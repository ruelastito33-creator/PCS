"use client";

import { useTransition } from "react";
import { usePosStore } from "../store/pos-store";
import { agregarPedidoAdicional } from "@/lib/actions/comandas";
import { useDialogs } from "@/components/shared/dialog-provider";
import { formatBolsasDisplay } from "@/lib/decimal";
import type { Produccion, Puesto, ComandaEstado } from "@prisma/client";

type ProduccionConPuesto = Produccion & { puesto: Puesto };

interface Opcion { id: number; nombre: string }

interface PosGridProps {
  comandaId: string;
  producciones: ProduccionConPuesto[];
  comandaEstado: ComandaEstado;
  vendedoras: Opcion[];
  choferes: Opcion[];
}

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

const FIELDS = [
  { key: "tacos", label: "Tacos", color: "bg-orange-500" },
  { key: "bolsas", label: "Tomate", color: "bg-amber-500" },
  { key: "aguas", label: "Aguas", color: "bg-cyan-500" },
  { key: "vendedora", label: "Vend", color: "bg-violet-500" },
  { key: "chofer", label: "Chof", color: "bg-emerald-500" },
];

interface PuestoGroup {
  puestoId: number;
  puesto: Puesto;
  rows: ProduccionConPuesto[];
}

function groupByPuesto(producciones: ProduccionConPuesto[]): PuestoGroup[] {
  const groups: PuestoGroup[] = [];
  const map = new Map<number, PuestoGroup>();

  for (const p of producciones) {
    let group = map.get(p.puesto_id);
    if (!group) {
      group = { puestoId: p.puesto_id, puesto: p.puesto, rows: [] };
      map.set(p.puesto_id, group);
      groups.push(group);
    }
    group.rows.push(p);
  }

  groups.sort((a, b) => {
    const af = a.puesto.es_fuera_puesto ? 1 : 0;
    const bf = b.puesto.es_fuera_puesto ? 1 : 0;
    if (af !== bf) return af - bf;
    return a.puesto.orden - b.puesto.orden;
  });
  for (const g of groups) {
    g.rows.sort((a, b) => a.numero_pedido - b.numero_pedido);
  }
  return groups;
}

function PedidoCard({
  p,
  isBase,
  isClosed,
  isActive,
  onClick,
}: {
  p: ProduccionConPuesto;
  isBase: boolean;
  isClosed: boolean;
  isActive: boolean;
  onClick: () => void;
}) {
  const isDisabled = isClosed || p.inasistencia;
  const hasTacos = p.tacos > 0;

  const filledCount = [
    p.tacos > 0,
    p.bolsas > 0,
    p.aguas > 0,
    !!p.vendedora,
    !!p.chofer,
  ].filter(Boolean).length;

  function handleKeyDown(e: React.KeyboardEvent) {
    if (isDisabled) return;
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onClick();
    }
  }

  return (
    <div className="relative">
      <div
        role="button"
        tabIndex={isDisabled ? -1 : 0}
        onClick={() => {
          if (!isDisabled) onClick();
        }}
        onKeyDown={handleKeyDown}
        aria-disabled={isDisabled}
        className={`group flex flex-col rounded-2xl border bg-surface p-4 text-left transition-all duration-150 ${
        filledCount === FIELDS.length
          ? "border-emerald-200 dark:border-emerald-500/30 shadow-sm"
          : hasTacos
            ? "border-orange-200 dark:border-orange-500/30 shadow-sm"
            : "border-border"
      } ${
        isActive
          ? "ring-2 ring-orange-500 ring-offset-2 scale-[0.97]"
          : ""
      } ${
        isDisabled
          ? "cursor-default opacity-35"
          : "hover:shadow-lg hover:-translate-y-0.5 active:scale-[0.97] active:shadow-sm cursor-pointer"
      }`}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-1.5 mb-2">
        <span className="text-sm font-bold text-text-primary leading-tight">
          {isBase ? (
            p.puesto.nombre
          ) : p.puesto.es_fuera_puesto ? (
            <span className="text-sm font-bold text-text-primary break-words">
              {p.solicitante?.trim() || (
                <span className="font-normal text-text-muted">Sin nombre</span>
              )}
            </span>
          ) : (
            <span className="flex items-center gap-1">
              <span className="text-orange-400 text-xs">↳</span>
              <span className="text-orange-600 dark:text-orange-400">{p.puesto.nombre}</span>
            </span>
          )}
        </span>
        <span className={`flex-shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wide ${ESTADO_BADGE[p.estado]}`}>
          {ESTADO_LABEL[p.estado]}
        </span>
      </div>

      {/* Tacos hero */}
      <div className="flex items-end justify-between mb-3">
        <div>
          <span className="text-[10px] uppercase tracking-wider text-text-faint font-semibold">Tacos</span>
          <span className={`block text-3xl font-black tabular-nums leading-none mt-0.5 ${
            hasTacos ? "text-orange-500" : "text-text-ghost"
          }`}>
            {p.tacos}
          </span>
        </div>
        {/* Progress dots */}
        <div className="flex gap-1 mb-1">
          {FIELDS.map((f) => {
            const filled = f.key === "tacos" ? p.tacos > 0
              : f.key === "bolsas" ? p.bolsas > 0
              : f.key === "aguas" ? p.aguas > 0
              : f.key === "vendedora" ? !!p.vendedora
              : !!p.chofer;
            return (
              <div
                key={f.key}
                className={`h-2 w-2 rounded-full ${filled ? f.color : "bg-surface-muted"}`}
              />
            );
          })}
        </div>
      </div>

      {/* Details compact */}
      <div className="flex flex-wrap gap-x-3 gap-y-0.5 border-t border-border-light pt-2">
        {p.bolsas > 0 && (
          <span className="text-[11px] tabular-nums text-text-secondary font-semibold">
            Tom: {formatBolsasDisplay(Number(p.bolsas))}
          </span>
        )}
        {p.aguas > 0 && (
          <span className="text-[11px] tabular-nums text-text-secondary font-semibold">
            Agu: {p.aguas}
          </span>
        )}
        {p.vendedora && (
          <span className="text-[11px] text-text-muted truncate max-w-[80px]">
            {p.vendedora}
          </span>
        )}
        {p.chofer && (
          <span className="text-[11px] text-text-muted truncate max-w-[80px]">
            {p.chofer}
          </span>
        )}
        {!p.bolsas && !p.aguas && !p.vendedora && !p.chofer && (
          <span className="text-[11px] text-text-ghost">Sin datos</span>
        )}
      </div>
    </div>
    </div>
  );
}

