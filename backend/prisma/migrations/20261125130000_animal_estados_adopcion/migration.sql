-- 1. Enum nuevo de estados del animal (sin OTRO)
--    PostgreSQL no permite quitar un valor de un enum, así que se crea de nuevo
ALTER TYPE "EstadoAnimal" RENAME TO "EstadoAnimal_old";

CREATE TYPE "EstadoAnimal" AS ENUM (
  'EN_EVALUACION', 'CUARENTENA', 'EN_TRATAMIENTO',
  'ADOPTABLE', 'EN_ADOPCION', 'ADOPTADO',
  'NO_ADOPTABLE', 'FALLECIDO', 'EXTRAVIADO'
);

ALTER TABLE "animales" ALTER COLUMN "estado" DROP DEFAULT;
-- los animales que estaban en OTRO vuelven a evaluación
ALTER TABLE "animales" ALTER COLUMN "estado" TYPE "EstadoAnimal"
  USING (CASE WHEN "estado"::text = 'OTRO' THEN 'EN_EVALUACION' ELSE "estado"::text END)::"EstadoAnimal";
ALTER TABLE "animales" ALTER COLUMN "estado" SET DEFAULT 'EN_EVALUACION';

DROP TYPE "EstadoAnimal_old";

-- 2. EN_ADOPCION cambió de significado:
--    antes = "disponible para adopción", ahora = "tiene una solicitud en curso".
--    Los que estaban EN_ADOPCION sin solicitud en curso pasan a ADOPTABLE
UPDATE "animales" a
SET "estado" = 'ADOPTABLE'
WHERE a."estado" = 'EN_ADOPCION'
  AND NOT EXISTS (
    SELECT 1 FROM "adopciones" ad
    WHERE ad."animalId" = a."id" AND ad."estado" IN ('PENDIENTE', 'EN_REVISION')
  );

-- 3. La fecha de nacimiento solo se puede corregir 1 vez
ALTER TABLE "animales" ADD COLUMN "cambioFechaNacimiento" INTEGER NOT NULL DEFAULT 0;