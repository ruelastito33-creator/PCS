"use client";

import { useTransition } from "react";
import { cerrarComanda } from "@/lib/actions/comandas";
import { useDialogs } from "@/components/shared/dialog-provider";

interface CerrarComandaBtnProps {
  comandaId: string;
}

export function CerrarComandaBtn({ comandaId }: CerrarComandaBtnProps) {
  const { confirm, alert: showAlert } = useDialogs();
  const [isPending, startTransition] = useTransition();

  function handleClick() {
    void (async () => {
      const ok = await confirm({
        title: "Cerrar comanda del día",
        message: "Esta acción no se puede deshacer. ¿Continuar?",
        tone: "danger",
        confirmLabel: "Cerrar comanda",
        cancelLabel: "Cancelar",
      });
      if (!ok) return;
      startTransition(async () => {
        const result = await cerrarComanda(comandaId);
        if (!result.success) {
          await showAlert({
            title: "No se pudo cerrar",
            message: result.error,
            variant: "error",
          });
        }
      });
    })();
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="rounded-lg bg-red-600 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-red-700 disabled:opacity-50"
    >
      {isPending ? "Cerrando..." : "Cerrar Comanda del Día"}
    </button>
  );
}
