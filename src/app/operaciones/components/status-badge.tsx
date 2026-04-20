"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { actualizarEstado } from "@/lib/actions/produccion";
import { useDialogs } from "@/components/shared/dialog-provider";
import type { ProduccionEstado } from "@prisma/client";

const STATUS_CONFIG: Record<
  ProduccionEstado,
  { label: string; bg: string; next: ProduccionEstado | null }
> = {
  PENDIENTE: {
    label: "Pendiente",
    bg: "bg-surface-muted text-text-secondary hover:bg-hover-surface-strong",
    next: "EN_PROCESO",
  },
  EN_PROCESO: {
    label: "En Proceso",
    bg: "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400 hover:bg-yellow-200 dark:hover:bg-yellow-500/30",
    next: "LISTO",
  },
  LISTO: {
    label: "Listo",
    bg: "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400 hover:bg-green-200 dark:hover:bg-green-500/30",
    next: "ENTREGADO",
  },
  ENTREGADO: {
    label: "Entregado",
    bg: "bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400",
    next: null,
  },
};

interface StatusBadgeProps {
  produccionId: string;
  estado: ProduccionEstado;
  disabled?: boolean;
  size?: "default" | "lg";
}

export function StatusBadge({
  produccionId,
  estado,
  disabled = false,
  size = "default",
}: StatusBadgeProps) {
  const textPad =
    size === "lg" ? "px-4 py-2 text-sm font-semibold" : "px-3 py-1 text-xs font-medium";
  const router = useRouter();
  const { alert: showAlert } = useDialogs();
  const [isPending, startTransition] = useTransition();
  const config = STATUS_CONFIG[estado];

  function handleClick() {
    if (!config.next || disabled) return;

    startTransition(async () => {
      const result = await actualizarEstado(produccionId, config.next!);
      if (!result.success) {
        await showAlert({
          title: "No se pudo cambiar estado",
          message: result.error,
          variant: "error",
        });
      } else {
        router.refresh();
      }
    });
  }

  const isClickable = config.next && !disabled;

  return (
    <button
      onClick={handleClick}
      disabled={!isClickable || isPending}
      className={`inline-flex rounded-full transition-colors ${textPad} ${
        config.bg
      } ${isClickable ? "cursor-pointer" : "cursor-default"} ${
        isPending ? "animate-pulse opacity-50" : ""
      }`}
      title={isClickable && config.next ? `Cambiar a: ${STATUS_CONFIG[config.next].label}` : undefined}
    >
      {config.label}
    </button>
  );
}
