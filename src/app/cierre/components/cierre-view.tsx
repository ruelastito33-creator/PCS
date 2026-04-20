"use client";

import { useState, useTransition, useCallback } from "react";
import { useViewMode } from "@/hooks/use-view-mode";
import { ViewToggle } from "@/components/shared/view-toggle";
import { CierreTable } from "./cierre-table";
import { actualizarCampo } from "@/lib/actions/produccion";
import { useDialogs } from "@/components/shared/dialog-provider";
import type { Produccion, Puesto, ComandaEstado, ProveedoraTacos } from "@prisma/client";
import { etiquetaPuestoProduccion } from "@/lib/puesto-fuera";

type Row = Produccion & { puesto: Puesto; proveedora_tacos: ProveedoraTacos | null };

// ─── Keys ────────────────────────────────────────────────────────────────────
const ESTADO_BADGE: Record<string, string> = {
  PENDIENTE: "bg-surface-muted text-text-muted",
  EN_PROCESO: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  LISTO: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  ENTREGADO: "bg-sky-100 text-sky-700 dark:bg-sky-500/20 dark:text-sky-400",
};
const ESTADO_LABEL: Record<string, string> = {
  PENDIENTE: "PENDIENTE",
  EN_PROCESO: "EN PROCESO",
  LISTO: "LISTO",
  ENTREGADO: "ENTREGADO",
};

// ─── Card ────────────────────────────────────────────────────────────────────

