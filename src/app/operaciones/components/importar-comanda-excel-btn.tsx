"use client";

import { useRef, useTransition } from "react";
import { useRouter } from "next/navigation";
import { FileSpreadsheet, Upload } from "lucide-react";
import { importarComandaExcel } from "@/lib/actions/comandas";
import { useDialogs } from "@/components/shared/dialog-provider";

interface ImportarComandaExcelBtnProps {
  fechaStr: string;
}

export function ImportarComandaExcelBtn({
  fechaStr,
}: ImportarComandaExcelBtnProps) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const { alert: showAlert, confirm } = useDialogs();
  const [isPending, startTransition] = useTransition();

  function handlePickFile() {
    inputRef.current?.click();
  }

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    void (async () => {
      const ok = await confirm({
        title: "Importar comanda desde Excel",
        message:
          "Se creara o actualizara la comanda del dia con las filas incluidas en el archivo. Las filas que no vengan en el Excel se dejan como estan.",
        confirmLabel: "Importar",
        cancelLabel: "Cancelar",
        tone: "primary",
      });

      if (!ok) {
        e.target.value = "";
        return;
      }

      startTransition(async () => {
        const formData = new FormData();
        formData.set("fecha", fechaStr);
        formData.set("archivo", file);

        const result = await importarComandaExcel(formData);
        e.target.value = "";

        if (!result.success) {
          await showAlert({
            title: "No se pudo importar",
            message: result.error,
            variant: "error",
          });
          return;
        }

        await showAlert({
          title: "Comanda importada",
          message: `Filas creadas: ${result.data.creadas}. Filas actualizadas: ${result.data.actualizadas}.`,
          variant: "success",
        });
        router.refresh();
      });
    })();
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={handleChange}
      />

      <div className="flex flex-wrap items-center gap-2">
        <a
          href="/api/comanda-template"
          className="inline-flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 text-sm font-medium text-text-secondary shadow-sm transition-colors hover:bg-hover-surface hover:text-text-primary"
        >
          <FileSpreadsheet className="h-4 w-4 shrink-0 text-emerald-600" />
          Plantilla Excel
        </a>

        <button
          type="button"
          onClick={handlePickFile}
          disabled={isPending}
          className="inline-flex items-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-emerald-700 disabled:opacity-50"
        >
          <Upload className="h-4 w-4 shrink-0" />
          {isPending ? "Importando..." : "Importar Excel"}
        </button>
      </div>
    </>
  );
}
