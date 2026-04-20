"use client";

import { useTransition } from "react";
import { EditableCell } from "@/app/operaciones/components/editable-cell";
import { actualizarCampo } from "@/lib/actions/produccion";
import { useDialogs } from "@/components/shared/dialog-provider";
import {
  insumosDataWithTomateFromBolsas,
  INSUMO_UI_COLORS,
  AGUAS_UI_COLORS,
} from "@/lib/insumos-config";
import { CIERRE_TABLE_TH, TORTILLAS_TD_CLASS } from "@/lib/cierre-table-display";
import { formatBolsasDisplay } from "@/lib/decimal";
import { etiquetaPuestoProduccion } from "@/lib/puesto-fuera";
import type { Produccion, Puesto, ComandaEstado, ProveedoraTacos } from "@prisma/client";

type ProduccionConPuesto = Produccion & {
  puesto: Puesto;
  proveedora_tacos: ProveedoraTacos | null;
};

interface CierreTableProps {
  producciones: ProduccionConPuesto[];
  comandaEstado: ComandaEstado;
}

const TH = CIERRE_TABLE_TH;
const TORTILLAS_TD = TORTILLAS_TD_CLASS;

function InasistenciaToggle({
  produccionId,
  inasistencia,
  disabled,
}: {
  produccionId: string;
  inasistencia: boolean;
  disabled: boolean;
}) {
  const { alert: showAlert } = useDialogs();
  const [isPending, startTransition] = useTransition();

  function handleToggle() {
    if (disabled) return;
    startTransition(async () => {
      const result = await actualizarCampo(produccionId, "inasistencia", !inasistencia);
      if (!result.success) {
        await showAlert({
          title: "No se pudo actualizar",
          message: result.error,
          variant: "error",
        });
      }
    });
  }

  return (
    <button
      onClick={handleToggle}
      disabled={disabled || isPending}
      className={`inline-flex rounded-full px-3 py-1.5 text-sm font-bold transition-colors ${
        inasistencia
          ? "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-500/30"
          : "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/25"
      } ${disabled ? "cursor-default" : "cursor-pointer"} ${isPending ? "animate-pulse opacity-50" : ""}`}
    >
      {inasistencia ? "Sí" : "No"}
    </button>
  );
}

