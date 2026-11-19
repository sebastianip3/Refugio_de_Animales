-- CreateEnum
CREATE TYPE "EstadoVisita" AS ENUM ('AGENDADA', 'CANCELADA');

-- AlterTable: las visitas que ya existían quedan como agendadas
ALTER TABLE "visitas_adopcion" ADD COLUMN "estado" "EstadoVisita" NOT NULL DEFAULT 'AGENDADA';
