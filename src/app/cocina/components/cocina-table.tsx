"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { EditableCell } from "@/app/operaciones/components/editable-cell";
import { SelectCell } from "@/app/operaciones/components/select-cell";
import { StatusBadge } from "@/app/operaciones/components/status-badge";
import {
  INSUMOS_ITEMS,
  insumosDataWithTomateFromBolsas,
  formatInsumoValorDisplay,
  AGUAS_UI_COLORS,
  INSUMO_UI_COLORS,
  type InsumoKey,
  type InsumosData,
} from "@/lib/insumos-config";
import {
  esInsumoFraccion,
  parseFraccionA_decimal,
  textoFraccionBienFormado,
} from "@/lib/fraccion";
import { actualizarCampo, actualizarEstadoMasivo } from "@/lib/actions/produccion";
import { useDialogs } from "@/components/shared/dialog-provider";
import {
  parseDecimalInput,
  decimalsEqual,
  parseBolsasInput,
  formatBolsasDisplay,
  roundToOneDecimal,
} from "@/lib/decimal";
import { useColumnOrder } from "@/hooks/use-column-order";
import type {
  Produccion,
  Puesto,
  ComandaEstado,
  ProduccionEstado,
  ProveedoraTacos,
} from "@prisma/client";

type ProduccionConPuesto = Produccion & {
  puesto: Puesto;
  proveedora_tacos: ProveedoraTacos | null;
};

type CocinaColumnKey =
  | "puesto"
  | "proveedora"
  | "tacos"
  | "tortillas"
  | "aguas"
  | "estado"
  | `insumo:${InsumoKey}`;

const COCINA_TACOS_TH =
  "text-orange-500 dark:text-orange-400 font-semibold uppercase tracking-wide";
const COCINA_TORTILLAS_TH =
  "text-orange-500 dark:text-orange-400 font-semibold uppercase tracking-wide";
const TORTILLAS_TD_POSITIVE =
  "text-orange-600 dark:text-orange-400 font-semibold";
const COCINA_PROVEEDORA_TH =
  "text-fuchsia-600 dark:text-fuchsia-400 font-semibold uppercase tracking-wide";
const STICKY_SELECTION_OFFSET = "left-14";
const BULK_STATUS_OPTIONS: readonly ProduccionEstado[] = [
  "PENDIENTE",
  "EN_PROCESO",
  "LISTO",
  "ENTREGADO",
];

interface CocinaTableProps {
  producciones: ProduccionConPuesto[];
  comandaEstado: ComandaEstado;
  proveedorasOpciones: ProveedoraTacos[];
}

