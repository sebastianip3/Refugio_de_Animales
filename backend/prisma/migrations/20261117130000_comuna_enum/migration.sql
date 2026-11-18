-- CreateEnum
CREATE TYPE "Comuna" AS ENUM ('CONCEPCION', 'CORONEL', 'CHIGUAYANTE', 'FLORIDA', 'HUALQUI', 'LOTA', 'PENCO', 'SAN_PEDRO_DE_LA_PAZ', 'SANTA_JUANA', 'TALCAHUANO');

-- AlterTable: convierte el texto libre anterior al enum.
-- La comuna es obligatoria, así que lo que no calce (datos de prueba) queda en CONCEPCION.
ALTER TABLE "adopciones" ALTER COLUMN "comuna" TYPE "Comuna" USING (
  CASE lower(trim("comuna"))
    WHEN 'concepción' THEN 'CONCEPCION'
    WHEN 'concepcion' THEN 'CONCEPCION'
    WHEN 'coronel' THEN 'CORONEL'
    WHEN 'chiguayante' THEN 'CHIGUAYANTE'
    WHEN 'florida' THEN 'FLORIDA'
    WHEN 'hualqui' THEN 'HUALQUI'
    WHEN 'lota' THEN 'LOTA'
    WHEN 'penco' THEN 'PENCO'
    WHEN 'san pedro de la paz' THEN 'SAN_PEDRO_DE_LA_PAZ'
    WHEN 'santa juana' THEN 'SANTA_JUANA'
    WHEN 'talcahuano' THEN 'TALCAHUANO'
    ELSE 'CONCEPCION'
  END
)::"Comuna";
