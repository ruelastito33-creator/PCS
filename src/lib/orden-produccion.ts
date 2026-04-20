import type { Produccion, Puesto } from "@prisma/client";

export type ProduccionConPuesto = Produccion & { puesto: Puesto };

/** Bases por orden de puesto; luego pedidos fuera de puesto por número. */
export function sortProduccionesComanda(rows: ProduccionConPuesto[]) {
  rows.sort((a, b) => {
    const aBase = a.numero_pedido === 1 && !a.puesto.es_fuera_puesto;
    const bBase = b.numero_pedido === 1 && !b.puesto.es_fuera_puesto;
    if (aBase && bBase) return a.puesto.orden - b.puesto.orden;
    if (aBase !== bBase) return aBase ? -1 : 1;
    return a.numero_pedido - b.numero_pedido;
  });
}
