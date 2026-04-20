import {
  parseDecimalInput,
  roundToOneDecimal,
  formatDecimalDisplay,
} from "@/lib/decimal";

function gcd(a: number, b: number): number {
  let x = Math.abs(Math.round(a));
  let y = Math.abs(Math.round(b));
  while (y) {
    const t = y;
    y = x % y;
    x = t;
  }
  return x || 1;
}

/** Redondeo para insumos cargados desde fracción (más fino que bolsas). */
export function roundInsumoFraccion(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

/** Insumos que se capturan y muestran como fracción (1, 1/2, 1 1/2…). */
export const INSUMO_KEYS_FRACCION = ["cebolla", "salsa_roja"] as const;
export type InsumoKeyFraccion = (typeof INSUMO_KEYS_FRACCION)[number];

export function esInsumoFraccion(key: string): key is InsumoKeyFraccion {
  return key === "cebolla" || key === "salsa_roja";
}

/** Atajos de captura (puestos, cocina). Cualquier `a/b` válido también se puede escribir a mano. */
export const FRACCIONES_PRESETS = ["1", "1/2", "1/4", "1/6"] as const;

/**
 * Texto permitido al guardar: número, fracción a/b o entero + espacio + fracción (ej. 1 1/2).
 */
export function textoFraccionBienFormado(raw: string): boolean {
  const t = raw.trim().replace(/\s+/g, " ");
  if (t === "" || t === ".") return false;
  if (/^\d+(?:\.\d+)?\s+[\d.]+\/[\d.]+$/.test(t)) return true;
  const compact = t.replace(/\s/g, "");
  if (compact === "" || compact === ".") return false;
  return /^[\d.]+(\/[\d.]+)?$/.test(compact);
}

/**
 * Muestra un decimal como fracción legible (parte entera + resto en /2…/12).
 */
export function decimalAFraccionDisplay(n: number, maxDen = 12): string {
  if (!Number.isFinite(n) || n < 0) return "0";
  if (n < 1e-9) return "0";
  const int = Math.floor(n + 1e-9);
  const rem = n - int;
  if (rem < 1e-6) return String(int);

  let bestNum = 0;
  let bestDen = 1;
  let bestErr = Infinity;
  for (let den = 1; den <= maxDen; den++) {
    const num = Math.round(rem * den);
    if (num < 0 || num > den) continue;
    const err = Math.abs(rem - num / den);
    if (err < bestErr) {
      bestErr = err;
      bestNum = num;
      bestDen = den;
    }
  }
  if (bestErr > 0.02) {
    return formatDecimalDisplay(roundInsumoFraccion(n));
  }

  const g = gcd(bestNum, bestDen);
  const numr = bestNum / g;
  const denr = bestDen / g;
  if (numr === denr) {
    return String(int + 1);
  }
  const fracStr = `${numr}/${denr}`;
  if (int === 0) return fracStr;
  return `${int} ${fracStr}`;
}

/**
 * Teclado cocina: dígitos, punto, barra, C y ⌫ sobre un string tipo "1/2".
 */
export function appendTecladoFraccion(cur: string, key: string): string {
  const safe = cur || "0";
  if (key === "C") return "0";
  if (key === "⌫") {
    if (safe.length <= 1) return "0";
    return safe.slice(0, -1);
  }
  if (key === "/") {
    if (safe.includes("/")) return safe;
    const base = safe === "0" ? "" : safe;
    if (base === "" || base === ".") return safe;
    return `${base}/`;
  }
  if (key === ".") {
    if (!safe.includes("/")) {
      if (safe.includes(".")) return safe;
      if (safe === "0") return "0.";
      return `${safe}.`;
    }
    const slash = safe.indexOf("/");
    const denPart = safe.slice(slash + 1);
    if (denPart.includes(".")) return safe;
    if (denPart === "") return `${safe}0.`;
    return `${safe}.`;
  }
  if (!/^\d$/.test(key)) return safe;
  if (safe.length >= 12) return safe;
  if (!safe.includes("/")) {
    if (safe === "0") return key;
    return safe + key;
  }
  return safe + key;
}

/**
 * Convierte "1", "1/2", "1/4", "1/6", "1 1/2" (entero + espacio + fracción) a decimal ≥ 0.
 */
export function parseFraccionA_decimal(raw: string): number {
  const t = raw.trim().replace(/\s+/g, " ");
  if (!t) return 0;

  const mixed = /^([\d.]+)\s+([\d.]+)\/([\d.]+)$/.exec(t);
  if (mixed) {
    const whole = parseDecimalInput(mixed[1]!);
    const num = parseDecimalInput(mixed[2]!);
    const den = parseDecimalInput(mixed[3]!);
    if (den === 0) return roundInsumoFraccion(Math.max(0, whole));
    return roundInsumoFraccion(Math.max(0, whole + num / den));
  }

  const compact = t.replace(/\s/g, "");
  if (!compact) return 0;
  if (compact.includes("/")) {
    const parts = compact.split("/").map((s) => s.trim()).filter(Boolean);
    if (parts.length !== 2) return 0;
    const num = parseDecimalInput(parts[0]!);
    const den = parseDecimalInput(parts[1]!);
    if (den === 0) return 0;
    return roundInsumoFraccion(Math.max(0, num / den));
  }
  return roundInsumoFraccion(Math.max(0, parseDecimalInput(compact)));
}

/**
 * Regla de negocio: por cada 50 tacos (bloques enteros), sumar 0.5 a tomate, col y zanahoria (misma cifra).
 * Se aplica sobre la suma de tacos de todas las filas del mismo puesto en la comanda.
 */
export function insumosTomateColZanahoriaDesdeTacos(totalTacos: number): number {
  const t = Math.max(0, Math.floor(Number(totalTacos) || 0));
  return roundToOneDecimal(Math.floor(t / 50) * 0.5);
}

/** Valores iniciales en `Produccion.insumos` al crear fila (tomate/col/zanahoria se recalculan con tacos). */
export function insumosInicialesDesdePuesto(p: {
  salsa_roja_default: string;
  cebolla_default: string;
}) {
  return {
    tomate: 0,
    col: 0,
    zanahoria: 0,
    salsa_roja: parseFraccionA_decimal(p.salsa_roja_default ?? "1"),
    cebolla: parseFraccionA_decimal(p.cebolla_default ?? "1"),
  };
}
