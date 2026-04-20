export const CHOFER_ROUTE_LAYOUT = [
  {
    chofer: "ALONSO",
    routeNumber: 1,
    puestos: ["BIMBO"],
  },
  {
    chofer: "ARNULFO",
    routeNumber: 2,
    puestos: ["COMER", "PENINSULA"],
  },
  {
    chofer: "ARMANDO",
    routeNumber: 3,
    puestos: ["FIESTA", "AVELLANA", "BRISAS", "VAQUERO"],
  },
  {
    chofer: "ALONSO",
    routeNumber: 4,
    puestos: ["DIF", "CASINO"],
  },
  {
    chofer: "ARNULFO",
    routeNumber: 5,
    puestos: [
      "MICHO",
      "MICH",
      "ISSTE",
      "ISSSTE",
      "CENTRAL",
      "ADRIANA",
      "KORAZA",
      "FOVISTE",
      "FOVISSTE",
    ],
  },
  {
    chofer: "ALONSO",
    routeNumber: 6,
    puestos: ["CIRKO", "ST JHONS", "ST JOHNS", "BOMBERO"],
  },
  {
    chofer: "ARMANDO",
    routeNumber: 7,
    puestos: ["HOSP", "HOSPITAL", "HOSPI", "BANA", "BANAMEX", "ALMENDRO"],
  },
] as const;

export function routePrimaryPuestos(puestos: readonly string[]) {
  const seen = new Set<string>();
  return puestos.filter((puesto) => {
    const normalized = puesto
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^A-Z0-9]+/gi, "")
      .toUpperCase()
      .trim();

    if (seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}
