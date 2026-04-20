import Redis, { type RedisOptions } from "ioredis";

const redisOpts: RedisOptions = {
  maxRetriesPerRequest: null,
  lazyConnect: true,
};

export const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, {
      ...redisOpts,
      tls: process.env.REDIS_URL.startsWith("rediss")
        ? { servername: new URL(process.env.REDIS_URL).hostname }
        : undefined,
    })
  : new Redis({
      host: "127.0.0.1",
      port: 6379,
      ...redisOpts,
    });

if (process.env.npm_lifecycle_event !== "build") {
  let lastErrorAt = 0;

  redis.on("error", (err) => {
    const now = Date.now();
    if (now - lastErrorAt < 60_000) return;
    lastErrorAt = now;
    console.error("[PCS Redis] Error:", err.message);
  });

  redis.on("ready", () => {
    lastErrorAt = 0;
    console.info("[PCS Redis] Conectado");
  });
}
