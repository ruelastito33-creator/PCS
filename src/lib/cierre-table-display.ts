import { AGUAS_UI_COLORS, INSUMO_UI_COLORS } from "@/lib/insumos-config";

/** Encabezados de tabla Cierre / Reportes (misma semántica de columnas). */
export const CIERRE_TABLE_TH = {
  puesto: "text-slate-600 dark:text-slate-400",
  proveedora: "text-fuchsia-600 dark:text-fuchsia-400",
  tomate: INSUMO_UI_COLORS.tomate.th,
  tortillas: "text-orange-600 dark:text-orange-400",
  tacos: "text-emerald-600 dark:text-emerald-400",
  sobrantes: "text-orange-600 dark:text-orange-400",
  vendedora: "text-sky-600 dark:text-sky-400",
  aguas: AGUAS_UI_COLORS.th,
  inasistencia: "text-red-600 dark:text-red-400",
  notas: "text-violet-600 dark:text-violet-400",
} as const;

export const TORTILLAS_TD_CLASS =
  "text-orange-600 dark:text-orange-400 font-semibold tabular-nums";
