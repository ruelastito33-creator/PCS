"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { logCambio } from "@/lib/bitacora";
import { publishEvent } from "@/lib/sse/publisher";
import type { ActionResult, ProduccionEstado } from "@/lib/types";
import { parseDecimalInput, roundToOneDecimal, decimalsEqual } from "@/lib/decimal";
import { syncInsumosTomateColZanahoriaParaPuesto } from "@/lib/insumos-tacos-sync";

/** Fields that OPERACIONES can edit */
const EDITABLE_FIELDS = [
  "solicitante",
  "vendedora",
  "tacos",
  "chofer",
  "bolsas",
  "aguas",
  "medida",
  "hora",
  "hieleras",
  "notas",
] as const;

/** Fields that COCINA can edit (OPERACIONES también, salvo que otro flujo limite) */
const COCINA_FIELDS = ["tortillas", "insumos", "aguas", "proveedora_tacos_id"] as const;

/** Closure fields */
const CIERRE_FIELDS = ["tacos_sobrantes", "inasistencia"] as const;

function revalidateProduccionRelatedPaths() {
  revalidatePath("/operaciones", "layout");
  revalidatePath("/cocina", "layout");
  revalidatePath("/chofer");
  revalidatePath("/aguas");
  revalidatePath("/hieleras");
  revalidatePath("/insumos");
}

/**
 * Update a single field on a Produccion row.
 */
export async function actualizarCampo(
  produccionId: string,
  campo: string,
  valor: string | number | boolean | object | null
): Promise<ActionResult> {
  try {
    const allFields = [
      ...EDITABLE_FIELDS,
      ...COCINA_FIELDS,
      ...CIERRE_FIELDS,
    ] as readonly string[];

    if (!allFields.includes(campo)) {
      return { success: false, error: `Campo no permitido: ${campo}` };
    }

    // Determine required role based on field
    const isCocinaField = (COCINA_FIELDS as readonly string[]).includes(campo);
    const isCierreField = (CIERRE_FIELDS as readonly string[]).includes(campo);

    let profile;
    if (isCocinaField) {
      profile = await requireRole("OPERACIONES", "COCINA");
    } else if (isCierreField) {
      profile = await requireRole("OPERACIONES", "COCINA");
    } else {
      profile = await requireRole("OPERACIONES");
    }

    // Cargar fila: bolsas e insumos juntos cuando haya sync tomate ↔ bolsas
    const current = await prisma.produccion.findUnique({
      where: { id: produccionId },
      select:
        campo === "insumos" || campo === "bolsas"
          ? { bolsas: true, insumos: true, comanda_id: true, puesto_id: true }
          : ({ [campo]: true, comanda_id: true, puesto_id: true } as {
              [key: string]: true;
              comanda_id: true;
              puesto_id: true;
            }),
    });

    if (!current) {
      return { success: false, error: "Registro de producción no encontrado" };
    }

    // Check comanda is not closed
    const comanda = await prisma.comanda.findUnique({
      where: { id: current.comanda_id },
      select: { estado: true },
    });

    if (comanda?.estado === "CERRADA") {
      return { success: false, error: "La comanda ya está cerrada" };
    }

    // Coerce value to correct type
    let coercedValue: unknown = valor;
    if (campo === "bolsas") {
      const raw =
        typeof valor === "number" && Number.isFinite(valor)
          ? valor
          : parseDecimalInput(String(valor ?? ""));
      coercedValue = roundToOneDecimal(Math.max(0, raw));
    } else if (["tacos", "aguas", "tortillas", "hieleras", "tacos_sobrantes"].includes(campo)) {
      coercedValue = typeof valor === "string" ? parseInt(valor, 10) || 0 : valor;
    }
    if (campo === "insumos" && valor !== null && typeof valor === "object" && !Array.isArray(valor)) {
      const o = valor as Record<string, unknown>;
      const normalized: Record<string, number> = {};
      for (const [k, v] of Object.entries(o)) {
        let num =
          typeof v === "number" && Number.isFinite(v)
            ? v
            : parseDecimalInput(String(v ?? ""));
        if (k === "tomate") {
          num = roundToOneDecimal(Math.max(0, num));
        }
        normalized[k] = num;
      }
      coercedValue = normalized;
    }
    if (campo === "solicitante") {
      const s = String(valor ?? "").trim();
      coercedValue = s.length > 0 ? s : null;
    }
    if (campo === "inasistencia") {
      coercedValue = valor === true || valor === "true";
    }
    if (campo === "proveedora_tacos_id") {
      if (valor === null || valor === undefined || valor === "") {
        coercedValue = null;
      } else {
        const n =
          typeof valor === "number" && Number.isFinite(valor)
            ? Math.trunc(valor)
            : parseInt(String(valor), 10);
        coercedValue = Number.isFinite(n) && n > 0 ? n : null;
      }
    }

    const antes = (current as Record<string, unknown>)[campo];

    // Build update data
    const updateData: Record<string, unknown> = { [campo]: coercedValue };

    // bolsas = salsa de tomate → insumos.tomate
    if (campo === "bolsas") {
      const currentInsumos =
        (current.insumos as Record<string, number> | null) ?? {};
      updateData.insumos = { ...currentInsumos, tomate: coercedValue };
    }

    // insumos.tomate (salsa de tomate) → bolsas (misma magnitud en comanda)
    let antesBolsasForLog: number | undefined;
    if (campo === "insumos" && typeof coercedValue === "object" && coercedValue !== null) {
      const inv = coercedValue as Record<string, number>;
      if (typeof inv.tomate === "number" && Number.isFinite(inv.tomate)) {
        antesBolsasForLog = Number((current as { bolsas?: number }).bolsas ?? 0);
        updateData.bolsas = inv.tomate;
      }
    }

    await prisma.produccion.update({
      where: { id: produccionId },
      data: updateData,
    });

    if (campo === "tacos") {
      await syncInsumosTomateColZanahoriaParaPuesto(
        current.comanda_id,
        current.puesto_id
      );
    }

    await logCambio({
      comanda_id: current.comanda_id,
      usuario_id: profile.id,
      campo,
      antes,
      despues: coercedValue,
      puesto_id: current.puesto_id,
    });

    if (
      campo === "insumos" &&
      antesBolsasForLog !== undefined &&
      "bolsas" in updateData
    ) {
      const despBolsas = updateData.bolsas as number;
      if (!decimalsEqual(roundToOneDecimal(antesBolsasForLog), despBolsas)) {
        await logCambio({
          comanda_id: current.comanda_id,
          usuario_id: profile.id,
          campo: "bolsas",
          antes: antesBolsasForLog,
          despues: despBolsas,
          puesto_id: current.puesto_id,
        });
      }
    }

    await publishEvent("PRODUCCION_ACTUALIZADA", {
      comanda_id: current.comanda_id,
      puesto_id: current.puesto_id,
    });

    revalidateProduccionRelatedPaths();

    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: message };
  }
}

