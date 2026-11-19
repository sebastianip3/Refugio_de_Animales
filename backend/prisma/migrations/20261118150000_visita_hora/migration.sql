-- AlterTable: hora de la visita ("HH:MM"). Las visitas que ya existían quedan sin hora
ALTER TABLE "visitas_adopcion" ADD COLUMN "hora" VARCHAR(5);
