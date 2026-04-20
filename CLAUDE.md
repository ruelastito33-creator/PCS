# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

PCS (Sistema de Producción Cocina) for "Los Tuxpeños Por Tradición" — a daily production control system used on tablets in a restaurant. Manages daily comandas (orders), kitchen production tracking, drivers, waters, coolers, supplies, daily closure, reports, and audit log.

## Commands

```bash
npm run dev              # Dev server (localhost:3000)
npm run build            # Production build
npm run lint             # ESLint check
npm run docker:up        # Start PostgreSQL + Redis (docker-compose.yml)
npm run docker:down      # Stop containers
npm run prisma:generate  # Regenerate Prisma client after schema changes
npm run prisma:migrate   # Create + apply DB migration
npm run prisma:seed      # Seed 21 puestos + fuera-puesto row
npm run db:reset         # Reset DB to migrations baseline (DESTROYS DATA)
npx tsx scripts/create-user.ts          # Create a Supabase Auth user + Profile
npx tsx scripts/create-kiosk-users.ts  # Create 5 kiosk tablet users
```

Local dev needs Docker running first, then `prisma:migrate`, then `dev`.

## Stack

- **Next.js 16.2.2** + React 19 + TypeScript 5 — App Router only (no Pages Router)
- **Tailwind CSS 4** + PostCSS (no `tailwind.config.ts`; configured via `@theme` in `globals.css`)
- **Prisma 7** + `@prisma/adapter-pg` + `pg` — pure JS driver, NO native binaries
- **Supabase** (Auth only; PostgreSQL is the actual DB via `DATABASE_URL`)
- **Redis** (ioredis) + SSE — real-time via pub/sub, no WebSockets
- **Docker**: PostgreSQL 16 on port 5434, Redis 7 on port 6381 (dev compose)

## Critical Prisma 7 Quirk

Prisma 7 removed the `url` field from `datasource db` in `schema.prisma`. The DB URL lives only at runtime in the adapter:

```typescript
// src/lib/prisma.ts — always use this singleton
const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter });
```

Migration URL is configured separately in `prisma/prisma.config.ts`. If Turbopack bundles Prisma incorrectly (symptom: "Unknown argument X" despite schema having it), delete `.next` and run `prisma:generate` again. That is why `next.config.ts` has `serverExternalPackages: ["@prisma/client", "prisma", "@prisma/adapter-pg"]`.

## Auth Architecture

Three-layer auth:

1. **Middleware** (`src/utils/supabase/middleware.ts`) — route-level protection. Public routes: `/login`, `/auth/**`, `/api/health`, `/api/kiosk/**`. Root `/` redirects authenticated users to their role home.

2. **Page guard** (`src/lib/get-page-profile.ts`) — call at top of every server page. Redirects to `/login` if unauthenticated; to `ROLE_HOME[role]` if wrong role.
   ```typescript
   const profile = await getPageProfile("OPERACIONES"); // one or more roles
   ```

3. **Action guard** (`src/lib/auth-guard.ts`) — call at top of every server action.
   ```typescript
   await requireRole("OPERACIONES");
   const { profile } = await getProfile();
   ```

## Page Pattern

```typescript
export const dynamic = "force-dynamic"; // always fresh data

export default async function SomePage() {
  const profile = await getPageProfile("OPERACIONES");
  const data = await prisma.something.findMany(...);
  return (
    <AppShell role={profile.role} userName={profile.full_name} title="...">
      <SSERefresher />  {/* triggers revalidatePath on SSE events */}
      {/* page content */}
    </AppShell>
  );
}
```

## Server Action Pattern

```typescript
"use server";
export async function doSomething(input: ...) {
  await requireRole("OPERACIONES");
  // validate input
  const result = await prisma.something.update(...);
  await logBitacora({ comanda_id, evento: "ALGO", detalle: { ... } });
  await publishEvent({ type: "PRODUCCION_ACTUALIZADA", comanda_id });
  revalidatePath("/some-page");
  return { success: true, data: result };
}
```

