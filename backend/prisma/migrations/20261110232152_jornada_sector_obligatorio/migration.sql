/*
  Warnings:

  - Made the column `sector` on table `jornadas_esterilizacion` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "jornadas_esterilizacion" ALTER COLUMN "sector" SET NOT NULL;