function CierreCard({
  p,
  isClosed,
  onOpen,
}: {
  p: Row;
  isClosed: boolean;
  onOpen: (p: Row) => void;
}) {
  const canEdit = !isClosed;
  const sobrantes = p.tacos_sobrantes ?? 0;

  return (
    <div
      className={`group flex flex-col rounded-2xl border bg-surface p-4 transition-all duration-150 ${
        p.inasistencia
          ? "border-red-200 dark:border-red-500/30 bg-red-50/30 dark:bg-red-500/5"
          : sobrantes > 0
            ? "border-orange-200 dark:border-orange-500/30 shadow-sm"
            : p.estado === "ENTREGADO"
              ? "border-emerald-200 dark:border-emerald-500/30 shadow-sm"
              : "border-border"
      } ${canEdit ? "cursor-pointer hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] active:shadow-sm" : ""}`}
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
        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${ESTADO_BADGE[p.estado]}`}>
          {ESTADO_LABEL[p.estado]}
        </span>
      </div>

      {/* Context */}
      <div className="text-xs text-text-faint mb-3">{p.tacos} tacos</div>

      {/* Sobrantes hero */}
      <div className="flex items-end justify-between mb-2">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-text-faint font-semibold">Sobrantes</span>
          <span className={`block text-3xl font-black tabular-nums leading-none mt-0.5 ${
            sobrantes > 0 ? "text-orange-500" : "text-text-ghost"
          }`}>
            {sobrantes}
          </span>
        </div>

        {/* Status indicators */}
        <div className="flex gap-1.5 mb-1">
          {p.inasistencia && (
            <span className="rounded-full bg-red-100 dark:bg-red-500/20 px-2 py-0.5 text-[10px] font-bold text-red-600 dark:text-red-400">
              FALTA
            </span>
          )}
        </div>
      </div>

      {/* Notas */}
      {p.notas && (
        <div className="border-t border-border-light pt-2 mt-1">
          <span className="text-[11px] text-text-faint line-clamp-1">{p.notas}</span>
        </div>
      )}
    </div>
  );
}

// ─── Modal ───────────────────────────────────────────────────────────────────

type CierreField = "sobrantes" | "inasistencia" | "notas";

const CIERRE_FIELDS: { key: CierreField; label: string }[] = [
  { key: "sobrantes", label: "Sobrantes" },
  { key: "inasistencia", label: "Inasistencia" },
  { key: "notas", label: "Notas" },
];

function CierreSheet({ row, onClose }: { row: Row; onClose: () => void }) {
  const { alert: showAlert } = useDialogs();
  const [activeIdx, setActiveIdx] = useState(0);
  const [isPending, startTransition] = useTransition();

  const [sobrantes, setSobrantes] = useState(String(row.tacos_sobrantes ?? 0) || "0");
  const [inasistencia, setInasistencia] = useState(row.inasistencia);
  const [notas, setNotas] = useState(row.notas ?? "");

  const activeField = CIERRE_FIELDS[activeIdx];

  function handleKey(key: string) {
    setSobrantes((cur) => {
      if (key === "C") return "0";
      if (key === "⌫") return cur.length <= 1 ? "0" : cur.slice(0, -1);
      if (key === ".") {
        if (cur.includes(".")) return cur;
        return cur + ".";
      }
      const next = cur === "0" ? key : cur + key;
      return next.length > 7 ? cur : next;
    });
  }

  function handleNext() {
    if (activeIdx < CIERRE_FIELDS.length - 1) {
      setActiveIdx(activeIdx + 1);
    }
  }

  const handleSave = useCallback(() => {
    startTransition(async () => {
      const sobVal = parseFloat(sobrantes) || 0;
      const res1 = await actualizarCampo(row.id, "tacos_sobrantes", sobVal);
      if (!res1.success) {
        await showAlert({
          title: "No se pudo guardar",
          message: res1.error,
          variant: "error",
        });
        return;
      }

      const res2 = await actualizarCampo(row.id, "inasistencia", inasistencia);
      if (!res2.success) {
        await showAlert({
          title: "No se pudo guardar",
          message: res2.error,
          variant: "error",
        });
        return;
      }

      const res3 = await actualizarCampo(row.id, "notas", notas);
      if (!res3.success) {
        await showAlert({
          title: "No se pudo guardar",
          message: res3.error,
          variant: "error",
        });
        return;
      }

      onClose();
    });
  }, [sobrantes, inasistencia, notas, row.id, onClose, showAlert]);

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-md" onClick={onClose} />

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

          {/* Field tabs */}
          <div className="flex gap-1.5 px-5 py-3">
            {CIERRE_FIELDS.map((f, i) => {
              const isActive = i === activeIdx;
              const hasValue = f.key === "sobrantes" ? sobrantes !== "0"
                : f.key === "inasistencia" ? inasistencia
                : notas !== "";
              const displayVal = f.key === "sobrantes" ? sobrantes
                : f.key === "inasistencia" ? (inasistencia ? "Sí" : "No")
                : notas ? "✓" : "—";

              return (
                <button
                  key={f.key}
                  onClick={() => setActiveIdx(i)}
                  className={`flex flex-1 flex-col items-center rounded-xl px-3 py-2 transition-all ${
                    isActive
                      ? f.key === "inasistencia" && inasistencia
                        ? "bg-red-500/20 ring-1 ring-red-500/40"
                        : "bg-orange-500/20 ring-1 ring-orange-500/40"
                      : "bg-zinc-800/50 hover:bg-zinc-800"
                  }`}
                >
                  <span className={`text-[10px] font-bold uppercase tracking-wide ${
                    isActive
                      ? f.key === "inasistencia" && inasistencia ? "text-red-400" : "text-orange-400"
                      : "text-zinc-500"
                  }`}>
                    {f.label}
                  </span>
                  <span className={`text-lg font-black tabular-nums ${
                    isActive ? "text-white" : hasValue ? "text-zinc-300" : "text-zinc-600"
                  }`}>
                    {displayVal}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Content area — fixed height */}
          <div className="px-5 pb-5 pt-2 h-[370px] flex flex-col">
            {activeField.key === "sobrantes" && (
              <>
                {/* Display */}
                <div className="rounded-2xl bg-black/40 px-5 py-4 text-right mb-2">
                  <span className="text-5xl font-black tabular-nums text-white">{sobrantes}</span>
                </div>

                {/* Numpad 1-9 */}
                <div className="grid grid-cols-3 gap-2 mb-2">
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
                {/* Bottom row: C 0 . ⌫ */}
                <div className="grid grid-cols-4 gap-2 mb-2">
                  <button onClick={() => handleKey("C")} className="flex h-13 items-center justify-center rounded-2xl text-xl font-bold bg-orange-500/20 text-orange-400 active:bg-orange-500/30 transition-all active:scale-[0.92] select-none">C</button>
                  <button onClick={() => handleKey("0")} className="flex h-13 items-center justify-center rounded-2xl text-xl font-bold bg-zinc-800 text-white active:bg-zinc-700 transition-all active:scale-[0.92] select-none">0</button>
                  <button onClick={() => handleKey(".")} className="flex h-13 items-center justify-center rounded-2xl text-2xl font-black bg-zinc-800 text-white active:bg-zinc-700 transition-all active:scale-[0.92] select-none">.</button>
                  <button onClick={() => handleKey("⌫")} className="flex h-13 items-center justify-center rounded-2xl bg-red-500/20 text-red-400 active:bg-red-500/30 transition-all active:scale-[0.92] select-none">
                    <svg width="22" height="18" viewBox="0 0 22 18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M7 1H21V17H7L1 9L7 1Z" /><path d="M11 6L17 12" /><path d="M17 6L11 12" />
                    </svg>
                  </button>
                </div>

                {/* Next */}
                <button onClick={handleNext} className="mt-auto w-full rounded-2xl bg-orange-500 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 active:scale-[0.98]">
                  Siguiente →
                </button>
              </>
            )}

            {activeField.key === "inasistencia" && (
              <div className="flex flex-col h-full">
                <div className="flex-1 flex flex-col items-center justify-center gap-6">
                  <p className="text-sm text-zinc-400 text-center">
                    ¿{etiquetaPuestoProduccion(row)} tuvo inasistencia hoy?
                  </p>

                  <div className="flex gap-4">
                    <button
                      onClick={() => setInasistencia(false)}
                      className={`flex flex-col items-center gap-2 rounded-2xl px-10 py-6 transition-all active:scale-[0.95] ${
                        !inasistencia
                          ? "bg-emerald-500/20 ring-2 ring-emerald-500/40"
                          : "bg-zinc-800 hover:bg-zinc-700"
                      }`}
                    >
                      <span className="text-3xl">✓</span>
                      <span className={`text-sm font-bold ${!inasistencia ? "text-emerald-400" : "text-zinc-500"}`}>
                        Asistió
                      </span>
                    </button>

                    <button
                      onClick={() => setInasistencia(true)}
                      className={`flex flex-col items-center gap-2 rounded-2xl px-10 py-6 transition-all active:scale-[0.95] ${
                        inasistencia
                          ? "bg-red-500/20 ring-2 ring-red-500/40"
                          : "bg-zinc-800 hover:bg-zinc-700"
                      }`}
                    >
                      <span className="text-3xl">✗</span>
                      <span className={`text-sm font-bold ${inasistencia ? "text-red-400" : "text-zinc-500"}`}>
                        Faltó
                      </span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={handleNext}
                  className="w-full rounded-2xl bg-orange-500 py-3.5 text-base font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 active:scale-[0.98] flex-shrink-0"
                >
                  Siguiente →
                </button>
              </div>
            )}

            {activeField.key === "notas" && (
              <div className="flex flex-col h-full">
                <textarea
                  value={notas}
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Notas opcionales..."
                  className="flex-1 w-full rounded-2xl border-2 border-zinc-700 bg-zinc-800 px-4 py-4 text-base text-white placeholder:text-zinc-600 focus:border-orange-500 focus:outline-none resize-none"
                />

                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="mt-3 w-full rounded-2xl bg-orange-500 py-4 text-lg font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50 disabled:shadow-none flex-shrink-0"
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
              </div>
            )}
          </div>

          {/* Quick save (on sobrantes/inasistencia screens) */}
          {activeField.key !== "notas" && (
            <div className="px-5 pb-5 -mt-3">
              <button
                onClick={handleSave}
                disabled={isPending}
                className="w-full rounded-2xl bg-zinc-800 py-3 text-sm font-bold text-zinc-400 transition-all hover:bg-zinc-700 active:scale-[0.98] disabled:opacity-50"
              >
                Guardar y salir
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// ─── Cards grid ──────────────────────────────────────────────────────────────

function CierreCards({ producciones, isClosed }: { producciones: Row[]; isClosed: boolean }) {
  const [activeRow, setActiveRow] = useState<Row | null>(null);

  const freshRow = activeRow
    ? producciones.find((p) => p.id === activeRow.id) ?? null
    : null;

  return (
    <>
      <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
        {producciones.map((p) => (
          <CierreCard key={p.id} p={p} isClosed={isClosed} onOpen={setActiveRow} />
        ))}
      </div>

      {freshRow && !isClosed && (
        <CierreSheet
          key={`${freshRow.id}:${String(freshRow.updated_at)}:${freshRow.tacos_sobrantes ?? 0}:${freshRow.inasistencia ? 1 : 0}:${freshRow.notas ?? ""}`}
          row={freshRow}
          onClose={() => setActiveRow(null)}
        />
      )}
    </>
  );
}

// ─── Export ──────────────────────────────────────────────────────────────────

export function CierreView({
  producciones,
  comandaEstado,
}: {
  producciones: Row[];
  comandaEstado: ComandaEstado;
}) {
  const { mode, setMode, hydrated } = useViewMode("cierre");
  const isClosed = comandaEstado === "CERRADA";

  if (!hydrated) return null;

  return (
    <div className="space-y-4">
      <ViewToggle mode={mode} setMode={setMode} />
      {mode === "tabla" ? (
        <CierreTable producciones={producciones} comandaEstado={comandaEstado} />
      ) : (
        <CierreCards producciones={producciones} isClosed={isClosed} />
      )}
    </div>
  );
}
