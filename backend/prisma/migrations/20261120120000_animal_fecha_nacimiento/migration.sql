-- Edad estimada se reemplaza por fecha de nacimiento
ALTER TABLE "animales" ADD COLUMN "fechaNacimiento" TIMESTAMP(3);

-- Se conserva la edad de los animales que ya existían: fecha de hoy menos los meses que tenían
UPDATE "animales"
SET "fechaNacimiento" = NOW() - ("edadEstimada" * INTERVAL '1 month')
WHERE "edadEstimada" IS NOT NULL;

ALTER TABLE "animales" DROP COLUMN "edadEstimada";

-- Contador de correcciones de sexo (máximo 2)
ALTER TABLE "animales" ADD COLUMN "cambioSexo" INTEGER NOT NULL DEFAULT 0;

-- Nuevos límites de caracteres
ALTER TABLE "animales" ALTER COLUMN "nombre" SET DATA TYPE VARCHAR(30);
ALTER TABLE "animales" ALTER COLUMN "numeroChip" SET DATA TYPE VARCHAR(15);
ALTER TABLE "animales" ALTER COLUMN "motivoEgreso" SET DATA TYPE VARCHAR(100);