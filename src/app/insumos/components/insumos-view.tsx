"use client";

import { useViewMode } from "@/hooks/use-view-mode";
import { ViewToggle } from "@/components/shared/view-toggle";
import { InsumosTable } from "./insumos-table";
import {
  INSUMOS_ITEMS,
  insumosDataWithTomateFromBolsas,
  formatInsumoValorDisplay,
} from "@/lib/insumos-config";
import type { Produccion, Puesto, ComandaEstado } from "@prisma/client";
import { etiquetaPuestoProduccion } from "@/lib/puesto-fuera";

type Row = Produccion & { puesto: Puesto };

const INSUMO_COLORS: Record<string, { bg: string; text: string }> = {
  tomate: { bg: "bg-red-50 dark:bg-red-500/10", text: "text-red-600 dark:text-red-400" },
  col: { bg: "bg-emerald-50 dark:bg-emerald-500/10", text: "text-emerald-600 dark:text-emerald-400" },
  zanahoria: { bg: "bg-orange-50 dark:bg-orange-500/10", text: "text-orange-600 dark:text-orange-400" },
  cebolla: { bg: "bg-violet-50 dark:bg-violet-500/10", text: "text-violet-600 dark:text-violet-400" },
  salsa_roja: { bg: "bg-rose-50 dark:bg-rose-500/10", text: "text-rose-600 dark:text-rose-400" },
};

function InsumoCard({ p }: { p: Row }) {
  const data = insumosDataWithTomateFromBolsas({
    insumos: p.insumos,
    bolsas: p.bolsas,
  });
  const totalInsumos = INSUMOS_ITEMS.reduce(
    (sum, item) => sum + ((data as Record<string, number>)[item.key] ?? 0),
    0
  );

  return (
    <div className={`flex flex-col rounded-2xl border-2 bg-surface ${
      totalInsumos > 0 ? "border-emerald-200 dark:border-emerald-500/30 shadow-sm" : "border-border"
    } ${p.inasistencia ? "opacity-35" : ""}`}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 pt-4 pb-2.5">
        <span className="text-3xl font-bold text-text-primary break-words">
          {etiquetaPuestoProduccion(p)}
          {p.numero_pedido > 1 && (
            <span className="ml-2 text-2xl font-semibold text-orange-500">#{p.numero_pedido}</span>
          )}
        </span>
        <span className={`text-3xl font-black tabular-nums ${
          totalInsumos > 0 ? "text-emerald-500" : "text-text-ghost"
        }`}>{totalInsumos}</span>
      </div>

      {/* Insumo rows — read only */}
      <div className="px-4 pb-4 space-y-2">
        {INSUMOS_ITEMS.map((item) => {
          const val = (data as Record<string, number>)[item.key] ?? 0;
          const colors = INSUMO_COLORS[item.key] ?? { bg: "bg-surface-alt", text: "text-text-secondary" };

          return (
            <div key={item.key} className="flex items-center justify-between rounded-xl px-3 py-2.5">
              <span className="text-2xl text-text-muted">{item.label}</span>
              <span className={`min-w-[2.5rem] rounded-xl px-2.5 py-1.5 text-center text-4xl font-black tabular-nums ${
                val > 0 ? `${colors.bg} ${colors.text}` : "text-text-ghost"
              }`}>
                {formatInsumoValorDisplay(item.key, Number(val))}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function InsumoCards({ producciones }: { producciones: Row[] }) {
  return (
    <div className="grid gap-3 grid-cols-1 lg:grid-cols-2">
      {producciones.map((p) => (
        <InsumoCard key={p.id} p={p} />
      ))}
    </div>
  );
}

export function InsumosView({
  producciones,
  comandaEstado,
}: {
  producciones: Row[];
  comandaEstado: ComandaEstado;
}) {
  const { mode, setMode, hydrated } = useViewMode("insumos");

  if (!hydrated) return null;

  return (
    <div className="space-y-4">
      <ViewToggle mode={mode} setMode={setMode} />
      {mode === "tabla" ? (
        <InsumosTable producciones={producciones} comandaEstado={comandaEstado} />
      ) : (
        <InsumoCards producciones={producciones} />
      )}
    </div>
  );
}
