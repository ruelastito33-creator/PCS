"use client";

import { useEffect, useRef, useCallback } from "react";
import type { SSEEvent } from "@/lib/sse/events";

interface UseSSEOptions {
  onEvent: (event: SSEEvent) => void;
  enabled?: boolean;
}

export function useSSE({ onEvent, enabled = true }: UseSSEOptions) {
  const onEventRef = useRef(onEvent);
  onEventRef.current = onEvent;

  const connect = useCallback(() => {
    if (!enabled) return;

    const es = new EventSource("/api/sse");
    let retryDelay = 1000;

    es.onmessage = (e) => {
      try {
        const event: SSEEvent = JSON.parse(e.data);
        onEventRef.current(event);
      } catch {
        // Ignore malformed events
      }
    };

    es.onerror = () => {
      es.close();
      // Reconnect with exponential backoff (max 30s)
      setTimeout(() => {
        retryDelay = Math.min(retryDelay * 2, 30_000);
        connect();
      }, retryDelay);
    };

    es.onopen = () => {
      retryDelay = 1000;
    };

    return es;
  }, [enabled]);

  useEffect(() => {
    const es = connect();
    return () => es?.close();
  }, [connect]);
}
