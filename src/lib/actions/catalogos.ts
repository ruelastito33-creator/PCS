"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import type { ActionResult } from "@/lib/types";
import { parseFraccionA_decimal, textoFraccionBienFormado } from "@/lib/fraccion";

// ─── Puestos ────────────────────────────────────────────────────────────────

export async function crearPuesto(nombre: string): Promise<ActionResult> {
  try {
    await requireRole("OPERACIONES");
    const trimmed = nombre.trim();
    if (!trimmed) return { success: false, error: "El nombre no puede estar vacío" };

    const ultimo = await prisma.puesto.findFirst({
      where: { es_fuera_puesto: false },
      orderBy: { orden: "desc" },
    });
    await prisma.puesto.create({
      data: { nombre: trimmed, orden: (ultimo?.orden ?? 0) + 1 },
    });

    revalidatePath("/settings");
    revalidatePath("/operaciones");
    return { success: true, data: undefined };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    if (msg.includes("Unique constraint")) return { success: false, error: "Ya existe un puesto con ese nombre" };
    return { success: false, error: msg };
  }
}

export async function renombrarPuesto(id: number, nombre: string): Promise<ActionResult> {
  try {
    await requireRole("OPERACIONES");
    const trimmed = nombre.trim();
    if (!trimmed) return { success: false, error: "El nombre no puede estar vacío" };

    const actual = await prisma.puesto.findUnique({ where: { id } });
    if (actual?.es_fuera_puesto) {
      return { success: false, error: "Este puesto es de sistema y no se puede renombrar." };
    }

    await prisma.puesto.update({ where: { id }, data: { nombre: trimmed } });

    revalidatePath("/settings");
    revalidatePath("/operaciones");
    return { success: true, data: undefined };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    if (msg.includes("Unique constraint")) return { success: false, error: "Ya existe un puesto con ese nombre" };
    return { success: false, error: msg };
  }
}

