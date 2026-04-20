"use client";

import { useMemo, useState } from "react";
import { crearComanda, precargarComandaDesdeOrigen } from "@/lib/actions/comandas";
import { useDialogs } from "@/components/shared/dialog-provider";

interface CrearComandaBtnProps {
  fechaStr: string;
  /** Si existe, el modal aplica datos sobre esa comanda (no crea otra). */
  comandaId?: string | null;
}

/** Límites yyyy-MM-dd del mes calendario de `fechaStr` (mismo criterio que parseFechaUTC). */
function boundsMes(fechaStr: string) {
  const [ys, ms] = fechaStr.split("-");
  const y = Number(ys);
  const m = Number(ms);
  const min = `${ys}-${ms}-01`;
  const lastDay = new Date(Date.UTC(y, m, 0)).getUTCDate();
  const max = `${ys}-${ms}-${String(lastDay).padStart(2, "0")}`;
  return { min, max };
}

function primeraFechaOrigenValida(target: string, min: string, max: string) {
  if (target !== min) return min;
  if (target !== max) return max;
  return min;
}

export function CrearComandaBtn({ fechaStr, comandaId = null }: CrearComandaBtnProps) {
  const precargarModo = Boolean(comandaId);
  const { alert: showAlert, confirm } = useDialogs();
  const [open, setOpen] = useState(false);
  const [origenTipo, setOrigenTipo] = useState<"ultima" | "dia">("ultima");
  const [fechaOrigen, setFechaOrigen] = useState(fechaStr);
  const [applying, setApplying] = useState(false);

  const { min, max } = useMemo(() => boundsMes(fechaStr), [fechaStr]);

  function abrirModal() {
    setOrigenTipo("ultima");
    setFechaOrigen(primeraFechaOrigenValida(fechaStr, min, max));
    setOpen(true);
  }

  function cerrarModal() {
    setOpen(false);
  }

  async function aplicarDesdeDatos() {
    if (applying) return;

    if (precargarModo && comandaId) {
      const ok = await confirm({
        title: "Actualizar datos de la comanda",
        message:
          "Se copiarán vendedoras, tacos, choferes y demás campos desde la fuente elegida. Las filas que coincidan (mismo puesto y número de pedido) se sobrescribirán.",
        confirmLabel: "Aplicar",
        cancelLabel: "Cancelar",
        tone: "primary",
      });
      if (!ok) return;
    }

    setApplying(true);
    try {
      if (precargarModo && comandaId) {
        const result =
          origenTipo === "ultima"
            ? await precargarComandaDesdeOrigen(comandaId, "ultima")
            : await precargarComandaDesdeOrigen(comandaId, "desde_fecha", {
                fechaOrigen: fechaOrigen,
              });

        if (!result.success) {
          await showAlert({
            title: "No se pudo aplicar",
            message: result.error,
            variant: "error",
          });
          return;
        }

        cerrarModal();
        await showAlert({
          title: "Datos actualizados",
          message:
            origenTipo === "ultima"
              ? "Se aplicaron los datos de la última comanda anterior a este día."
              : `Se copiaron los datos del día ${fechaOrigen}.`,
          variant: "success",
        });
        return;
      }

      const result =
        origenTipo === "ultima"
          ? await crearComanda(fechaStr, "ultima")
          : await crearComanda(fechaStr, "desde_fecha", {
              fechaOrigen: fechaOrigen,
            });

      if (!result.success) {
        await showAlert({
          title: "No se pudo crear la comanda",
          message: result.error,
          variant: "error",
        });
        return;
      }

      cerrarModal();
      await showAlert({
        title: "Comanda creada",
        message:
          origenTipo === "ultima"
            ? "Se precargó con los datos de la última comanda anterior a hoy."
            : `Se copiaron los datos del día ${fechaOrigen}.`,
        variant: "success",
      });
    } catch (e) {
      await showAlert({
        title: "Error de red",
        message:
          e instanceof Error ? e.message : "No se pudo completar la operación.",
        variant: "error",
      });
    } finally {
      setApplying(false);
    }
  }

  async function handleCreateBlank() {
    if (applying) return;
    const ok = await confirm({
      title: "Crear comanda vacía",
      message:
        "Esto creará la comanda del día sin copiar datos de otra comanda.",
      confirmLabel: "Crear vacía",
      cancelLabel: "Cancelar",
      tone: "primary",
    });
    if (!ok) return;

    setApplying(true);
    try {
      const result = await crearComanda(fechaStr, "cero");
      if (!result.success) {
        await showAlert({
          title: "No se pudo crear la comanda",
          message: result.error,
          variant: "error",
        });
        return;
      }
      await showAlert({
        title: "Comanda creada",
        message: "Se creó una comanda limpia para empezar de cero.",
        variant: "success",
      });
    } catch (e) {
      await showAlert({
        title: "Error de red",
        message:
          e instanceof Error ? e.message : "No se pudo completar la operación.",
        variant: "error",
      });
    } finally {
      setApplying(false);
    }
  }

  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={abrirModal}
          disabled={applying}
          className="rounded-lg bg-orange-600 px-5 py-3 text-sm font-medium text-white shadow-sm hover:bg-orange-700 disabled:opacity-50"
        >
          {applying
            ? precargarModo
              ? "Aplicando…"
              : "Creando…"
            : precargarModo
              ? "Cargar datos desde…"
              : "Crear con datos iniciales…"}
        </button>
        {!precargarModo && (
          <button
            type="button"
            onClick={handleCreateBlank}
            disabled={applying}
            className="rounded-lg border border-border bg-surface px-4 py-3 text-sm font-medium text-text-secondary shadow-sm hover:bg-hover-surface hover:text-text-primary disabled:opacity-50"
          >
            Empezar de cero
          </button>
        )}
      </div>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="crear-comanda-titulo"
          onClick={() => {
            if (!applying) cerrarModal();
          }}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-surface p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h3
              id="crear-comanda-titulo"
              className="text-lg font-semibold text-text-primary"
            >
              {precargarModo ? "Cargar datos en la comanda" : "Datos iniciales de la comanda"}
            </h3>
            <p className="mt-1 text-sm text-text-muted">
              {precargarModo ? (
                <>
                  Comanda del{" "}
                  <span className="font-medium text-text-primary">{fechaStr}</span>.
                  Elige la fuente (mismo mes calendario).
                </>
              ) : (
                <>
                  Elige de dónde copiar vendedoras, tacos, choferes y demás campos
                  (mismo mes que el día de la comanda:{" "}
                  <span className="font-medium text-text-primary">{fechaStr}</span>
                  ).
                </>
              )}
            </p>

            <div className="mt-4 space-y-3">
              <label className="flex cursor-pointer gap-3 rounded-lg border border-border p-3 has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50/50 dark:has-[:checked]:bg-orange-500/10">
                <input
                  type="radio"
                  name="origen"
                  className="mt-1"
                  checked={origenTipo === "ultima"}
                  onChange={() => setOrigenTipo("ultima")}
                />
                <span>
                  <span className="block font-medium text-text-primary">
                    Última comanda anterior
                  </span>
                  <span className="text-sm text-text-muted">
                    {precargarModo
                      ? "La más reciente con fecha anterior a la de esta comanda."
                      : "Copia la comanda más reciente con fecha anterior a hoy."}
                  </span>
                </span>
              </label>

              <label className="flex cursor-pointer gap-3 rounded-lg border border-border p-3 has-[:checked]:border-orange-400 has-[:checked]:bg-orange-50/50 dark:has-[:checked]:bg-orange-500/10">
                <input
                  type="radio"
                  name="origen"
                  className="mt-1"
                  checked={origenTipo === "dia"}
                  onChange={() => setOrigenTipo("dia")}
                />
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-text-primary">
                    Día concreto del mes
                  </span>
                  <span className="text-sm text-text-muted">
                    Copia una comanda que ya exista en cualquier día de este mes.
                  </span>
                  {origenTipo === "dia" && (
                    <input
                      type="date"
                      min={min}
                      max={max}
                      value={fechaOrigen}
                      onChange={(e) => setFechaOrigen(e.target.value)}
                      className="mt-2 w-full rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-text-primary"
                    />
                  )}
                </span>
              </label>
            </div>

            <div className="mt-6 flex flex-wrap justify-end gap-2">
              <button
                type="button"
                onClick={cerrarModal}
                disabled={applying}
                className="rounded-lg border border-border px-4 py-2 text-sm font-medium text-text-secondary hover:bg-hover-surface disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={aplicarDesdeDatos}
                disabled={applying}
                className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-medium text-white hover:bg-orange-700 disabled:opacity-50"
              >
                {applying
                  ? precargarModo
                    ? "Aplicando…"
                    : "Creando…"
                  : precargarModo
                    ? "Aplicar datos"
                    : "Crear comanda"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
