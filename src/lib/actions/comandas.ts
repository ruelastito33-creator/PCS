"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { logBitacora } from "@/lib/bitacora";
import { publishEvent } from "@/lib/sse/publisher";
import type { ActionResult } from "@/lib/types";
import { parseFechaUTC } from "@/lib/fecha";
import { parseComandaExcelFile } from "@/lib/comanda-excel";
import { insumosInicialesDesdePuesto } from "@/lib/fraccion";
import { syncInsumosTomateColZanahoriaParaPuesto } from "@/lib/insumos-tacos-sync";

async function ensureComandaBaseRows(fechaDate: Date, createdBy: string) {
  let comanda = await prisma.comanda.findUnique({
    where: { fecha: fechaDate },
  });

  const puestos = await prisma.puesto.findMany({
    where: { is_active: true, es_fuera_puesto: false },
    orderBy: { orden: "asc" },
  });

  if (puestos.length === 0) {
    throw new Error("No hay puestos activos. Agrega puestos primero.");
  }

  if (!comanda) {
    comanda = await prisma.comanda.create({
      data: {
        fecha: fechaDate,
        estado: "ABIERTA",
        created_by: createdBy,
      },
    });

    await logBitacora({
      comanda_id: comanda.id,
      evento: "COMANDA_CREADA",
      usuario_id: createdBy,
      detalle: {
        fecha: fechaDate.toISOString().slice(0, 10),
        puestos_count: puestos.length,
        origen: "sistema",
      },
    });
  }

  await prisma.produccion.createMany({
    data: puestos.map((p) => ({
      comanda_id: comanda.id,
      puesto_id: p.id,
      numero_pedido: 1,
      estado: "PENDIENTE",
      tortillas: 10,
      hieleras: 1,
      bolsas: 0,
      insumos: insumosInicialesDesdePuesto(p),
    })),
    skipDuplicates: true,
  });

  return { comanda, puestos };
}

type ProduccionClonRow = {
  puesto_id: number;
  numero_pedido: number;
  solicitante: string | null;
  vendedora: string | null;
  tacos: number;
  chofer: string | null;
  bolsas: number;
  aguas: number;
  medida: string | null;
  tortillas: number;
  insumos: unknown;
  hieleras: number;
  hora: string | null;
  notas: string | null;
  proveedora_tacos_id: number | null;
};

async function clonarProduccionesHaciaComanda(
  comandaIdDestino: string,
  filasOrigen: ProduccionClonRow[]
) {
  if (filasOrigen.length === 0) {
    return { clonada: false, filas: 0 };
  }

  const actuales = await prisma.produccion.findMany({
    where: { comanda_id: comandaIdDestino },
    select: { id: true, puesto_id: true, numero_pedido: true },
  });

  const actualesMap = new Map(
    actuales.map((row) => [`${row.puesto_id}:${row.numero_pedido}`, row.id])
  );

  let filas = 0;

  for (const row of filasOrigen) {
    const key = `${row.puesto_id}:${row.numero_pedido}`;
    const data = {
      solicitante: row.solicitante,
      vendedora: row.vendedora,
      tacos: row.tacos,
      chofer: row.chofer,
      bolsas: row.bolsas,
      aguas: row.aguas,
      medida: row.medida,
      tortillas: row.tortillas,
      insumos:
        row.insumos && typeof row.insumos === "object" ? row.insumos : {},
      hieleras: row.hieleras,
      hora: row.hora,
      notas: row.notas,
      proveedora_tacos_id: row.proveedora_tacos_id,
      estado: "PENDIENTE" as const,
      tacos_sobrantes: 0,
      inasistencia: false,
    };

    const existingId = actualesMap.get(key);
    if (existingId) {
      await prisma.produccion.update({
        where: { id: existingId },
        data,
      });
    } else {
      await prisma.produccion.create({
        data: {
          comanda_id: comandaIdDestino,
          puesto_id: row.puesto_id,
          numero_pedido: row.numero_pedido,
          ...data,
        },
      });
    }
    filas += 1;
  }

  const grupos = await prisma.produccion.findMany({
    where: { comanda_id: comandaIdDestino },
    distinct: ["puesto_id"],
    select: { puesto_id: true },
  });
  for (const g of grupos) {
    await syncInsumosTomateColZanahoriaParaPuesto(comandaIdDestino, g.puesto_id);
  }

  return { clonada: true, filas };
}

