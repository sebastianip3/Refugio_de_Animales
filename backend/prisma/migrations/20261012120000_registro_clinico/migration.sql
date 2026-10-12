-- CreateEnum
CREATE TYPE "TipoRegistroClinico" AS ENUM ('CONSULTA', 'VACUNA', 'DESPARASITACION', 'CIRUGIA', 'ESTERILIZACION', 'TRATAMIENTO', 'EXAMEN', 'OTRO');

-- CreateTable
CREATE TABLE "registros_clinicos" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "tipo" "TipoRegistroClinico" NOT NULL,
    "descripcion" TEXT NOT NULL,
    "diagnostico" TEXT,
    "tratamiento" TEXT,
    "veterinario" VARCHAR(100),
    "observaciones" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "animalId" INTEGER NOT NULL,

    CONSTRAINT "registros_clinicos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "registros_clinicos_animalId_fecha_idx" ON "registros_clinicos"("animalId", "fecha");

-- AddForeignKey
ALTER TABLE "registros_clinicos" ADD CONSTRAINT "registros_clinicos_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

