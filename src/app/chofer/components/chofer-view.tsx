"use client";

import { useRef } from "react";
import { useViewMode } from "@/hooks/use-view-mode";
import { useColumnOrder } from "@/hooks/use-column-order";
import { ViewToggle } from "@/components/shared/view-toggle";
import type { Produccion, Puesto } from "@prisma/client";
import { etiquetaPuestoProduccion } from "@/lib/puesto-fuera";
import { CHOFER_ROUTE_LAYOUT } from "@/lib/chofer-routes";

type Row = Produccion & { puesto: Puesto };
type ChoferColumnKey = "puesto" | "vendedora" | "chofer" | "estado";

const DEFAULT_COLUMN_ORDER: readonly ChoferColumnKey[] = [
  "puesto",
  "vendedora",
  "chofer",
  "estado",
];

const ESTADO_ROW_TINT: Record<string, string> = {
  PENDIENTE: "",
  EN_PROCESO: "bg-amber-50/50 dark:bg-amber-500/[0.08]",
  LISTO: "bg-emerald-50/50 dark:bg-emerald-500/[0.08]",
  ENTREGADO: "bg-sky-50/50 dark:bg-sky-500/[0.08]",
};

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

const COL = {
  puestoTh: "text-slate-600 dark:text-slate-400",
  vendedoraTh: "text-violet-600 dark:text-violet-400",
  choferTh: "text-orange-500 dark:text-orange-400",
  estadoTh: "text-amber-600 dark:text-amber-400",
  vendedoraTd: "text-violet-600 dark:text-violet-400",
  choferTd: "text-orange-600 dark:text-orange-400",
} as const;

const ROUTE_PALETTE = [
  {
    shell:
      "border-cyan-500/30 bg-cyan-500/[0.08] shadow-[0_18px_40px_-26px_rgba(6,182,212,0.55)]",
    header: "bg-cyan-950 text-cyan-50",
    route: "bg-cyan-500/15 text-cyan-300 ring-1 ring-cyan-400/20",
    item: "bg-cyan-500/[0.08] ring-1 ring-cyan-400/10",
  },
  {
    shell:
      "border-fuchsia-500/30 bg-fuchsia-500/[0.08] shadow-[0_18px_40px_-26px_rgba(217,70,239,0.5)]",
    header: "bg-fuchsia-700/90 text-fuchsia-50",
    route: "bg-fuchsia-500/15 text-fuchsia-200 ring-1 ring-fuchsia-300/20",
    item: "bg-fuchsia-500/[0.08] ring-1 ring-fuchsia-300/10",
  },
  {
    shell:
      "border-lime-500/30 bg-lime-500/[0.08] shadow-[0_18px_40px_-26px_rgba(132,204,22,0.5)]",
    header: "bg-lime-800/90 text-lime-50",
    route: "bg-lime-500/15 text-lime-200 ring-1 ring-lime-300/20",
    item: "bg-lime-500/[0.08] ring-1 ring-lime-300/10",
  },
] as const;

const ROUTE_TABLE_ACCENTS = [
  {
    row: "bg-cyan-500/[0.04]",
    sticky: "bg-cyan-500/[0.06]",
    separator: "border-t-4 border-cyan-500/45",
  },
  {
    row: "bg-fuchsia-500/[0.04]",
    sticky: "bg-fuchsia-500/[0.06]",
    separator: "border-t-4 border-fuchsia-500/45",
  },
  {
    row: "bg-lime-500/[0.04]",
    sticky: "bg-lime-500/[0.06]",
    separator: "border-t-4 border-lime-500/45",
  },
] as const;

function normalizeRouteToken(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Z0-9]+/gi, "")
    .toUpperCase()
    .trim();
}

function resolveRouteMeta(row: Row) {
  const choferKey = normalizeRouteToken(row.chofer || "Sin asignar");
  const puestoKey = normalizeRouteToken(etiquetaPuestoProduccion(row));
  const routeIndex = CHOFER_ROUTE_LAYOUT.findIndex((route) => {
    const routeKey = normalizeRouteToken(route.chofer);
    return (
      routeKey === choferKey &&
      route.puestos.map(normalizeRouteToken).includes(puestoKey)
    );
  });

  if (routeIndex >= 0) {
    return {
      routeNumber: CHOFER_ROUTE_LAYOUT[routeIndex]!.routeNumber,
      accent: ROUTE_TABLE_ACCENTS[routeIndex % ROUTE_TABLE_ACCENTS.length]!,
    };
  }

  return {
    routeNumber: 99,
    accent: {
      row: "",
      sticky: "bg-surface",
      separator: "border-t-4 border-slate-400/35",
    },
  };
}

