import type {
  Comanda,
  Produccion,
  Puesto,
  Profile,
  Bitacora,
  Role,
  ComandaEstado,
  ProduccionEstado,
} from "@prisma/client";

// Re-export Prisma types for convenience
export type {
  Comanda,
  Produccion,
  Puesto,
  Profile,
  Bitacora,
  Role,
  ComandaEstado,
  ProduccionEstado,
};

/** Produccion row with puesto name joined */
export type ProduccionConPuesto = Produccion & {
  puesto: Puesto;
};

/** Comanda with all produccion rows + puestos */
export type ComandaCompleta = Comanda & {
  producciones: ProduccionConPuesto[];
};

/** Server action result */
export type ActionResult<T = void> =
  | { success: true; data: T }
  | { success: false; error: string };
