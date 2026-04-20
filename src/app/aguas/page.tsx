import { getPageProfile } from "@/lib/get-page-profile";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import { fechaUTC } from "@/lib/fecha";
import { SSERefresher } from "@/components/shared/sse-refresher";
import { etiquetaPuestoProduccion } from "@/lib/puesto-fuera";

export default async function AguasPage() {
  const profile = await getPageProfile("OPERACIONES", "SURTIDOR_AGUAS");

  const today = fechaUTC();

  const comanda = await prisma.comanda.findUnique({
    where: { fecha: today },
    include: {
      producciones: {
        include: { puesto: true },
        orderBy: { puesto: { orden: "asc" } },
        where: { aguas: { gt: 0 } },
      },
    },
  });

  const totalAguas =
    comanda?.producciones.reduce((sum, p) => sum + p.aguas, 0) ?? 0;

  return (
    <AppShell
      role={profile.role}
      userName={profile.full_name}
      title="Surtidor de Aguas"
    >
      <SSERefresher />
      <div className="space-y-6">
        {/* Summary */}
        <div className="rounded-xl border-2 border-blue-200 dark:border-blue-500/30 bg-blue-50 dark:bg-blue-500/10 p-4">
          <p className="text-sm text-blue-600 dark:text-blue-400">Total de aguas hoy</p>
          <p className="text-3xl font-bold text-blue-900 dark:text-blue-300">{totalAguas}</p>
        </div>

        {comanda && comanda.producciones.length > 0 ? (
          <div className="overflow-x-auto rounded-xl border-2 border-border bg-surface">
            <table className="min-w-[640px] w-full divide-y divide-border">
              <thead className="bg-surface-alt">
                <tr>
                  <th className="sticky left-0 z-10 bg-surface-alt px-4 py-4 text-left text-sm font-black uppercase tracking-wide text-slate-600 dark:text-slate-400 min-w-[11rem]">
                    Puesto
                  </th>
                  <th className="px-4 py-4 text-center text-sm font-black uppercase tracking-wide text-sky-600 dark:text-sky-400 min-w-[8rem]">
                    Aguas
                  </th>
                  <th className="px-4 py-4 text-left text-sm font-black uppercase tracking-wide text-cyan-700 dark:text-cyan-400 min-w-[12rem]">
                    Medida
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {comanda.producciones.map((p) => (
                  <tr key={p.id} className="hover:bg-hover-surface">
                    <td className="sticky left-0 z-10 border-r border-border-light bg-surface px-4 py-3 text-lg font-bold text-text-primary">
                      <span className="break-words">{etiquetaPuestoProduccion(p)}</span>
                      {p.numero_pedido > 1 && (
                        <span className="ml-1.5 text-sm font-semibold text-orange-500">#{p.numero_pedido}</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block min-w-[3rem] rounded-xl px-3 py-1.5 text-3xl font-black tabular-nums leading-none ${
                          p.aguas > 0
                            ? "bg-sky-50 text-sky-600 dark:bg-sky-500/15 dark:text-sky-300"
                            : "text-text-ghost"
                        }`}
                      >
                        {p.aguas}
                      </span>
                    </td>
                    <td className={`px-4 py-3 text-lg font-semibold ${p.medida ? "text-cyan-700 dark:text-cyan-400" : "text-text-ghost"}`}>
                      {p.medida || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-lg border border-dashed border-border-strong bg-surface p-12 text-center">
            <p className="text-text-muted">No hay aguas asignadas para hoy.</p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
