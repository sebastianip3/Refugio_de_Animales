-- AlterEnum: la visita puede quedar registrada como realizada
ALTER TYPE "EstadoVisita" ADD VALUE 'REALIZADA';

-- CreateEnum
CREATE TYPE "EstadoAnimalVisita" AS ENUM ('BIEN', 'REGULAR', 'CON_PROBLEMAS');

-- AlterTable: resultado de la visita
ALTER TABLE "visitas_adopcion" ADD COLUMN "estadoAnimal" "EstadoAnimalVisita",
ADD COLUMN "observaciones" TEXT;
