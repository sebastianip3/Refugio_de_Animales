-- El veterinario responsable de un registro clínico deja de ser una lista fija (enum)
-- y pasa a ser una cuenta de tipo VETERINARIO creada por el administrador.
-- Los veterinarios de ejemplo (James Herriot, Karen Becker y Francisca González) se eliminan:
-- los registros que los tenían quedan como "Veterinario no indicado".
BEGIN;

ALTER TABLE "registros_clinicos" ADD COLUMN "veterinarioId" INTEGER;

ALTER TABLE "registros_clinicos"
  ADD CONSTRAINT "registros_clinicos_veterinarioId_fkey"
  FOREIGN KEY ("veterinarioId") REFERENCES "cuentas"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "registros_clinicos_veterinarioId_idx" ON "registros_clinicos"("veterinarioId");

ALTER TABLE "registros_clinicos" DROP COLUMN "veterinario";

DROP TYPE "Veterinario";

COMMIT;