function groupByPuesto(producciones: ProduccionConPuesto[]) {
  const groups: { puestoId: number; puesto: Puesto; rows: ProduccionConPuesto[] }[] = [];
  const map = new Map<number, (typeof groups)[number]>();

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

function buildDefaultColumnOrder() {
  return [
    "puesto",
    "proveedora",
    "tacos",
    "tortillas",
    ...INSUMOS_ITEMS.map((item) => `insumo:${item.key}` as const),
    "aguas",
    "estado",
  ] as readonly CocinaColumnKey[];
}

function InsumoDecimalCell({
  produccionId,
  insumos,
  insumoKey,
  disabled,
  size = "lg",
}: {
  produccionId: string;
  insumos: InsumosData;
  insumoKey: InsumoKey;
  disabled: boolean;
  size?: "default" | "lg";
}) {
  const router = useRouter();
  const pad = size === "lg" ? "px-3 py-2" : "px-2 py-1";
  const text = size === "lg" ? "text-xl" : "text-sm";
  const { alert: showAlert } = useDialogs();
  const current = Number((insumos as Record<string, number>)[insumoKey] ?? 0);
  const isTomate = insumoKey === "tomate";
  const isFraccion = esInsumoFraccion(insumoKey);
  const tone = INSUMO_UI_COLORS[insumoKey];
  const [editing, setEditing] = useState(false);
  const [localValue, setLocalValue] = useState(() =>
    isTomate ? formatBolsasDisplay(current) : formatInsumoValorDisplay(insumoKey, current)
  );
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  function handleSave() {
    setEditing(false);
    let newNum: number;
    if (isTomate) {
      newNum = parseBolsasInput(localValue);
    } else if (isFraccion) {
      if (!textoFraccionBienFormado(localValue)) {
        setLocalValue(formatInsumoValorDisplay(insumoKey, current));
        void showAlert({
          title: "Cantidad inválida",
          message: "Usa números o fracción (ej. 1, 1/2, 1/6).",
          variant: "error",
        });
        return;
      }
      newNum = parseFraccionA_decimal(localValue);
    } else {
      newNum = Math.max(0, parseDecimalInput(localValue));
    }

    if (isTomate) {
      if (decimalsEqual(newNum, roundToOneDecimal(current))) return;
    } else if (decimalsEqual(newNum, current)) {
      return;
    }

    const updated = { ...(insumos as Record<string, number>), [insumoKey]: newNum };
    startTransition(async () => {
      const res = await actualizarCampo(produccionId, "insumos", updated);
      if (!res.success) {
        setLocalValue(
          isTomate ? formatBolsasDisplay(current) : formatInsumoValorDisplay(insumoKey, current)
        );
        await showAlert({
          title: "No se pudo guardar",
          message: res.error,
          variant: "error",
        });
      } else {
        router.refresh();
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") handleSave();
    else if (e.key === "Escape") {
      setLocalValue(
        isTomate ? formatBolsasDisplay(current) : formatInsumoValorDisplay(insumoKey, current)
      );
      setEditing(false);
    }
  }

  if (disabled) {
    return (
      <span
        className={`block text-center ${text} tabular-nums ${
          current > 0 ? tone.tdPositive : "text-text-ghost"
        }`}
      >
        {isTomate ? formatBolsasDisplay(current) : formatInsumoValorDisplay(insumoKey, current)}
      </span>
    );
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type={isFraccion ? "text" : "number"}
        inputMode={isFraccion ? "text" : "decimal"}
        step={isTomate ? "0.1" : isFraccion ? undefined : "any"}
        min={isFraccion ? undefined : 0}
        value={localValue}
        onChange={(e) => {
          const v = e.target.value.replace(",", ".");
          if (isTomate) {
            if (v === "" || /^\d*\.?\d{0,1}$/.test(v)) setLocalValue(v);
          } else if (isFraccion) {
            if (v === "" || /^[\d\s./]*$/.test(v)) setLocalValue(v);
          } else {
            setLocalValue(v);
          }
        }}
        onBlur={handleSave}
        onKeyDown={handleKeyDown}
        className={`w-full rounded border border-orange-300 bg-orange-50 text-center ${pad} ${text} text-text-primary focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-orange-500/30 dark:bg-orange-500/10`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setLocalValue(
          isTomate ? formatBolsasDisplay(current) : formatInsumoValorDisplay(insumoKey, current)
        );
        setEditing(true);
      }}
      disabled={isPending}
      className={`w-full cursor-pointer rounded text-center ${pad} ${text} tabular-nums hover:bg-orange-50 dark:hover:bg-orange-500/10 ${
        current > 0 ? tone.tdPositive : "text-text-ghost"
      } ${isPending ? "animate-pulse opacity-50" : ""}`}
      title="Clic para editar"
    >
      {isTomate ? formatBolsasDisplay(current) : formatInsumoValorDisplay(insumoKey, current)}
    </button>
  );
}

function headerLabel(column: CocinaColumnKey) {
  if (column.startsWith("insumo:")) {
    const key = column.slice(7) as InsumoKey;
    return INSUMOS_ITEMS.find((item) => item.key === key)?.label ?? key;
  }

  switch (column) {
    case "puesto":
      return "Puesto / solicitante";
    case "proveedora":
      return "Proveedora";
    case "tacos":
      return "Tacos";
    case "tortillas":
      return "Tortillas";
    case "aguas":
      return "Aguas";
    case "estado":
      return "Estado";
  }
}

export function CocinaTable({
  producciones,
  comandaEstado,
  proveedorasOpciones,
}: CocinaTableProps) {
  const router = useRouter();
  const { alert: showAlert, confirm } = useDialogs();
  const isClosed = comandaEstado === "CERRADA";
  const groups = groupByPuesto(producciones);
  const defaultOrder = buildDefaultColumnOrder();
  const { order, moveColumn, resetOrder } = useColumnOrder<CocinaColumnKey>(
    "pcs-columns-cocina-tabla",
    defaultOrder
  );
  const dragColumnRef = useRef<CocinaColumnKey | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [bulkEstado, setBulkEstado] = useState<ProduccionEstado>("EN_PROCESO");
  const [isBulkPending, startBulkTransition] = useTransition();

  const totalTortillas = producciones.reduce((s, p) => s + p.tortillas, 0);
  const totalTacos = producciones.reduce((s, p) => s + p.tacos, 0);
  const totalAguas = producciones.reduce((s, p) => s + p.aguas, 0);
  const insumoTotals: Record<string, number> = {};

  for (const item of INSUMOS_ITEMS) {
    insumoTotals[item.key] = producciones.reduce((sum, p) => {
      const data = insumosDataWithTomateFromBolsas({
        insumos: p.insumos,
        bolsas: p.bolsas,
      });
      return sum + ((data as Record<string, number>)[item.key] ?? 0);
    }, 0);
  }

  const opcionesProveedora = proveedorasOpciones.map((o) => ({
    id: o.id,
    nombre: o.nombre,
  }));

  const selectableIds = producciones
    .filter((p) => !isClosed && !p.inasistencia)
    .map((p) => p.id);
  const selectableSet = new Set(selectableIds);
  const effectiveSelectedIds = selectedIds.filter((id) => selectableSet.has(id));
  const selectedCount = effectiveSelectedIds.length;
  const allSelected =
    selectableIds.length > 0 && effectiveSelectedIds.length === selectableIds.length;
  const isIndeterminate =
    effectiveSelectedIds.length > 0 && effectiveSelectedIds.length < selectableIds.length;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = isIndeterminate;
    }
  }, [isIndeterminate]);

  function toggleSelected(id: string, checked: boolean) {
    setSelectedIds((prev) => {
      if (checked) return prev.includes(id) ? prev : [...prev, id];
      return prev.filter((item) => item !== id);
    });
  }

  function toggleSelectAll(checked: boolean) {
    setSelectedIds(checked ? selectableIds : []);
  }

  async function handleBulkEstado() {
    if (effectiveSelectedIds.length === 0) {
      await showAlert({
        title: "Sin seleccion",
        message: "Marca al menos una fila para cambiar el estado masivamente.",
        variant: "info",
      });
      return;
    }

    const accepted = await confirm({
      title: "Cambiar estado en bloque",
      message: `Se cambiaran ${effectiveSelectedIds.length} fila${effectiveSelectedIds.length === 1 ? "" : "s"} a ${bulkEstado.replace("_", " ")}.`,
      confirmLabel: "Aplicar cambio",
      cancelLabel: "Cancelar",
      tone: "primary",
    });

    if (!accepted) return;

    startBulkTransition(async () => {
      const result = await actualizarEstadoMasivo(effectiveSelectedIds, bulkEstado);
      if (!result.success) {
        await showAlert({
          title: "No se pudo cambiar el estado",
          message: result.error,
          variant: "error",
        });
        return;
      }

      setSelectedIds([]);
      router.refresh();
      await showAlert({
        title: "Estados actualizados",
        message: `Se actualizaron ${result.data.updated} fila${result.data.updated === 1 ? "" : "s"}.`,
        variant: "success",
      });
    });
  }

  function headerClass(column: CocinaColumnKey, isSticky: boolean) {
    const stickyClass = isSticky
      ? `sticky ${STICKY_SELECTION_OFFSET} z-10 border-r border-border-light bg-surface-alt`
      : "";
    const widthClass =
      column === "puesto"
        ? "min-w-[10rem]"
        : column === "proveedora"
          ? "min-w-[10rem]"
          : column.startsWith("insumo:")
            ? "min-w-[7rem]"
            : "min-w-[5.5rem]";
    const alignClass =
      column === "puesto" ? "text-left" : "text-center";

    let toneClass = "text-text-muted";
    if (column === "proveedora") toneClass = COCINA_PROVEEDORA_TH;
    if (column === "tacos") toneClass = COCINA_TACOS_TH;
    if (column === "tortillas") toneClass = COCINA_TORTILLAS_TH;
    if (column === "aguas") toneClass = AGUAS_UI_COLORS.th;
    if (column === "estado") toneClass = "text-text-muted";
    if (column.startsWith("insumo:")) {
      const key = column.slice(7) as InsumoKey;
      toneClass = `${INSUMO_UI_COLORS[key].th} font-semibold uppercase tracking-wide`;
    }

    return `${stickyClass} px-3 py-4 text-sm ${alignClass} ${widthClass} ${toneClass}`;
  }

  function renderBodyCell(
    column: CocinaColumnKey,
    p: ProduccionConPuesto,
    isBase: boolean,
    isAdditional: boolean,
    isSticky: boolean
  ) {
    const data = insumosDataWithTomateFromBolsas({
      insumos: p.insumos,
      bolsas: p.bolsas,
    });
    const stickyClass = isSticky
      ? `sticky ${STICKY_SELECTION_OFFSET} z-10 border-r border-border-light ${
          isAdditional ? "bg-orange-50/30 dark:bg-orange-500/5" : "bg-surface"
        }`
      : "";

    if (column.startsWith("insumo:")) {
      return (
        <td key={column} className="px-1 py-1">
          <InsumoDecimalCell
            produccionId={p.id}
            insumos={data}
            insumoKey={column.slice(7) as InsumoKey}
            disabled={isClosed || p.inasistencia}
            size="lg"
          />
        </td>
      );
    }

    switch (column) {
      case "puesto":
        return (
          <td key={column} className={`${stickyClass} px-4 py-3 text-xl`}>
            {isBase ? (
              <span className="font-bold text-text-primary">{p.puesto.nombre}</span>
            ) : p.puesto.es_fuera_puesto ? (
              <span className="flex flex-col gap-0.5 pl-2">
                <span className="flex items-center gap-1.5">
                  <span className="text-sm text-orange-400">↳</span>
                  <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                    Pedido #{p.numero_pedido}
                  </span>
                </span>
                <span className="pl-5 text-sm font-bold text-text-primary break-words">
                  {p.solicitante?.trim() || (
                    <span className="font-normal text-text-muted">Sin nombre</span>
                  )}
                </span>
              </span>
            ) : (
              <span className="flex items-center gap-1.5 pl-3">
                <span className="text-sm text-orange-400">↳</span>
                <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">
                  Pedido #{p.numero_pedido}
                </span>
              </span>
            )}
          </td>
        );
      case "proveedora":
        return (
          <td key={column} className="min-w-[10rem] px-2 py-2 align-middle">
            {isClosed || p.inasistencia ? (
              <span
                className={`block text-center text-xl font-semibold ${
                  p.proveedora_tacos
                    ? "text-fuchsia-600 dark:text-fuchsia-400"
                    : "text-text-ghost"
                }`}
              >
                {p.proveedora_tacos?.nombre ?? "-"}
              </span>
            ) : (
              <SelectCell
                produccionId={p.id}
                campo="proveedora_tacos_id"
                valor={null}
                valorId={p.proveedora_tacos_id}
                opciones={opcionesProveedora}
                size="lg"
              />
            )}
          </td>
        );
      case "tacos":
        return (
          <td
            key={column}
            className={`px-4 py-3 text-center text-xl font-semibold tabular-nums ${
              p.tacos > 0 ? "text-orange-500 dark:text-orange-400" : "text-text-ghost"
            }`}
          >
            {p.tacos}
          </td>
        );
      case "tortillas":
        return (
          <td key={column} className="px-2 py-2">
            {isClosed ? (
              <span
                className={`block text-center text-xl tabular-nums ${
                  p.tortillas > 0 ? TORTILLAS_TD_POSITIVE : "text-text-ghost"
                }`}
              >
                {p.tortillas}
              </span>
            ) : (
              <EditableCell
                produccionId={p.id}
                campo="tortillas"
                valor={p.tortillas}
                tipo="number"
                size="lg"
                positiveValueClassName={TORTILLAS_TD_POSITIVE}
              />
            )}
          </td>
        );
      case "aguas":
        return (
          <td key={column} className="px-2 py-2">
            {isClosed || p.inasistencia ? (
              <span
                className={`block text-center text-xl tabular-nums ${
                  p.aguas > 0 ? AGUAS_UI_COLORS.tdPositive : "text-text-ghost"
                }`}
              >
                {p.aguas > 0 ? p.aguas : "-"}
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
      case "estado":
        return (
          <td key={column} className="px-3 py-3 text-center">
            <StatusBadge
              produccionId={p.id}
              estado={p.estado}
              disabled={isClosed || p.inasistencia}
              size="lg"
            />
          </td>
        );
    }
  }

  function renderFooterCell(column: CocinaColumnKey, isSticky: boolean) {
    const stickyClass = isSticky
      ? `sticky ${STICKY_SELECTION_OFFSET} z-10 border-r border-border-light bg-surface-alt`
      : "";

    if (column.startsWith("insumo:")) {
      const key = column.slice(7) as InsumoKey;
      const total = insumoTotals[key] ?? 0;
      return (
        <td
          key={column}
          className={`px-3 py-4 text-center text-xl font-bold tabular-nums ${
            total > 0 ? INSUMO_UI_COLORS[key].tdPositive : "text-text-ghost"
          }`}
        >
          {formatInsumoValorDisplay(key, total)}
        </td>
      );
    }

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
            className={`px-4 py-4 text-center text-xl font-semibold tabular-nums ${
              totalTacos > 0 ? "text-orange-500 dark:text-orange-400" : "text-text-ghost"
            }`}
          >
            {totalTacos}
          </td>
        );
      case "tortillas":
        return (
          <td
            key={column}
            className={`px-4 py-4 text-center text-xl font-semibold tabular-nums ${
              totalTortillas > 0 ? TORTILLAS_TD_POSITIVE : "text-text-ghost"
            }`}
          >
            {totalTortillas}
          </td>
        );
      case "aguas":
        return (
          <td
            key={column}
            className={`px-4 py-4 text-center text-xl font-bold tabular-nums ${
              totalAguas > 0 ? AGUAS_UI_COLORS.tdPositive : "text-text-ghost"
            }`}
          >
            {totalAguas}
          </td>
        );
      default:
        return <td key={column} className="px-3 py-4 text-center text-sm text-text-faint">-</td>;
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-surface-alt px-3 py-1.5 text-xs font-semibold text-text-secondary">
            {selectedCount} seleccionada{selectedCount === 1 ? "" : "s"}
          </span>
          <select
            value={bulkEstado}
            onChange={(e) => setBulkEstado(e.target.value as ProduccionEstado)}
            disabled={isClosed || isBulkPending}
            className="rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-primary outline-none transition focus:border-orange-400"
          >
            {BULK_STATUS_OPTIONS.map((estado) => (
              <option key={estado} value={estado}>
                {estado.replace("_", " ")}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleBulkEstado}
            disabled={isClosed || isBulkPending || selectedCount === 0}
            className="rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {isBulkPending ? "Aplicando..." : "Cambiar estados"}
          </button>
        </div>

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
      </div>

      <div className="overflow-x-auto rounded-xl border border-border bg-surface">
        <table className="min-w-full divide-y divide-border">
          <thead className="bg-surface-alt">
            <tr>
              <th className="w-14 min-w-14 px-3 py-4 text-center">
                <input
                  ref={selectAllRef}
                  type="checkbox"
                  checked={allSelected}
                  disabled={selectableIds.length === 0 || isBulkPending}
                  onChange={(e) => toggleSelectAll(e.target.checked)}
                  className="h-4 w-4 rounded border-border text-orange-500 focus:ring-orange-400"
                  title="Seleccionar todas"
                />
              </th>
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
                      <span className="block text-[0.65rem] font-bold normal-case tracking-normal opacity-90">
                        de tacos
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
            {groups.map((group) =>
              group.rows.map((p) => {
                const isBase = p.numero_pedido === 1 && !p.puesto.es_fuera_puesto;
                const isAdditional = !isBase;
                const isSelectable = !isClosed && !p.inasistencia;
                const isChecked = effectiveSelectedIds.includes(p.id);

                return (
                  <tr
                    key={p.id}
                    className={`hover:bg-hover-surface ${
                      p.inasistencia ? "opacity-35" : ""
                    } ${isAdditional ? "bg-orange-50/30 dark:bg-orange-500/5" : ""}`}
                  >
                    <td className="px-3 py-3 text-center align-middle">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={!isSelectable || isBulkPending}
                        onChange={(e) => toggleSelected(p.id, e.target.checked)}
                        className="h-4 w-4 rounded border-border text-orange-500 focus:ring-orange-400"
                        title="Seleccionar fila"
                      />
                    </td>
                    {order.map((column, index) =>
                      renderBodyCell(column, p, isBase, isAdditional, index === 0)
                    )}
                  </tr>
                );
              })
            )}
          </tbody>
          <tfoot className="border-t-2 border-border-strong bg-surface-alt">
            <tr className="font-semibold text-text-primary">
              <td className="px-3 py-4 text-center text-sm text-text-faint">-</td>
              {order.map((column, index) => renderFooterCell(column, index === 0))}
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
