import {
  roundToOneDecimal,
  formatBolsasDisplay,
  formatDecimalDisplay,
} from "@/lib/decimal";
import { decimalAFraccionDisplay } from "@/lib/fraccion";

/**
 * Catálogo de insumos (cocina).
 *
 * Regla de negocio: `Produccion.bolsas` (comanda / operaciones) es la misma cantidad
 * que `insumos.tomate` — bolsas de salsa de tomate. Se sincronizan en `actualizarCampo`.
 *
 * Tomate / col / zanahoria: por la suma de tacos del puesto en la comanda, cada 50 tacos
 * suman 0.5 a las tres columnas (`syncInsumosTomateColZanahoriaParaPuesto` al guardar tacos).
 */
export const INSUMOS_ITEMS = [
  { key: "tomate", label: "Salsa de Tomate", shortLabel: "S.Tom", unidad: "bolsas" },
  { key: "col", label: "Col", shortLabel: "Col", unidad: "pzas" },
  { key: "zanahoria", label: "Zanahoria", shortLabel: "Zana", unidad: "pzas" },
  { key: "cebolla", label: "Cebollas", shortLabel: "Cebo", unidad: "pzas" },
  { key: "salsa_roja", label: "Salsa Roja", shortLabel: "S.Roj", unidad: "bolsas" },
] as const;

export type InsumoKey = (typeof INSUMOS_ITEMS)[number]["key"];

export type InsumosData = Partial<Record<InsumoKey, number>>;

/** Texto en UI y al abrir edición (tomate = bolsas; cebolla/salsa = fracción). */
export function formatInsumoValorDisplay(key: InsumoKey, n: number): string {
  if (key === "tomate") return formatBolsasDisplay(n);
  if (key === "cebolla" || key === "salsa_roja") return decimalAFraccionDisplay(n);
  return formatDecimalDisplay(n);
}

/**
 * Colores de UI alineados con la vista POS de cocina / modal de campos.
 * `th`: encabezado de columna; `tdPositive`: celda cuando el valor &gt; 0.
 */
export const INSUMO_UI_COLORS: Record<
  InsumoKey,
  { th: string; tdPositive: string }
> = {
  tomate: {
    th: "text-red-500 dark:text-red-400",
    tdPositive: "text-red-600 dark:text-red-400 font-semibold",
  },
  col: {
    th: "text-emerald-500 dark:text-emerald-400",
    tdPositive: "text-emerald-600 dark:text-emerald-400 font-semibold",
  },
  zanahoria: {
    th: "text-amber-500 dark:text-amber-400",
    tdPositive: "text-amber-600 dark:text-amber-400 font-semibold",
  },
  cebolla: {
    th: "text-violet-500 dark:text-violet-400",
    tdPositive: "text-violet-600 dark:text-violet-400 font-semibold",
  },
  salsa_roja: {
    th: "text-rose-500 dark:text-rose-400",
    tdPositive: "text-rose-600 dark:text-rose-400 font-semibold",
  },
};

/** Columna Bolsas en comanda (= salsa de tomate / `insumos.tomate`). */
export const BOLSAS_UI_COLORS = INSUMO_UI_COLORS.tomate;

/** Columna Aguas (misma lógica que campo aguas en cocina). */
export const AGUAS_UI_COLORS = {
  th: "text-sky-500 dark:text-sky-400",
  tdPositive: "text-sky-600 dark:text-sky-400 font-semibold",
} as const;

/** Parse the JSON `insumos` field from DB into typed data */
export function parseInsumos(raw: unknown): InsumosData {
  if (!raw || typeof raw !== "object") return {};
  return raw as InsumosData;
}

/**
 * Datos de insumos para la UI: si `tomate` no está en JSON (o no es un número finito),
 * se usa `bolsas` — evita filas donde solo se actualizó la comanda y cocina seguía en 0.
 */
export function insumosDataWithTomateFromBolsas(p: {
  insumos: unknown;
  bolsas: number;
}): InsumosData {
  const base = parseInsumos(p.insumos) as Record<string, number>;
  const bolsasVal = roundToOneDecimal(Math.max(0, Number(p.bolsas) || 0));
  const hasTomate =
    Object.prototype.hasOwnProperty.call(base, "tomate") &&
    typeof base.tomate === "number" &&
    Number.isFinite(base.tomate);
  const tomate = hasTomate ? roundToOneDecimal(Math.max(0, base.tomate)) : bolsasVal;
  return { ...base, tomate };
}

/** Format insumos for display (e.g. "2 tomate, 1 col") */
export function formatInsumos(data: InsumosData): string {
  const parts: string[] = [];
  for (const item of INSUMOS_ITEMS) {
    const val = data[item.key];
    if (val && val > 0) {
      parts.push(
        `${formatInsumoValorDisplay(item.key, val)} ${item.label.toLowerCase()}`,
      );
    }
  }
  return parts.length > 0 ? parts.join(", ") : "Sin asignar";
}
