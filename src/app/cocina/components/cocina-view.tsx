"use client";

import { useState, useTransition, useCallback } from "react";
import { useRouter } from "next/navigation";
import { useViewMode } from "@/hooks/use-view-mode";
import { ViewToggle } from "@/components/shared/view-toggle";
import { CocinaTable } from "./cocina-table";
import { StatusBadge } from "@/app/operaciones/components/status-badge";
import { actualizarCampo } from "@/lib/actions/produccion";
import { useDialogs } from "@/components/shared/dialog-provider";
import {
  INSUMOS_ITEMS,
  insumosDataWithTomateFromBolsas,
  formatInsumoValorDisplay,
} from "@/lib/insumos-config";
import {
  appendTecladoFraccion,
  decimalAFraccionDisplay,
  esInsumoFraccion,
  FRACCIONES_PRESETS,
  parseFraccionA_decimal,
  textoFraccionBienFormado,
} from "@/lib/fraccion";
import type { Produccion, Puesto, ComandaEstado, ProveedoraTacos } from "@prisma/client";
import { etiquetaPuestoProduccion } from "@/lib/puesto-fuera";

type Row = Produccion & { puesto: Puesto; proveedora_tacos: ProveedoraTacos | null };

// ─── Field definitions ──────────────────────────────────────────────────────

interface FieldDef {
  key: string;
  label: string;
  color: string;        // text color when active
  bgActive: string;     // bg when selected
  bgDot: string;        // dot color for filled
}

const FIELDS: FieldDef[] = [
  { key: "tortillas", label: "Tortillas", color: "text-orange-400", bgActive: "bg-orange-500/20 ring-orange-500/40", bgDot: "bg-orange-500" },
  { key: "tomate", label: "S.Tomate", color: "text-red-400", bgActive: "bg-red-500/20 ring-red-500/40", bgDot: "bg-red-500" },
  { key: "col", label: "Col", color: "text-emerald-400", bgActive: "bg-emerald-500/20 ring-emerald-500/40", bgDot: "bg-emerald-500" },
  { key: "zanahoria", label: "Zanah", color: "text-amber-400", bgActive: "bg-amber-500/20 ring-amber-500/40", bgDot: "bg-amber-500" },
  { key: "cebolla", label: "Cebolla", color: "text-violet-400", bgActive: "bg-violet-500/20 ring-violet-500/40", bgDot: "bg-violet-500" },
  { key: "salsa_roja", label: "S.Roja", color: "text-rose-400", bgActive: "bg-rose-500/20 ring-rose-500/40", bgDot: "bg-rose-500" },
  { key: "aguas", label: "Aguas", color: "text-sky-400", bgActive: "bg-sky-500/20 ring-sky-500/40", bgDot: "bg-sky-500" },
];

function buildCocinaFormValues(row: Row): Record<string, string> {
  const merged = insumosDataWithTomateFromBolsas({
    insumos: row.insumos,
    bolsas: row.bolsas,
  });
  const v: Record<string, string> = {};
  for (const f of FIELDS) {
    const num =
      f.key === "tortillas"
        ? row.tortillas
        : f.key === "aguas"
          ? row.aguas
          : ((merged as Record<string, number>)[f.key] ?? 0);
    if (f.key === "tortillas" || f.key === "aguas") {
      v[f.key] = num > 0 ? String(num) : "0";
    } else if (esInsumoFraccion(f.key)) {
      v[f.key] = num > 0 ? decimalAFraccionDisplay(num) : "0";
    } else {
      v[f.key] = num > 0 ? String(num) : "0";
    }
  }
  return v;
}

// ─── Summary card (grid) ────────────────────────────────────────────────────