## Date Handling

All dates stored as UTC midnight. Mexico City timezone (`America/Mexico_City`) must be used for display and DB queries:

```typescript
import { fechaStr, parseFechaUTC } from "@/lib/fecha";
const hoyStr = fechaStr();            // "2026-04-09" in MX timezone
const hoyUTC = parseFechaUTC(hoyStr); // Date at UTC midnight for DB
```

Never use `new Date()` directly for comanda date queries — it will be wrong before 6am UTC (midnight MX time).

## Real-Time (SSE + Redis)

Events flow: server action → `publishEvent()` → Redis pub/sub (`pcs:events`) → `/api/sse` route → `EventSource` in `SSERefresher` → `router.refresh()`.

- `src/lib/sse/events.ts` — SSEEvent type definition
- `src/lib/sse/publisher.ts` — `publishEvent()` with 2.5s timeout (won't block if Redis down)
- `src/app/api/sse/route.ts` — SSE endpoint
- `src/components/shared/sse-refresher.tsx` — mount in pages needing real-time

## Kiosk Mode (Tablets)

Tablets auto-login via URL bookmark — no manual login needed:
```
/api/kiosk/auth?role=COCINA&key=KIOSK_SECRET
```
Authenticates against `kiosk-cocina@tuxpenos.local` using `KIOSK_PASSWORD`, sets cookies, redirects to role home. `SessionWatchdog` (`src/components/kiosk/session-watchdog.tsx`) re-authenticates every 5 min if session expires.

Create kiosk users once per environment: `npx tsx scripts/create-kiosk-users.ts`

## Roles and Navigation

Roles: `OPERACIONES | COCINA | CHOFER | SURTIDOR_AGUAS | HIELERA | INSUMOS`

Nav items and role access defined in `src/lib/constants.ts` (`NAV_ITEMS`, `ROLE_HOME`). Sidebar icons mapped manually in `src/components/layout/sidebar.tsx` (`ICONS` object) — add new icon there when adding a nav route.

## Key Domain Rules

- **One comanda per day** — `Comanda.fecha` is `@unique` (UTC midnight). Query always by `parseFechaUTC(fechaStr())`.
- **`numero_pedido`**: 1 = base puesto order; 2+ = "fuera de puesto" (additional orders not tied to a catalog puesto).
- **`bolsas` ↔ `insumos.tomate` sync**: always updated together in `actualizarCampo()`.
- **`es_fuera_puesto`**: one special Puesto row in DB for additional orders; never shown in catalog UI.
- **Insumos fractions**: `salsa_roja` and `cebolla` stored as decimals, displayed as fractions (`src/lib/fraccion.ts`).

## PWA

- `src/app/manifest.ts` — Web App Manifest (auto-linked at `/manifest.webmanifest`)
- `src/app/icon.tsx` / `apple-icon.tsx` — dynamic PNG icons via `ImageResponse`
- `public/sw.js` — service worker (cache-first for static assets, network-only for `/api/`)
- `src/components/shared/sw-register.tsx` — registers SW on mount

## Docker Production

```bash
docker build .                                    # Requires output: "standalone" in next.config.ts
docker compose -f docker-compose.prod.yml up -d  # App + Redis only (Supabase hosts PostgreSQL)
```

## Environment Variables

```bash
DATABASE_URL=                      # PostgreSQL (Supabase or local Docker on port 5434)
REDIS_URL=                         # Redis (default: redis://localhost:6381)
NEXT_PUBLIC_SUPABASE_URL=          # Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=     # Public anon key
SUPABASE_SERVICE_ROLE_KEY=         # Secret — only for scripts, never client-side
KIOSK_SECRET=                      # API key for /api/kiosk/auth endpoint
KIOSK_PASSWORD=                    # Shared password for all kiosk users
```

## Next.js 16 Breaking Changes

`searchParams` and dynamic route `params` are now **Promises** — always `await` them:
```typescript
export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
}
```

Read `node_modules/next/dist/docs/` before using any Next.js API not listed here.
