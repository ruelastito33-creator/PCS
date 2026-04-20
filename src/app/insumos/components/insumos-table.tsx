"use client";

import {
  INSUMOS_ITEMS,
  insumosDataWithTomateFromBolsas,
  formatInsumoValorDisplay,
} from "@/lib/insumos-config";
import { etiquetaPuestoProduccion } from "@/lib/puesto-fuera";
import type { Produccion, Puesto, ComandaEstado } from "@prisma/client";

type ProduccionConPuesto = Produccion & { puesto: Puesto };

interface InsumosTableProps {
  producciones: ProduccionConPuesto[];
  comandaEstado: ComandaEstado;
}

const INSUMO_COLORS: Record<string, { text: string }> = {
  tomate: { text: "text-red-600 dark:text-red-400" },
  col: { text: "text-emerald-600 dark:text-emerald-400" },
  zanahoria: { text: "text-orange-600 dark:text-orange-400" },
  cebolla: { text: "text-violet-600 dark:text-violet-400" },
  salsa_roja: { text: "text-rose-600 dark:text-rose-400" },
};

export function InsumosTable({ producciones }: InsumosTableProps) {
  const totals: Record<string, number> = {};
  for (const item of INSUMOS_ITEMS) {
    totals[item.key] = producciones.reduce((sum, p) => {
      const data = insumosDataWithTomateFromBolsas({
        insumos: p.insumos,
        bolsas: p.bolsas,
      });
      return sum + ((data as Record<string, number>)[item.key] ?? 0);
    }, 0);
  }

  return (
    <div className="overflow-x-auto rounded-xl border-2 border-border bg-surface">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-surface-alt">
          <tr>
            <th className="sticky left-0 z-10 bg-surface-alt px-5 py-4 text-left text-2xl font-black uppercase tracking-wide text-text-muted">
              Puesto
            </th>
            {INSUMOS_ITEMS.map((item) => (
              <th key={item.key} className="px-5 py-4 text-center text-2xl font-black uppercase tracking-wide text-text-muted min-w-[120px]">
                {item.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light">
          {producciones.map((p) => {
            const data = insumosDataWithTomateFromBolsas({
              insumos: p.insumos,
              bolsas: p.bolsas,
            });
            return (
              <tr key={p.id} className={`hover:bg-hover-surface ${p.inasistencia ? "opacity-35" : ""}`}>
                <td className="sticky left-0 z-10 bg-surface px-5 py-4 text-3xl font-bold text-text-primary">
                  <span className="break-words">{etiquetaPuestoProduccion(p)}</span>
                  {p.numero_pedido > 1 && (
                    <span className="ml-2 text-2xl font-semibold text-orange-500">#{p.numero_pedido}</span>
                  )}
                </td>
                {INSUMOS_ITEMS.map((item) => {
                  const val = (data as Record<string, number>)[item.key] ?? 0;
                  const colors = INSUMO_COLORS[item.key] ?? { text: "text-text-secondary" };
                  return (
                    <td key={item.key} className="px-5 py-4 text-center">
                      <span className={`text-[4rem] leading-none font-black tabular-nums ${
                        val > 0 ? colors.text : "text-text-ghost"
                      }`}>
                        {formatInsumoValorDisplay(item.key, val)}
                      </span>
                    </td>
                  );
                })}
              </tr>
            );
          })}
        </tbody>
        <tfoot className="border-t-2 border-border-strong bg-surface-alt">
          <tr className="font-semibold text-text-primary">
            <td className="sticky left-0 z-10 bg-surface-alt px-5 py-4 text-3xl font-black">TOTALES</td>
            {INSUMOS_ITEMS.map((item) => (
              <td key={item.key} className="px-5 py-4 text-center text-[4rem] leading-none font-black">
                {formatInsumoValorDisplay(item.key, totals[item.key])}
              </td>
            ))}
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
