import { redis } from "@/lib/redis";
import { SSE_CHANNEL, type SSEEvent, type SSEEventType } from "./events";

/** Evita que acciones de servidor queden colgadas si Redis no responde. */
const PUBLISH_TIMEOUT_MS = 2500;

export async function publishEvent(
  type: SSEEventType,
  data?: { comanda_id?: string; puesto_id?: number }
) {
  const event: SSEEvent = {
    type,
    ...data,
    timestamp: Date.now(),
  };

  try {
    await Promise.race([
      redis.publish(SSE_CHANNEL, JSON.stringify(event)),
      new Promise<never>((_, reject) => {
        setTimeout(
          () => reject(new Error(`publish timeout (${PUBLISH_TIMEOUT_MS}ms)`)),
          PUBLISH_TIMEOUT_MS
        );
      }),
    ]);
  } catch (err) {
    console.error("[PCS SSE] Failed to publish:", err);
  }
}