function CocinaCard({
  p,
  isClosed,
  onOpen,
}: {
  p: Row;
  isClosed: boolean;
  onOpen: (p: Row) => void;
}) {
  const canEdit = !isClosed && !p.inasistencia;
  const data = insumosDataWithTomateFromBolsas({
    insumos: p.insumos,
    bolsas: p.bolsas,
  });
  const filledCount = FIELDS.filter((f) => {
    const val =
      f.key === "tortillas"
        ? p.tortillas
        : f.key === "aguas"
          ? p.aguas
          : ((data as Record<string, number>)[f.key] ?? 0);
    return val > 0;
  }).length;

  const tortillasField = FIELDS.find((f) => f.key === "tortillas");
  const aguasField = FIELDS.find((f) => f.key === "aguas");
  const tortillaColor =
    p.tortillas > 0 ? (tortillasField?.color ?? "text-orange-400") : "text-text-ghost";
  const aguasColor = p.aguas > 0 ? (aguasField?.color ?? "text-sky-400") : "text-text-ghost";

  const cardAccent =
    filledCount === FIELDS.length
      ? "border-emerald-200 dark:border-emerald-500/30 shadow-sm"
      : p.tacos > 0 || p.tortillas > 0
        ? "border-orange-200 dark:border-orange-500/30 shadow-sm"
        : "border-border";

  return (
    <div
      className={`group flex flex-col rounded-2xl border bg-surface p-4 transition-all duration-150 ${cardAccent} ${
        p.inasistencia ? "opacity-35" : ""
      } ${
        canEdit
          ? "cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] active:shadow-sm"
          : ""
      }`}
      onClick={() => canEdit && onOpen(p)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-1.5 mb-2">
        <span className="text-sm font-bold text-text-primary leading-tight break-words">
          {etiquetaPuestoProduccion(p)}
          {p.numero_pedido > 1 && (
            <span className="ml-1.5 text-xs font-semibold text-orange-500">#{p.numero_pedido}</span>
          )}
        </span>
        <div
          className="flex-shrink-0"
          onClick={(e) => e.stopPropagation()}
          role="presentation"
        >
          <StatusBadge
            produccionId={p.id}
            estado={p.estado}
            disabled={isClosed || p.inasistencia}
          />
        </div>
      </div>

      {/* Proveedora de tacos */}
      <div className="mt-2 text-[11px] leading-snug">
        <span className="font-bold uppercase tracking-wide text-fuchsia-600 dark:text-fuchsia-400">
          Prov. tacos
        </span>
        <span
          className={`ml-1.5 font-semibold ${
            p.proveedora_tacos ? "text-fuchsia-700 dark:text-fuchsia-300" : "text-text-ghost"
          }`}
        >
          {p.proveedora_tacos?.nombre ?? "—"}
        </span>
      </div>

      {/* Tacos — mismo peso visual que tenía el bloque de tortillas */}
      <div className="flex items-end justify-between gap-2 border-t border-border-light pt-3">
        <div className="min-w-0">
          <span className="text-[10px] uppercase tracking-wider text-text-faint font-semibold">Tacos</span>
          <span
            className={`block text-3xl font-black tabular-nums leading-none mt-0.5 ${
              p.tacos > 0 ? "text-orange-500" : "text-text-ghost"
            }`}
          >
            {p.tacos.toLocaleString("es-MX")}
          </span>
        </div>
        <div className="flex shrink-0 gap-1 self-end pb-1">
          {FIELDS.map((f) => {
            const val =
              f.key === "tortillas"
                ? p.tortillas
                : f.key === "aguas"
                  ? p.aguas
                  : ((data as Record<string, number>)[f.key] ?? 0);
            return (
              <div
                key={f.key}
                className={`h-2 w-2 rounded-full ${val > 0 ? f.bgDot : "bg-surface-muted"}`}
                title={f.label}
              />
            );
          })}
        </div>
      </div>

      {/* Insumos — destacados, colores alineados con FIELDS / modal */}
      <div className="mt-3 flex flex-wrap gap-x-4 gap-y-3 border-t border-border-light pt-3">
        {INSUMOS_ITEMS.map((item) => {
          const val = (data as Record<string, number>)[item.key] ?? 0;
          const display = formatInsumoValorDisplay(item.key, Number(val));
          const fd = FIELDS.find((f) => f.key === item.key);
          const active = val > 0;
          const color = active ? (fd?.color ?? "text-text-secondary") : "text-text-ghost";
          return (
            <div key={item.key} className={`flex min-w-[3.25rem] flex-col ${color}`}>
              <span className="text-[9px] font-bold uppercase tracking-wide opacity-90">{item.shortLabel}</span>
              <span className="text-2xl font-black tabular-nums leading-none mt-0.5">{display}</span>
            </div>
          );
        })}
      </div>

      {/* Tortillas y aguas — compactas, mismos colores que en el flujo de campos */}
      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-border-light pt-2 text-[11px] tabular-nums">
        <span className={p.tortillas > 0 ? `${tortillaColor} font-semibold` : tortillaColor}>
          Tort: {p.tortillas}
        </span>
        <span className={p.aguas > 0 ? `${aguasColor} font-semibold` : aguasColor}>
          {aguasField?.label ?? "Aguas"}: {p.aguas}
        </span>
      </div>
    </div>
  );
}

// ─── Full-puesto modal with inline numpad ───────────────────────────────────

function CocinaSheet({
  row,
  onClose,
  proveedorasOpciones,
}: {
  row: Row;
  onClose: () => void;
  proveedorasOpciones: ProveedoraTacos[];
}) {
  const router = useRouter();
  const { alert: showAlert } = useDialogs();
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPending, startTransition] = useTransition();

  const [proveedoraId, setProveedoraId] = useState<number | null>(
    row.proveedora_tacos_id ?? null
  );

  const [values, setValues] = useState<Record<string, string>>(() =>
    buildCocinaFormValues(row)
  );

  const activeField = FIELDS[activeIdx];
  const activeValue = values[activeField.key];

  function handleKey(key: string) {
    const fieldKey = activeField.key;
    const integerField = fieldKey === "tortillas" || fieldKey === "aguas";

    if (esInsumoFraccion(fieldKey)) {
      setValues((prev) => {
        const cur = prev[fieldKey];
        const next = appendTecladoFraccion(cur, key);
        return { ...prev, [fieldKey]: next };
      });
      return;
    }

    setValues((prev) => {
      const cur = prev[fieldKey];
      let next: string;
      if (key === "C") {
        next = "0";
      } else if (key === "⌫") {
        next = cur.length <= 1 ? "0" : cur.slice(0, -1);
      } else if (key === ".") {
        if (integerField) return prev;
        if (cur.includes(".")) return prev;
        next = cur + ".";
      } else {
        next = cur === "0" ? key : cur + key;
        if (next.length > 7) return prev;
      }
      return { ...prev, [fieldKey]: next };
    });
  }

  function handleNext() {
    if (activeIdx < FIELDS.length - 1) {
      setActiveIdx(activeIdx + 1);
    }
  }

  const handleSave = useCallback(() => {
    startTransition(async () => {
      const res0 = await actualizarCampo(row.id, "proveedora_tacos_id", proveedoraId);
      if (!res0.success) {
        await showAlert({
          title: "No se pudo guardar",
          message: res0.error,
          variant: "error",
        });
        return;
      }

      // Save tortillas
      const tortillasVal = parseFloat(values.tortillas) || 0;
      const res1 = await actualizarCampo(row.id, "tortillas", tortillasVal);
      if (!res1.success) {
        await showAlert({
          title: "No se pudo guardar",
          message: res1.error,
          variant: "error",
        });
        return;
      }

      // Save insumos as object
      const insumosObj: Record<string, number> = {};
      for (const item of INSUMOS_ITEMS) {
        const raw = values[item.key] ?? "0";
        if (esInsumoFraccion(item.key)) {
          if (!textoFraccionBienFormado(raw)) {
            await showAlert({
              title: "Cantidad inválida",
              message: `En ${item.label} usa números o fracción (ej. 1, 1/2, 1/6).`,
              variant: "error",
            });
            return;
          }
          insumosObj[item.key] = parseFraccionA_decimal(raw);
        } else {
          insumosObj[item.key] = parseFloat(raw) || 0;
        }
      }
      const res2 = await actualizarCampo(row.id, "insumos", insumosObj);
      if (!res2.success) {
        await showAlert({
          title: "No se pudo guardar",
          message: res2.error,
          variant: "error",
        });
        return;
      }

      const aguasVal = parseInt(values.aguas ?? "0", 10) || 0;
      const res3 = await actualizarCampo(row.id, "aguas", aguasVal);
      if (!res3.success) {
        await showAlert({
          title: "No se pudo guardar",
          message: res3.error,
          variant: "error",
        });
        return;
      }

      router.refresh();
      onClose();
    });
  }, [values, proveedoraId, row.id, onClose, showAlert, router]);

  const isLast = activeIdx === FIELDS.length - 1;

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        <div
          className="w-full max-w-sm rounded-3xl bg-zinc-900 shadow-2xl overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="flex items-center justify-between px-5 pt-5 pb-2">
            <div>
              <h3 className="text-lg font-black text-white">
                {etiquetaPuestoProduccion(row)}
                {row.numero_pedido > 1 && (
                  <span className="ml-2 text-sm font-bold text-orange-400">#{row.numero_pedido}</span>
                )}
              </h3>
              <span className="text-xs text-zinc-500">{row.tacos} tacos</span>
            </div>
            <button
              onClick={onClose}
              className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
            >
              <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M1 1l12 12M13 1L1 13" />
              </svg>
            </button>
          </div>

          {/* Proveedora de tacos */}
          <div className="px-5 pb-3">
            <label className="mb-1 block text-[10px] font-bold uppercase tracking-wide text-fuchsia-400">
              Proveedora de tacos
            </label>
            <select
              value={proveedoraId != null ? String(proveedoraId) : ""}
              onChange={(e) =>
                setProveedoraId(
                  e.target.value === "" ? null : parseInt(e.target.value, 10)
                )
              }
              className="w-full rounded-xl border border-zinc-600 bg-zinc-800 px-3 py-2.5 text-sm font-medium text-white focus:border-fuchsia-500 focus:outline-none focus:ring-1 focus:ring-fuchsia-500"
            >
              <option value="">— Sin asignar —</option>
              {proveedorasOpciones.map((o) => (
                <option key={o.id} value={String(o.id)}>
                  {o.nombre}
                  {!o.is_active ? " (inactiva)" : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Field tabs */}
          <div className="flex gap-1.5 px-5 py-3 overflow-x-auto">
            {FIELDS.map((f, i) => {
              const val = values[f.key];
              const numVal = esInsumoFraccion(f.key)
                ? parseFraccionA_decimal(val)
                : parseInt(val, 10) || 0;
              const isActive = i === activeIdx;

              return (
                <button
                  key={f.key}
                  onClick={() => setActiveIdx(i)}
                  className={`flex flex-col items-center rounded-xl px-2 py-2 min-w-[50px] transition-all ${
                    isActive
                      ? `${f.bgActive} ring-1`
                      : "bg-zinc-800/50 hover:bg-zinc-800"
                  }`}
                >
                  <span className={`text-[9px] font-bold uppercase tracking-wide ${
                    isActive ? f.color : "text-zinc-500"
                  }`}>
                    {f.label}
                  </span>
                  <span className={`text-lg font-black tabular-nums ${
                    isActive ? "text-white" : numVal > 0 ? "text-zinc-300" : "text-zinc-600"
                  }`}>
                    {val}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active field display */}
          <div className="px-5 pb-2">
            <div className="flex items-center justify-between rounded-2xl bg-black/40 px-5 py-4">
              <span className={`text-sm font-bold ${activeField.color}`}>{activeField.label}</span>
              <span className="text-5xl font-black tabular-nums tracking-tight text-white">
                {activeValue}
              </span>
            </div>
          </div>

          {esInsumoFraccion(activeField.key) && (
            <div className="flex flex-wrap justify-center gap-2 px-5 pb-2">
              {FRACCIONES_PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() =>
                    setValues((prev) => ({ ...prev, [activeField.key]: p }))
                  }
                  className="min-w-[2.75rem] rounded-xl border border-zinc-600 bg-zinc-800 px-2 py-1.5 text-sm font-black text-white hover:bg-zinc-700 active:scale-95"
                >
                  {p}
                </button>
              ))}
            </div>
          )}

          {/* Numpad */}
          <div className="px-5 py-3">
            <div className="grid grid-cols-3 gap-2">
              {(["1","2","3","4","5","6","7","8","9"] as const).map((key) => (
                <button
                  key={key}
                  onClick={() => handleKey(key)}
                  className="flex h-13 items-center justify-center rounded-2xl text-xl font-bold bg-zinc-800 text-white active:bg-zinc-700 transition-all duration-100 active:scale-[0.92] select-none"
                >
                  {key}
                </button>
              ))}
            </div>
            <div
              className={`grid gap-2 mt-2 ${
                esInsumoFraccion(activeField.key) ? "grid-cols-5" : "grid-cols-4"
              }`}
            >
              <button
                type="button"
                onClick={() => handleKey("C")}
                className="flex h-13 items-center justify-center rounded-2xl text-xl font-bold bg-orange-500/20 text-orange-400 active:bg-orange-500/30 transition-all duration-100 active:scale-[0.92] select-none"
              >
                C
              </button>
              <button
                type="button"
                onClick={() => handleKey("0")}
                className="flex h-13 items-center justify-center rounded-2xl text-xl font-bold bg-zinc-800 text-white active:bg-zinc-700 transition-all duration-100 active:scale-[0.92] select-none"
              >
                0
              </button>
              <button
                type="button"
                onClick={() => handleKey(".")}
                className="flex h-13 items-center justify-center rounded-2xl text-2xl font-black bg-zinc-800 text-white active:bg-zinc-700 transition-all duration-100 active:scale-[0.92] select-none"
              >
                .
              </button>
              {esInsumoFraccion(activeField.key) && (
                <button
                  type="button"
                  onClick={() => handleKey("/")}
                  className="flex h-13 items-center justify-center rounded-2xl text-2xl font-black bg-zinc-800 text-white active:bg-zinc-700 transition-all duration-100 active:scale-[0.92] select-none"
                  title="Fracción"
                >
                  /
                </button>
              )}
              <button
                type="button"
                onClick={() => handleKey("⌫")}
                className="flex h-13 items-center justify-center rounded-2xl bg-red-500/20 text-red-400 active:bg-red-500/30 transition-all duration-100 active:scale-[0.92] select-none"
              >
                <svg width="22" height="18" viewBox="0 0 22 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M7 1H21V17H7L1 9L7 1Z" />
                  <path d="M11 6L17 12" />
                  <path d="M17 6L11 12" />
                </svg>
              </button>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex gap-2 px-5 pb-5">
            {!isLast ? (
              <>
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="flex-1 rounded-2xl bg-zinc-800 py-3.5 text-base font-bold text-zinc-400 transition-all hover:bg-zinc-700 active:scale-[0.98] disabled:opacity-50"
                >
                  Guardar
                </button>
                <button
                  onClick={handleNext}
                  className="flex-[2] rounded-2xl bg-orange-500 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 active:scale-[0.98]"
                >
                  Siguiente →
                </button>
              </>
            ) : (
              <button
                onClick={handleSave}
                disabled={isPending}
                className="w-full rounded-2xl bg-orange-500 py-4 text-lg font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none"
              >
                {isPending ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="h-5 w-5 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Guardando...
                  </span>
                ) : (
                  "Guardar todo"
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  );
}

// ─── Grid + Sheet orchestration ─────────────────────────────────────────────

function CocinaCards({
  producciones,
  isClosed,
  proveedorasOpciones,
}: {
  producciones: Row[];
  isClosed: boolean;
  proveedorasOpciones: ProveedoraTacos[];
}) {
  const [activeRow, setActiveRow] = useState<Row | null>(null);

  // Keep activeRow data fresh when producciones update via SSE
  const freshRow = activeRow
    ? producciones.find((p) => p.id === activeRow.id) ?? null
    : null;

  return (
    <>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {producciones.map((p) => (
          <CocinaCard key={p.id} p={p} isClosed={isClosed} onOpen={setActiveRow} />
        ))}
      </div>

      {freshRow && (
        <CocinaSheet
          key={`${freshRow.id}:${String(freshRow.updated_at)}:${freshRow.tortillas}:${freshRow.aguas}:${freshRow.bolsas}:${freshRow.proveedora_tacos_id ?? ""}:${JSON.stringify(freshRow.insumos ?? {})}`}
          row={freshRow}
          onClose={() => setActiveRow(null)}
          proveedorasOpciones={proveedorasOpciones}
        />
      )}
    </>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────

export function CocinaView({
  producciones,
  comandaEstado,
  proveedorasOpciones,
}: {
  producciones: Row[];
  comandaEstado: ComandaEstado;
  proveedorasOpciones: ProveedoraTacos[];
}) {
  const { mode, setMode, hydrated } = useViewMode("cocina");
  const isClosed = comandaEstado === "CERRADA";

  if (!hydrated) return null;

  return (
    <div className="space-y-4">
      <ViewToggle mode={mode} setMode={setMode} />
      {mode === "tabla" ? (
        <CocinaTable
          producciones={producciones}
          comandaEstado={comandaEstado}
          proveedorasOpciones={proveedorasOpciones}
        />
      ) : (
        <CocinaCards
          producciones={producciones}
          isClosed={isClosed}
          proveedorasOpciones={proveedorasOpciones}
        />
      )}
    </div>
  );
}
