"use client";

import { useEffect, useRef } from "react";
import type { SSEEvent } from "@/lib/sse/events";

interface UseSSEOptions {
  onEvent: (event: SSEEvent) => void;
  enabled?: boolean;
}

export function useSSE({ onEvent, enabled = true }: UseSSEOptions) {
  const onEventRef = useRef(onEvent);

  useEffect(() => {
    onEventRef.current = onEvent;
  }, [onEvent]);

  useEffect(() => {
    if (!enabled) return;

    let retryDelay = 1000;
    let source: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
    let disposed = false;

    const connect = () => {
      if (disposed) return;

      source = new EventSource("/api/sse");

      source.onmessage = (e) => {
        try {
          const event: SSEEvent = JSON.parse(e.data);
          onEventRef.current(event);
        } catch {
          // Ignore malformed events
        }
      };

      source.onerror = () => {
        source?.close();
        reconnectTimer = setTimeout(() => {
          retryDelay = Math.min(retryDelay * 2, 30_000);
          connect();
        }, retryDelay);
      };

      source.onopen = () => {
        retryDelay = 1000;
      };
    };

    connect();

    return () => {
      disposed = true;
      if (reconnectTimer) clearTimeout(reconnectTimer);
      source?.close();
    };
  }, [enabled]);
}