function renderChoferCell(
  column: ChoferColumnKey,
  row: Row,
  isSticky: boolean,
  stickyBgClass: string
) {
  const stickyClass = isSticky
    ? `sticky left-0 z-10 border-r border-border-light ${stickyBgClass}`
    : "";

  switch (column) {
    case "puesto":
      return (
        <td
          key={column}
          className={`${stickyClass} px-4 py-3 text-xl font-bold text-text-primary`}
        >
          <span className="break-words">{etiquetaPuestoProduccion(row)}</span>
          {row.numero_pedido > 1 && (
            <span className="ml-1.5 text-sm font-semibold text-orange-500">
              #{row.numero_pedido}
            </span>
          )}
        </td>
      );
    case "vendedora":
      return (
        <td
          key={column}
          className={`px-4 py-3 text-xl font-semibold ${
            row.vendedora ? COL.vendedoraTd : "text-text-ghost"
          }`}
        >
          {row.vendedora || "-"}
        </td>
      );
    case "chofer":
      return (
        <td
          key={column}
          className={`px-4 py-3 text-xl font-semibold ${
            row.chofer ? COL.choferTd : "text-text-ghost"
          }`}
        >
          {row.chofer || "-"}
        </td>
      );
    case "estado":
      return (
        <td key={column} className="px-4 py-3 text-center">
          <span
            className={`inline-flex rounded-full px-4 py-2 text-sm font-bold tracking-wide ${ESTADO_BADGE[row.estado]}`}
          >
            {ESTADO_LABEL[row.estado]}
          </span>
        </td>
      );
  }
}

function headerClass(column: ChoferColumnKey, isSticky: boolean) {
  const stickyClass = isSticky
    ? "sticky left-0 z-10 bg-surface-alt border-r border-border-light"
    : "";

  const colorClass =
    column === "puesto"
      ? COL.puestoTh
      : column === "vendedora"
        ? COL.vendedoraTh
        : column === "chofer"
          ? COL.choferTh
          : COL.estadoTh;

  const widthClass =
    column === "puesto"
      ? "min-w-[10rem]"
      : column === "estado"
        ? "min-w-[11rem] text-center"
        : "min-w-[12rem] text-left";

  return `${stickyClass} px-4 py-4 text-sm font-black uppercase tracking-wide ${widthClass} ${colorClass}`;
}

function headerLabel(column: ChoferColumnKey) {
  switch (column) {
    case "puesto":
      return "Puesto";
    case "vendedora":
      return "Vendedora";
    case "chofer":
      return "Chofer";
    case "estado":
      return "Estado";
  }
}

