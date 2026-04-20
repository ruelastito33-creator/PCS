"use client";

import { useTransition } from "react";
import { RotateCcw } from "lucide-react";
import { reiniciarComandaDesdeCero } from "@/lib/actions/comandas";
import { useDialogs } from "@/components/shared/dialog-provider";

export function ReiniciarComandaBtn({ comandaId }: { comandaId: string }) {
  const { confirm, alert: showAlert } = useDialogs();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    void (async () => {
      const ok = await confirm({
        title: "Reiniciar comanda",
        message:
          "Se borraran cantidades, asignaciones y notas de la comanda actual para empezar de cero.",
        confirmLabel: "Reiniciar",
        cancelLabel: "Cancelar",
        tone: "danger",
      });
      if (!ok) return;

      startTransition(async () => {
        const res = await reiniciarComandaDesdeCero(comandaId);
        if (!res.success) {
          await showAlert({
            title: "No se pudo reiniciar",
            message: res.error,
            variant: "error",
          });
          return;
        }

        await showAlert({
          title: "Comanda reiniciada",
          message: `Se reiniciaron ${res.data.filas} filas.`,
          variant: "success",
        });
      });
    })();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={isPending}
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary shadow-sm transition-colors hover:bg-hover-surface hover:text-text-primary disabled:opacity-50"
    >
      <RotateCcw className="h-4 w-4 shrink-0 text-orange-500" />
      {isPending ? "Reiniciando..." : "Reiniciar comanda"}
    </button>
  );
}
