-- Guarda qué encargado de adopciones (o administrador) hizo cada acción:
-- quién evaluó la adopción y quién agendó, canceló o registró el resultado de cada visita.
-- Las adopciones y visitas anteriores quedan sin encargado (NULL): no se sabe quién las hizo.
-- Si se elimina la cuenta del encargado, el registro se conserva y el campo queda en NULL.
BEGIN;

ALTER TABLE "adopciones"
  ADD COLUMN "evaluadaPorId" INTEGER,
  ADD COLUMN "fechaEvaluacion" TIMESTAMP(3);

ALTER TABLE "visitas_adopcion"
  ADD COLUMN "agendadaPorId" INTEGER,
  ADD COLUMN "canceladaPorId" INTEGER,
  ADD COLUMN "registradaPorId" INTEGER;

CREATE INDEX "adopciones_evaluadaPorId_idx" ON "adopciones"("evaluadaPorId");
CREATE INDEX "visitas_adopcion_agendadaPorId_idx" ON "visitas_adopcion"("agendadaPorId");
CREATE INDEX "visitas_adopcion_canceladaPorId_idx" ON "visitas_adopcion"("canceladaPorId");
CREATE INDEX "visitas_adopcion_registradaPorId_idx" ON "visitas_adopcion"("registradaPorId");

ALTER TABLE "adopciones" ADD CONSTRAINT "adopciones_evaluadaPorId_fkey"
  FOREIGN KEY ("evaluadaPorId") REFERENCES "cuentas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "visitas_adopcion" ADD CONSTRAINT "visitas_adopcion_agendadaPorId_fkey"
  FOREIGN KEY ("agendadaPorId") REFERENCES "cuentas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "visitas_adopcion" ADD CONSTRAINT "visitas_adopcion_canceladaPorId_fkey"
  FOREIGN KEY ("canceladaPorId") REFERENCES "cuentas"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "visitas_adopcion" ADD CONSTRAINT "visitas_adopcion_registradaPorId_fkey"
  FOREIGN KEY ("registradaPorId") REFERENCES "cuentas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

COMMIT;
