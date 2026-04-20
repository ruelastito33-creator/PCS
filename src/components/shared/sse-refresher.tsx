"use client";

import { useRouter } from "next/navigation";
import { useSSE } from "@/hooks/use-sse";

/**
 * Drop this into any Server Component page to get automatic
 * refresh whenever SSE events arrive.
 */
export function SSERefresher() {
  const router = useRouter();

  useSSE({
    onEvent(event) {
      if (
        event.type === "COMANDA_CREADA" ||
        event.type === "COMANDA_CERRADA" ||
        event.type === "PRODUCCION_ACTUALIZADA"
      ) {
        router.refresh();
      }
    },
  });

  return null;
}
