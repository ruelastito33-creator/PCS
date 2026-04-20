-- CreateTable
CREATE TABLE "proveedoras_tacos" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "proveedoras_tacos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "proveedoras_tacos_nombre_key" ON "proveedoras_tacos"("nombre");

-- AlterTable
ALTER TABLE "produccion" ADD COLUMN "proveedora_tacos_id" INTEGER;

-- AddForeignKey
ALTER TABLE "produccion" ADD CONSTRAINT "produccion_proveedora_tacos_id_fkey" FOREIGN KEY ("proveedora_tacos_id") REFERENCES "proveedoras_tacos"("id") ON DELETE SET NULL ON UPDATE CASCADE;
