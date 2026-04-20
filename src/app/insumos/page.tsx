import { getPageProfile } from "@/lib/get-page-profile";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import { fechaUTC } from "@/lib/fecha";
import { SSERefresher } from "@/components/shared/sse-refresher";
import {
  INSUMOS_ITEMS,
  insumosDataWithTomateFromBolsas,
  formatInsumoValorDisplay,
} from "@/lib/insumos-config";
import { InsumosView } from "./components/insumos-view";

const SUMMARY_COLORS: Record<string, { border: string; bg: string; label: string; value: string }> = {
  tomate: { border: "border-red-200 dark:border-red-500/30", bg: "bg-red-50 dark:bg-red-500/10", label: "text-red-500", value: "text-red-700 dark:text-red-400" },
  col: { border: "border-emerald-200 dark:border-emerald-500/30", bg: "bg-emerald-50 dark:bg-emerald-500/10", label: "text-emerald-500", value: "text-emerald-700 dark:text-emerald-400" },
  zanahoria: { border: "border-orange-200 dark:border-orange-500/30", bg: "bg-orange-50 dark:bg-orange-500/10", label: "text-orange-500", value: "text-orange-700 dark:text-orange-400" },
  cebolla: { border: "border-violet-200 dark:border-violet-500/30", bg: "bg-violet-50 dark:bg-violet-500/10", label: "text-violet-500", value: "text-violet-700 dark:text-violet-400" },
  salsa_roja: { border: "border-rose-200 dark:border-rose-500/30", bg: "bg-rose-50 dark:bg-rose-500/10", label: "text-rose-500", value: "text-rose-700 dark:text-rose-400" },
};

export default async function InsumosPage() {
  const profile = await getPageProfile("OPERACIONES", "INSUMOS");
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

  const totals: Record<string, number> = {};
  for (const item of INSUMOS_ITEMS) {
    totals[item.key] = (comanda?.producciones ?? []).reduce((sum, p) => {
      const data = insumosDataWithTomateFromBolsas({
        insumos: p.insumos,
        bolsas: p.bolsas,
      });
      return sum + ((data as Record<string, number>)[item.key] ?? 0);
    }, 0);
  }

  return (
    <AppShell role={profile.role} userName={profile.full_name} title="Insumos">
      <SSERefresher />
      <div className="space-y-6">
        {comanda && (
          <div className="sticky top-0 z-20 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 bg-surface-alt pb-4 -mx-4 px-4 lg:-mx-6 lg:px-6 pt-1">
            {INSUMOS_ITEMS.map((item) => {
              const colors = SUMMARY_COLORS[item.key] ?? { border: "border-border", bg: "bg-surface", label: "text-text-faint", value: "text-text-secondary" };
              return (
                <div key={item.key} className={`rounded-2xl border-2 ${colors.border} ${colors.bg} p-4`}>
                  <p className={`text-2xl font-black uppercase tracking-wide ${colors.label}`}>{item.label}</p>
                  <p className={`text-[4rem] leading-none font-black tabular-nums mt-2 ${colors.value}`}>
                    {formatInsumoValorDisplay(item.key, totals[item.key])}
                    <span className="ml-2 text-xl font-normal opacity-60">{item.unidad}</span>
                  </p>
                </div>
              );
            })}
          </div>
        )}

        {comanda && comanda.producciones.length > 0 ? (
          <InsumosView producciones={comanda.producciones} comandaEstado={comanda.estado} />
        ) : (
          <div className="rounded-xl border border-dashed border-border-strong bg-surface p-12 text-center">
            <p className="text-text-faint font-medium">No hay comanda para hoy.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
