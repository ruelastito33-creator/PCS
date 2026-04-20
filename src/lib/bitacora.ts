import { prisma } from "@/lib/prisma";

interface LogParams {
  comanda_id: string;
  evento: string;
  detalle?: Record<string, unknown>;
  usuario_id?: string;
}

/** Write an entry to the bitácora. Fire-and-forget by default. */
export async function logBitacora({
  comanda_id,
  evento,
  detalle,
  usuario_id,
}: LogParams) {
  await prisma.bitacora.create({
    data: {
      comanda_id,
      evento,
      detalle: (detalle ?? {}) as object,
      usuario_id: usuario_id ?? null,
    },
  });
}

/** Log a field change with before/after values. */
export async function logCambio({
  comanda_id,
  usuario_id,
  campo,
  antes,
  despues,
  puesto_id,
}: {
  comanda_id: string;
  usuario_id?: string;
  campo: string;
  antes: unknown;
  despues: unknown;
  puesto_id?: number;
}) {
  await logBitacora({
    comanda_id,
    evento: "CAMPO_ACTUALIZADO",
    usuario_id,
    detalle: {
      campo,
      antes,
      despues,
      puesto_id,
    },
  });
}
