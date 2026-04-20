import { getPageProfile } from "@/lib/get-page-profile";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import { CHOFER_ROUTE_LAYOUT, routePrimaryPuestos } from "@/lib/chofer-routes";
import { SettingsTabs } from "./components/settings-tabs";

export default async function SettingsPage() {
  const profile = await getPageProfile("OPERACIONES");

  const [puestos, vendedoras, choferes, proveedorasTacos, usuarios] =
    await Promise.all([
      prisma.puesto.findMany({
        where: { es_fuera_puesto: false },
        orderBy: { orden: "asc" },
      }),
      prisma.vendedora.findMany({ orderBy: { nombre: "asc" } }),
      prisma.chofer.findMany({ orderBy: { nombre: "asc" } }),
      prisma.proveedoraTacos.findMany({ orderBy: { nombre: "asc" } }),
      prisma.profile.findMany({ orderBy: { full_name: "asc" } }),
    ]);

  return (
    <AppShell
      role={profile.role}
      userName={profile.full_name}
      title="Configuracion"
    >
      <div className="max-w-4xl space-y-10">
        <section>
          <h3 className="mb-1 text-lg font-semibold text-text-primary">
            Catalogos
          </h3>
          <p className="mb-4 text-sm text-text-muted">
            Puestos, vendedoras, choferes y proveedoras de tacos (vista
            Cocina).
          </p>
          <SettingsTabs
            puestos={puestos}
            vendedoras={vendedoras}
            choferes={choferes}
            proveedorasTacos={proveedorasTacos}
          />
        </section>

        <section>
          <h3 className="mb-1 text-lg font-semibold text-text-primary">
            Rutas de chofer
          </h3>
          <p className="mb-4 text-sm text-text-muted">
            Base operativa de lunes a sabado usada para agrupar puestos y
            vendedoras en la vista de Chofer.
          </p>
          <div className="overflow-x-auto pb-2">
            <div className="flex min-w-max gap-4">
              {CHOFER_ROUTE_LAYOUT.map((route, index) => {
                const accent =
                  index % 3 === 0
                    ? {
                        shell: "border-cyan-500/30 bg-cyan-500/[0.08]",
                        header: "bg-cyan-950 text-cyan-50",
                        badge: "bg-cyan-500/15 text-cyan-300",
                      }
                    : index % 3 === 1
                      ? {
                          shell:
                            "border-fuchsia-500/30 bg-fuchsia-500/[0.08]",
                          header: "bg-fuchsia-700/90 text-fuchsia-50",
                          badge: "bg-fuchsia-500/15 text-fuchsia-200",
                        }
                      : {
                          shell: "border-lime-500/30 bg-lime-500/[0.08]",
                          header: "bg-lime-800/90 text-lime-50",
                          badge: "bg-lime-500/15 text-lime-200",
                        };

                return (
                  <article
                    key={route.routeNumber}
                    className={`w-[250px] rounded-[1.6rem] border p-3 ${accent.shell}`}
                  >
                    <div
                      className={`rounded-[1.15rem] px-4 py-4 ${accent.header}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-black uppercase tracking-[0.24em] text-white/65">
                            Chofer
                          </p>
                          <h4 className="text-2xl font-black">
                            {route.chofer}
                          </h4>
                        </div>
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-black uppercase tracking-[0.2em] ${accent.badge}`}
                        >
                          Ruta {route.routeNumber}
                        </span>
                      </div>
                    </div>

                    <div className="mt-3 space-y-2">
                      {routePrimaryPuestos(route.puestos).map((puesto) => (
                        <div
                          key={`${route.routeNumber}-${puesto}`}
                          className="rounded-[1.05rem] border border-border-light bg-surface px-3 py-2.5"
                        >
                          <p className="text-sm font-black uppercase tracking-[0.04em] text-text-primary">
                            {puesto}
                          </p>
                        </div>
                      ))}
                    </div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>

        <section>
          <h3 className="mb-1 text-lg font-semibold text-text-primary">
            Usuarios del sistema
          </h3>
          <p className="mb-4 text-sm text-text-muted">
            Para agregar usuarios usa el dashboard de Supabase y el script{" "}
            <code className="rounded bg-surface-muted px-1 text-xs">
              scripts/create-user.ts
            </code>
            .
          </p>
          <div className="overflow-hidden rounded-lg border border-border bg-surface">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-surface-alt">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-text-muted">
                    Nombre
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-text-muted">
                    Email
                  </th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase text-text-muted">
                    Rol
                  </th>
                  <th className="px-4 py-2 text-center text-xs font-semibold uppercase text-text-muted">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {usuarios.map((u) => (
                  <tr key={u.id} className="hover:bg-hover-surface">
                    <td className="px-4 py-2 text-sm font-medium text-text-primary">
                      {u.full_name}
                    </td>
                    <td className="px-4 py-2 text-sm text-text-muted">
                      {u.email}
                    </td>
                    <td className="px-4 py-2 text-sm text-text-muted">
                      {u.role.replace(/_/g, " ")}
                    </td>
                    <td className="px-4 py-2 text-center">
                      <span
                        className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                          u.is_active
                            ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                            : "bg-surface-muted text-text-faint"
                        }`}
                      >
                        {u.is_active ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