async function clonarUltimaComanda(comandaId: string, fechaDate: Date) {
  const ultimaComanda = await prisma.comanda.findFirst({
    where: { fecha: { lt: fechaDate } },
    include: {
      producciones: {
        orderBy: [{ puesto: { orden: "asc" } }, { numero_pedido: "asc" }],
      },
    },
    orderBy: { fecha: "desc" },
  });

  if (!ultimaComanda) {
    return { clonada: false, filas: 0 };
  }

  return clonarProduccionesHaciaComanda(comandaId, ultimaComanda.producciones);
}

function mismoMesUTC(a: Date, b: Date) {
  return (
    a.getUTCFullYear() === b.getUTCFullYear() &&
    a.getUTCMonth() === b.getUTCMonth()
  );
}

/**
 * Create the daily comanda + one Produccion row per active puesto.
 * `desde_fecha`: copiar filas de la comanda del día `fechaOrigen` (mismo mes/año UTC que `fecha`).
 */
export async function crearComanda(
  fecha: string,
  modo: "ultima" | "cero" | "desde_fecha" = "ultima",
  opts?: { fechaOrigen?: string }
): Promise<
  ActionResult<{ id: string; origen: "ultima" | "cero" | "desde_fecha" }>
> {
  try {
    const profile = await requireRole("OPERACIONES");

    const fechaDate = parseFechaUTC(fecha);
    const existing = await prisma.comanda.findUnique({ where: { fecha: fechaDate } });
    if (existing) {
      return { success: false, error: "Ya existe una comanda para esta fecha." };
    }

    const { comanda } = await ensureComandaBaseRows(fechaDate, profile.id);

    if (modo === "ultima") {
      await clonarUltimaComanda(comanda.id, fechaDate);
    } else if (modo === "desde_fecha") {
      const raw = opts?.fechaOrigen?.trim();
      if (!raw) {
        return { success: false, error: "Indica la fecha de origen." };
      }
      const fechaOrigenDate = parseFechaUTC(raw);
      if (fechaOrigenDate.getTime() === fechaDate.getTime()) {
        return {
          success: false,
          error: "La fecha de origen no puede ser la misma que la comanda nueva.",
        };
      }
      if (!mismoMesUTC(fechaDate, fechaOrigenDate)) {
        return {
          success: false,
          error: "La fecha de origen debe ser del mismo mes que la comanda que creas.",
        };
      }
      const origen = await prisma.comanda.findUnique({
        where: { fecha: fechaOrigenDate },
        include: {
          producciones: {
            orderBy: [{ puesto: { orden: "asc" } }, { numero_pedido: "asc" }],
          },
        },
      });
      if (!origen) {
        return {
          success: false,
          error: `No hay comanda registrada para el día ${raw}.`,
        };
      }
      await clonarProduccionesHaciaComanda(comanda.id, origen.producciones);
    }

    await logBitacora({
      comanda_id: comanda.id,
      evento: "COMANDA_PRECARGA",
      usuario_id: profile.id,
      detalle: {
        fecha,
        modo,
        fecha_origen: opts?.fechaOrigen ?? null,
      },
    });

    await publishEvent("COMANDA_CREADA", { comanda_id: comanda.id });
    revalidatePath("/operaciones");

    return { success: true, data: { id: comanda.id, origen: modo } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: message };
  }
}

/**
 * Copia datos de otra comanda sobre la comanda del día (abierta). Misma lógica de fusión que al crear.
 */
