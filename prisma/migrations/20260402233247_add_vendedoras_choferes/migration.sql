-- AlterTable
ALTER TABLE "comandas" ALTER COLUMN "fecha" SET DATA TYPE TIMESTAMP(3);

-- CreateTable
CREATE TABLE "vendedoras" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vendedoras_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "choferes" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "choferes_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "vendedoras_nombre_key" ON "vendedoras"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "choferes_nombre_key" ON "choferes"("nombre");
