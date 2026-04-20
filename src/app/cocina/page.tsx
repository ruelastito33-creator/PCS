import { getPageProfile } from "@/lib/get-page-profile";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import { fechaUTC } from "@/lib/fecha";
import { SSERefresher } from "@/components/shared/sse-refresher";
import { CocinaView } from "./components/cocina-view";
import { sortProduccionesComanda } from "@/lib/orden-produccion";

export const dynamic = "force-dynamic";

export default async function CocinaPage() {
  const profile = await getPageProfile("OPERACIONES", "COCINA");
  const today = fechaUTC();

  const [comanda, proveedorasTacosCatalogo] = await Promise.all([
    prisma.comanda.findUnique({
      where: { fecha: today },
      include: {
        producciones: {
          include: { puesto: true, proveedora_tacos: true },
          orderBy: { puesto: { orden: "asc" } },
        },
      },
    }),
    prisma.proveedoraTacos.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  if (comanda) {
    sortProduccionesComanda(comanda.producciones);
  }

  const totalTortillas = comanda?.producciones.reduce((s, p) => s + p.tortillas, 0) ?? 0;

  const assignedProveedoraIds = new Set(
    comanda?.producciones
      .map((p) => p.proveedora_tacos_id)
      .filter((id): id is number => id != null) ?? []
  );
  const proveedorasParaSelector = proveedorasTacosCatalogo.filter(
    (pt) => pt.is_active || assignedProveedoraIds.has(pt.id)
  );

  const estadoColor =
    comanda?.estado === "CERRADA"
      ? "border-border bg-surface-alt text-text-muted"
      : comanda?.estado === "EN_PROCESO"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
        : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400";

  return (
    <AppShell role={profile.role} userName={profile.full_name} title="Cocina — Insumos y Tortillas">
      <SSERefresher />
      <div className="space-y-6">
        {comanda && (
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-xl border border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/10 p-4">
              <p className="text-xs font-medium text-orange-500 uppercase tracking-wide">Tortillas</p>
              <p className="text-3xl font-black text-orange-600 dark:text-orange-400 tabular-nums">{totalTortillas.toLocaleString()}</p>
            </div>
            <div className={`rounded-xl border p-4 ${estadoColor}`}>
              <p className="text-xs font-medium uppercase tracking-wide opacity-70">Estado</p>
              <p className="text-sm font-bold mt-1">{comanda.estado.replace("_", " ")}</p>
            </div>
          </div>
        )}

        {comanda ? (
          <CocinaView
            producciones={comanda.producciones}
            comandaEstado={comanda.estado}
            proveedorasOpciones={proveedorasParaSelector}
          />
        ) : (
          <div className="rounded-xl border border-dashed border-border-strong bg-surface p-12 text-center">
            <p className="text-text-faint font-medium">No hay comanda para hoy.</p>
            <p className="text-xs text-text-ghost mt-1">Operaciones debe crearla primero.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
