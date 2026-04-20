"use client";

import { useTransition } from "react";
import { actualizarCampo } from "@/lib/actions/produccion";
import { useDialogs } from "@/components/shared/dialog-provider";

interface Opcion {
  id: number;
  nombre: string;
}

interface SelectCellProps {
  produccionId: string;
  campo: "vendedora" | "chofer" | "proveedora_tacos_id";
  /** Nombre actual (vendedora / chofer) o ignorado si `campo === "proveedora_tacos_id"`. */
  valor: string | null;
  /** Id de proveedora de tacos cuando `campo === "proveedora_tacos_id"`. */
  valorId?: number | null;
  opciones: Opcion[];
  size?: "default" | "lg";
}

export function SelectCell({
  produccionId,
  campo,
  valor,
  valorId,
  opciones,
  size = "default",
}: SelectCellProps) {
  const pad = size === "lg" ? "px-3 py-2" : "px-2 py-1";
  const text = size === "lg" ? "text-xl" : "text-sm";
  const { alert: showAlert } = useDialogs();
  const [isPending, startTransition] = useTransition();

  const isProveedora = campo === "proveedora_tacos_id";
  const selectValue = isProveedora
    ? valorId != null && valorId > 0
      ? String(valorId)
      : ""
    : valor ?? "";
  const hasValue = isProveedora ? selectValue !== "" : Boolean(valor);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const raw = e.target.value;
    startTransition(async () => {
      const payload = isProveedora
        ? raw === ""
          ? null
          : parseInt(raw, 10)
        : raw;
      const result = await actualizarCampo(produccionId, campo, payload);
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
    <select
      value={selectValue}
      onChange={handleChange}
      disabled={isPending}
      className={`w-full rounded border ${pad} ${text} focus:outline-none focus:ring-1 focus:ring-orange-500 ${
        hasValue
          ? "border-border bg-input-bg text-text-primary"
          : "border-border bg-input-bg text-text-faint"
      } ${isPending ? "animate-pulse opacity-50" : ""}`}
    >
      <option value="">— Sin asignar —</option>
      {opciones.map((o) => (
        <option key={o.id} value={isProveedora ? String(o.id) : o.nombre}>
          {o.nombre}
        </option>
      ))}
    </select>
  );
}