export async function precargarComandaDesdeOrigen(
  comandaId: string,
  modo: "ultima" | "desde_fecha",
  opts?: { fechaOrigen?: string }
): Promise<ActionResult<{ filas: number }>> {
  try {
    const profile = await requireRole("OPERACIONES");

    const comanda = await prisma.comanda.findUnique({
      where: { id: comandaId },
      select: { id: true, estado: true, fecha: true },
    });
    if (!comanda) {
      return { success: false, error: "Comanda no encontrada." };
    }
    if (comanda.estado === "CERRADA") {
      return { success: false, error: "La comanda está cerrada." };
    }

    const fechaDate = comanda.fecha;
    let filas = 0;

    if (modo === "ultima") {
      const r = await clonarUltimaComanda(comandaId, fechaDate);
      if (!r.clonada) {
        return {
          success: false,
          error: "No hay una comanda con fecha anterior a esta para copiar.",
        };
      }
      filas = r.filas;
    } else {
      const raw = opts?.fechaOrigen?.trim();
      if (!raw) {
        return { success: false, error: "Indica la fecha de origen." };
      }
      const fechaOrigenDate = parseFechaUTC(raw);
      if (fechaOrigenDate.getTime() === fechaDate.getTime()) {
        return {
          success: false,
          error: "La fecha de origen no puede ser el mismo día que esta comanda.",
        };
      }
      if (!mismoMesUTC(fechaDate, fechaOrigenDate)) {
        return {
          success: false,
          error: "La fecha de origen debe ser del mismo mes que esta comanda.",
        };
      }
      const origen = await prisma.comanda.findUnique({
        where: { fecha: fechaOrigenDate },
        include: {
          producciones: {
            orderBy: [{ puesto: { orden: "asc" } }, { numero_pedido: "asc" }],
          },
        },
      });
      if (!origen) {
        return {
          success: false,
          error: `No hay comanda registrada para el día ${raw}.`,
        };
      }
      const r = await clonarProduccionesHaciaComanda(comandaId, origen.producciones);
      filas = r.filas;
    }

    await logBitacora({
      comanda_id: comandaId,
      evento: "COMANDA_PRECARGA_DESDE_ORIGEN",
      usuario_id: profile.id,
      detalle: {
        modo,
        fecha_origen: opts?.fechaOrigen ?? null,
        filas,
      },
    });

    await publishEvent("PRODUCCION_ACTUALIZADA", { comanda_id: comandaId });
    revalidatePath("/operaciones");
    revalidatePath("/cocina");
    revalidatePath("/chofer");
    revalidatePath("/aguas");
    revalidatePath("/hieleras");
    revalidatePath("/insumos");
    revalidatePath("/cierre");

    return { success: true, data: { filas } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: message };
  }
}

export async function reiniciarComandaDesdeCero(
  comandaId: string
): Promise<ActionResult<{ filas: number }>> {
  try {
    const profile = await requireRole("OPERACIONES");

    const comanda = await prisma.comanda.findUnique({
      where: { id: comandaId },
      select: { id: true, estado: true },
    });

    if (!comanda) {
      return { success: false, error: "Comanda no encontrada." };
    }
    if (comanda.estado === "CERRADA") {
      return { success: false, error: "La comanda esta cerrada." };
    }

    const puestoFuera = await prisma.puesto.findFirst({
      where: { es_fuera_puesto: true },
    });
    if (puestoFuera) {
      await prisma.produccion.deleteMany({
        where: { comanda_id: comandaId, puesto_id: puestoFuera.id },
      });
    }

    const result = await prisma.produccion.updateMany({
      where: { comanda_id: comandaId },
      data: {
        solicitante: null,
        vendedora: null,
        tacos: 0,
        chofer: null,
        bolsas: 0,
        aguas: 0,
        medida: null,
        tortillas: 10,
        insumos: {},
        hieleras: 1,
        hora: null,
        notas: null,
        proveedora_tacos_id: null,
        estado: "PENDIENTE",
        tacos_sobrantes: 0,
        inasistencia: false,
      },
    });

    const gruposReinicio = await prisma.produccion.findMany({
      where: { comanda_id: comandaId },
      distinct: ["puesto_id"],
      select: { puesto_id: true },
    });
    for (const g of gruposReinicio) {
      await syncInsumosTomateColZanahoriaParaPuesto(comandaId, g.puesto_id);
    }

    await logBitacora({
      comanda_id: comandaId,
      evento: "COMANDA_REINICIADA_CERO",
      usuario_id: profile.id,
      detalle: { filas: result.count },
    });

    await publishEvent("PRODUCCION_ACTUALIZADA", { comanda_id: comandaId });
    revalidatePath("/operaciones");
    revalidatePath("/cocina");
    revalidatePath("/chofer");
    revalidatePath("/aguas");
    revalidatePath("/hieleras");
    revalidatePath("/insumos");
    revalidatePath("/cierre");

    return { success: true, data: { filas: result.count } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: message };
  }
}

