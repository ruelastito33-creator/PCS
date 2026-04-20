"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import type { Puesto } from "@prisma/client";
import type { ActionResult } from "@/lib/types";
import { useDialogs } from "@/components/shared/dialog-provider";
import {
  crearPuesto,
  renombrarPuesto,
  togglePuestoActivo,
  actualizarPuestoFracciones,
  sincronizarDefaultsInsumosComandaAbierta,
} from "@/lib/actions/catalogos";
import { FRACCIONES_PRESETS } from "@/lib/fraccion";

function defaultFraccion(v: string | null | undefined): string {
  const t = (v ?? "").trim();
  return t || "1";
}

function FraccionCell({
  value,
  onChange,
  onSave,
  onPresetClick,
  disabled,
  label,
  color,
}: {
  value: string;
  onChange: (v: string) => void;
  onSave: () => void;
  onPresetClick: (preset: string) => void;
  disabled: boolean;
  label: string;
  color: "red" | "amber";
}) {
  const colorClasses = {
    red: {
      preset: "border-red-200 bg-red-50 text-red-800 hover:bg-red-100 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300 dark:hover:bg-red-500/20",
      active: "border-red-500 bg-red-500 text-white dark:border-red-400 dark:bg-red-500",
      input: "focus:border-red-400 focus:ring-red-400/30",
    },
    amber: {
      preset: "border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300 dark:hover:bg-amber-500/20",
      active: "border-amber-500 bg-amber-500 text-white dark:border-amber-400 dark:bg-amber-500",
      input: "focus:border-amber-400 focus:ring-amber-400/30",
    },
  };
  const c = colorClasses[color];

  return (
    <div className="space-y-1.5">
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onBlur={onSave}
        onKeyDown={(e) => e.key === "Enter" && onSave()}
        disabled={disabled}
        placeholder="1"
        aria-label={label}
        className={`w-full rounded-lg border border-input-border bg-input-bg px-2 py-1.5 text-center text-sm font-semibold text-text-primary transition focus:outline-none focus:ring-2 disabled:opacity-40 ${c.input}`}
      />
      <div className="flex flex-wrap gap-1 justify-center">
        {FRACCIONES_PRESETS.map((p) => (
          <button
            key={p}
            type="button"
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onPresetClick(p)}
            className={`min-w-[2rem] rounded-md border px-1.5 py-1 text-xs font-semibold transition-all disabled:opacity-40 ${
              value === p ? c.active + " shadow-sm" : c.preset
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function PuestoRow({
  puesto,
  idx,
  isToggling,
  startToggle,
}: {
  puesto: Puesto;
  idx: number;
  isToggling: boolean;
  startToggle: (fn: () => void) => void;
}) {
  const { alert: showAlert } = useDialogs();
  const [editing, setEditing] = useState(false);
  const [nombre, setNombre] = useState(puesto.nombre);
  const [isRenamePending, startRename] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  const [sr, setSr] = useState(() => defaultFraccion(puesto.salsa_roja_default));
  const [cb, setCb] = useState(() => defaultFraccion(puesto.cebolla_default));
  const [isFraccionPending, startFraccion] = useTransition();

  useEffect(() => {
    setNombre(puesto.nombre);
    setSr(defaultFraccion(puesto.salsa_roja_default));
    setCb(defaultFraccion(puesto.cebolla_default));
  }, [puesto]);

  useEffect(() => {
    if (editing) inputRef.current?.focus();
  }, [editing]);

  function handleRenameSave() {
    setEditing(false);
    if (nombre.trim() === puesto.nombre) return;
    startRename(async () => {
      const res = await renombrarPuesto(puesto.id, nombre.trim());
      if (!res.success) {
        await showAlert({ title: "No se pudo guardar", message: res.error, variant: "error" });
        setNombre(puesto.nombre);
      }
    });
  }

  function persistFracciones(nextSr: string, nextCb: string) {
    const ns = defaultFraccion(nextSr);
    const nc = defaultFraccion(nextCb);
    if (ns === defaultFraccion(puesto.salsa_roja_default) && nc === defaultFraccion(puesto.cebolla_default)) return;
    startFraccion(async () => {
      const res = await actualizarPuestoFracciones(puesto.id, ns, nc);
      if (!res.success) {
        await showAlert({ title: "No se pudo guardar", message: res.error, variant: "error" });
        setSr(defaultFraccion(puesto.salsa_roja_default));
        setCb(defaultFraccion(puesto.cebolla_default));
      }
    });
  }

  const isPending = isRenamePending || isFraccionPending;

  return (
    <tr className={`group transition-colors hover:bg-hover-surface ${!puesto.is_active ? "opacity-40" : ""}`}>
      {/* # */}
      <td className="w-10 px-3 py-3 text-center text-sm tabular-nums text-text-faint">
        {idx + 1}
      </td>

      {/* Nombre */}
      <td className="px-2 py-2 min-w-[9rem]">
        {editing ? (
          <input
            ref={inputRef}
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            onBlur={handleRenameSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleRenameSave();
              if (e.key === "Escape") { setNombre(puesto.nombre); setEditing(false); }
            }}
            className="w-full rounded-lg border border-orange-400 bg-orange-50 px-3 py-1.5 text-sm font-semibold text-text-primary focus:outline-none focus:ring-2 focus:ring-orange-400/30 dark:bg-orange-500/10"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={isPending}
            title="Clic para renombrar"
            className="group/btn flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm font-semibold text-text-primary hover:bg-orange-50 dark:hover:bg-orange-500/10 disabled:opacity-50"
          >
            <span className={isPending ? "animate-pulse" : ""}>{nombre}</span>
            <svg className="ml-auto h-3.5 w-3.5 shrink-0 text-text-ghost opacity-0 group-hover/btn:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-1.414a2 2 0 01.586-1.414z" />
            </svg>
          </button>
        )}
      </td>

      {/* Salsa roja */}
      <td className="px-3 py-2 w-32">
        <FraccionCell
          value={sr}
          onChange={setSr}
          onSave={() => persistFracciones(sr, cb)}
          onPresetClick={(p) => { setSr(p); persistFracciones(p, cb); }}
          disabled={isPending}
          label="Salsa roja"
          color="red"
        />
      </td>

      {/* Cebolla */}
      <td className="px-3 py-2 w-32">
        <FraccionCell
          value={cb}
          onChange={setCb}
          onSave={() => persistFracciones(sr, cb)}
          onPresetClick={(p) => { setCb(p); persistFracciones(sr, p); }}
          disabled={isPending}
          label="Cebolla"
          color="amber"
        />
      </td>

      {/* Activo toggle */}
      <td className="px-3 py-3 text-center w-20">
        <button
          type="button"
          onClick={() =>
            startToggle(async () => {
              const res = await togglePuestoActivo(puesto.id);
              if (!res.success) {
                await showAlert({ title: "No se pudo actualizar", message: res.error, variant: "error" });
              }
            })
          }
          disabled={isToggling}
          title={puesto.is_active ? "Desactivar puesto" : "Activar puesto"}
          className={`inline-flex h-7 w-12 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
            puesto.is_active
              ? "bg-green-500 focus-visible:ring-green-500"
              : "bg-zinc-300 dark:bg-zinc-600 focus-visible:ring-zinc-400"
          } disabled:opacity-40`}
        >
          <span
            className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform ${
              puesto.is_active ? "translate-x-6" : "translate-x-1"
            }`}
          />
        </button>
      </td>
    </tr>
  );
}

export function PuestosTable({ items }: { items: Puesto[] }) {
  const { alert: showAlert } = useDialogs();
  const [newNombre, setNewNombre] = useState("");
  const [isAdding, startAdd] = useTransition();
  const [isToggling, startToggle] = useTransition();
  const [isSyncing, startSync] = useTransition();

  const activeCount = items.filter((p) => p.is_active).length;

  function handleSync() {
    startSync(async () => {
      const res = await sincronizarDefaultsInsumosComandaAbierta();
      if (res.success) {
        await showAlert({
          title: "Sincronizado",
          message: `Se actualizaron ${res.data?.filas ?? 0} filas con los defaults de S. Roja y Cebolla.`,
          variant: "success",
        });
      } else {
        await showAlert({ title: "Error", message: res.error, variant: "error" });
      }
    });
  }

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newNombre.trim()) return;
    startAdd(async () => {
      const res = await crearPuesto(newNombre.trim());
      if (res.success) {
        setNewNombre("");
      } else {
        await showAlert({ title: "No se pudo agregar", message: res.error, variant: "error" });
      }
    });
  }

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface shadow-sm">
      {/* Stats bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-surface-alt px-4 py-2.5">
        <span className="text-xs text-text-muted">
          <span className="font-semibold text-text-primary">{activeCount}</span> activos
          {" · "}
          <span className="font-semibold text-text-primary">{items.length}</span> total
        </span>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={handleSync}
            disabled={isSyncing}
            className="rounded-lg border border-orange-300 bg-orange-50 px-3 py-1.5 text-xs font-semibold text-orange-700 transition hover:bg-orange-100 disabled:opacity-50 dark:border-orange-500/30 dark:bg-orange-500/10 dark:text-orange-300 dark:hover:bg-orange-500/20"
          >
            {isSyncing ? "Sincronizando…" : "Aplicar defaults a comanda abierta"}
          </button>
          <span className="text-xs text-text-faint">Clic en el nombre para renombrar</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-border-light">
          <thead className="bg-surface-alt/60">
            <tr>
              <th className="w-10 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-text-faint">#</th>
              <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-text-muted">Nombre</th>
              <th className="w-32 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-red-600 dark:text-red-400">S. Roja</th>
              <th className="w-32 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-amber-600 dark:text-amber-400">Cebolla</th>
              <th className="w-20 px-3 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-text-muted">Activo</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light">
            {items.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-sm text-text-faint">
                  Sin puestos aún. Agrega el primero abajo.
                </td>
              </tr>
            ) : (
              items.map((p, idx) => (
                <PuestoRow
                  key={p.id}
                  puesto={p}
                  idx={idx}
                  isToggling={isToggling}
                  startToggle={startToggle}
                />
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add form */}
      <div className="border-t border-border bg-surface-alt/60 px-4 py-3">
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            value={newNombre}
            onChange={(e) => setNewNombre(e.target.value)}
            placeholder="Nombre del nuevo puesto…"
            disabled={isAdding}
            className="min-w-0 flex-1 rounded-lg border border-input-border bg-input-bg px-3 py-2 text-sm text-text-primary placeholder:text-text-ghost focus:border-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400/20 disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={isAdding || !newNombre.trim()}
            className="shrink-0 rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-700 disabled:opacity-40"
          >
            {isAdding ? "Agregando…" : "+ Agregar"}
          </button>
        </form>
      </div>
    </div>
  );
}
