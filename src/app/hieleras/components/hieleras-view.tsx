"use client";

import { useViewMode } from "@/hooks/use-view-mode";
import { ViewToggle } from "@/components/shared/view-toggle";
import { HielerasTable } from "./hieleras-table";
import type { Produccion, Puesto } from "@prisma/client";
import { etiquetaPuestoProduccion } from "@/lib/puesto-fuera";

type Row = Produccion & { puesto: Puesto };

/** Solo lectura: vista informativa de hieleras por puesto. */
function HieleraCard({ p }: { p: Row }) {
  const extras = Math.max(0, p.hieleras - 1);

  return (
    <div
      className={`relative flex flex-col items-center rounded-2xl border bg-surface p-4 transition-colors ${
        extras > 0
          ? "border-orange-200 dark:border-orange-500/30 shadow-sm"
          : "border-border"
      }`}
    >
      <span className="text-sm font-bold text-text-primary mb-2 text-center break-words px-1">
        {etiquetaPuestoProduccion(p)}
        {p.numero_pedido > 1 && (
          <span className="ml-1.5 text-xs font-semibold text-orange-500">#{p.numero_pedido}</span>
        )}
      </span>

      <span
        className={`text-4xl font-black tabular-nums leading-none ${
          p.hieleras > 0 ? "text-cyan-600 dark:text-cyan-400" : "text-text-ghost"
        }`}
      >
        {p.hieleras}
      </span>

      {extras > 0 ? (
        <span className="mt-2 rounded-full bg-orange-100 dark:bg-orange-500/20 px-2.5 py-0.5 text-[11px] font-bold text-orange-600 dark:text-orange-400">
          +{extras} extra{extras > 1 ? "s" : ""}
        </span>
      ) : (
        <span className="mt-2 rounded-full bg-surface-alt px-2.5 py-0.5 text-[11px] font-medium text-text-faint">
          base
        </span>
      )}
    </div>
  );
}

function HieleraCards({ producciones }: { producciones: Row[] }) {
  return (
    <div className="grid gap-3 grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 xl:grid-cols-7">
      {producciones.map((p) => (
        <HieleraCard key={p.id} p={p} />
      ))}
    </div>
  );
}

export function HielerasView({ producciones }: { producciones: Row[] }) {
  const { mode, setMode, hydrated } = useViewMode("hieleras");

  if (!hydrated) return null;

  return (
    <div className="space-y-4">
      <p className="text-sm text-text-muted">
        Solo lectura aquí. Para registrar o cambiar cantidades use la columna <strong>Hieleras</strong> en{" "}
        <strong>Comanda</strong> (Operaciones).
      </p>
      <ViewToggle mode={mode} setMode={setMode} />
      {mode === "tabla" ? (
        <HielerasTable producciones={producciones} />
      ) : (
        <HieleraCards producciones={producciones} />
      )}
    </div>
  );
}