export async function importarComandaExcel(
  formData: FormData
): Promise<ActionResult<{ creadas: number; actualizadas: number; comandaId: string }>> {
  try {
    const profile = await requireRole("OPERACIONES");
    const fechaValue = String(formData.get("fecha") ?? "").trim();
    const fechaDate = parseFechaUTC(fechaValue);

    const file = formData.get("archivo");
    if (!(file instanceof File)) {
      return { success: false, error: "Selecciona un archivo Excel valido." };
    }
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      return { success: false, error: "El archivo debe ser .xlsx." };
    }

    const importedRows = parseComandaExcelFile(await file.arrayBuffer());
    const { comanda, puestos } = await ensureComandaBaseRows(fechaDate, profile.id);

    if (comanda.estado === "CERRADA") {
      return { success: false, error: "La comanda ya esta cerrada." };
    }

    const puestoFuera = await prisma.puesto.findFirst({
      where: { es_fuera_puesto: true },
    });
    if (!puestoFuera) {
      return {
        success: false,
        error: "Falta el puesto de sistema para pedidos fuera de catálogo. Ejecuta migraciones.",
      };
    }

    const puestoMap = new Map(
      puestos.map((puesto) => [puesto.nombre.trim().toLowerCase(), puesto])
    );

    const unknownPuestos = importedRows
      .filter((row) => row.numero_pedido === 1)
      .map((row) => row.puesto)
      .filter((puesto, index, arr) => {
        const key = puesto.trim().toLowerCase();
        return !puestoMap.has(key) && arr.indexOf(puesto) === index;
      });

    if (unknownPuestos.length > 0) {
      return {
        success: false,
        error: `Puestos no reconocidos en Excel: ${unknownPuestos.join(", ")}.`,
      };
    }

    const existingRows = await prisma.produccion.findMany({
      where: { comanda_id: comanda.id },
      select: {
        id: true,
        puesto_id: true,
        numero_pedido: true,
        solicitante: true,
        vendedora: true,
        tacos: true,
        chofer: true,
        bolsas: true,
        aguas: true,
        medida: true,
        hieleras: true,
        hora: true,
        notas: true,
        insumos: true,
      },
    });

    const existingMap = new Map(
      existingRows.map((row) => [`${row.puesto_id}:${row.numero_pedido}`, row])
    );

    let creadas = 0;
    let actualizadas = 0;
    const puestosTocados = new Set<number>();

    for (const row of importedRows) {
      const solicitanteTexto = row.puesto.trim();
      if (row.numero_pedido > 1 && !solicitanteTexto) {
        return {
          success: false,
          error:
            'En filas con numero_pedido > 1, la columna "puesto" debe traer el nombre de quien solicita el pedido (fuera de catálogo de puestos).',
        };
      }

      const puesto =
        row.numero_pedido === 1
          ? puestoMap.get(solicitanteTexto.toLowerCase())
          : puestoFuera;
      if (!puesto) continue;

      puestosTocados.add(puesto.id);

      const key = `${puesto.id}:${row.numero_pedido}`;
      const existing = existingMap.get(key);
      const insumosActuales =
        existing?.insumos && typeof existing.insumos === "object"
          ? (existing.insumos as Record<string, unknown>)
          : {};

      const data = {
        solicitante: row.numero_pedido > 1 ? solicitanteTexto : null,
        vendedora: row.vendedora,
        tacos: row.tacos,
        chofer: row.chofer,
        bolsas: row.bolsas,
        aguas: row.aguas,
        medida: row.medida,
        hieleras: row.hieleras,
        hora: row.hora,
        notas: row.notas,
        insumos: {
          ...insumosActuales,
          tomate: row.bolsas,
        },
      };

      if (existing) {
        await prisma.produccion.update({
          where: { id: existing.id },
          data,
        });
        actualizadas += 1;
      } else {
        const esBase = row.numero_pedido === 1;
        await prisma.produccion.create({
          data: {
            comanda_id: comanda.id,
            puesto_id: puesto.id,
            numero_pedido: row.numero_pedido,
            estado: "PENDIENTE",
            ...data,
            tortillas: esBase ? 10 : 0,
            hieleras: esBase ? Math.max(1, row.hieleras) : row.hieleras,
          },
        });
        creadas += 1;
      }
    }

    for (const pid of puestosTocados) {
      await syncInsumosTomateColZanahoriaParaPuesto(comanda.id, pid);
    }

    await logBitacora({
      comanda_id: comanda.id,
      evento: "COMANDA_IMPORTADA_EXCEL",
      usuario_id: profile.id,
      detalle: {
        archivo: file.name,
        filas: importedRows.length,
        creadas,
        actualizadas,
        fecha: fechaValue,
      },
    });

    await publishEvent("PRODUCCION_ACTUALIZADA", { comanda_id: comanda.id });
    revalidatePath("/operaciones");
    revalidatePath("/cocina");
    revalidatePath("/chofer");
    revalidatePath("/aguas");
    revalidatePath("/hieleras");
    revalidatePath("/insumos");
    revalidatePath("/cierre");

    return {
      success: true,
      data: { creadas, actualizadas, comandaId: comanda.id },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: message };
  }
}

