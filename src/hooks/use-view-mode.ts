"use client";

import { useState, useCallback } from "react";

export type ViewMode = "tabla" | "pos";

/**
 * Hook for persisting table/POS view preference per page.
 * Stores in localStorage with a page-specific key.
 */
export function useViewMode(pageKey: string, defaultMode: ViewMode = "tabla") {
  const storageKey = `pcs-view-${pageKey}`;
  const [mode, setModeState] = useState<ViewMode>(defaultMode);

  const setMode = useCallback(
    (m: ViewMode) => {
      setModeState(m);
      if (typeof window !== "undefined") {
        localStorage.setItem(storageKey, m);
      }
    },
    [storageKey]
  );

  return { mode, setMode, hydrated: true } as const;
}
