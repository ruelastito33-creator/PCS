"use client";

import { useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { actualizarCampo } from "@/lib/actions/produccion";
import { useDialogs } from "@/components/shared/dialog-provider";
import { useNumpad } from "@/components/shared/numpad-sheet";
import {
  parseDecimalInput,
  decimalsEqual,
  formatDecimalDisplay,
  roundToOneDecimal,
  parseBolsasInput,
  formatBolsasDisplay,
} from "@/lib/decimal";

interface EditableCellProps {
  produccionId: string;
  campo: string;
  valor: string | number;
  tipo?: "text" | "number" | "decimal";
  maxDecimalPlaces?: number;
  positiveValueClassName?: string;
  size?: "default" | "lg";
  className?: string;
}

export function EditableCell({
  produccionId,
  campo,
  valor,
  tipo = "text",
  maxDecimalPlaces,
  positiveValueClassName,
  size = "default",
  className = "",
}: EditableCellProps) {
  const pad = size === "lg" ? "px-3 py-2" : "px-2 py-1";
  const text = size === "lg" ? "text-xl" : "text-sm";
  const router = useRouter();
  const { alert: showAlert } = useDialogs();
  const { open: openNumpad } = useNumpad();
  const [editingText, setEditingText] = useState(false);
  const [localText, setLocalText] = useState(String(valor ?? ""));
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const displayVal = useMemo(() => {
    if (tipo === "number") return valor || 0;
    if (tipo === "decimal" && maxDecimalPlaces === 1) {
      return formatBolsasDisplay(Number(valor ?? 0));
    }
    if (tipo === "decimal") {
      return formatDecimalDisplay(Number(valor ?? 0));
    }
    return valor || "-";
  }, [tipo, maxDecimalPlaces, valor]);

  function resetTextValue() {
    setLocalText(String(valor ?? ""));
  }

  async function saveValue(rawValue: string | number) {
    const newVal =
      tipo === "number"
        ? parseInt(String(rawValue), 10) || 0
        : tipo === "decimal" && maxDecimalPlaces === 1
          ? parseBolsasInput(String(rawValue))
          : tipo === "decimal"
            ? parseDecimalInput(String(rawValue))
            : String(rawValue);

    if (tipo === "decimal" && maxDecimalPlaces === 1) {
      if (
        decimalsEqual(newVal as number, roundToOneDecimal(Number(valor ?? 0)))
      ) {
        return;
      }
    } else if (tipo === "decimal") {
      if (decimalsEqual(newVal as number, Number(valor ?? 0))) return;
    } else if (String(newVal) === String(valor ?? "")) {
      return;
    }

    const result = await actualizarCampo(produccionId, campo, newVal);
    if (!result.success) {
      throw new Error(result.error);
    }
  }

  function handleTextSave() {
    setEditingText(false);
    startTransition(async () => {
      try {
        await saveValue(localText);
        router.refresh();
      } catch (error) {
        resetTextValue();
        await showAlert({
          title: "No se pudo guardar",
          message: error instanceof Error ? error.message : "Error desconocido",
          variant: "error",
        });
      }
    });
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      handleTextSave();
    } else if (e.key === "Escape") {
      resetTextValue();
      setEditingText(false);
    }
  }

  function openNumericPad() {
    void openNumpad({
      label: campo.charAt(0).toUpperCase() + campo.slice(1).replace(/_/g, " "),
      currentValue:
        tipo === "decimal" && maxDecimalPlaces === 1
          ? formatBolsasDisplay(Number(valor ?? 0))
          : tipo === "decimal"
            ? formatDecimalDisplay(Number(valor ?? 0))
            : String(Number(valor ?? 0)),
      mode: tipo === "decimal" ? "decimal" : "integer",
      maxLength: tipo === "decimal" ? 10 : 7,
      maxDecimalPlaces: maxDecimalPlaces ?? 1,
      onSave: async (val) => {
        try {
          await saveValue(val);
          router.refresh();
        } catch (error) {
          await showAlert({
            title: "No se pudo guardar",
            message: error instanceof Error ? error.message : "Error desconocido",
            variant: "error",
          });
        }
      },
    });
  }

  if (editingText) {
    return (
      <input
        ref={inputRef}
        autoFocus
        type="text"
        value={localText}
        onChange={(e) => setLocalText(e.target.value)}
        onBlur={handleTextSave}
        onKeyDown={handleKeyDown}
        className={`w-full rounded border border-orange-300 bg-orange-50 ${pad} ${text} text-text-primary focus:outline-none focus:ring-1 focus:ring-orange-500 dark:border-orange-500/30 dark:bg-orange-500/10 ${className}`}
      />
    );
  }

  const displayTextClass =
    positiveValueClassName && (tipo === "number" || tipo === "decimal")
      ? Number(valor ?? 0) > 0
        ? positiveValueClassName
        : "text-text-ghost"
      : "text-text-primary";

  return (
    <button
      onClick={() => {
        if (tipo === "number" || tipo === "decimal") {
          openNumericPad();
        } else {
          setLocalText(String(valor ?? ""));
          setEditingText(true);
        }
      }}
      disabled={isPending}
      className={`w-full cursor-pointer rounded ${pad} ${text} hover:bg-orange-50 dark:hover:bg-orange-500/10 ${
        isPending ? "animate-pulse opacity-50" : ""
      } ${tipo === "number" || tipo === "decimal" ? "text-center" : "text-left"} ${displayTextClass} ${className}`}
      title="Clic para editar"
    >
      {displayVal}
    </button>
  );
}
