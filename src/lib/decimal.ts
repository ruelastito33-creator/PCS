/**
 * Parse numeric input allowing `.` or `,` as decimal separator.
 * Invalid or empty input becomes 0.
 */
export function parseDecimalInput(raw: string): number {
  const t = raw.trim().replace(",", ".");
  if (t === "" || t === "." || t === "-" || t === "-.") return 0;
  const n = parseFloat(t);
  return Number.isFinite(n) ? n : 0;
}

/** True if two decimals are equal within float tolerance. */
export function decimalsEqual(a: number, b: number): boolean {
  return Math.abs(a - b) < 1e-9;
}

/** Short display for integers vs decimals. */
export function formatDecimalDisplay(n: number): string {
  if (!Number.isFinite(n)) return "0";
  if (Number.isInteger(n)) return String(n);
  return String(n);
}

/** Redondea a máximo un decimal (p. ej. bolsas en comanda). */
export function roundToOneDecimal(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 10) / 10;
}

/** Parse + ≥0 + un solo decimal. */
export function parseBolsasInput(raw: string): number {
  return roundToOneDecimal(Math.max(0, parseDecimalInput(raw)));
}

/**
 * Formato para `Produccion.bolsas` (= bolsas de salsa de tomate, `insumos.tomate`).
 * Entero sin ".0"; con fracción, un dígito (ej. 2, 2.5).
 */
export function formatBolsasDisplay(n: number): string {
  const r = roundToOneDecimal(Number(n));
  if (!Number.isFinite(r)) return "0";
  if (Number.isInteger(r)) return String(r);
  return r.toFixed(1);
}
