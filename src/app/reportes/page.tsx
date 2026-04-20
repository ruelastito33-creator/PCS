import { getPageProfile } from "@/lib/get-page-profile";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import { ReportesTable } from "./components/reportes-table";
import { ExportButton } from "./components/export-button";

export default async function ReportesPage() {
  const profile = await getPageProfile("OPERACIONES");

  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  sevenDaysAgo.setHours(0, 0, 0, 0);

  const comandas = await prisma.comanda.findMany({
    where: { fecha: { gte: sevenDaysAgo } },
    include: {
      producciones: {
        include: { puesto: true, proveedora_tacos: true },
        orderBy: [{ puesto: { orden: "asc" } }, { numero_pedido: "asc" }],
      },
    },
    orderBy: { fecha: "desc" },
  });

  return (
    <AppShell role={profile.role} userName={profile.full_name} title="Reportes">
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-4">
          <h3 className="text-lg font-medium text-text-primary">Ultimos 7 dias</h3>
          <ExportButton />
        </div>

        {comandas.length > 0 ? (
          <ReportesTable comandas={JSON.parse(JSON.stringify(comandas))} />
        ) : (
          <div className="rounded-lg border border-dashed border-border-strong bg-surface p-12 text-center">
            <p className="text-text-muted">
              No hay comandas registradas en los ultimos 7 dias.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
