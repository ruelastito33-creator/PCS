import * as XLSX from "xlsx";
import { formatBolsasDisplay } from "@/lib/decimal";
import { insumosDataWithTomateFromBolsas } from "@/lib/insumos-config";
import { etiquetaPuestoProduccion } from "@/lib/puesto-fuera";

export const COMANDA_EXCEL_HEADERS = [
  "puesto",
  "numero_pedido",
  "vendedora",
  "tacos",
  "chofer",
  "bolsas",
  "aguas",
  "medida",
  "hieleras",
  "hora",
  "notas",
] as const;

export type ComandaExcelRow = {
  puesto: string;
  numero_pedido: number;
  vendedora: string | null;
  tacos: number;
  chofer: string | null;
  bolsas: number;
  aguas: number;
  medida: string | null;
  hieleras: number;
  hora: string | null;
  notas: string | null;
};

function normalizeHeader(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function cleanString(value: unknown) {
  const text = String(value ?? "").trim();
  return text ? text : null;
}

function parseInteger(value: unknown, field: string, rowNumber: number) {
  const text = String(value ?? "").trim();
  if (!text) return 0;
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Fila ${rowNumber}: "${field}" debe ser un entero >= 0.`);
  }
  return parsed;
}

function parsePedido(value: unknown, rowNumber: number) {
  const text = String(value ?? "").trim();
  if (!text) return 1;
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || !Number.isInteger(parsed) || parsed < 1) {
    throw new Error(`Fila ${rowNumber}: "numero_pedido" debe ser un entero >= 1.`);
  }
  return parsed;
}

function parseDecimal(value: unknown, field: string, rowNumber: number) {
  const text = String(value ?? "").trim().replace(",", ".");
  if (!text) return 0;
  const parsed = Number(text);
  if (!Number.isFinite(parsed) || parsed < 0) {
    throw new Error(`Fila ${rowNumber}: "${field}" debe ser un numero >= 0.`);
  }
  return Math.round(parsed * 10) / 10;
}

export function parseComandaExcelFile(buffer: ArrayBuffer): ComandaExcelRow[] {
  const workbook = XLSX.read(buffer, { type: "array" });
  const firstSheetName = workbook.SheetNames.find((name) => name !== "Instrucciones");
  if (!firstSheetName) {
    throw new Error("El archivo no contiene una hoja de captura.");
  }

  const sheet = workbook.Sheets[firstSheetName];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  });

  const [headerRow, ...dataRows] = rows;
  if (!headerRow) {
    throw new Error("La hoja de captura esta vacia.");
  }

  const normalizedHeaders = headerRow.map((value) => normalizeHeader(value));
  const expectedHeaders = [...COMANDA_EXCEL_HEADERS];

  const exactHeaders =
    normalizedHeaders.length >= expectedHeaders.length &&
    expectedHeaders.every((header, index) => normalizedHeaders[index] === header);

  if (!exactHeaders) {
    throw new Error(
      `Encabezados invalidos. Se esperaba: ${expectedHeaders.join(", ")}.`
    );
  }

  const parsedRows: ComandaExcelRow[] = [];
  const seenKeys = new Set<string>();

  dataRows.forEach((row, index) => {
    const rowNumber = index + 2;
    const values = expectedHeaders.map((_, colIndex) => row?.[colIndex] ?? "");
    const isEmpty = values.every((value) => String(value ?? "").trim() === "");
    if (isEmpty) return;

    const puesto = String(values[0] ?? "").trim();
    if (!puesto) {
      throw new Error(`Fila ${rowNumber}: "puesto" es obligatorio.`);
    }

    const numero_pedido = parsePedido(values[1], rowNumber);
    const key = `${puesto.toLowerCase()}::${numero_pedido}`;
    if (seenKeys.has(key)) {
      throw new Error(
        `Fila ${rowNumber}: puesto "${puesto}" con pedido #${numero_pedido} esta duplicado en el archivo.`
      );
    }
    seenKeys.add(key);

    parsedRows.push({
      puesto,
      numero_pedido,
      vendedora: cleanString(values[2]),
      tacos: parseInteger(values[3], "tacos", rowNumber),
      chofer: cleanString(values[4]),
      bolsas: parseDecimal(values[5], "bolsas", rowNumber),
      aguas: parseInteger(values[6], "aguas", rowNumber),
      medida: cleanString(values[7]),
      hieleras: parseInteger(values[8], "hieleras", rowNumber),
      hora: cleanString(values[9]),
      notas: cleanString(values[10]),
    });
  });

  if (parsedRows.length === 0) {
    throw new Error("El archivo no contiene filas con datos.");
  }

  return parsedRows;
}

