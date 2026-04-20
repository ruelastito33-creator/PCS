"use client";

import { useMemo, useRef, useTransition } from "react";
import { EditableCell } from "./editable-cell";
import { SelectCell } from "./select-cell";
import { StatusBadge } from "./status-badge";
import {
  agregarPedidoAdicional,
  eliminarPedidoAdicional,
  reiniciarVendedorasComanda,
} from "@/lib/actions/comandas";
import { sortProduccionesComanda } from "@/lib/orden-produccion";
import { useDialogs } from "@/components/shared/dialog-provider";
import { formatBolsasDisplay } from "@/lib/decimal";
import { AGUAS_UI_COLORS, BOLSAS_UI_COLORS } from "@/lib/insumos-config";
import { useColumnOrder } from "@/hooks/use-column-order";
import type { Produccion, Puesto, ComandaEstado } from "@prisma/client";

const TORTILLAS_READONLY_POSITIVE =
  "text-orange-600 dark:text-orange-400 font-semibold";

type ProduccionConPuesto = Produccion & { puesto: Puesto };
type ComandaColumnKey =
  | "puesto"
  | "vendedora"
  | "tacos"
  | "chofer"
  | "bolsas"
  | "aguas"
  | "hieleras"
  | "tortillas"
  | "hora"
  | "estado";

const DEFAULT_COLUMN_ORDER: readonly ComandaColumnKey[] = [
  "puesto",
  "vendedora",
  "tacos",
  "chofer",
  "bolsas",
  "aguas",
  "hieleras",
  "tortillas",
  "hora",
  "estado",
];

interface Opcion {
  id: number;
  nombre: string;
}

interface ComandaTableProps {
  comandaId: string;
  producciones: ProduccionConPuesto[];
  comandaEstado: ComandaEstado;
  vendedoras: Opcion[];
  choferes: Opcion[];
}

function EliminarPedidoButton({ produccionId }: { produccionId: string }) {
  const { confirm } = useDialogs();
  const [isPending, startTransition] = useTransition();

  function handleEliminar() {
    startTransition(async () => {
      const ok = await confirm({
        title: "Eliminar pedido",
        message: "¿Eliminar este pedido adicional? Esta acción no se puede deshacer.",
        confirmLabel: "Eliminar",
      });
      if (!ok) return;
      const res = await eliminarPedidoAdicional(produccionId);
      if (!res.success) alert(res.error);
    });
  }

  return (
    <button
      type="button"
      onClick={handleEliminar}
      disabled={isPending}
      title="Eliminar pedido"
      className="ml-1 rounded p-1 text-red-500 hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:hover:bg-red-900/30"
    >
      {isPending ? "…" : "✕"}
    </button>
  );
}

function ReiniciarVendedorasButton({ comandaId }: { comandaId: string }) {
  const { confirm } = useDialogs();
  const [isPending, startTransition] = useTransition();

  function handleReinicio() {
    startTransition(async () => {
      const ok = await confirm({
        title: "Reiniciar vendedoras",
        message: "Se quitarán todas las vendedoras asignadas. ¿Continuar?",
        confirmLabel: "Reiniciar",
      });
      if (!ok) return;
      const res = await reiniciarVendedorasComanda(comandaId);
      if (!res.success) alert(res.error);
    });
  }

  return (
    <button
      type="button"
      onClick={handleReinicio}
      disabled={isPending}
      className="rounded-lg border border-red-300 bg-surface px-3 py-1.5 text-xs font-semibold text-red-600 transition-colors hover:bg-red-50 hover:text-red-700 disabled:opacity-50 dark:border-red-700 dark:text-red-400 dark:hover:bg-red-900/30"
    >
      {isPending ? "Reiniciando…" : "Reiniciar vendedoras"}
    </button>
  );
}

function AgregarPedidoFilaControl({
  comandaId,
  order,
}: {
  comandaId: string;
  order: ComandaColumnKey[];
}) {
  const { alert: showAlert } = useDialogs();
  const [isPending, startTransition] = useTransition();

  const stickyIdx = order.indexOf("puesto");

  function handleAgregar() {
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
    <tr className="border-t border-dashed border-border-light">
      {order.map((column, index) => {
        const isSticky = index === stickyIdx;
        const stickyClass = isSticky
          ? "sticky left-0 z-10 border-r border-border-light bg-surface"
          : "";

        if (column === "puesto") {
          return (
            <td key={column} className={`${stickyClass} px-4 py-2`}>
              <button
                type="button"
                onClick={handleAgregar}
                disabled={isPending}
                className="inline-flex items-center gap-1.5 rounded-lg border border-dashed border-orange-300 px-3 py-1.5 text-xs font-semibold text-orange-600 transition hover:border-orange-400 hover:bg-orange-50 disabled:opacity-50 dark:border-orange-500/40 dark:text-orange-400 dark:hover:bg-orange-500/10"
              >
                <span className="text-base leading-none">+</span>
                {isPending ? "Agregando…" : "Pedido extra"}
              </button>
            </td>
          );
        }

        return <td key={column} className={isSticky ? stickyClass : ""} />;
      })}
    </tr>
  );
}

