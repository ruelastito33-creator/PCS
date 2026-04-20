-- CreateEnum
CREATE TYPE "Role" AS ENUM ('OPERACIONES', 'COCINA', 'CHOFER', 'SURTIDOR_AGUAS', 'HIELERA', 'INSUMOS');

-- CreateEnum
CREATE TYPE "ComandaEstado" AS ENUM ('ABIERTA', 'EN_PROCESO', 'CERRADA');

-- CreateEnum
CREATE TYPE "ProduccionEstado" AS ENUM ('PENDIENTE', 'EN_PROCESO', 'LISTO', 'ENTREGADO');

-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "email" TEXT NOT NULL,
    "full_name" TEXT NOT NULL,
    "role" "Role" NOT NULL DEFAULT 'CHOFER',
    "pin" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "puestos" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "orden" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "puestos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "comandas" (
    "id" UUID NOT NULL,
    "fecha" DATE NOT NULL,
    "estado" "ComandaEstado" NOT NULL DEFAULT 'ABIERTA',
    "notas" TEXT,
    "created_by" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,
    "closed_at" TIMESTAMP(3),

    CONSTRAINT "comandas_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "produccion" (
    "id" UUID NOT NULL,
    "comanda_id" UUID NOT NULL,
    "puesto_id" INTEGER NOT NULL,
    "vendedora" TEXT,
    "tacos" INTEGER NOT NULL DEFAULT 0,
    "chofer" TEXT,
    "bolsas" INTEGER NOT NULL DEFAULT 0,
    "aguas" INTEGER NOT NULL DEFAULT 0,
    "medida" TEXT,
    "tortillas" INTEGER NOT NULL DEFAULT 0,
    "insumos" JSONB DEFAULT '{}',
    "hieleras" INTEGER NOT NULL DEFAULT 0,
    "hora" TEXT,
    "estado" "ProduccionEstado" NOT NULL DEFAULT 'PENDIENTE',
    "tacos_sobrantes" INTEGER DEFAULT 0,
    "inasistencia" BOOLEAN NOT NULL DEFAULT false,
    "notas" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "produccion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bitacora" (
    "id" UUID NOT NULL,
    "comanda_id" UUID NOT NULL,
    "evento" TEXT NOT NULL,
    "detalle" JSONB DEFAULT '{}',
    "usuario_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bitacora_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "profiles_email_key" ON "profiles"("email");

-- CreateIndex
CREATE UNIQUE INDEX "puestos_nombre_key" ON "puestos"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "comandas_fecha_key" ON "comandas"("fecha");

-- CreateIndex
CREATE INDEX "comandas_fecha_idx" ON "comandas"("fecha");

-- CreateIndex
CREATE INDEX "produccion_comanda_id_idx" ON "produccion"("comanda_id");

-- CreateIndex
CREATE INDEX "produccion_puesto_id_idx" ON "produccion"("puesto_id");

-- CreateIndex
CREATE UNIQUE INDEX "produccion_comanda_id_puesto_id_key" ON "produccion"("comanda_id", "puesto_id");

-- CreateIndex
CREATE INDEX "bitacora_comanda_id_idx" ON "bitacora"("comanda_id");

-- CreateIndex
CREATE INDEX "bitacora_created_at_idx" ON "bitacora"("created_at");

-- AddForeignKey
ALTER TABLE "produccion" ADD CONSTRAINT "produccion_comanda_id_fkey" FOREIGN KEY ("comanda_id") REFERENCES "comandas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "produccion" ADD CONSTRAINT "produccion_puesto_id_fkey" FOREIGN KEY ("puesto_id") REFERENCES "puestos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bitacora" ADD CONSTRAINT "bitacora_comanda_id_fkey" FOREIGN KEY ("comanda_id") REFERENCES "comandas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bitacora" ADD CONSTRAINT "bitacora_usuario_id_fkey" FOREIGN KEY ("usuario_id") REFERENCES "profiles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
