import { getPageProfile } from "@/lib/get-page-profile";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import { fechaUTC } from "@/lib/fecha";
import { SSERefresher } from "@/components/shared/sse-refresher";
import { CierreView } from "./components/cierre-view";
import { CerrarComandaBtn } from "./components/cerrar-comanda-btn";

export default async function CierrePage() {
  const profile = await getPageProfile("OPERACIONES", "COCINA");
  const today = fechaUTC();

  const comanda = await prisma.comanda.findUnique({
    where: { fecha: today },
    include: {
      producciones: {
        include: { puesto: true, proveedora_tacos: true },
        orderBy: { puesto: { orden: "asc" } },
      },
    },
  });

  const totalTacos = comanda?.producciones.reduce((s, p) => s + p.tacos, 0) ?? 0;
  const totalSobrantes = comanda?.producciones.reduce((s, p) => s + (p.tacos_sobrantes ?? 0), 0) ?? 0;
  const inasistencias = comanda?.producciones.filter((p) => p.inasistencia).length ?? 0;

  const estadoColor =
    comanda?.estado === "CERRADA"
      ? "border-border bg-surface-alt text-text-muted"
      : comanda?.estado === "EN_PROCESO"
        ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-400"
        : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-400";

  return (
    <AppShell role={profile.role} userName={profile.full_name} title="Cierre del Día">
      <SSERefresher />
      <div className="space-y-6">
        {comanda ? (
          <>
            {/* Summary */}
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <div className="rounded-xl border border-border bg-surface p-4">
                <p className="text-xs font-medium text-text-faint uppercase tracking-wide">Tacos</p>
                <p className="text-3xl font-black text-text-primary tabular-nums">{totalTacos.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/10 p-4">
                <p className="text-xs font-medium text-orange-500 uppercase tracking-wide">Sobrantes</p>
                <p className="text-3xl font-black text-orange-600 dark:text-orange-400 tabular-nums">{totalSobrantes.toLocaleString()}</p>
              </div>
              <div className="rounded-xl border border-red-200 dark:border-red-500/30 bg-red-50 dark:bg-red-500/10 p-4">
                <p className="text-xs font-medium text-red-500 uppercase tracking-wide">Inasistencias</p>
                <p className="text-3xl font-black text-red-600 dark:text-red-400 tabular-nums">{inasistencias}</p>
              </div>
              <div className={`rounded-xl border p-4 ${estadoColor}`}>
                <p className="text-xs font-medium uppercase tracking-wide opacity-70">Estado</p>
                <p className="text-sm font-bold mt-1">{comanda.estado.replace("_", " ")}</p>
                {comanda.estado !== "CERRADA" && (
                  <div className="mt-2">
                    <CerrarComandaBtn comandaId={comanda.id} />
                  </div>
                )}
              </div>
            </div>

            {comanda.estado !== "CERRADA" && (
              <p className="text-sm text-text-muted">
                Registra tacos sobrantes e inasistencias. Todos los puestos deben estar
                en estado <strong>ENTREGADO</strong> o marcados como inasistencia para cerrar.
              </p>
            )}

            <CierreView producciones={comanda.producciones} comandaEstado={comanda.estado} />
          </>
        ) : (
          <div className="rounded-xl border border-dashed border-border-strong bg-surface p-12 text-center">
            <p className="text-text-faint font-medium">No hay comanda para hoy.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