export function CierreTable({ producciones, comandaEstado }: CierreTableProps) {
  const isClosed = comandaEstado === "CERRADA";

  return (
    <div className="overflow-x-auto rounded-xl border-2 border-border bg-surface">
      <table className="min-w-[1320px] w-full table-fixed divide-y divide-border">
        <colgroup>
          <col className="w-[9.5rem]" />
          <col className="w-[8.5rem]" />
          <col className="w-[5.25rem]" />
          <col className="w-[4.75rem]" />
          <col className="w-[4.25rem]" />
          <col className="w-[5.5rem]" />
          <col className="w-[8rem]" />
          <col className="w-[4.25rem]" />
          <col className="w-[7.5rem]" />
          <col />
        </colgroup>
        <thead className="bg-surface-alt">
          <tr>
            <th className={`sticky left-0 z-10 bg-surface-alt px-3 py-3 text-left text-xs font-black uppercase tracking-wide ${TH.puesto}`}>
              Puesto
            </th>
            <th
              className={`px-2 py-3 text-center text-xs font-black uppercase leading-tight ${TH.proveedora}`}
            >
              <span className="block">Proveedora</span>
              <span className="block text-[0.6rem] font-bold normal-case tracking-normal opacity-90">
                de tacos
              </span>
            </th>
            <th
              className={`px-2 py-3 text-center text-xs font-black uppercase leading-tight ${TH.tomate}`}
            >
              <span className="block">Salsa</span>
              <span className="block text-[0.6rem] font-bold normal-case tracking-normal opacity-90">
                tomate
              </span>
            </th>
            <th className={`px-2 py-3 text-center text-xs font-black uppercase tracking-wide ${TH.tortillas}`}>
              Tortillas
            </th>
            <th className={`px-2 py-3 text-center text-xs font-black uppercase tracking-wide ${TH.tacos}`}>
              Tacos
            </th>
            <th className={`px-2 py-3 text-center text-xs font-black uppercase tracking-wide ${TH.sobrantes}`}>
              Sobrantes
            </th>
            <th className={`px-2 py-3 text-center text-xs font-black uppercase tracking-wide ${TH.vendedora}`}>
              Vendedora
            </th>
            <th className={`px-2 py-3 text-center text-xs font-black uppercase tracking-wide ${TH.aguas}`}>
              Aguas
            </th>
            <th
              className={`px-2 py-3 text-center text-[10px] font-black uppercase leading-tight ${TH.inasistencia}`}
            >
              Inasistencia
            </th>
            <th className={`px-3 py-3 text-left text-xs font-black uppercase tracking-wide ${TH.notas}`}>
              Notas
            </th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light">
          {producciones.map((p) => {
            const sob = p.tacos_sobrantes ?? 0;
            const ins = insumosDataWithTomateFromBolsas({
              insumos: p.insumos,
              bolsas: p.bolsas,
            });
            const tomateVal = Number((ins as Record<string, number>).tomate ?? 0);
            return (
            <tr
              key={p.id}
              className={`hover:bg-hover-surface ${p.inasistencia ? "bg-red-50/50 dark:bg-red-500/[0.08]" : ""}`}
            >
              <td className="sticky left-0 z-10 border-r border-border-light bg-surface px-3 py-2.5 text-sm font-bold text-text-primary">
                <span className="block truncate" title={etiquetaPuestoProduccion(p)}>
                  {etiquetaPuestoProduccion(p)}
                </span>
                {p.numero_pedido > 1 && (
                  <span className="text-xs font-semibold text-orange-500">#{p.numero_pedido}</span>
                )}
              </td>
              <td className="px-2 py-2.5 text-center align-middle">
                <span
                  className={`block truncate text-sm font-semibold ${
                    p.proveedora_tacos
                      ? "text-fuchsia-600 dark:text-fuchsia-400"
                      : "text-text-ghost"
                  }`}
                  title={p.proveedora_tacos?.nombre}
                >
                  {p.proveedora_tacos?.nombre ?? "—"}
                </span>
              </td>
              <td className="px-2 py-2.5 text-center align-middle">
                <span
                  className={`text-base font-black tabular-nums ${
                    tomateVal > 0
                      ? INSUMO_UI_COLORS.tomate.tdPositive
                      : "text-text-ghost"
                  }`}
                >
                  {formatBolsasDisplay(tomateVal)}
                </span>
              </td>
              <td className="px-2 py-2.5 text-center align-middle">
                <span
                  className={`text-base font-black tabular-nums ${
                    p.tortillas > 0 ? TORTILLAS_TD : "text-text-ghost"
                  }`}
                >
                  {p.tortillas}
                </span>
              </td>
              <td className="px-2 py-2.5 text-center align-middle">
                <span className="text-base font-black tabular-nums text-emerald-600 dark:text-emerald-400">
                  {p.tacos}
                </span>
              </td>
              <td className="px-1.5 py-1.5 align-middle">
                {isClosed ? (
                  <span
                    className={`block text-center text-base font-black tabular-nums ${
                      sob > 0 ? "text-orange-600 dark:text-orange-400" : "text-text-ghost"
                    }`}
                  >
                    {sob}
                  </span>
                ) : (
                  <EditableCell
                    produccionId={p.id}
                    campo="tacos_sobrantes"
                    valor={p.tacos_sobrantes ?? 0}
                    tipo="number"
                    size="lg"
                    positiveValueClassName="text-orange-600 dark:text-orange-400"
                  />
                )}
              </td>
              <td className="px-2 py-2.5 text-center align-middle min-w-0">
                <span
                  className={`block truncate text-sm font-semibold ${
                    p.vendedora ? "text-sky-700 dark:text-sky-300" : "text-text-ghost"
                  }`}
                  title={p.vendedora ?? undefined}
                >
                  {p.vendedora ?? "—"}
                </span>
              </td>
              <td className="px-2 py-2.5 text-center align-middle">
                <span
                  className={`text-base font-black tabular-nums ${
                    p.aguas > 0 ? AGUAS_UI_COLORS.tdPositive : "text-text-ghost"
                  }`}
                >
                  {p.aguas > 0 ? p.aguas : "—"}
                </span>
              </td>
              <td className="px-2 py-2.5 text-center align-middle">
                <InasistenciaToggle produccionId={p.id} inasistencia={p.inasistencia} disabled={isClosed} />
              </td>
              <td className="px-2 py-1.5 align-middle min-w-0">
                {isClosed ? (
                  <span className={`block truncate text-sm leading-snug ${p.notas ? "text-violet-700 dark:text-violet-300" : "text-text-ghost"}`} title={p.notas ?? undefined}>
                    {p.notas || "—"}
                  </span>
                ) : (
                  <EditableCell
                    produccionId={p.id}
                    campo="notas"
                    valor={p.notas ?? ""}
                    size="lg"
                    className={
                      (p.notas ?? "").trim()
                        ? "text-violet-700 dark:text-violet-300"
                        : "text-text-ghost"
                    }
                  />
                )}
              </td>
            </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
