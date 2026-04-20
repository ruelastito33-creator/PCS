import { SSE_CHANNEL } from "@/lib/sse/events";
import Redis from "ioredis";

export const dynamic = "force-dynamic";

export async function GET() {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Create a dedicated subscriber connection
      const subscriber = new Redis(process.env.REDIS_URL || "redis://127.0.0.1:6379", {
        lazyConnect: false,
      });

      // Send initial heartbeat
      controller.enqueue(encoder.encode("data: {\"type\":\"CONNECTED\"}\n\n"));

      // Subscribe to PCS events channel
      subscriber.subscribe(SSE_CHANNEL).catch((err) => {
        console.error("[SSE] Subscribe error:", err);
      });

      subscriber.on("message", (_channel, message) => {
        try {
          controller.enqueue(encoder.encode(`data: ${message}\n\n`));
        } catch {
          // Stream closed
          subscriber.disconnect();
        }
      });

      // Heartbeat every 30 seconds to keep connection alive
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(
            encoder.encode(`data: {"type":"HEARTBEAT"}\n\n`)
          );
        } catch {
          clearInterval(heartbeat);
          subscriber.disconnect();
        }
      }, 30_000);

      // Cleanup on stream cancel
      const cleanup = () => {
        clearInterval(heartbeat);
        subscriber.disconnect();
      };

      // Store cleanup for when the stream is cancelled
      (controller as unknown as Record<string, () => void>)._cleanup = cleanup;
    },
    cancel(controller) {
      const cleanup = (controller as unknown as Record<string, () => void>)._cleanup;
      cleanup?.();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
