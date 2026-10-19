-- CreateEnum
CREATE TYPE "TipoCuenta" AS ENUM ('ADMINISTRADOR', 'VOLUNTARIO', 'TRABAJADOR');

-- CreateTable
CREATE TABLE "cuentas" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100) NOT NULL,
    "apellido" VARCHAR(100) NOT NULL,
    "tipo" "TipoCuenta" NOT NULL DEFAULT 'VOLUNTARIO',
    "correo" VARCHAR(254) NOT NULL,
    "contrasenaHash" VARCHAR(255) NOT NULL,
    "horario" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "cuentas_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "cuentas_correo_key" ON "cuentas"("correo");
