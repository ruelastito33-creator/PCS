export const SSE_CHANNEL = "pcs:events";

export type SSEEventType =
  | "COMANDA_CREADA"
  | "COMANDA_ACTUALIZADA"
  | "COMANDA_CERRADA"
  | "PRODUCCION_ACTUALIZADA"
  | "REFRESH";

export interface SSEEvent {
  type: SSEEventType;
  comanda_id?: string;
  puesto_id?: number;
  timestamp: number;
}
