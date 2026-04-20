"use client";

import { useState } from "react";

function sanitizeOrder<T extends string>(stored: unknown, defaultOrder: readonly T[]) {
  if (!Array.isArray(stored)) return [...defaultOrder];

  const valid = stored.filter(
    (value): value is T =>
      typeof value === "string" && defaultOrder.includes(value as T)
  );

  const missing = defaultOrder.filter((value) => !valid.includes(value));
  return [...valid, ...missing];
}

export function useColumnOrder<T extends string>(
  storageKey: string,
  defaultOrder: readonly T[]
) {
  const [order, setOrder] = useState<T[]>(() => {
    if (typeof window === "undefined") {
      return [...defaultOrder];
    }

    try {
      const raw = window.localStorage.getItem(storageKey);
      if (!raw) return [...defaultOrder];
      return sanitizeOrder<T>(JSON.parse(raw), defaultOrder);
    } catch {
      return [...defaultOrder];
    }
  });

  function persist(nextOrder: T[]) {
    setOrder(nextOrder);
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(nextOrder));
    } catch {
      // Ignore storage errors and keep in-memory order.
    }
  }

  function moveColumn(source: T, target: T) {
    if (source === target) return;

    const sourceIndex = order.indexOf(source);
    const targetIndex = order.indexOf(target);
    if (sourceIndex === -1 || targetIndex === -1) return;

    const nextOrder = [...order];
    const [moved] = nextOrder.splice(sourceIndex, 1);
    nextOrder.splice(targetIndex, 0, moved);
    persist(nextOrder);
  }

  function resetOrder() {
    persist([...defaultOrder]);
  }

  return {
    order,
    moveColumn,
    resetOrder,
  } as const;
}
