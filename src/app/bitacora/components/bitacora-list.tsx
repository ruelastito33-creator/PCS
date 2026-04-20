"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type BitacoraEntry = {
  id: string;
  evento: string;
  detalle: Record<string, unknown> | null;
  created_at: string;
  comanda: { fecha: string } | null;
  usuario: { full_name: string } | null;
};

const EVENTO_LABELS: Record<string, string> = {
  COMANDA_CREADA: "Comanda creada",
  COMANDA_PRECARGA: "Precarga",
  COMANDA_PRECARGA_DESDE_ORIGEN: "Precarga desde origen",
  COMANDA_REINICIADA_CERO: "Reinicio a cero",
  COMANDA_IMPORTADA_EXCEL: "Importada de Excel",
  PEDIDO_ADICIONAL: "Pedido adicional",
  PEDIDO_ADICIONAL_ELIMINADO: "Pedido adicional eliminado",
  VENDEDORAS_REINICIADAS: "Vendedoras reiniciadas",
  COMANDA_CERRADA: "Comanda cerrada",
  CAMPO_ACTUALIZADO: "Campo actualizado",
};

const EVENTO_COLORS: Record<string, string> = {
  COMANDA_CREADA: "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400",
  COMANDA_PRECARGA: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  COMANDA_PRECARGA_DESDE_ORIGEN: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
  COMANDA_REINICIADA_CERO: "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400",
  COMANDA_IMPORTADA_EXCEL: "bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:text-indigo-400",
  PEDIDO_ADICIONAL: "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400",
  PEDIDO_ADICIONAL_ELIMINADO: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400",
  VENDEDORAS_REINICIADAS: "bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400",
  COMANDA_CERRADA: "bg-surface-muted text-text-secondary",
  CAMPO_ACTUALIZADO: "bg-surface-muted text-text-muted",
};

function formatHora(isoString: string): string {
  try {
    return new Date(isoString).toLocaleTimeString("es-MX", {
      timeZone: "America/Mexico_City",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "";
  }
}

function DetalleView({ evento, detalle }: { evento: string; detalle: Record<string, unknown> | null }) {
  if (!detalle || Object.keys(detalle).length === 0) return null;

  if (evento === "CAMPO_ACTUALIZADO") {
    const { campo, antes, despues, puesto_id } = detalle as {
      campo?: string;
      antes?: unknown;
      despues?: unknown;
      puesto_id?: number;
    };
    return (
      <p className="mt-1 text-xs text-text-muted">
        {puesto_id !== undefined && (
          <span className="mr-2 text-text-faint">puesto #{puesto_id}</span>
        )}
        <span className="font-medium text-text-secondary">{campo}</span>
        {": "}
        <span className="text-text-faint line-through">{String(antes ?? "-")}</span>
        {" → "}
        <span className="font-semibold text-text-primary">{String(despues ?? "-")}</span>
      </p>
    );
  }

  const entries = Object.entries(detalle).filter(([, v]) => v !== null && v !== undefined);
  if (entries.length === 0) return null;

  return (
    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-text-muted">
      {entries.map(([k, v]) => (
        <span key={k}>
          <span className="text-text-faint">{k}: </span>
          <span className="font-medium text-text-secondary">
            {typeof v === "object" ? JSON.stringify(v) : String(v)}
          </span>
        </span>
      ))}
    </p>
  );
}

const ALL_EVENTOS = "TODOS";

export function BitacoraList({
  entries,
  fecha,
}: {
  entries: BitacoraEntry[];
  fecha: string;
}) {
  const router = useRouter();
  const [eventoFilter, setEventoFilter] = useState(ALL_EVENTOS);

  const filtered =
    eventoFilter === ALL_EVENTOS
      ? entries
      : entries.filter((e) => e.evento === eventoFilter);

  const uniqueEventos = Array.from(new Set(entries.map((e) => e.evento))).sort();

  function handleFechaChange(e: React.ChangeEvent<HTMLInputElement>) {
    const val = e.target.value;
    if (val) router.push(`/bitacora?fecha=${val}`);
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          type="date"
          value={fecha}
          onChange={handleFechaChange}
          className="h-11 rounded-lg border border-input-border bg-input-bg px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-orange-500/50"
        />
        <select
          value={eventoFilter}
          onChange={(e) => setEventoFilter(e.target.value)}
          className="h-11 rounded-lg border border-input-border bg-input-bg px-3 text-sm text-text-primary focus:outline-none focus:ring-2 focus:ring-orange-500/50"
        >
          <option value={ALL_EVENTOS}>Todos los eventos</option>
          {uniqueEventos.map((ev) => (
            <option key={ev} value={ev}>
              {EVENTO_LABELS[ev] ?? ev}
            </option>
          ))}
        </select>
        <span className="text-sm text-text-muted">
          {filtered.length} {filtered.length === 1 ? "entrada" : "entradas"}
        </span>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border-strong bg-surface p-12 text-center">
          <p className="text-text-muted">
            No hay entradas en la bitacora para este dia.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-surface">
          <ul className="divide-y divide-border-light">
            {filtered.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start gap-3 px-4 py-3 hover:bg-hover-surface"
              >
                <span className="mt-0.5 min-w-[5rem] text-xs font-mono text-text-muted tabular-nums">
                  {formatHora(entry.created_at)}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${
                        EVENTO_COLORS[entry.evento] ?? "bg-surface-muted text-text-muted"
                      }`}
                    >
                      {EVENTO_LABELS[entry.evento] ?? entry.evento}
                    </span>
                    {entry.usuario && (
                      <span className="text-xs text-text-muted">
                        {entry.usuario.full_name}
                      </span>
                    )}
                  </div>
                  <DetalleView evento={entry.evento} detalle={entry.detalle} />
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