/**
 * Pedido adicional fuera de catálogo de puestos: el nombre lo capturas en la columna solicitante.
 */
export async function agregarPedidoAdicional(
  comandaId: string
): Promise<ActionResult<{ id: string; numero_pedido: number }>> {
  try {
    const profile = await requireRole("OPERACIONES");

    // Verify comanda exists and is not closed
    const comanda = await prisma.comanda.findUnique({
      where: { id: comandaId },
      select: { estado: true },
    });

    if (!comanda) {
      return { success: false, error: "Comanda no encontrada" };
    }
    if (comanda.estado === "CERRADA") {
      return { success: false, error: "La comanda ya está cerrada" };
    }

    const puestoFuera = await prisma.puesto.findFirst({
      where: { es_fuera_puesto: true },
    });
    if (!puestoFuera) {
      return {
        success: false,
        error: "Falta el puesto de sistema para pedidos fuera de catálogo. Ejecuta migraciones.",
      };
    }

    const lastPedido = await prisma.produccion.findFirst({
      where: { comanda_id: comandaId, puesto_id: puestoFuera.id },
      orderBy: { numero_pedido: "desc" },
      select: { numero_pedido: true },
    });

    const nextNumero = (lastPedido?.numero_pedido ?? 1) + 1;

    const produccion = await prisma.produccion.create({
      data: {
        comanda_id: comandaId,
        puesto_id: puestoFuera.id,
        numero_pedido: nextNumero,
        solicitante: null,
        estado: "PENDIENTE",
        tortillas: 0,
        hieleras: 0,
        tacos: 0,
        bolsas: 0,
        aguas: 0,
        insumos: insumosInicialesDesdePuesto(puestoFuera),
      },
    });

    await logBitacora({
      comanda_id: comandaId,
      evento: "PEDIDO_ADICIONAL",
      usuario_id: profile.id,
      detalle: {
        puesto_fuera: true,
        numero_pedido: nextNumero,
      },
    });

    await publishEvent("PRODUCCION_ACTUALIZADA", {
      comanda_id: comandaId,
      puesto_id: puestoFuera.id,
    });

    revalidatePath("/operaciones");
    revalidatePath("/cocina");

    return {
      success: true,
      data: { id: produccion.id, numero_pedido: nextNumero },
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: message };
  }
}

/**
 * Remove an additional order (numero_pedido > 1). Base order cannot be deleted.
 * Only allowed while production row is still PENDIENTE.
 */
