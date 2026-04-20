"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  usePosStore,
  POS_FIELDS,
  POS_FIELD_LABELS,
  POS_NUMERIC_FIELDS,
} from "../store/pos-store";
import { Numpad } from "./numpad";
import { actualizarProduccionFila } from "@/lib/actions/produccion";
import { useDialogs } from "@/components/shared/dialog-provider";
import { parseBolsasInput } from "@/lib/decimal";

interface Opcion {
  id: number;
  nombre: string;
}

interface ProduccionMinimal {
  id: string;
  vendedora: string | null;
}

interface PosSheetProps {
  vendedoras: Opcion[];
  choferes: Opcion[];
  producciones: ProduccionMinimal[];
}

export function PosSheet({ vendedoras, choferes, producciones }: PosSheetProps) {
  const router = useRouter();
  const { alert: showAlert } = useDialogs();
  const {
    activeProduccionId,
    activePuestoNombre,
    activeField,
    draft,
    setField,
    nextField,
    setTextValue,
    closeCard,
  } = usePosStore();
  const [isPending, startTransition] = useTransition();

  const isOpen = !!activeProduccionId;

  // 1:1 vendedora filtering — exclude vendedoras assigned to other producciones
  const assignedVendedoras = new Set(
    producciones
      .filter((p) => p.id !== activeProduccionId && p.vendedora)
      .map((p) => p.vendedora as string)
  );
  const filteredVendedoras = vendedoras.filter(
    (v) => !assignedVendedoras.has(v.nombre) || v.nombre === draft.vendedora
  );

  function handleSave() {
    if (!activeProduccionId) return;

    const campos: Record<string, string | number> = {};
    for (const f of POS_FIELDS) {
      if (f === "bolsas") {
        campos[f] = parseBolsasInput(draft[f] ?? "0");
      } else if (POS_NUMERIC_FIELDS.has(f)) {
        campos[f] = parseInt(draft[f] ?? "0", 10) || 0;
      } else {
        campos[f] = draft[f] ?? "";
      }
    }

    startTransition(async () => {
      const res = await actualizarProduccionFila(activeProduccionId, campos);
      if (res.success) {
        router.refresh();
        closeCard();
      } else {
        await showAlert({
          title: "No se pudo guardar",
          message: res.error,
          variant: "error",
        });
      }
    });
  }

  function handleNextField() {
    const idx = POS_FIELDS.indexOf(activeField);
    if (idx < POS_FIELDS.length - 1) {
      nextField();
    } else {
      handleSave();
    }
  }

  const currentValue = draft[activeField] ?? (POS_NUMERIC_FIELDS.has(activeField) ? "0" : "");
  const isNumeric = POS_NUMERIC_FIELDS.has(activeField);
  const isLastField = POS_FIELDS.indexOf(activeField) === POS_FIELDS.length - 1;

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/70 backdrop-blur-md transition-opacity duration-200 ${
          isOpen ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={closeCard}
      />

      {/* Centered modal */}
      <div
        className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-all duration-200 ${
          isOpen
            ? "opacity-100 scale-100"
            : "pointer-events-none opacity-0 scale-95"
        }`}
      >
        {isOpen && (
          <div
            className="w-full max-w-sm rounded-3xl bg-zinc-900 shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-2">
              <h3 className="text-lg font-black text-white">{activePuestoNombre}</h3>
              <div className="flex items-center gap-2">
                <button
                  onClick={handleSave}
                  disabled={isPending}
                  className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-bold text-white transition-all hover:bg-orange-600 active:scale-95 disabled:opacity-50"
                >
                  {isPending ? "..." : "Guardar"}
                </button>
                <button
                  onClick={closeCard}
                  className="flex h-9 w-9 items-center justify-center rounded-full text-zinc-500 transition-colors hover:bg-zinc-800 hover:text-zinc-300"
                >
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <path d="M1 1l12 12M13 1L1 13" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Field tabs */}
            <div className="flex gap-1.5 overflow-x-auto px-5 py-3 no-scrollbar">
              {POS_FIELDS.map((f) => {
                const val = draft[f] ?? "";
                const hasValue = POS_NUMERIC_FIELDS.has(f)
                  ? val !== "0" && val !== ""
                  : val !== "";
                const isActive = activeField === f;
                const displayVal = POS_NUMERIC_FIELDS.has(f)
                  ? (val || "0")
                  : hasValue ? "✓" : "—";

                return (
                  <button
                    key={f}
                    onClick={() => setField(f)}
                    className={`flex flex-shrink-0 flex-col items-center rounded-xl px-3 py-2 min-w-[60px] transition-all ${
                      isActive
                        ? "bg-orange-500/20 ring-1 ring-orange-500/40"
                        : "bg-zinc-800/50 hover:bg-zinc-800"
                    }`}
                  >
                    <span className={`text-[10px] font-bold uppercase tracking-wide ${
                      isActive ? "text-orange-400" : "text-zinc-500"
                    }`}>
                      {POS_FIELD_LABELS[f]}
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

            {/* Input area — fixed height so modal doesn't resize between fields */}
            <div className="px-5 pb-5 pt-2 h-[370px] flex flex-col">
              {isNumeric ? (
                <Numpad value={currentValue} onNext={handleNextField} />
              ) : activeField === "vendedora" ? (
                <SelectList
                  opciones={filteredVendedoras}
                  valor={draft.vendedora ?? ""}
                  onChange={(v) => setTextValue(v)}
                  onNext={handleNextField}
                  isLast={isLastField}
                />
              ) : activeField === "chofer" ? (
                <SelectList
                  opciones={choferes}
                  valor={draft.chofer ?? ""}
                  onChange={(v) => setTextValue(v)}
                  onNext={handleNextField}
                  isLast={isLastField}
                />
              ) : (
                <HoraInput
                  valor={draft.hora ?? ""}
                  onChange={(v) => setTextValue(v)}
                  onSave={handleSave}
                  isPending={isPending}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}

// ─── Sub-components ──────────────────────────────────────────────

function SelectList({
  opciones,
  valor,
  onChange,
  onNext,
  isLast,
}: {
  opciones: Opcion[];
  valor: string;
  onChange: (v: string) => void;
  onNext: () => void;
  isLast: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      {opciones.length === 0 && (
        <p className="rounded-xl bg-zinc-800 p-6 text-center text-sm text-zinc-500">
          Sin opciones. Agrega en Configuración.
        </p>
      )}

      <div className="grid grid-cols-3 gap-1 flex-1 overflow-y-auto content-start">
        {/* Sin asignar */}
        <button
          onClick={() => onChange("")}
          className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors h-fit ${
            valor === ""
              ? "bg-orange-500 text-white"
              : "bg-zinc-800 text-zinc-500 hover:bg-zinc-700"
          }`}
        >
          Ninguno
        </button>

        {opciones.map((o) => (
          <button
            key={o.id}
            onClick={() => onChange(o.nombre)}
            className={`rounded-lg px-2 py-2 text-xs font-medium transition-colors h-fit ${
              valor === o.nombre
                ? "bg-orange-500 text-white"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            }`}
          >
            <span className="truncate">{o.nombre}</span>
          </button>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full rounded-xl bg-orange-500 py-3 text-base font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 active:scale-[0.98] mt-2 flex-shrink-0"
      >
        {isLast ? "Guardar todo" : "Siguiente campo →"}
      </button>
    </div>
  );
}

function HoraInput({
  valor,
  onChange,
  onSave,
  isPending,
}: {
  valor: string;
  onChange: (v: string) => void;
  onSave: () => void;
  isPending: boolean;
}) {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 flex items-center justify-center">
        <input
          type="time"
          value={valor}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-2xl border-2 border-zinc-700 bg-zinc-800 px-5 py-6 text-4xl font-bold tabular-nums text-white text-center focus:border-orange-500 focus:outline-none"
        />
      </div>
      <button
        onClick={onSave}
        disabled={isPending}
        className="w-full rounded-xl bg-orange-500 py-3 text-base font-bold text-white shadow-lg shadow-orange-500/20 transition-all hover:bg-orange-600 active:scale-[0.98] disabled:opacity-50 flex-shrink-0"
      >
        {isPending ? "Guardando..." : "Guardar todo"}
      </button>
    </div>
  );
}
