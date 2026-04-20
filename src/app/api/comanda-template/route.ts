import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/auth-guard";
import { buildComandaTemplateWorkbook } from "@/lib/comanda-excel";
import { fechaStr } from "@/lib/fecha";

export const dynamic = "force-dynamic";

export async function GET() {
  await requireRole("OPERACIONES");

  const puestos = await prisma.puesto.findMany({
    where: { is_active: true, es_fuera_puesto: false },
    orderBy: { orden: "asc" },
    select: { nombre: true },
  });

  const workbook = buildComandaTemplateWorkbook(puestos.map((p) => p.nombre));
  const buffer = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" });
  const filename = `comanda-plantilla-${fechaStr()}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
