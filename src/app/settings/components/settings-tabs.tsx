"use client";

import { useState } from "react";
import { CatalogTable } from "./catalog-table";
import { PuestosTable } from "./puestos-table";
import {
  crearVendedora, renombrarVendedora, toggleVendedoraActiva,
  crearChofer, renombrarChofer, toggleChoferActivo,
  crearProveedoraTacos, renombrarProveedoraTacos, toggleProveedoraTacosActiva,
} from "@/lib/actions/catalogos";
import type { Puesto, Vendedora, Chofer, ProveedoraTacos } from "@prisma/client";

interface SettingsTabsProps {
  puestos: Puesto[];
  vendedoras: Vendedora[];
  choferes: Chofer[];
  proveedorasTacos: ProveedoraTacos[];
}

const TABS = ["Puestos", "Vendedoras", "Choferes", "Proveedoras tacos"] as const;
type Tab = (typeof TABS)[number];

const TAB_ICONS: Record<Tab, React.ReactNode> = {
  Puestos: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  ),
  Vendedoras: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Choferes: (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 17a2 2 0 11-4 0 2 2 0 014 0zM19 17a2 2 0 11-4 0 2 2 0 014 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10l2 1m7-1l-2 1m0-1V5m6 11V9a1 1 0 00-1-1h-2" />
    </svg>
  ),
  "Proveedoras tacos": (
    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
    </svg>
  ),
};

const TAB_DESCRIPTIONS: Record<Tab, string> = {
  Puestos: "Los puestos activos aparecen en la comanda diaria. Fracciones válidas: 1, 1/2, 1/4, 1/6, 1 1/2.",
  Vendedoras: "Nombres disponibles en el selector de vendedora de la comanda.",
  Choferes: "Nombres disponibles en el selector de chofer de la comanda.",
  "Proveedoras tacos": "Personas del grupo que surten tacos en cocina. Las inactivas siguen visibles en días ya asignados.",
};

export function SettingsTabs({
  puestos,
  vendedoras,
  choferes,
  proveedorasTacos,
}: SettingsTabsProps) {
  const [activeTab, setActiveTab] = useState<Tab>("Puestos");

  const counts: Record<Tab, number> = {
    Puestos: puestos.filter((p) => p.is_active).length,
    Vendedoras: vendedoras.filter((v) => v.is_active).length,
    Choferes: choferes.filter((c) => c.is_active).length,
    "Proveedoras tacos": proveedorasTacos.filter((p) => p.is_active).length,
  };

  return (
    <div className="space-y-5">
      {/* Tab bar */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {TABS.map((tab) => {
          const isActive = activeTab === tab;
          return (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`relative flex items-center gap-2 px-4 py-2.5 text-sm font-medium transition-colors focus:outline-none ${
                isActive
                  ? "text-orange-600 dark:text-orange-400"
                  : "text-text-muted hover:text-text-primary"
              }`}
            >
              <span className={isActive ? "text-orange-500" : "text-text-faint"}>
                {TAB_ICONS[tab]}
              </span>
              <span>{tab}</span>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold tabular-nums ${
                isActive
                  ? "bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300"
                  : "bg-surface-muted text-text-faint"
              }`}>
                {counts[tab]}
              </span>
              {/* Active underline */}
              {isActive && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-orange-500" />
              )}
            </button>
          );
        })}
      </div>

      {/* Description */}
      <p className="text-sm text-text-muted">{TAB_DESCRIPTIONS[activeTab]}</p>

      {/* Content */}
      {activeTab === "Puestos" && <PuestosTable items={puestos} />}

      {activeTab === "Vendedoras" && (
        <div className="max-w-md">
          <CatalogTable
            items={vendedoras}
            onAdd={crearVendedora}
            onRename={renombrarVendedora}
            onToggle={toggleVendedoraActiva}
            addPlaceholder="Nombre de la vendedora…"
          />
        </div>
      )}

      {activeTab === "Choferes" && (
        <div className="max-w-md">
          <CatalogTable
            items={choferes}
            onAdd={crearChofer}
            onRename={renombrarChofer}
            onToggle={toggleChoferActivo}
            addPlaceholder="Nombre del chofer…"
          />
        </div>
      )}

      {activeTab === "Proveedoras tacos" && (
        <div className="max-w-md">
          <CatalogTable
            items={proveedorasTacos}
            onAdd={crearProveedoraTacos}
            onRename={renombrarProveedoraTacos}
            onToggle={toggleProveedoraTacosActiva}
            addPlaceholder="Nombre de la proveedora…"
          />
        </div>
      )}
    </div>
  );
}