export async function actualizarPuestoFracciones(
  id: number,
  salsa_roja_default: string,
  cebolla_default: string
): Promise<ActionResult> {
  try {
    await requireRole("OPERACIONES");
    const puesto = await prisma.puesto.findUnique({ where: { id } });
    if (!puesto) return { success: false, error: "Puesto no encontrado" };
    if (puesto.es_fuera_puesto) {
      return { success: false, error: "Este registro es de sistema." };
    }

    const sr = salsa_roja_default.trim() || "1";
    const cb = cebolla_default.trim() || "1";
    if (!textoFraccionBienFormado(sr) || !textoFraccionBienFormado(cb)) {
      return {
        success: false,
        error: "Usa números o una fracción (ej. 1, 1/2, 1/6, 1 1/2 como 1.5 o 3/2).",
      };
    }
    parseFraccionA_decimal(sr);
    parseFraccionA_decimal(cb);

    await prisma.puesto.update({
      where: { id },
      data: { salsa_roja_default: sr, cebolla_default: cb },
    });

    // Propagate to open comanda(s) — update insumos.salsa_roja & insumos.cebolla
    const srDecimal = parseFraccionA_decimal(sr);
    const cbDecimal = parseFraccionA_decimal(cb);
    const openRows = await prisma.produccion.findMany({
      where: {
        puesto_id: id,
        comanda: { estado: { not: "CERRADA" } },
      },
      select: { id: true, insumos: true },
    });
    if (openRows.length > 0) {
      await prisma.$transaction(
        openRows.map((row) => {
          const base = (row.insumos && typeof row.insumos === "object" ? row.insumos : {}) as Record<string, unknown>;
          return prisma.produccion.update({
            where: { id: row.id },
            data: {
              insumos: { ...base, salsa_roja: srDecimal, cebolla: cbDecimal },
            },
          });
        })
      );
    }

    revalidatePath("/settings");
    revalidatePath("/operaciones");
    revalidatePath("/cocina");
    revalidatePath("/insumos");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

/**
 * Sync salsa_roja & cebolla defaults from ALL puestos into the open comanda's produccion rows.
 */
export async function sincronizarDefaultsInsumosComandaAbierta(): Promise<ActionResult<{ filas: number }>> {
  try {
    await requireRole("OPERACIONES");

    const puestos = await prisma.puesto.findMany({
      where: { is_active: true, es_fuera_puesto: false },
      select: { id: true, salsa_roja_default: true, cebolla_default: true },
    });

    const openRows = await prisma.produccion.findMany({
      where: { comanda: { estado: { not: "CERRADA" } } },
      select: { id: true, puesto_id: true, insumos: true },
    });

    if (openRows.length === 0) {
      return { success: true, data: { filas: 0 } };
    }

    const puestoMap = new Map(puestos.map((p) => [p.id, p]));

    const updates = openRows
      .filter((row) => puestoMap.has(row.puesto_id))
      .map((row) => {
        const p = puestoMap.get(row.puesto_id)!;
        const srDecimal = parseFraccionA_decimal(p.salsa_roja_default ?? "1");
        const cbDecimal = parseFraccionA_decimal(p.cebolla_default ?? "1");
        const base = (row.insumos && typeof row.insumos === "object" ? row.insumos : {}) as Record<string, unknown>;
        return prisma.produccion.update({
          where: { id: row.id },
          data: { insumos: { ...base, salsa_roja: srDecimal, cebolla: cbDecimal } },
        });
      });

    await prisma.$transaction(updates);

    revalidatePath("/settings");
    revalidatePath("/operaciones");
    revalidatePath("/cocina");
    revalidatePath("/insumos");
    return { success: true, data: { filas: updates.length } };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

export async function togglePuestoActivo(id: number): Promise<ActionResult> {
  try {
    await requireRole("OPERACIONES");
    const puesto = await prisma.puesto.findUnique({ where: { id } });
    if (!puesto) return { success: false, error: "Puesto no encontrado" };
    if (puesto.es_fuera_puesto) {
      return { success: false, error: "Este puesto es de sistema y no se puede desactivar." };
    }

    await prisma.puesto.update({ where: { id }, data: { is_active: !puesto.is_active } });

    revalidatePath("/settings");
    revalidatePath("/operaciones");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

// ─── Vendedoras ─────────────────────────────────────────────────────────────

export async function crearVendedora(nombre: string): Promise<ActionResult> {
  try {
    await requireRole("OPERACIONES");
    const trimmed = nombre.trim();
    if (!trimmed) return { success: false, error: "El nombre no puede estar vacío" };

    await prisma.vendedora.create({ data: { nombre: trimmed } });

    revalidatePath("/settings");
    revalidatePath("/operaciones");
    return { success: true, data: undefined };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    if (msg.includes("Unique constraint")) return { success: false, error: "Ya existe una vendedora con ese nombre" };
    return { success: false, error: msg };
  }
}

export async function renombrarVendedora(id: number, nombre: string): Promise<ActionResult> {
  try {
    await requireRole("OPERACIONES");
    const trimmed = nombre.trim();
    if (!trimmed) return { success: false, error: "El nombre no puede estar vacío" };

    await prisma.vendedora.update({ where: { id }, data: { nombre: trimmed } });

    revalidatePath("/settings");
    revalidatePath("/operaciones");
    return { success: true, data: undefined };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    if (msg.includes("Unique constraint")) return { success: false, error: "Ya existe una vendedora con ese nombre" };
    return { success: false, error: msg };
  }
}

export async function toggleVendedoraActiva(id: number): Promise<ActionResult> {
  try {
    await requireRole("OPERACIONES");
    const v = await prisma.vendedora.findUnique({ where: { id } });
    if (!v) return { success: false, error: "Vendedora no encontrada" };

    await prisma.vendedora.update({ where: { id }, data: { is_active: !v.is_active } });

    revalidatePath("/settings");
    revalidatePath("/operaciones");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

// ─── Choferes ────────────────────────────────────────────────────────────────

export async function crearChofer(nombre: string): Promise<ActionResult> {
  try {
    await requireRole("OPERACIONES");
    const trimmed = nombre.trim();
    if (!trimmed) return { success: false, error: "El nombre no puede estar vacío" };

    await prisma.chofer.create({ data: { nombre: trimmed } });

    revalidatePath("/settings");
    revalidatePath("/operaciones");
    return { success: true, data: undefined };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    if (msg.includes("Unique constraint")) return { success: false, error: "Ya existe un chofer con ese nombre" };
    return { success: false, error: msg };
  }
}

export async function renombrarChofer(id: number, nombre: string): Promise<ActionResult> {
  try {
    await requireRole("OPERACIONES");
    const trimmed = nombre.trim();
    if (!trimmed) return { success: false, error: "El nombre no puede estar vacío" };

    await prisma.chofer.update({ where: { id }, data: { nombre: trimmed } });

    revalidatePath("/settings");
    revalidatePath("/operaciones");
    return { success: true, data: undefined };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    if (msg.includes("Unique constraint")) return { success: false, error: "Ya existe un chofer con ese nombre" };
    return { success: false, error: msg };
  }
}

export async function toggleChoferActivo(id: number): Promise<ActionResult> {
  try {
    await requireRole("OPERACIONES");
    const c = await prisma.chofer.findUnique({ where: { id } });
    if (!c) return { success: false, error: "Chofer no encontrado" };

    await prisma.chofer.update({ where: { id }, data: { is_active: !c.is_active } });

    revalidatePath("/settings");
    revalidatePath("/operaciones");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}

// ─── Proveedoras de tacos (Cocina) ───────────────────────────────────────────

export async function crearProveedoraTacos(nombre: string): Promise<ActionResult> {
  try {
    await requireRole("OPERACIONES");
    const trimmed = nombre.trim();
    if (!trimmed) return { success: false, error: "El nombre no puede estar vacío" };

    await prisma.proveedoraTacos.create({ data: { nombre: trimmed } });

    revalidatePath("/settings");
    revalidatePath("/cocina");
    return { success: true, data: undefined };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    if (msg.includes("Unique constraint")) {
      return { success: false, error: "Ya existe una proveedora con ese nombre" };
    }
    return { success: false, error: msg };
  }
}

export async function renombrarProveedoraTacos(id: number, nombre: string): Promise<ActionResult> {
  try {
    await requireRole("OPERACIONES");
    const trimmed = nombre.trim();
    if (!trimmed) return { success: false, error: "El nombre no puede estar vacío" };

    await prisma.proveedoraTacos.update({ where: { id }, data: { nombre: trimmed } });

    revalidatePath("/settings");
    revalidatePath("/cocina");
    return { success: true, data: undefined };
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error desconocido";
    if (msg.includes("Unique constraint")) {
      return { success: false, error: "Ya existe una proveedora con ese nombre" };
    }
    return { success: false, error: msg };
  }
}

export async function toggleProveedoraTacosActiva(id: number): Promise<ActionResult> {
  try {
    await requireRole("OPERACIONES");
    const row = await prisma.proveedoraTacos.findUnique({ where: { id } });
    if (!row) return { success: false, error: "Proveedora no encontrada" };

    await prisma.proveedoraTacos.update({
      where: { id },
      data: { is_active: !row.is_active },
    });

    revalidatePath("/settings");
    revalidatePath("/cocina");
    return { success: true, data: undefined };
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : "Error desconocido" };
  }
}
