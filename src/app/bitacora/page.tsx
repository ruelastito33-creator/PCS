import { getPageProfile } from "@/lib/get-page-profile";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import { fechaStr, parseFechaUTC } from "@/lib/fecha";
import { BitacoraList } from "./components/bitacora-list";

export default async function BitacoraPage({
  searchParams,
}: {
  searchParams: Promise<{ fecha?: string }>;
}) {
  const profile = await getPageProfile("OPERACIONES");
  const { fecha } = await searchParams;
  const fechaParam = fecha && /^\d{4}-\d{2}-\d{2}$/.test(fecha) ? fecha : fechaStr();

  const fechaDate = parseFechaUTC(fechaParam);

  const entries = await prisma.bitacora.findMany({
    where: { comanda: { fecha: fechaDate } },
    include: {
      comanda: { select: { fecha: true } },
      usuario: { select: { full_name: true } },
    },
    orderBy: { created_at: "desc" },
  });

  return (
    <AppShell role={profile.role} userName={profile.full_name} title="Bitacora">
      <div className="space-y-6">
        <h3 className="text-lg font-medium text-text-primary">
          Bitacora de cambios
        </h3>
        <BitacoraList
          entries={JSON.parse(JSON.stringify(entries))}
          fecha={fechaParam}
        />
      </div>
    </AppShell>
  );
}
