"use client";

import { useRef } from "react";
import { formatBolsasDisplay } from "@/lib/decimal";
import {
  AGUAS_UI_COLORS,
  INSUMO_UI_COLORS,
  insumosDataWithTomateFromBolsas,
} from "@/lib/insumos-config";
import { CIERRE_TABLE_TH, TORTILLAS_TD_CLASS } from "@/lib/cierre-table-display";
import { useColumnOrder } from "@/hooks/use-column-order";
import { etiquetaPuestoProduccion } from "@/lib/puesto-fuera";

type ReporteProduccion = {
  id: string;
  numero_pedido: number;
  solicitante: string | null;
  puesto: { nombre: string; es_fuera_puesto: boolean };
  proveedora_tacos: { nombre: string } | null;
  bolsas: number;
  insumos: unknown;
  tortillas: number;
  tacos: number;
  tacos_sobrantes: number | null;
  vendedora: string | null;
  aguas: number;
  inasistencia: boolean;
  notas: string | null;
};

type ReporteComanda = {
  id: string;
  fecha: string;
  estado: string;
  producciones: ReporteProduccion[];
};

type ReportesColumnKey =
  | "puesto"
  | "proveedora"
  | "tomate"
  | "tortillas"
  | "tacos"
  | "sobrantes"
  | "vendedora"
  | "aguas"
  | "inasistencia"
  | "notas";

const DEFAULT_COLUMN_ORDER: readonly ReportesColumnKey[] = [
  "puesto",
  "proveedora",
  "tomate",
  "tortillas",
  "tacos",
  "sobrantes",
  "vendedora",
  "aguas",
  "inasistencia",
  "notas",
];

