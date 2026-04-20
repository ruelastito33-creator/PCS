import { getPageProfile } from "@/lib/get-page-profile";
import { AppShell } from "@/components/layout/app-shell";
import { prisma } from "@/lib/prisma";
import { format } from "date-fns";
import { fechaStr, parseFechaUTC } from "@/lib/fecha";
import { es } from "date-fns/locale";
import { CrearComandaBtn } from "./components/crear-comanda-btn";
import { ComandaView } from "./components/comanda-view";
import { ModeToggle } from "./components/mode-toggle";
import { ReiniciarVendedorasBtn } from "./components/reiniciar-vendedoras-btn";
import { ReiniciarComandaBtn } from "./components/reiniciar-comanda-btn";
import { ImportarComandaExcelBtn } from "./components/importar-comanda-excel-btn";
import { SSERefresher } from "@/components/shared/sse-refresher";
import { sortProduccionesComanda } from "@/lib/orden-produccion";

export const dynamic = "force-dynamic";

export default async function OperacionesPage() {
  const profile = await getPageProfile("OPERACIONES");

  // fecha como string "yyyy-MM-dd" en zona horaria Mexico_City (para display y acciones)
  const hoyStr = fechaStr();
  // fecha como Date UTC midnight (para queries a la DB)
  const today = parseFechaUTC(hoyStr);

  const [vendedoras, choferes] = await Promise.all([
    prisma.vendedora.findMany({ where: { is_active: true }, orderBy: { nombre: "asc" } }),
    prisma.chofer.findMany({ where: { is_active: true }, orderBy: { nombre: "asc" } }),
  ]);

  const comanda = await prisma.comanda.findUnique({
    where: { fecha: today },
    include: {
      producciones: {
        include: { puesto: true },
        orderBy: { puesto: { orden: "asc" } },
      },
    },
  });

  if (comanda) {
    sortProduccionesComanda(comanda.producciones);
  }

  // Summary stats
  const stats = comanda
    ? {
        totalTacos: comanda.producciones.reduce((s, p) => s + p.tacos, 0),
        puestos: new Set(
          comanda.producciones
            .filter((p) => p.numero_pedido === 1 && !p.puesto.es_fuera_puesto)
            .map((p) => p.puesto_id)
        ).size,
        pedidos: comanda.producciones.length,
        listos: comanda.producciones.filter(
          (p) => p.estado === "LISTO" || p.estado === "ENTREGADO"
        ).length,
        enProceso: comanda.producciones.filter(
          (p) => p.estado === "EN_PROCESO"
        ).length,
      }
    : null;

  return (
    <AppShell
      role={profile.role}
      userName={profile.full_name}
      title="Operaciones — Comanda"
    >
      <SSERefresher />
      <div className="space-y-6">
        {/* Date header + create button */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-semibold text-text-primary">
              {format(
                // Parsear la fecha local como date LOCAL para que format() muestre el día correcto
                new Date(`${hoyStr}T12:00:00`),
                "EEEE, d 'de' MMMM yyyy",
                { locale: es }
              )}
            </h3>
            {comanda && (
              <span
                className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
                  comanda.estado === "ABIERTA"
                    ? "bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400"
                    : comanda.estado === "EN_PROCESO"
                      ? "bg-yellow-100 text-yellow-700 dark:bg-yellow-500/20 dark:text-yellow-400"
                      : "bg-surface-muted text-text-secondary"
                }`}
              >
                {comanda.estado.replace("_", " ")}
              </span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <ImportarComandaExcelBtn fechaStr={hoyStr} />
            {comanda && comanda.estado !== "CERRADA" && (
              <ReiniciarComandaBtn comandaId={comanda.id} />
            )}
            {comanda && comanda.estado !== "CERRADA" && (
              <ReiniciarVendedorasBtn comandaId={comanda.id} />
            )}
            {comanda && <ModeToggle />}
            {(!comanda || comanda.estado !== "CERRADA") && (
              <CrearComandaBtn fechaStr={hoyStr} comandaId={comanda?.id ?? null} />
            )}
          </div>
        </div>

        {/* Summary cards */}
        {stats && (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="text-xs text-text-muted">Total Tacos</p>
              <p className="text-2xl font-bold text-text-primary">
                {stats.totalTacos.toLocaleString()}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="text-xs text-text-muted">Puestos</p>
              <p className="text-2xl font-bold text-text-primary">
                {stats.puestos}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="text-xs text-text-muted">En Proceso</p>
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {stats.enProceso}
              </p>
            </div>
            <div className="rounded-lg border border-border bg-surface p-3">
              <p className="text-xs text-text-muted">Listos / Entregados</p>
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {stats.listos}
              </p>
            </div>
          </div>
        )}

        {/* Comanda view (tabla or POS) */}
        {comanda ? (
          <ComandaView
            comandaId={comanda.id}
            producciones={comanda.producciones}
            comandaEstado={comanda.estado}
            vendedoras={vendedoras}
            choferes={choferes}
          />
        ) : (
          <div className="rounded-lg border-2 border-dashed border-border-strong bg-surface p-16 text-center">
            <p className="text-lg text-text-muted">
              No hay comanda para hoy.
            </p>
            <p className="mt-1 text-sm text-text-faint">
              Haz clic en &quot;Crear Comanda del Día&quot; para comenzar.
            </p>
          </div>
        )}
      </div>
    </AppShell>
  );
}
