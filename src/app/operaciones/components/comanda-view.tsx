"use client";

import { usePosStore } from "../store/pos-store";
import { ComandaTable } from "./comanda-table";
import { PosGrid } from "./pos-grid";
import { PosSheet } from "./pos-sheet";
import type { Produccion, Puesto, ComandaEstado } from "@prisma/client";

type ProduccionConPuesto = Produccion & { puesto: Puesto };
interface Opcion { id: number; nombre: string }

interface ComandaViewProps {
  comandaId: string;
  producciones: ProduccionConPuesto[];
  comandaEstado: ComandaEstado;
  vendedoras: Opcion[];
  choferes: Opcion[];
}

export function ComandaView({
  comandaId,
  producciones,
  comandaEstado,
  vendedoras,
  choferes,
}: ComandaViewProps) {
  const mode = usePosStore((s) => s.mode);

  return (
    <>
      {mode === "tabla" ? (
        <ComandaTable
          comandaId={comandaId}
          producciones={producciones}
          comandaEstado={comandaEstado}
          vendedoras={vendedoras}
          choferes={choferes}
        />
      ) : (
        <>
          <PosGrid
            comandaId={comandaId}
            producciones={producciones}
            comandaEstado={comandaEstado}
            vendedoras={vendedoras}
            choferes={choferes}
          />
          <PosSheet vendedoras={vendedoras} choferes={choferes} producciones={producciones} />
        </>
      )}
    </>
  );
}
