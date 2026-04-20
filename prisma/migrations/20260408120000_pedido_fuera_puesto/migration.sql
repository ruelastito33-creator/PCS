-- AlterTable
ALTER TABLE "puestos" ADD COLUMN "es_fuera_puesto" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "produccion" ADD COLUMN "solicitante" TEXT;

-- Puesto técnico único (no aparece en catálogo operativo)
INSERT INTO "puestos" ("nombre", "is_active", "orden", "es_fuera_puesto", "created_at")
SELECT '— Pedido fuera de puesto —', false, 999999, true, NOW()
WHERE NOT EXISTS (
  SELECT 1 FROM "puestos" p WHERE p."nombre" = '— Pedido fuera de puesto —'
);

-- Reenumerar pedidos adicionales por comanda (2, 3, 4…) antes de unificar puesto_id
WITH extras AS (
  SELECT
    p."id",
    (ROW_NUMBER() OVER (
      PARTITION BY p."comanda_id"
      ORDER BY pu."orden" ASC, p."numero_pedido" ASC, p."id" ASC
    ) + 1) AS new_num
  FROM "produccion" p
  INNER JOIN "puestos" pu ON pu."id" = p."puesto_id"
  WHERE p."numero_pedido" > 1
    AND COALESCE(pu."es_fuera_puesto", false) = false
)
UPDATE "produccion" p
SET "numero_pedido" = extras.new_num
FROM extras
WHERE p."id" = extras."id";

-- Unificar en puesto técnico; el nombre del puesto anterior pasa a solicitante
UPDATE "produccion" p
SET
  "solicitante" = COALESCE(NULLIF(TRIM(p."solicitante"), ''), pu."nombre"),
  "puesto_id" = (SELECT p2."id" FROM "puestos" p2 WHERE p2."es_fuera_puesto" = true ORDER BY p2."id" ASC LIMIT 1)
FROM "puestos" pu
WHERE p."puesto_id" = pu."id"
  AND p."numero_pedido" > 1
  AND COALESCE(pu."es_fuera_puesto", false) = false;
