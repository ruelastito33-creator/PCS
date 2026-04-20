import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { buildReportesWorkbook } from "@/lib/comanda-excel";
import { fechaStr, parseFechaUTC } from "@/lib/fecha";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  await requireRole("OPERACIONES");

  const { searchParams } = new URL(request.url);
  const hoy = fechaStr();

  const desdeParam = searchParams.get("desde") ?? "";
  const hastaParam = searchParams.get("hasta") ?? "";

  const desde = /^\d{4}-\d{2}-\d{2}$/.test(desdeParam) ? desdeParam : (() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toLocaleDateString("en-CA", { timeZone: "America/Mexico_City" });
  })();
  const hasta = /^\d{4}-\d{2}-\d{2}$/.test(hastaParam) ? hastaParam : hoy;

  const desdeDate = parseFechaUTC(desde);
  const hastaDate = parseFechaUTC(hasta);
  // Include the hasta date (add 1 day to make it inclusive)
  hastaDate.setUTCDate(hastaDate.getUTCDate() + 1);

  const comandas = await prisma.comanda.findMany({
    where: { fecha: { gte: desdeDate, lt: hastaDate } },
    include: {
      producciones: {
        include: { puesto: true, proveedora_tacos: true },
        orderBy: [{ puesto: { orden: "asc" } }, { numero_pedido: "asc" }],
      },
    },
    orderBy: { fecha: "asc" },
  });

  const workbook = buildReportesWorkbook(
    JSON.parse(JSON.stringify(comandas))
  );
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
  const filename = `reportes-${desde}-a-${hasta}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