function headerClass(column: ComandaColumnKey, isSticky: boolean) {
  const stickyClass = isSticky
    ? "sticky left-0 z-10 border-r border-border-light bg-surface-alt"
    : "";
  const alignClass =
    column === "puesto" ||
    column === "vendedora" ||
    column === "chofer" ||
    column === "hora"
      ? "text-left"
      : "text-center";
  const toneClass =
    column === "tacos" || column === "tortillas"
      ? "text-orange-500 dark:text-orange-400"
      : column === "bolsas"
        ? BOLSAS_UI_COLORS.th
        : column === "aguas"
          ? AGUAS_UI_COLORS.th
          : column === "hieleras"
            ? "text-cyan-600 dark:text-cyan-400"
            : "text-text-secondary";
  const widthClass =
    column === "puesto"
      ? "min-w-[11rem]"
      : column === "vendedora" || column === "chofer"
        ? "min-w-[10rem]"
        : column === "hora" || column === "estado"
            ? "min-w-[7rem]"
            : "min-w-[5.5rem]";

  return `${stickyClass} px-3 py-4 text-sm font-semibold uppercase ${alignClass} ${toneClass} ${widthClass}`;
}

function headerLabel(column: ComandaColumnKey) {
  switch (column) {
    case "puesto":
      return "Puesto / solicitante";
    case "vendedora":
      return "Vendedora";
    case "tacos":
      return "Tacos";
    case "chofer":
      return "Chofer";
    case "bolsas":
      return "Bolsas";
    case "aguas":
      return "Aguas";
    case "hieleras":
      return "Hieleras";
    case "tortillas":
      return "Tortillas";
    case "hora":
      return "Hora";
    case "estado":
      return "Estado";
  }
}

