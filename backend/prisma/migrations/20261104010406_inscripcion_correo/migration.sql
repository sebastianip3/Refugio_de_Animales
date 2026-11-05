/*
  Warnings:

  - The values [PENDIENTE,CITADA,RECHAZADA] on the enum `EstadoInscripcion` will be removed. If these variants are still used in the database, this will fail.
  - A unique constraint covering the columns `[codigoComprobante]` on the table `inscripciones_esterilizacion` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `codigoComprobante` to the `inscripciones_esterilizacion` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "EstadoCorreo" AS ENUM ('PENDIENTE', 'ENVIADO', 'FALLIDO');

-- AlterEnum
BEGIN;
CREATE TYPE "EstadoInscripcion_new" AS ENUM ('CONFIRMADA', 'ASISTIO', 'NO_ASISTIO', 'CANCELADA');
ALTER TABLE "public"."inscripciones_esterilizacion" ALTER COLUMN "estado" DROP DEFAULT;
ALTER TABLE "inscripciones_esterilizacion" ALTER COLUMN "estado" TYPE "EstadoInscripcion_new" USING ("estado"::text::"EstadoInscripcion_new");
ALTER TYPE "EstadoInscripcion" RENAME TO "EstadoInscripcion_old";
ALTER TYPE "EstadoInscripcion_new" RENAME TO "EstadoInscripcion";
DROP TYPE "public"."EstadoInscripcion_old";
ALTER TABLE "inscripciones_esterilizacion" ALTER COLUMN "estado" SET DEFAULT 'CONFIRMADA';
COMMIT;

-- AlterTable
ALTER TABLE "inscripciones_esterilizacion" ADD COLUMN     "codigoComprobante" VARCHAR(20) NOT NULL,
ADD COLUMN     "errorCorreo" TEXT,
ADD COLUMN     "estadoCorreo" "EstadoCorreo" NOT NULL DEFAULT 'PENDIENTE',
ADD COLUMN     "intentosCorreo" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "estado" SET DEFAULT 'CONFIRMADA';

-- AlterTable
ALTER TABLE "jornadas_esterilizacion" ALTER COLUMN "activa" SET DEFAULT false;

-- CreateIndex
CREATE UNIQUE INDEX "inscripciones_esterilizacion_codigoComprobante_key" ON "inscripciones_esterilizacion"("codigoComprobante");

-- CreateIndex
CREATE INDEX "inscripciones_esterilizacion_estadoCorreo_idx" ON "inscripciones_esterilizacion"("estadoCorreo");