/**
 * Update the status of a Produccion row.
 */
export async function actualizarEstado(
  produccionId: string,
  nuevoEstado: ProduccionEstado
): Promise<ActionResult> {
  try {
    const profile = await requireRole("OPERACIONES", "COCINA");

    const current = await prisma.produccion.findUnique({
      where: { id: produccionId },
      select: { estado: true, comanda_id: true, puesto_id: true },
    });

    if (!current) {
      return { success: false, error: "Registro no encontrado" };
    }

    const comanda = await prisma.comanda.findUnique({
      where: { id: current.comanda_id },
      select: { estado: true },
    });

    if (comanda?.estado === "CERRADA") {
      return { success: false, error: "La comanda ya está cerrada" };
    }

    await prisma.produccion.update({
      where: { id: produccionId },
      data: { estado: nuevoEstado },
    });

    // If this is the first status change, move comanda to EN_PROCESO
    if (comanda?.estado === "ABIERTA" && nuevoEstado !== "PENDIENTE") {
      await prisma.comanda.update({
        where: { id: current.comanda_id },
        data: { estado: "EN_PROCESO" },
      });
    }

    await logCambio({
      comanda_id: current.comanda_id,
      usuario_id: profile.id,
      campo: "estado",
      antes: current.estado,
      despues: nuevoEstado,
      puesto_id: current.puesto_id,
    });

    await publishEvent("PRODUCCION_ACTUALIZADA", {
      comanda_id: current.comanda_id,
      puesto_id: current.puesto_id,
    });

    revalidateProduccionRelatedPaths();
    revalidatePath("/cierre", "layout");

    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: message };
  }
}

