-- AlterTable: bolsas permite decimales (ej. 2.5 bolsas)
ALTER TABLE "produccion" ALTER COLUMN "bolsas" SET DATA TYPE DOUBLE PRECISION USING "bolsas"::double precision;
