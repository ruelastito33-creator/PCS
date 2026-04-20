"use client";

import { useState, useTransition, useRef, useEffect } from "react";
import type { ActionResult } from "@/lib/types";
import { useDialogs } from "@/components/shared/dialog-provider";

interface CatalogItem {
  id: number;
  nombre: string;
  is_active: boolean;
}

interface CatalogTableProps {
  items: CatalogItem[];
  onAdd: (nombre: string) => Promise<ActionResult>;
  onRename: (id: number, nombre: string) => Promise<ActionResult>;
  onToggle: (id: number) => Promise<ActionResult>;
  addPlaceholder?: string;
}

function CatalogRow({
  item,
  idx,
  onRename,
  onToggle,
  isToggling,
  startToggle,
}: {
  item: CatalogItem;
  idx: number;
  onRename: (id: number, nombre: string) => Promise<ActionResult>;
  onToggle: (id: number) => Promise<ActionResult>;
  isToggling: boolean;
  startToggle: (fn: () => void) => void;
}) {
  const { alert: showAlert } = useDialogs();
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState(item.nombre);
  const [isRenamePending, startRename] = useTransition();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { setValue(item.nombre); }, [item.nombre]);
  useEffect(() => { if (editing) inputRef.current?.focus(); }, [editing]);

  function handleSave() {
    setEditing(false);
    if (value.trim() === item.nombre) return;
    startRename(async () => {
      const res = await onRename(item.id, value.trim());
      if (!res.success) {
        await showAlert({ title: "No se pudo guardar", message: res.error, variant: "error" });
        setValue(item.nombre);
      }
    });
  }

  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 transition-colors hover:bg-hover-surface ${!item.is_active ? "opacity-40" : ""}`}>
      {/* Index */}
      <span className="w-6 shrink-0 text-center text-xs tabular-nums text-text-faint">
        {idx + 1}
      </span>

      {/* Name */}
      <div className="min-w-0 flex-1">
        {editing ? (
          <input
            ref={inputRef}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSave();
              if (e.key === "Escape") { setValue(item.nombre); setEditing(false); }
            }}
            className="w-full rounded-lg border border-orange-400 bg-orange-50 px-3 py-1.5 text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-orange-400/30 dark:bg-orange-500/10"
          />
        ) : (
          <button
            type="button"
            onClick={() => setEditing(true)}
            disabled={isRenamePending}
            title="Clic para renombrar"
            className="group/btn flex w-full items-center gap-2 rounded-lg px-3 py-1.5 text-left text-sm font-medium text-text-primary hover:bg-orange-50 dark:hover:bg-orange-500/10 disabled:opacity-50"
          >
            <span className={isRenamePending ? "animate-pulse" : ""}>{value}</span>
            <svg className="ml-auto h-3.5 w-3.5 shrink-0 text-text-ghost opacity-0 group-hover/btn:opacity-100 transition-opacity" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a2 2 0 01-1.414.586H9v-1.414a2 2 0 01.586-1.414z" />
            </svg>
          </button>
        )}
      </div>

      {/* Toggle */}
      <button
        type="button"
        onClick={() =>
          startToggle(async () => {
            const res = await onToggle(item.id);
            if (!res.success) {
              await showAlert({ title: "No se pudo actualizar", message: res.error, variant: "error" });
            }
          })
        }
        disabled={isToggling}
        title={item.is_active ? "Desactivar" : "Activar"}
        className={`inline-flex h-7 w-12 shrink-0 items-center rounded-full transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 ${
          item.is_active
            ? "bg-green-500 focus-visible:ring-green-500"
            : "bg-zinc-300 dark:bg-zinc-600 focus-visible:ring-zinc-400"
        } disabled:opacity-40`}
      >
        <span className={`inline-block h-5 w-5 rounded-full bg-white shadow-md transition-transform ${item.is_active ? "translate-x-6" : "translate-x-1"}`} />
      </button>
    </div>
  );
}

export function CatalogTable({
  items,
  onAdd,
  onRename,
  onToggle,
  addPlaceholder = "Nuevo nombre…",
}: CatalogTableProps) {
  const { alert: showAlert } = useDialogs();
  const [newNombre, setNewNombre] = useState("");
  const [isAdding, startAdd] = useTransition();
  const [isToggling, startToggle] = useTransition();

  const activeCount = items.filter((i) => i.is_active).length;

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!newNombre.trim()) return;
    startAdd(async () => {
      const res = await onAdd(newNombre.trim());
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
      <div className="flex items-center justify-between border-b border-border bg-surface-alt px-4 py-2.5">
        <span className="text-xs text-text-muted">
          <span className="font-semibold text-text-primary">{activeCount}</span> activos
          {" · "}
          <span className="font-semibold text-text-primary">{items.length}</span> total
        </span>
        <span className="text-xs text-text-faint">Clic en el nombre para renombrar</span>
      </div>

      {/* List */}
      <div className="divide-y divide-border-light">
        {items.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-text-faint">
            Sin registros. Agrega el primero abajo.
          </div>
        ) : (
          items.map((item, idx) => (
            <CatalogRow
              key={item.id}
              item={item}
              idx={idx}
              onRename={onRename}
              onToggle={onToggle}
              isToggling={isToggling}
              startToggle={startToggle}
            />
          ))
        )}
      </div>

      {/* Add form */}
      <div className="border-t border-border bg-surface-alt/60 px-4 py-3">
        <form onSubmit={handleAdd} className="flex gap-2">
          <input
            value={newNombre}
            onChange={(e) => setNewNombre(e.target.value)}
            placeholder={addPlaceholder}
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
