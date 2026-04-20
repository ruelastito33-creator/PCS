"use client";

import { useState, useEffect, useCallback } from "react";

export type ViewMode = "tabla" | "pos";

/**
 * Hook for persisting table/POS view preference per page.
 * Stores in localStorage with a page-specific key.
 */
export function useViewMode(pageKey: string, defaultMode: ViewMode = "tabla") {
  const storageKey = `pcs-view-${pageKey}`;
  const [mode, setModeState] = useState<ViewMode>(defaultMode);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(storageKey);
    if (stored === "tabla" || stored === "pos") {
      setModeState(stored);
    }
    setHydrated(true);
  }, [storageKey]);

  const setMode = useCallback(
    (m: ViewMode) => {
      setModeState(m);
      localStorage.setItem(storageKey, m);
    },
    [storageKey]
  );

  return { mode, setMode, hydrated } as const;
}
