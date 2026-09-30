-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('MACHO', 'HEMBRA', 'DESCONOCIDO');

-- CreateEnum
CREATE TYPE "EstadoAnimal" AS ENUM ('EN_EVALUACION', 'CUARENTENA', 'EN_TRATAMIENTO', 'EN_ADOPCION', 'ADOPTADO', 'OTRO');

-- CreateTable
CREATE TABLE "especies" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "especies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animales" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100),
    "edadEstimada" INTEGER,
    "sexo" "Sexo" NOT NULL DEFAULT 'DESCONOCIDO',
    "peso" DOUBLE PRECISION,
    "estadoGeneral" TEXT,
    "fotografiaUrl" VARCHAR(500),
    "estado" "EstadoAnimal" NOT NULL DEFAULT 'EN_EVALUACION',
    "tieneChip" BOOLEAN,
    "numeroChip" VARCHAR(50),
    "observaciones" TEXT,
    "fechaIngreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEgreso" TIMESTAMP(3),
    "motivoEgreso" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "especieId" INTEGER NOT NULL,

    CONSTRAINT "animales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adopciones" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "comuna" TEXT NOT NULL,
    "tipoVivienda" TEXT,
    "otrasMascotas" TEXT,
    "motivo" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "animalId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adopciones_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "especies_nombre_key" ON "especies"("nombre");

-- CreateIndex
CREATE INDEX "animales_estado_idx" ON "animales"("estado");

-- AddForeignKey
ALTER TABLE "animales" ADD CONSTRAINT "animales_especieId_fkey" FOREIGN KEY ("especieId") REFERENCES "especies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adopciones" ADD CONSTRAINT "adopciones_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
