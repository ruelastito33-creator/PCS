import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /**
   * Prisma debe cargarse desde node_modules (cliente generado actual).
   * Si Turbopack lo empaqueta, a veces queda un cliente viejo y falla con
   * "Unknown argument salsa_roja_default" aunque el schema sí tenga el campo.
   */
  serverExternalPackages: ["@prisma/client", "prisma", "@prisma/adapter-pg"],
  /** Genera output standalone para Docker (incluye server.js + subset de node_modules). */
  output: "standalone",
};

export default nextConfig;