export function ComandaTable({
  comandaId,
  producciones,
  comandaEstado,
  vendedoras,
  choferes,
}: ComandaTableProps) {
  const isClosed = comandaEstado === "CERRADA";
  const filasOrdenadas = useMemo(() => {
    const copy = [...producciones];
    sortProduccionesComanda(copy);
    return copy;
  }, [producciones]);

  const { order, moveColumn, resetOrder } = useColumnOrder<ComandaColumnKey>(
    "pcs-columns-comanda-tabla",
    DEFAULT_COLUMN_ORDER
  );
  const dragColumnRef = useRef<ComandaColumnKey | null>(null);
  const stickyIdx = order.indexOf("puesto") >= 0 ? order.indexOf("puesto") : 0;

  const assignedVendedoras = new Set(
    producciones.map((p) => p.vendedora).filter(Boolean) as string[]
  );

  const totalTacos = producciones.reduce((s, p) => s + p.tacos, 0);
  const totalBolsas = producciones.reduce((s, p) => s + p.bolsas, 0);
  const totalAguas = producciones.reduce((s, p) => s + p.aguas, 0);
  const totalTortillas = producciones.reduce((s, p) => s + p.tortillas, 0);
  const totalHieleras = producciones.reduce((s, p) => s + p.hieleras, 0);

  function renderBodyCell(
    column: ComandaColumnKey,
    p: ProduccionConPuesto,
    isBase: boolean,
    isAdditional: boolean,
    isSticky: boolean
  ) {
    const stickyClass = isSticky
      ? `sticky left-0 z-10 border-r border-border-light ${
          isAdditional ? "bg-orange-50/30 dark:bg-orange-500/5" : "bg-surface"
        }`
      : "";

    switch (column) {
      case "puesto":
        return (
          <td key={column} className={`${stickyClass} px-4 py-3 text-xl`}>
            {isBase ? (
              <span className="font-bold text-text-primary">{p.puesto.nombre}</span>
            ) : p.puesto.es_fuera_puesto ? (
              <span className="flex min-w-0 items-center gap-1">
                <span className="min-w-0 flex-1">
                  {isClosed ? (
                    <span className="font-bold text-text-primary">
                      {p.solicitante?.trim() || (
                        <span className="text-text-muted font-normal">Sin nombre</span>
                      )}
                    </span>
                  ) : (
                    <EditableCell
                      produccionId={p.id}
                      campo="solicitante"
                      valor={p.solicitante ?? ""}
                      tipo="text"
                      size="lg"
                      className="font-bold"
                    />
                  )}
                </span>
                {!isClosed && <EliminarPedidoButton produccionId={p.id} />}
              </span>
            ) : (
              <span className="flex items-center gap-1">
                <span className="font-bold text-text-primary">{p.puesto.nombre}</span>
                {!isClosed && <EliminarPedidoButton produccionId={p.id} />}
              </span>
            )}
          </td>
        );
      case "vendedora":
        return (
          <td key={column} className="px-2 py-2">
            {isClosed ? (
              <span className="px-2 text-xl text-text-secondary">{p.vendedora || "-"}</span>
            ) : vendedoras.length > 0 ? (
              <SelectCell
                produccionId={p.id}
                campo="vendedora"
                valor={p.vendedora}
                opciones={vendedoras.filter(
                  (v) => !assignedVendedoras.has(v.nombre) || v.nombre === p.vendedora
                )}
                size="lg"
              />
            ) : (
              <EditableCell
                produccionId={p.id}
                campo="vendedora"
                valor={p.vendedora ?? ""}
                size="lg"
              />
            )}
          </td>
        );
      case "tacos":
        return (
          <td key={column} className="px-2 py-2">
            {isClosed ? (
              <span
                className={`block text-center text-xl font-semibold tabular-nums ${
                  p.tacos > 0 ? "text-orange-500 dark:text-orange-400" : "text-text-ghost"
                }`}
              >
                {p.tacos}
              </span>
            ) : (
              <EditableCell
                produccionId={p.id}
                campo="tacos"
                valor={p.tacos}
                tipo="number"
                size="lg"
                positiveValueClassName="text-orange-500 dark:text-orange-400 font-semibold"
              />
            )}
          </td>
        );
      case "chofer":
        return (
          <td key={column} className="px-2 py-2">
            {isClosed ? (
              <span className="px-2 text-xl text-text-secondary">{p.chofer || "-"}</span>
            ) : choferes.length > 0 ? (
              <SelectCell
                produccionId={p.id}
                campo="chofer"
                valor={p.chofer}
                opciones={choferes}
                size="lg"
              />
            ) : (
              <EditableCell
                produccionId={p.id}
                campo="chofer"
                valor={p.chofer ?? ""}
                size="lg"
              />
            )}
          </td>
        );
      case "bolsas":
        return (
          <td key={column} className="px-2 py-2">
            {isClosed ? (
              <span
                className={`block text-center text-xl tabular-nums ${
                  Number(p.bolsas) > 0 ? BOLSAS_UI_COLORS.tdPositive : "text-text-ghost"
                }`}
              >
                {formatBolsasDisplay(Number(p.bolsas))}
              </span>
            ) : (
              <EditableCell
                produccionId={p.id}
                campo="bolsas"
                valor={p.bolsas}
                tipo="decimal"
                maxDecimalPlaces={1}
                size="lg"
                positiveValueClassName={BOLSAS_UI_COLORS.tdPositive}
              />
            )}
          </td>
        );
      case "aguas":
        return (
          <td key={column} className="px-2 py-2">
            {isClosed ? (
              <span
                className={`block text-center text-xl tabular-nums ${
                  p.aguas > 0 ? AGUAS_UI_COLORS.tdPositive : "text-text-ghost"
                }`}
              >
                {p.aguas}
              </span>
            ) : (
              <EditableCell
                produccionId={p.id}
                campo="aguas"
                valor={p.aguas}
                tipo="number"
                size="lg"
                positiveValueClassName={AGUAS_UI_COLORS.tdPositive}
              />
            )}
          </td>
        );
      case "hieleras":
        return (
          <td key={column} className="px-2 py-2">
            {isClosed ? (
              <span
                className={`block text-center text-xl tabular-nums ${
                  p.hieleras > 0
                    ? "font-semibold text-cyan-600 dark:text-cyan-400"
                    : "text-text-ghost"
                }`}
              >
                {p.hieleras}
              </span>
            ) : (
              <EditableCell
                produccionId={p.id}
                campo="hieleras"
                valor={p.hieleras}
                tipo="number"
                size="lg"
                positiveValueClassName="text-cyan-600 dark:text-cyan-400 font-semibold"
              />
            )}
          </td>
        );
      case "tortillas":
        return (
          <td key={column} className="px-2 py-2">
            <span
              className={`block text-center text-xl tabular-nums ${
                p.tortillas > 0 ? TORTILLAS_READONLY_POSITIVE : "text-text-ghost"
              }`}
            >
              {p.tortillas > 0 ? p.tortillas : "-"}
            </span>
          </td>
        );
      case "hora":
        return (
          <td key={column} className="px-2 py-2">
            {isClosed ? (
              <span className="px-2 text-xl text-text-secondary">{p.hora || "-"}</span>
            ) : (
              <EditableCell
                produccionId={p.id}
                campo="hora"
                valor={p.hora ?? ""}
                size="lg"
              />
            )}
          </td>
        );
      case "estado":
        return (
          <td key={column} className="px-3 py-3 text-center">
            <StatusBadge
              produccionId={p.id}
              estado={p.estado}
              disabled={isClosed}
              size="lg"
            />
          </td>
        );
    }
  }

  function renderFooterCell(column: ComandaColumnKey, isSticky: boolean) {
    const stickyClass = isSticky
      ? "sticky left-0 z-10 border-r border-border-light bg-surface-alt"
      : "";

    switch (column) {
      case "puesto":
        return (
          <td key={column} className={`${stickyClass} px-4 py-4 text-xl`}>
            TOTALES
          </td>
        );
      case "tacos":
        return (
          <td
            key={column}
            className={`px-4 py-4 text-center text-xl tabular-nums ${
              totalTacos > 0 ? "text-orange-500 dark:text-orange-400" : "text-text-ghost"
            }`}
          >
            {totalTacos}
          </td>
        );
      case "bolsas":
        return (
          <td
            key={column}
            className={`px-4 py-4 text-center text-xl tabular-nums ${
              totalBolsas > 0 ? BOLSAS_UI_COLORS.tdPositive : "text-text-ghost"
            }`}
          >
            {formatBolsasDisplay(totalBolsas)}
          </td>
        );
      case "aguas":
        return (
          <td
            key={column}
            className={`px-4 py-4 text-center text-xl tabular-nums ${
              totalAguas > 0 ? AGUAS_UI_COLORS.tdPositive : "text-text-ghost"
            }`}
          >
            {totalAguas}
          </td>
        );
      case "hieleras":
        return (
          <td
            key={column}
            className={`px-4 py-4 text-center text-xl tabular-nums ${
              totalHieleras > 0
                ? "font-semibold text-cyan-600 dark:text-cyan-400"
                : "text-text-ghost"
            }`}
          >
            {totalHieleras}
          </td>
        );
      case "tortillas":
        return (
          <td
            key={column}
            className={`px-4 py-4 text-center text-xl tabular-nums ${
              totalTortillas > 0 ? TORTILLAS_READONLY_POSITIVE : "text-text-ghost"
            }`}
          >
            {totalTortillas}
          </td>
        );
      default:
        return <td key={column} className="px-4 py-4" />;
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-end gap-2 text-xs text-text-faint">
        {!isClosed && (
          <ReiniciarVendedorasButton comandaId={comandaId} />
        )}
        <span>Arrastra encabezados para reordenar columnas.</span>
        <button
          type="button"
          onClick={resetOrder}
          className="rounded-lg border border-border bg-surface px-3 py-1.5 font-semibold text-text-secondary transition-colors hover:bg-hover-surface hover:text-text-primary"
        >
          Restablecer
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border bg-surface shadow-sm">
        <table className="w-full min-w-[1400px] table-fixed divide-y divide-border">
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
                  className={`${headerClass(column, index === stickyIdx)} cursor-grab select-none active:cursor-grabbing`}
                >
                  {column === "bolsas" ? (
                    <>
                      <span className="block leading-tight">Bolsas</span>
                      <span className={`mt-0.5 block text-xs font-normal normal-case tracking-normal opacity-90 ${BOLSAS_UI_COLORS.th}`}>
                        salsa tomate
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
            {filasOrdenadas.map((p) => {
              const isBase = p.numero_pedido === 1 && !p.puesto.es_fuera_puesto;
              const isAdditional = !isBase;

              return (
                <tr
                  key={p.id}
                  className={`transition-colors hover:bg-hover-surface ${
                    p.inasistencia ? "bg-red-50/50 dark:bg-red-500/5 opacity-60" : ""
                  } ${isAdditional ? "bg-orange-50/30 dark:bg-orange-500/5" : ""}`}
                >
                  {order.map((column, index) =>
                    renderBodyCell(
                      column,
                      p,
                      isBase,
                      isAdditional,
                      index === stickyIdx
                    )
                  )}
                </tr>
              );
            })}
            {!isClosed && (
              <AgregarPedidoFilaControl comandaId={comandaId} order={order} />
            )}
          </tbody>
          <tfoot className="border-t-2 border-border-strong bg-surface-alt">
            <tr className="font-semibold text-text-primary">
              {order.map((column, index) =>
                renderFooterCell(column, index === stickyIdx)
              )}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