type ReportesProduccion = {
  numero_pedido: number;
  solicitante: string | null;
  puesto: { nombre: string; es_fuera_puesto: boolean };
  proveedora_tacos: { nombre: string } | null;
  bolsas: number;
  insumos: unknown;
  tortillas: number;
  tacos: number;
  tacos_sobrantes: number | null;
  vendedora: string | null;
  aguas: number;
  inasistencia: boolean;
  notas: string | null;
};

type ReportesComanda = {
  fecha: string | Date;
  estado: string;
  producciones: ReportesProduccion[];
};

export function buildReportesWorkbook(comandas: ReportesComanda[]) {
  const workbook = XLSX.utils.book_new();

  // Hoja "Resumen" con totales por dia
  const resumenHeaders = ["Fecha", "Estado", "Total Tacos", "Sobrantes", "Inasistencias", "Total Aguas"];
  const resumenRows = comandas.map((c) => {
    const fecha = new Date(c.fecha).toLocaleDateString("es-MX", {
      timeZone: "UTC",
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    });
    const totalTacos = c.producciones.reduce((s, p) => s + p.tacos, 0);
    const sobrantes = c.producciones.reduce((s, p) => s + (p.tacos_sobrantes ?? 0), 0);
    const inasistencias = c.producciones.filter((p) => p.inasistencia).length;
    const totalAguas = c.producciones.reduce((s, p) => s + p.aguas, 0);
    return [fecha, c.estado, totalTacos, sobrantes, inasistencias, totalAguas];
  });

  const resumenSheet = XLSX.utils.aoa_to_sheet([resumenHeaders, ...resumenRows]);
  resumenSheet["!cols"] = [{ wch: 36 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 16 }, { wch: 14 }];
  XLSX.utils.book_append_sheet(workbook, resumenSheet, "Resumen");

  // Una hoja por comanda/fecha
  const detailHeaders = [
    "Puesto", "Proveedora", "Salsa Tomate", "Tortillas",
    "Tacos", "Sobrantes", "Vendedora", "Aguas", "Inasistencia", "Notas",
  ];

  for (const c of comandas) {
    const fechaDate = new Date(c.fecha);
    const sheetName = fechaDate.toLocaleDateString("en-CA", { timeZone: "UTC" }); // YYYY-MM-DD

    const dataRows = c.producciones.map((p) => {
      const ins = insumosDataWithTomateFromBolsas({ insumos: p.insumos, bolsas: p.bolsas });
      const tomate = formatBolsasDisplay(Number(ins.tomate ?? 0));
      return [
        etiquetaPuestoProduccion(p),
        p.proveedora_tacos?.nombre ?? "",
        tomate,
        p.tortillas,
        p.tacos,
        p.tacos_sobrantes ?? 0,
        p.vendedora ?? "",
        p.aguas,
        p.inasistencia ? "Sí" : "No",
        p.notas ?? "",
      ];
    });

    const sheet = XLSX.utils.aoa_to_sheet([detailHeaders, ...dataRows]);
    sheet["!cols"] = [
      { wch: 20 }, { wch: 16 }, { wch: 14 }, { wch: 12 },
      { wch: 10 }, { wch: 12 }, { wch: 18 }, { wch: 10 }, { wch: 12 }, { wch: 28 },
    ];
    XLSX.utils.book_append_sheet(workbook, sheet, sheetName);
  }

  return workbook;
}

export function buildComandaTemplateWorkbook(puestos: string[]) {
  const workbook = XLSX.utils.book_new();

  const instructions = XLSX.utils.aoa_to_sheet([
    ["Plantilla de captura de comanda"],
    ["Usa la hoja 'Comanda' y no cambies los encabezados."],
    ["Las filas vacias se ignoran."],
    ['numero_pedido: 1 = fila del puesto del catálogo (columna puesto = nombre del puesto).'],
    ['numero_pedido: 2+ = pedido fuera de puesto: en la columna "puesto" escribe quién solicitó el pedido (texto libre).'],
    ['bolsas acepta decimales. Ejemplo: 1.5'],
    ['Campos opcionales: vendedora, chofer, medida, hora, notas.'],
  ]);
  instructions["!cols"] = [{ wch: 70 }];
  XLSX.utils.book_append_sheet(workbook, instructions, "Instrucciones");

  const comandaRows = [
    [...COMANDA_EXCEL_HEADERS],
    ...puestos.map((puesto) => [puesto, 1, "", 0, "", 0, 0, "", 1, "", ""]),
  ];
  const comandaSheet = XLSX.utils.aoa_to_sheet(comandaRows);
  comandaSheet["!cols"] = [
    { wch: 18 },
    { wch: 14 },
    { wch: 18 },
    { wch: 10 },
    { wch: 18 },
    { wch: 10 },
    { wch: 10 },
    { wch: 14 },
    { wch: 10 },
    { wch: 10 },
    { wch: 28 },
  ];
  XLSX.utils.book_append_sheet(workbook, comandaSheet, "Comanda");

  return workbook;
}
