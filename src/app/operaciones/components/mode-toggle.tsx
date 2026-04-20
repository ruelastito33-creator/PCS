"use client";

import { usePosStore } from "../store/pos-store";

export function ModeToggle() {
  const mode = usePosStore((s) => s.mode);
  const setMode = usePosStore((s) => s.setMode);

  return (
    <div className="flex gap-1 rounded-lg border border-border bg-surface-muted p-1">
      <button
        onClick={() => setMode("tabla")}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          mode === "tabla"
            ? "bg-surface text-text-primary shadow-sm"
            : "text-text-muted hover:text-text-primary"
        }`}
      >
        Tabla
      </button>
      <button
        onClick={() => setMode("pos")}
        className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
          mode === "pos"
            ? "bg-surface text-text-primary shadow-sm"
            : "text-text-muted hover:text-text-primary"
        }`}
      >
        POS
      </button>
    </div>
  );
}