export function ReportesTable({ comandas }: { comandas: ReporteComanda[] }) {
  const { order, moveColumn, resetOrder } = useColumnOrder<ReportesColumnKey>(
    "pcs-columns-reportes-tabla",
    DEFAULT_COLUMN_ORDER
  );
  const dragColumnRef = useRef<ReportesColumnKey | null>(null);

  function headerLabel(column: ReportesColumnKey) {
    switch (column) {
      case "puesto":
        return "Puesto";
      case "proveedora":
        return "Proveedora";
      case "tomate":
        return "Salsa tomate";
      case "tortillas":
        return "Tortillas";
      case "tacos":
        return "Tacos";
      case "sobrantes":
        return "Sobrantes";
      case "vendedora":
        return "Vendedora";
      case "aguas":
        return "Aguas";
      case "inasistencia":
        return "Inasistencia";
      case "notas":
        return "Notas";
    }
  }

  function headerClass(column: ReportesColumnKey, isSticky: boolean) {
    const stickyClass = isSticky
      ? "sticky left-0 z-10 border-r border-border-light bg-surface-alt"
      : "";

    const widthClass =
      column === "puesto"
        ? "w-[9.5rem]"
        : column === "proveedora"
          ? "w-[8.5rem]"
          : column === "tomate"
            ? "w-[5.25rem]"
            : column === "tortillas"
              ? "w-[4.75rem]"
              : column === "tacos" || column === "aguas"
                ? "w-[4.25rem]"
                : column === "sobrantes"
                  ? "w-[5.5rem]"
                  : column === "vendedora"
                    ? "w-[8rem]"
                    : column === "inasistencia"
                      ? "w-[7.5rem]"
                      : "min-w-[14rem]";

    const toneClass =
      column === "puesto"
        ? CIERRE_TABLE_TH.puesto
        : column === "proveedora"
          ? CIERRE_TABLE_TH.proveedora
          : column === "tomate"
            ? CIERRE_TABLE_TH.tomate
            : column === "tortillas"
              ? CIERRE_TABLE_TH.tortillas
              : column === "tacos"
                ? CIERRE_TABLE_TH.tacos
                : column === "sobrantes"
                  ? CIERRE_TABLE_TH.sobrantes
                  : column === "vendedora"
                    ? CIERRE_TABLE_TH.vendedora
                    : column === "aguas"
                      ? CIERRE_TABLE_TH.aguas
                      : column === "inasistencia"
                        ? CIERRE_TABLE_TH.inasistencia
                        : CIERRE_TABLE_TH.notas;

    const alignClass =
      column === "puesto" || column === "notas"
        ? "text-left"
        : "text-center";

    return `${stickyClass} ${widthClass} px-2 py-3 text-xs font-black uppercase ${alignClass} ${toneClass}`;
  }

  function renderCell(
    column: ReportesColumnKey,
    p: ReporteProduccion,
    isSticky: boolean
  ) {
    const ins = insumosDataWithTomateFromBolsas({
      insumos: p.insumos,
      bolsas: p.bolsas,
    });
    const tomateVal = Number((ins as Record<string, number>).tomate ?? 0);
    const sob = p.tacos_sobrantes ?? 0;
    const stickyClass = isSticky
      ? "sticky left-0 z-10 border-r border-border-light bg-surface"
      : "";

    switch (column) {
      case "puesto":
        return (
          <td key={column} className={`${stickyClass} px-3 py-2.5 font-bold text-text-primary`}>
            <span className="block truncate" title={etiquetaPuestoProduccion(p)}>
              {etiquetaPuestoProduccion(p)}
            </span>
            {p.numero_pedido > 1 && (
              <span className="text-xs font-semibold text-orange-500">
                #{p.numero_pedido}
              </span>
            )}
          </td>
        );
      case "proveedora":
        return (
          <td key={column} className="px-2 py-2.5 text-center align-middle">
            <span
              className={`block truncate text-sm font-semibold ${
                p.proveedora_tacos
                  ? "text-fuchsia-600 dark:text-fuchsia-400"
                  : "text-text-ghost"
              }`}
              title={p.proveedora_tacos?.nombre}
            >
              {p.proveedora_tacos?.nombre ?? "-"}
            </span>
          </td>
        );
      case "tomate":
        return (
          <td key={column} className="px-2 py-2.5 text-center align-middle tabular-nums">
            <span
              className={`font-black ${
                tomateVal > 0 ? INSUMO_UI_COLORS.tomate.tdPositive : "text-text-ghost"
              }`}
            >
              {formatBolsasDisplay(tomateVal)}
            </span>
          </td>
        );
      case "tortillas":
        return (
          <td key={column} className="px-2 py-2.5 text-center align-middle tabular-nums">
            <span
              className={`font-black ${
                p.tortillas > 0 ? TORTILLAS_TD_CLASS : "text-text-ghost"
              }`}
            >
              {p.tortillas}
            </span>
          </td>
        );
      case "tacos":
        return (
          <td key={column} className="px-2 py-2.5 text-center align-middle tabular-nums font-black text-emerald-600 dark:text-emerald-400">
            {p.tacos}
          </td>
        );
      case "sobrantes":
        return (
          <td key={column} className="px-2 py-2.5 text-center align-middle tabular-nums font-black">
            <span className={sob > 0 ? "text-orange-600 dark:text-orange-400" : "text-text-ghost"}>
              {sob}
            </span>
          </td>
        );
      case "vendedora":
        return (
          <td key={column} className="min-w-0 px-2 py-2.5 text-center align-middle">
            <span
              className={`block truncate text-sm font-semibold ${
                p.vendedora ? "text-sky-700 dark:text-sky-300" : "text-text-ghost"
              }`}
              title={p.vendedora ?? undefined}
            >
              {p.vendedora ?? "-"}
            </span>
          </td>
        );
      case "aguas":
        return (
          <td key={column} className="px-2 py-2.5 text-center align-middle tabular-nums font-black">
            <span className={p.aguas > 0 ? AGUAS_UI_COLORS.tdPositive : "text-text-ghost"}>
              {p.aguas > 0 ? p.aguas : "-"}
            </span>
          </td>
        );
      case "inasistencia":
        return (
          <td key={column} className="px-2 py-2.5 text-center align-middle">
            {p.inasistencia ? (
              <span className="inline-flex rounded-full bg-red-100 px-2.5 py-1 text-xs font-bold text-red-700 dark:bg-red-500/20 dark:text-red-400">
                Si
              </span>
            ) : (
              <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-bold text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400">
                No
              </span>
            )}
          </td>
        );
      case "notas":
        return (
          <td key={column} className="min-w-0 px-2 py-2 align-middle">
            {p.notas?.trim() ? (
              <span
                className="line-clamp-3 break-words text-sm leading-snug text-violet-700 dark:text-violet-300"
                title={p.notas}
              >
                {p.notas}
              </span>
            ) : (
              <span className="text-text-ghost">-</span>
            )}
          </td>
        );
    }
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-text-faint">
        <span>Arrastra encabezados para reordenar columnas.</span>
        <button
          type="button"
          onClick={resetOrder}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 font-semibold text-text-secondary transition-colors hover:bg-hover-surface hover:text-text-primary"
        >
          Restablecer
        </button>
      </div>

      {comandas.map((c) => {
        const totalTacos = c.producciones.reduce((sum, p) => sum + p.tacos, 0);
        const totalSobrantes = c.producciones.reduce(
          (sum, p) => sum + (p.tacos_sobrantes ?? 0),
          0
        );
        const inasistencias = c.producciones.filter((p) => p.inasistencia).length;
        const totalAguas = c.producciones.reduce((sum, p) => sum + p.aguas, 0);

        return (
          <section
            key={c.id}
            className="overflow-hidden rounded-xl border border-border bg-surface"
          >
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-alt px-4 py-3">
              <h4 className="text-base font-semibold text-text-primary">
                {new Date(c.fecha).toLocaleDateString("es-MX", {
                  weekday: "long",
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </h4>
              <span
                className={`inline-flex rounded-full px-2.5 py-1 text-xs font-medium ${
                  c.estado === "CERRADA"
                    ? "bg-surface-muted text-text-secondary"
                    : "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                }`}
              >
                {c.estado.replace("_", " ")}
              </span>
            </div>

            <div className="grid gap-3 border-b border-border bg-surface-alt/50 px-4 py-3 text-sm sm:grid-cols-4">
              <div>
                <p className="text-text-muted">Total tacos</p>
                <p className="font-semibold tabular-nums text-text-primary">{totalTacos}</p>
              </div>
              <div>
                <p className="text-text-muted">Sobrantes (tacos)</p>
                <p className="font-semibold tabular-nums text-orange-600 dark:text-orange-400">
                  {totalSobrantes}
                </p>
              </div>
              <div>
                <p className="text-text-muted">Filas con inasistencia</p>
                <p className="font-semibold tabular-nums text-red-600 dark:text-red-400">
                  {inasistencias}
                </p>
              </div>
              <div>
                <p className="text-text-muted">Total aguas</p>
                <p className="font-semibold tabular-nums text-sky-600 dark:text-sky-400">
                  {totalAguas}
                </p>
              </div>
            </div>

            <div className="overflow-x-auto border-t border-border">
              <table className="min-w-[1320px] w-full table-fixed divide-y divide-border text-sm">
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
                          if (dragged) moveColumn(dragged, column);
                          dragColumnRef.current = null;
                        }}
                        onDragEnd={() => {
                          dragColumnRef.current = null;
                        }}
                        className={`${headerClass(column, index === 0)} cursor-grab select-none active:cursor-grabbing`}
                      >
                        {column === "proveedora" ? (
                          <>
                            <span className="block">Proveedora</span>
                            <span className="block text-[0.6rem] font-bold normal-case tracking-normal opacity-90">
                              de tacos
                            </span>
                          </>
                        ) : column === "tomate" ? (
                          <>
                            <span className="block">Salsa</span>
                            <span className="block text-[0.6rem] font-bold normal-case tracking-normal opacity-90">
                              tomate
                            </span>
                          </>
                        ) : (
                          headerLabel(column)
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-light">
                  {c.producciones.map((p) => (
                    <tr
                      key={p.id}
                      className={
                        p.inasistencia
                          ? "bg-red-50/50 dark:bg-red-500/[0.08]"
                          : "hover:bg-hover-surface"
                      }
                    >
                      {order.map((column, index) =>
                        renderCell(column, p, index === 0)
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}
    </div>
  );
}
