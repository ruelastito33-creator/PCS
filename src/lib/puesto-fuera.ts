/** Nombre fijo del puesto técnico en BD (debe coincidir con la migración SQL). */
export const PUESTO_FUERA_NOMBRE = "— Pedido fuera de puesto —";

export function esPuestoFueraCatalogo(puesto: { es_fuera_puesto: boolean }) {
  return puesto.es_fuera_puesto === true;
}

/** Primera columna en vistas Aguas / Chofer / etc.: catálogo o nombre libre del solicitante. */
export function etiquetaPuestoProduccion(p: {
  puesto: { nombre: string; es_fuera_puesto: boolean };
  solicitante: string | null;
}): string {
  if (p.puesto.es_fuera_puesto) {
    const s = p.solicitante?.trim();
    return s && s.length > 0 ? s : "Sin nombre";
  }
  return p.puesto.nombre;
}
