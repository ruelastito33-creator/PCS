-- AlterTable: add numero_pedido column with default 1 (IF NOT EXISTS for idempotency)
ALTER TABLE "produccion" ADD COLUMN IF NOT EXISTS "numero_pedido" INTEGER NOT NULL DEFAULT 1;

-- Drop old unique index (comanda_id, puesto_id) if it exists
DROP INDEX IF EXISTS "produccion_comanda_id_puesto_id_key";

-- Create new unique index (comanda_id, puesto_id, numero_pedido)
CREATE UNIQUE INDEX IF NOT EXISTS "produccion_comanda_id_puesto_id_numero_pedido_key" ON "produccion"("comanda_id", "puesto_id", "numero_pedido");
