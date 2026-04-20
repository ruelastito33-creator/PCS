"use client";

import type { ViewMode } from "@/hooks/use-view-mode";

interface ViewToggleProps {
  mode: ViewMode;
  setMode: (m: ViewMode) => void;
}

export function ViewToggle({ mode, setMode }: ViewToggleProps) {
  return (
    <div className="inline-flex gap-0.5 rounded-xl bg-surface-muted p-1">
      <button
        onClick={() => setMode("tabla")}
        className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
          mode === "tabla"
            ? "bg-surface text-text-primary shadow-sm"
            : "text-text-faint hover:text-text-secondary"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="1" y="1" width="14" height="14" rx="2" />
            <path d="M1 5.5h14M1 10.5h14M5.5 1v14" />
          </svg>
          Tabla
        </span>
      </button>
      <button
        onClick={() => setMode("pos")}
        className={`rounded-lg px-4 py-2 text-sm font-semibold transition-all ${
          mode === "pos"
            ? "bg-surface text-text-primary shadow-sm"
            : "text-text-faint hover:text-text-secondary"
        }`}
      >
        <span className="flex items-center gap-1.5">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
            <rect x="1" y="1" width="6" height="6" rx="1.5" />
            <rect x="9" y="1" width="6" height="6" rx="1.5" />
            <rect x="1" y="9" width="6" height="6" rx="1.5" />
            <rect x="9" y="9" width="6" height="6" rx="1.5" />
          </svg>
          POS
        </span>
      </button>
    </div>
  );
}
