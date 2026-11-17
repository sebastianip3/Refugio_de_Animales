-- CreateEnum
CREATE TYPE "TipoVivienda" AS ENUM ('CASA_CON_PATIO', 'CASA_SIN_PATIO', 'CABANA', 'DEPARTAMENTO', 'CONDOMINIO');

-- AlterTable: convierte el texto libre anterior al enum; lo que no calce queda en NULL
ALTER TABLE "adopciones" ALTER COLUMN "tipoVivienda" TYPE "TipoVivienda" USING (
  CASE lower(trim("tipoVivienda"))
    WHEN 'casa con patio' THEN 'CASA_CON_PATIO'
    WHEN 'casa sin patio' THEN 'CASA_SIN_PATIO'
    WHEN 'cabaña' THEN 'CABANA'
    WHEN 'cabana' THEN 'CABANA'
    WHEN 'departamento' THEN 'DEPARTAMENTO'
    WHEN 'condominio' THEN 'CONDOMINIO'
    ELSE NULL
  END
)::"TipoVivienda";
