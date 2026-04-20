import { prisma } from "@/lib/prisma";
import { parseInsumos } from "@/lib/insumos-config";
import {
  insumosTomateColZanahoriaDesdeTacos,
  parseFraccionA_decimal,
} from "@/lib/fraccion";

/**
 * Alinea tomate / col / zanahoria (y bolsas = tomate) con la suma de tacos del puesto en la comanda.
 * Conserva salsa_roja y cebolla si ya son numéricos; si no, usa los defaults del catálogo de puesto.
 */
export async function syncInsumosTomateColZanahoriaParaPuesto(
  comandaId: string,
  puestoId: number
) {
  const rows = await prisma.produccion.findMany({
    where: { comanda_id: comandaId, puesto_id: puestoId },
    include: {
      puesto: { select: { salsa_roja_default: true, cebolla_default: true } },
    },
  });
  if (rows.length === 0) return;

  const sumTacos = rows.reduce((s, r) => s + r.tacos, 0);
  const derived = insumosTomateColZanahoriaDesdeTacos(sumTacos);

  await prisma.$transaction(
    rows.map((row) => {
      const base = parseInsumos(row.insumos) as Record<string, number>;
      const defSr = parseFraccionA_decimal(row.puesto.salsa_roja_default ?? "1");
      const defCb = parseFraccionA_decimal(row.puesto.cebolla_default ?? "1");
      const salsa_roja =
        typeof base.salsa_roja === "number" && Number.isFinite(base.salsa_roja)
          ? base.salsa_roja
          : defSr;
      const cebolla =
        typeof base.cebolla === "number" && Number.isFinite(base.cebolla)
          ? base.cebolla
          : defCb;
      const next = {
        ...base,
        tomate: derived,
        col: derived,
        zanahoria: derived,
        salsa_roja,
        cebolla,
      };
      return prisma.produccion.update({
        where: { id: row.id },
        data: { insumos: next, bolsas: derived },
      });
    })
  );
}