export async function eliminarPedidoAdicional(
  produccionId: string
): Promise<ActionResult> {
  try {
    const profile = await requireRole("OPERACIONES");

    const row = await prisma.produccion.findUnique({
      where: { id: produccionId },
      select: {
        id: true,
        comanda_id: true,
        puesto_id: true,
        numero_pedido: true,
        estado: true,
      },
    });

    if (!row) {
      return { success: false, error: "Registro no encontrado" };
    }
    if (row.numero_pedido <= 1) {
      return {
        success: false,
        error: "No se puede eliminar el pedido base del puesto.",
      };
    }
    if (row.estado !== "PENDIENTE") {
      return {
        success: false,
        error:
          "Solo se pueden quitar pedidos extra que sigan en PENDIENTE. Cambia el estado o vacía los datos primero.",
      };
    }

    const comanda = await prisma.comanda.findUnique({
      where: { id: row.comanda_id },
      select: { estado: true },
    });
    if (!comanda || comanda.estado === "CERRADA") {
      return { success: false, error: "La comanda está cerrada." };
    }

    await prisma.produccion.delete({ where: { id: produccionId } });

    await logBitacora({
      comanda_id: row.comanda_id,
      evento: "PEDIDO_ADICIONAL_ELIMINADO",
      usuario_id: profile.id,
      detalle: {
        puesto_id: row.puesto_id,
        numero_pedido: row.numero_pedido,
      },
    });

    await publishEvent("PRODUCCION_ACTUALIZADA", {
      comanda_id: row.comanda_id,
      puesto_id: row.puesto_id,
    });

    revalidatePath("/operaciones");
    revalidatePath("/cocina");
    revalidatePath("/chofer");
    revalidatePath("/aguas");
    revalidatePath("/hieleras");
    revalidatePath("/insumos");
    revalidatePath("/cierre");

    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: message };
  }
}

/**
 * Clear vendedora on every produccion row for the comanda (all puestos and pedidos extra).
 */
export async function reiniciarVendedorasComanda(
  comandaId: string
): Promise<ActionResult<{ filas: number }>> {
  try {
    const profile = await requireRole("OPERACIONES");

    const comanda = await prisma.comanda.findUnique({
      where: { id: comandaId },
      select: { estado: true },
    });
    if (!comanda) {
      return { success: false, error: "Comanda no encontrada" };
    }
    if (comanda.estado === "CERRADA") {
      return { success: false, error: "La comanda está cerrada." };
    }

    const result = await prisma.produccion.updateMany({
      where: {
        comanda_id: comandaId,
        vendedora: { not: null },
      },
      data: { vendedora: null },
    });

    if (result.count > 0) {
      await logBitacora({
        comanda_id: comandaId,
        evento: "VENDEDORAS_REINICIADAS",
        usuario_id: profile.id,
        detalle: { filas: result.count },
      });
    }

    await publishEvent("PRODUCCION_ACTUALIZADA", { comanda_id: comandaId });

    revalidatePath("/operaciones");
    revalidatePath("/cocina");
    revalidatePath("/chofer");
    revalidatePath("/aguas");
    revalidatePath("/hieleras");
    revalidatePath("/insumos");
    revalidatePath("/cierre");

    return { success: true, data: { filas: result.count } };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: message };
  }
}

/**
 * Close the comanda for the day.
 */
export async function cerrarComanda(
  comandaId: string
): Promise<ActionResult> {
  try {
    const profile = await requireRole("OPERACIONES", "COCINA");

    // Check all producciones are ENTREGADO or have inasistencia
    const pendientes = await prisma.produccion.findMany({
      where: {
        comanda_id: comandaId,
        estado: { not: "ENTREGADO" },
        inasistencia: false,
      },
      include: { puesto: true },
    });

    if (pendientes.length > 0) {
      const nombres = pendientes.map((p) => p.puesto.nombre).join(", ");
      return {
        success: false,
        error: `Puestos sin entregar ni marcar inasistencia: ${nombres}`,
      };
    }

    await prisma.comanda.update({
      where: { id: comandaId },
      data: {
        estado: "CERRADA",
        closed_at: new Date(),
      },
    });

    await logBitacora({
      comanda_id: comandaId,
      evento: "COMANDA_CERRADA",
      usuario_id: profile.id,
    });

    await publishEvent("COMANDA_CERRADA", { comanda_id: comandaId });
    revalidatePath("/operaciones");
    revalidatePath("/cierre");
    revalidatePath("/reportes");

    return { success: true, data: undefined };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Error desconocido";
    return { success: false, error: message };
  }
}
