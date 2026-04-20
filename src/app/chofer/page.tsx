import { getPageProfile } from "@/lib/get-page-profile";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import { fechaUTC } from "@/lib/fecha";
import { SSERefresher } from "@/components/shared/sse-refresher";
import { ChoferView } from "./components/chofer-view";

export default async function ChoferPage() {
  const profile = await getPageProfile("OPERACIONES", "CHOFER");
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

  const producciones =
    comanda?.producciones.filter((p) => {
      if (profile.role === "CHOFER") {
        return p.chofer?.toLowerCase() === profile.full_name.toLowerCase();
      }
      return true;
    }) ?? [];

  return (
    <AppShell role={profile.role} userName={profile.full_name} title="Chofer — Entregas">
      <SSERefresher />
      {producciones.length > 0 ? (
        <ChoferView producciones={producciones} />
      ) : (
        <div className="rounded-lg border border-dashed border-border-strong bg-surface p-12 text-center">
          <p className="text-text-muted">
            {comanda ? "No tienes puestos asignados hoy." : "No hay comanda para hoy."}
          </p>
        </div>
      )}
    </AppShell>
  );
}
