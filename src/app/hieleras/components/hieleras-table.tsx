"use client";

import type { Produccion, Puesto } from "@prisma/client";
import { etiquetaPuestoProduccion } from "@/lib/puesto-fuera";

type ProduccionConPuesto = Produccion & { puesto: Puesto };

interface HielerasTableProps {
  producciones: ProduccionConPuesto[];
}

/** Solo lectura: los totales se capturan en Comanda / Operaciones. */
export function HielerasTable({ producciones }: HielerasTableProps) {
  const BASE = 1;

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-surface">
      <table className="min-w-full divide-y divide-border">
        <thead className="bg-surface-alt">
          <tr>
            <th className="px-4 py-3 text-left text-xs font-semibold uppercase text-text-secondary">
              Puesto
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-text-secondary">
              Base
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-text-secondary">
              Extras
            </th>
            <th className="px-4 py-3 text-center text-xs font-semibold uppercase text-text-secondary">
              Total
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light">
          {producciones.map((p) => {
            const extras = Math.max(0, p.hieleras - BASE);
            return (
              <tr key={p.id} className="hover:bg-hover-surface">
                <td className="px-4 py-3 text-sm font-bold text-text-primary">
                  <span className="break-words">{etiquetaPuestoProduccion(p)}</span>
                  {p.numero_pedido > 1 && (
                    <span className="ml-1.5 text-xs font-semibold text-orange-500">#{p.numero_pedido}</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-sm text-text-muted">
                  {BASE}
                </td>
                <td className="px-4 py-3 text-center">
                  {extras > 0 ? (
                    <span className="inline-flex rounded-full bg-orange-100 dark:bg-orange-500/20 px-2.5 py-0.5 text-sm font-semibold text-orange-700 dark:text-orange-400">
                      +{extras}
                    </span>
                  ) : (
                    <span className="text-sm text-text-ghost">0</span>
                  )}
                </td>
                <td className="px-4 py-3 text-center text-lg font-bold text-cyan-700 dark:text-cyan-400">
                  {p.hieleras}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
