import type { Role } from "@prisma/client";

export const DEFAULT_PUESTOS = [
  "BIMBO",
  "PENI",
  "COMER",
  "FIESTA",
  "AVELLANA",
  "BRISAS",
  "VAQUERO",
  "DIF1",
  "CASINO",
  "MICHO",
  "ISSTE",
  "CENTRAL",
  "ADRIANA",
  "KORAZA",
  "FOVISTE",
  "CIRKO",
  "ST JOHNS",
  "BOMBERO",
  "HOSPI",
  "BANA",
  "ALMENDRO",
] as const;

/** Home route for each role */
export const ROLE_HOME: Record<Role, string> = {
  OPERACIONES: "/operaciones",
  COCINA: "/cocina",
  CHOFER: "/chofer",
  SURTIDOR_AGUAS: "/aguas",
  HIELERA: "/hieleras",
  INSUMOS: "/insumos",
};

/** Human-readable role labels */
export const ROLE_LABELS: Record<Role, string> = {
  OPERACIONES: "Operaciones",
  COCINA: "Cocina",
  CHOFER: "Chofer",
  SURTIDOR_AGUAS: "Surtidor de Aguas",
  HIELERA: "Hielera",
  INSUMOS: "Insumos",
};

/** Navigation items per role */
export const NAV_ITEMS: {
  label: string;
  href: string;
  roles: Role[];
}[] = [
  {
    label: "Comanda",
    href: "/operaciones",
    roles: ["OPERACIONES"],
  },
  {
    label: "Cocina",
    href: "/cocina",
    roles: ["OPERACIONES", "COCINA"],
  },
  {
    label: "Chofer",
    href: "/chofer",
    roles: ["OPERACIONES", "CHOFER"],
  },
  {
    label: "Aguas",
    href: "/aguas",
    roles: ["OPERACIONES", "SURTIDOR_AGUAS"],
  },
  {
    label: "Hieleras",
    href: "/hieleras",
    roles: ["OPERACIONES", "HIELERA"],
  },
  {
    label: "Insumos",
    href: "/insumos",
    roles: ["OPERACIONES", "INSUMOS"],
  },
  {
    label: "Cierre",
    href: "/cierre",
    roles: ["OPERACIONES", "COCINA"],
  },
  {
    label: "Reportes",
    href: "/reportes",
    roles: ["OPERACIONES"],
  },
  {
    label: "Bitacora",
    href: "/bitacora",
    roles: ["OPERACIONES"],
  },
  {
    label: "Configuración",
    href: "/settings",
    roles: ["OPERACIONES"],
  },
];
