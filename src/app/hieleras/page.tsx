import { getPageProfile } from "@/lib/get-page-profile";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import { fechaUTC } from "@/lib/fecha";
import { SSERefresher } from "@/components/shared/sse-refresher";
import { HielerasView } from "./components/hieleras-view";

export default async function HielerasPage() {
  const profile = await getPageProfile("OPERACIONES", "HIELERA");
  const today = fechaUTC();

  const comanda = await prisma.comanda.findUnique({
    where: { fecha: today },
    include: {
      producciones: {
        include: { puesto: true },
        orderBy: { puesto: { orden: "asc" } },
      },
    },
  });

  const totalHieleras = comanda?.producciones.reduce((sum, p) => sum + p.hieleras, 0) ?? 0;
  const totalExtras = comanda?.producciones.reduce((sum, p) => sum + Math.max(0, p.hieleras - 1), 0) ?? 0;

  return (
    <AppShell role={profile.role} userName={profile.full_name} title="Hieleras">
      <SSERefresher />
      <div className="space-y-6">
        <div className="grid grid-cols-3 gap-3">
          <div className="rounded-xl border border-cyan-200 dark:border-cyan-500/30 bg-cyan-50 dark:bg-cyan-500/10 p-4">
            <p className="text-xs font-medium text-cyan-500 uppercase tracking-wide">Total</p>
            <p className="text-3xl font-black text-cyan-700 dark:text-cyan-400 tabular-nums">{totalHieleras}</p>
          </div>
          <div className="rounded-xl border border-border bg-surface p-4">
            <p className="text-xs font-medium text-text-faint uppercase tracking-wide">Base/puesto</p>
            <p className="text-3xl font-black text-text-secondary tabular-nums">1</p>
          </div>
          <div className="rounded-xl border border-orange-200 dark:border-orange-500/30 bg-orange-50 dark:bg-orange-500/10 p-4">
            <p className="text-xs font-medium text-orange-500 uppercase tracking-wide">Extras</p>
            <p className="text-3xl font-black text-orange-600 dark:text-orange-400 tabular-nums">{totalExtras}</p>
          </div>
        </div>

        {comanda && comanda.producciones.length > 0 ? (
          <HielerasView producciones={comanda.producciones} />
        ) : (
          <div className="rounded-xl border border-dashed border-border-strong bg-surface p-12 text-center">
            <p className="text-text-faint font-medium">No hay comanda para hoy.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