export async function actualizarEstadoMasivo(
  produccionIds: string[],
  nuevoEstado: ProduccionEstado
): Promise<ActionResult<{ updated: number }>> {
  try {
    const ids = Array.from(
      new Set(
        produccionIds.filter(
          (id): id is string => typeof id === "string" && id.trim().length > 0
        )
      )
    );

    if (ids.length === 0) {
      return { success: false, error: "No hay filas seleccionadas" };
    }

    const profile = await requireRole("OPERACIONES", "COCINA");

    const currentRows = await prisma.produccion.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        estado: true,
        comanda_id: true,
        puesto_id: true,
      },
    });

    if (currentRows.length === 0) {
      return { success: false, error: "No se encontraron registros para actualizar" };
    }

    const comandaIds = Array.from(new Set(currentRows.map((row) => row.comanda_id)));
    const comandas = await prisma.comanda.findMany({
      where: { id: { in: comandaIds } },
      select: { id: true, estado: true },
    });

    if (comandas.some((comanda) => comanda.estado === "CERRADA")) {
      return { success: false, error: "La comanda ya esta cerrada" };
    }

    await prisma.produccion.updateMany({
      where: { id: { in: currentRows.map((row) => row.id) } },
      data: { estado: nuevoEstado },
    });

    const comandasAbiertas = comandas.filter(
      (comanda) => comanda.estado === "ABIERTA" && nuevoEstado !== "PENDIENTE"
    );

    if (comandasAbiertas.length > 0) {
      await prisma.comanda.updateMany({
        where: { id: { in: comandasAbiertas.map((comanda) => comanda.id) } },
        data: { estado: "EN_PROCESO" },
      });
    }

    for (const row of currentRows) {
      await logCambio({
        comanda_id: row.comanda_id,
        usuario_id: profile.id,
        campo: "estado",
        antes: row.estado,
        despues: nuevoEstado,
        puesto_id: row.puesto_id,
      });
    }

    for (const row of currentRows) {
      await publishEvent("PRODUCCION_ACTUALIZADA", {
        comanda_id: row.comanda_id,
        puesto_id: row.puesto_id,
      });
    }

    revalidateProduccionRelatedPaths();
    revalidatePath("/cierre", "layout");

    return { success: true, data: { updated: currentRows.length } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: message };
  }
}

/**
 * Bulk update multiple fields on a Produccion row at once (for inline row save).
 */
export async function actualizarProduccionFila(
  produccionId: string,
  campos: Record<string, string | number | boolean>
): Promise<ActionResult> {
  try {
    const profile = await requireRole("OPERACIONES");

    const current = await prisma.produccion.findUnique({
      where: { id: produccionId },
      include: { puesto: true },
    });

    if (!current) {
      return { success: false, error: "Registro no encontrado" };
    }

    const comanda = await prisma.comanda.findUnique({
      where: { id: current.comanda_id },
      select: { estado: true },
    });

    if (comanda?.estado === "CERRADA") {
      return { success: false, error: "La comanda ya está cerrada" };
    }

    // Build update data, only include allowed fields that changed
    const updateData: Record<string, unknown> = {};
    const changes: { campo: string; antes: unknown; despues: unknown }[] = [];

    const allAllowed = [...EDITABLE_FIELDS] as readonly string[];

    for (const [campo, valor] of Object.entries(campos)) {
      if (!allAllowed.includes(campo)) continue;

      let coerced: unknown = valor;
      if (campo === "bolsas") {
        const raw =
          typeof valor === "number" && Number.isFinite(valor)
            ? valor
            : parseDecimalInput(String(valor ?? ""));
        coerced = roundToOneDecimal(Math.max(0, raw));
      } else if (["tacos", "aguas", "hieleras"].includes(campo)) {
        coerced = typeof valor === "string" ? parseInt(valor, 10) || 0 : valor;
      }

      const antes = (current as Record<string, unknown>)[campo];
      const changed =
        campo === "bolsas"
          ? !decimalsEqual(
              roundToOneDecimal(Number(antes ?? 0)),
              coerced as number
            )
          : antes !== coerced;
      if (changed) {
        updateData[campo] = coerced;
        changes.push({ campo, antes, despues: coerced });
      }
    }

    if (Object.keys(updateData).length === 0) {
      return { success: true, data: undefined }; // No changes
    }

    // bolsas = tomate
    if ("bolsas" in updateData) {
      const currentInsumos = (current.insumos as Record<string, number> | null) ?? {};
      updateData.insumos = { ...currentInsumos, tomate: updateData.bolsas };
    }

    await prisma.produccion.update({
      where: { id: produccionId },
      data: updateData,
    });

    // Log each change individually for audit trail
    for (const change of changes) {
      await logCambio({
        comanda_id: current.comanda_id,
        usuario_id: profile.id,
        campo: change.campo,
        antes: change.antes,
        despues: change.despues,
        puesto_id: current.puesto_id,
      });
    }

    await publishEvent("PRODUCCION_ACTUALIZADA", {
      comanda_id: current.comanda_id,
      puesto_id: current.puesto_id,
    });

    revalidateProduccionRelatedPaths();

    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: message };
  }
}
