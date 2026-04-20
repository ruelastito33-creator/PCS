"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { reiniciarVendedorasComanda } from "@/lib/actions/comandas";
import { useDialogs } from "@/components/shared/dialog-provider";
import { UserX } from "lucide-react";

interface ReiniciarVendedorasBtnProps {
  comandaId: string;
  disabled?: boolean;
}

export function ReiniciarVendedorasBtn({
  comandaId,
  disabled,
}: ReiniciarVendedorasBtnProps) {
  const router = useRouter();
  const { confirm, alert: showAlert } = useDialogs();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    void (async () => {
      const ok = await confirm({
        title: "Reiniciar vendedoras",
        message:
          "Se quitará la vendedora en todos los puestos y pedidos extra de esta comanda.",
        tone: "primary",
        confirmLabel: "Reiniciar",
        cancelLabel: "Cancelar",
      });
      if (!ok) return;
      startTransition(async () => {
        const res = await reiniciarVendedorasComanda(comandaId);
        if (!res.success) {
          await showAlert({
            title: "No se pudo reiniciar",
            message: res.error,
            variant: "error",
          });
          return;
        }
        const n = res.data?.filas ?? 0;
        if (n === 0) {
          await showAlert({
            title: "Sin cambios",
            message: "No había vendedoras asignadas.",
            variant: "info",
          });
        }
        router.refresh();
      });
    })();
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={disabled || isPending}
      title="Quitar vendedora de todas las filas"
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary shadow-sm transition-colors hover:bg-hover-surface hover:text-text-primary disabled:cursor-not-allowed disabled:opacity-50"
    >
      <UserX className="h-4 w-4 shrink-0 text-orange-500" aria-hidden />
      {isPending ? "Reiniciando…" : "Reiniciar vendedoras"}
    </button>
  );
}
