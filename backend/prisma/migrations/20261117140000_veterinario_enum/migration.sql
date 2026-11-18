-- CreateEnum
CREATE TYPE "Veterinario" AS ENUM ('JAMES_HERRIOT', 'KAREN_BECKER', 'FRANCISCA_GONZALEZ');

-- AlterTable: convierte el texto libre anterior al enum.
-- Los nombres de los datos de ejemplo se pasan a los veterinarios nuevos; lo que no calce queda en NULL.
ALTER TABLE "registros_clinicos" ALTER COLUMN "veterinario" TYPE "Veterinario" USING (
  CASE lower(trim("veterinario"))
    WHEN 'dr. james herriot' THEN 'JAMES_HERRIOT'
    WHEN 'dra. karen becker' THEN 'KAREN_BECKER'
    WHEN 'dra. francisca gonzález' THEN 'FRANCISCA_GONZALEZ'
    WHEN 'dra. francisca gonzalez' THEN 'FRANCISCA_GONZALEZ'
    WHEN 'dr. andrés soto' THEN 'JAMES_HERRIOT'
    WHEN 'dra. paula rojas' THEN 'KAREN_BECKER'
    ELSE NULL
  END
)::"Veterinario";
