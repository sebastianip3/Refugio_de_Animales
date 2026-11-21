-- CreateEnum
CREATE TYPE "TipoEvento" AS ENUM ('ADOPCION', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoEvento" AS ENUM ('PROGRAMADO', 'CANCELADO', 'FINALIZADO');

-- CreateTable
CREATE TABLE "eventos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "tipo" "TipoEvento" NOT NULL DEFAULT 'ADOPCION',
    "descripcion" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "lugar" VARCHAR(255) NOT NULL,
    "comuna" VARCHAR(100) NOT NULL,
    "cuposTotales" INTEGER,
    "estado" "EstadoEvento" NOT NULL DEFAULT 'PROGRAMADO',
    "publicado" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "eventos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "eventos_publicado_fecha_idx" ON "eventos"("publicado", "fecha");