function AddPedidoFueraPuestoButton({ comandaId }: { comandaId: string }) {
  const { alert: showAlert } = useDialogs();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    startTransition(async () => {
      const res = await agregarPedidoAdicional(comandaId);
      if (!res.success) {
        await showAlert({
          title: "No se pudo agregar",
          message: res.error,
          variant: "error",
        });
      }
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-orange-300 dark:border-orange-500/30 bg-orange-50/50 dark:bg-orange-500/5 p-4 min-h-[120px] text-orange-500 dark:text-orange-400 transition-all hover:border-orange-400 dark:hover:border-orange-500/50 hover:bg-orange-100/50 dark:hover:bg-orange-500/10 active:scale-[0.97] disabled:opacity-50 cursor-pointer"
      title="Pedido fuera de puesto (nombre libre en la tabla)"
    >
      <span className="text-2xl font-bold">{isPending ? "…" : "+"}</span>
      <span className="text-[10px] font-semibold mt-1 uppercase tracking-wide text-center leading-tight px-1">
        Fuera de puesto
      </span>
    </button>
  );
}

export function PosGrid({ comandaId, producciones, comandaEstado }: PosGridProps) {
  const openCard = usePosStore((s) => s.openCard);
  const activeId = usePosStore((s) => s.activeProduccionId);
  const isClosed = comandaEstado === "CERRADA";
  const groups = groupByPuesto(producciones);

  function handleCardClick(p: ProduccionConPuesto) {
    if (isClosed) return;
    const label =
      p.numero_pedido > 1 && p.puesto.es_fuera_puesto
        ? p.solicitante?.trim() || "Pedido extra"
        : `${p.puesto.nombre}${p.numero_pedido > 1 ? " (extra)" : ""}`;
    openCard(p.id, label, {
      tacos: String(p.tacos),
      bolsas: formatBolsasDisplay(Number(p.bolsas)),
      aguas: String(p.aguas),
      vendedora: p.vendedora ?? "",
      chofer: p.chofer ?? "",
      hora: p.hora ?? "",
    });
  }

  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
      {groups.map((group) =>
        group.rows.map((p) => (
          <PedidoCard
            key={p.id}
            p={p}
            isBase={p.numero_pedido === 1 && !p.puesto.es_fuera_puesto}
            isClosed={isClosed}
            isActive={activeId === p.id}
            onClick={() => handleCardClick(p)}
          />
        ))
      )}
      {!isClosed && <AddPedidoFueraPuestoButton comandaId={comandaId} />}
    </div>
  );
}