function ChoferCards({ producciones }: { producciones: Row[] }) {
  const routes = CHOFER_ROUTE_LAYOUT.map((route, index) => ({
    choferName: route.chofer,
    routeNumber: route.routeNumber,
    palette: ROUTE_PALETTE[index % ROUTE_PALETTE.length],
    rows: [] as Row[],
  }));

  const fallbackRoutes = new Map<
    string,
    {
      choferName: string;
      routeNumber: number;
      palette: (typeof ROUTE_PALETTE)[number];
      rows: Row[];
    }
  >();

  for (const row of producciones) {
    const routeMeta = resolveRouteMeta(row);
    const routeIndex = CHOFER_ROUTE_LAYOUT.findIndex(
      (route) => route.routeNumber === routeMeta.routeNumber
    );

    if (routeIndex >= 0) {
      routes[routeIndex]?.rows.push(row);
      continue;
    }

    const choferKey = normalizeRouteToken(row.chofer || "Sin asignar");
    const fallbackKey = choferKey || "SINASIGNAR";
    const existing = fallbackRoutes.get(fallbackKey);
    if (existing) {
      existing.rows.push(row);
      continue;
    }

    fallbackRoutes.set(fallbackKey, {
      choferName: row.chofer || "Sin asignar",
      routeNumber: 99,
      palette: ROUTE_PALETTE[fallbackRoutes.size % ROUTE_PALETTE.length],
      rows: [row],
    });
  }

  const visibleRoutes = [...routes, ...fallbackRoutes.values()].filter(
    (route) => route.rows.length > 0
  );

  return (
    <section className="space-y-4">
      <div className="rounded-2xl border border-border bg-surface-alt/70 px-4 py-3 text-center">
        <p className="text-xs font-black uppercase tracking-[0.32em] text-text-faint">
          Choferes
        </p>
        <h2 className="mt-1 text-lg font-black text-text-primary">
          Lunes a Sabado
        </h2>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="flex min-w-max gap-4">
          {visibleRoutes.map(({ choferName, rows, routeNumber, palette }) => {
            const allEntregado = rows.every((r) => r.estado === "ENTREGADO");
            const anyEnProceso = rows.some(
              (r) => r.estado === "EN_PROCESO" || r.estado === "LISTO"
            );

            return (
            <article
              key={`${choferName}-${routeNumber}`}
              className={`w-[260px] rounded-[1.6rem] border p-3 transition-all ${palette.shell} ${
                allEntregado
                  ? "ring-1 ring-sky-400/25"
                  : anyEnProceso
                    ? "ring-1 ring-amber-400/25"
                    : ""
              }`}
            >
              <div className={`rounded-[1.15rem] px-4 py-4 ${palette.header}`}>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/65">
                      Chofer
                    </p>
                    <h3 className="truncate text-2xl font-black">
                      {choferName}
                    </h3>
                  </div>
                  <span
                    className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.2em] ${palette.route}`}
                  >
                    {routeNumber === 99 ? "Sin ruta" : `Ruta ${routeNumber}`}
                  </span>
                </div>

                <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
                  <span className="text-xs font-bold uppercase tracking-[0.22em] text-white/60">
                    Puestos
                  </span>
                  <span className="text-lg font-black">{rows.length}</span>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                {rows.map((p) => (
                  <div
                    key={p.id}
                    className={`rounded-[1.05rem] px-3 py-3 ${
                      p.inasistencia ? "opacity-35" : palette.item
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="break-words text-base font-black uppercase tracking-[0.04em] text-text-primary">
                          {etiquetaPuestoProduccion(p)}
                          {p.numero_pedido > 1 && (
                            <span className="ml-1.5 text-xs font-bold text-orange-500">
                              #{p.numero_pedido}
                            </span>
                          )}
                        </p>
                        <p
                          className={`mt-1 text-sm font-semibold ${
                            p.vendedora ? COL.vendedoraTd : "text-text-muted"
                          }`}
                        >
                          {p.vendedora || "Sin vendedora"}
                        </p>
                      </div>
                      <span
                        className={`mt-0.5 inline-flex shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black tracking-wide ${ESTADO_BADGE[p.estado]}`}
                      >
                        {ESTADO_LABEL[p.estado]}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function ChoferView({ producciones }: { producciones: Row[] }) {
  const { mode, setMode, hydrated } = useViewMode("chofer");
  const { order, moveColumn, resetOrder } = useColumnOrder<ChoferColumnKey>(
    "pcs-columns-chofer-tabla",
    DEFAULT_COLUMN_ORDER
  );
  const dragColumnRef = useRef<ChoferColumnKey | null>(null);
  const tableRows = producciones
    .map((row, index) => ({
      row,
      index,
      routeMeta: resolveRouteMeta(row),
    }))
    .sort((a, b) => {
      if (a.routeMeta.routeNumber !== b.routeMeta.routeNumber) {
        return a.routeMeta.routeNumber - b.routeMeta.routeNumber;
      }
      return a.index - b.index;
    });

  if (!hydrated) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <ViewToggle mode={mode} setMode={setMode} />

        {mode === "tabla" && (
          <div className="flex items-center gap-2 text-xs text-text-faint">
            <span>Arrastra encabezados para reordenar columnas.</span>
            <button
              type="button"
              onClick={resetOrder}
              className="rounded-lg border border-border bg-surface px-3 py-1.5 font-semibold text-text-secondary transition-colors hover:bg-hover-surface hover:text-text-primary"
            >
              Restablecer
            </button>
          </div>
        )}
      </div>

      {mode === "tabla" ? (
        <div className="overflow-x-auto rounded-xl border-2 border-border bg-surface">
          <table className="min-w-[900px] w-full divide-y divide-border">
            <thead className="bg-surface-alt">
              <tr>
                {order.map((column, index) => (
                  <th
                    key={column}
                    draggable
                    onDragStart={() => {
                      dragColumnRef.current = column;
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={() => {
                      const dragged = dragColumnRef.current;
                      if (dragged) {
                        moveColumn(dragged, column);
                      }
                      dragColumnRef.current = null;
                    }}
                    onDragEnd={() => {
                      dragColumnRef.current = null;
                    }}
                    className={`${headerClass(column, index === 0)} cursor-grab select-none active:cursor-grabbing`}
                    title="Arrastra para mover columna"
                  >
                    <span className="inline-flex items-center gap-2">
                      <span>{headerLabel(column)}</span>
                      <span className="text-[10px] opacity-50">::</span>
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {tableRows.map(({ row: p, routeMeta }, rowIndex) => {
                const previousRoute = tableRows[rowIndex - 1]?.routeMeta.routeNumber;
                const isRouteStart = rowIndex === 0 || previousRoute !== routeMeta.routeNumber;

                return (
                <tr
                  key={p.id}
                  className={`${routeMeta.accent.row} ${
                    isRouteStart ? routeMeta.accent.separator : "border-t border-border-light"
                  } hover:bg-hover-surface ${
                    ESTADO_ROW_TINT[p.estado] ?? ""
                  } ${p.inasistencia ? "opacity-35" : ""}`}
                >
                  {order.map((column, index) =>
                    renderChoferCell(
                      column,
                      p,
                      index === 0,
                      index === 0 ? routeMeta.accent.sticky : ""
                    )
                  )}
                </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <ChoferCards producciones={producciones} />
      )}
    </div>
  );
}
