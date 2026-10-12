-- CreateEnum
CREATE TYPE "Sexo" AS ENUM ('MACHO', 'HEMBRA', 'DESCONOCIDO');

-- CreateEnum
CREATE TYPE "EstadoAnimal" AS ENUM ('EN_EVALUACION', 'CUARENTENA', 'EN_TRATAMIENTO', 'EN_ADOPCION', 'ADOPTADO', 'OTRO');

-- CreateEnum
CREATE TYPE "EstadoAdopcion" AS ENUM ('PENDIENTE', 'EN_REVISION', 'APROBADA', 'RECHAZADA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TamanoMascota" AS ENUM ('PEQUENO', 'MEDIANO', 'GRANDE');

-- CreateEnum
CREATE TYPE "EstadoInscripcion" AS ENUM ('PENDIENTE', 'CITADA', 'ASISTIO', 'NO_ASISTIO', 'RECHAZADA', 'CANCELADA');

-- CreateTable
CREATE TABLE "especies" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(80) NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "especies_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "animales" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(100),
    "edadEstimada" INTEGER,
    "sexo" "Sexo" NOT NULL DEFAULT 'DESCONOCIDO',
    "peso" DOUBLE PRECISION,
    "estadoGeneral" TEXT,
    "fotografiaUrl" VARCHAR(500),
    "estado" "EstadoAnimal" NOT NULL DEFAULT 'EN_EVALUACION',
    "tieneChip" BOOLEAN,
    "numeroChip" VARCHAR(50),
    "observaciones" TEXT,
    "fechaIngreso" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEgreso" TIMESTAMP(3),
    "motivoEgreso" VARCHAR(255),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "especieId" INTEGER NOT NULL,

    CONSTRAINT "animales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "adopciones" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "rut" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "direccion" TEXT NOT NULL,
    "comuna" TEXT NOT NULL,
    "tipoVivienda" TEXT,
    "otrasMascotas" TEXT,
    "motivo" TEXT,
    "estado" "EstadoAdopcion" NOT NULL DEFAULT 'PENDIENTE',
    "observaciones" TEXT,
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "animalId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "adopciones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "jornadas_esterilizacion" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "lugar" VARCHAR(255) NOT NULL,
    "comuna" VARCHAR(100) NOT NULL,
    "sector" VARCHAR(100),
    "cuposTotales" INTEGER NOT NULL,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "indicacionesPostOperatorias" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "jornadas_esterilizacion_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inscripciones_esterilizacion" (
    "id" SERIAL NOT NULL,
    "estado" "EstadoInscripcion" NOT NULL DEFAULT 'PENDIENTE',
    "sexo" "Sexo" NOT NULL,
    "tamano" "TamanoMascota" NOT NULL,
    "pesoEstimado" DOUBLE PRECISION NOT NULL,
    "especieId" INTEGER NOT NULL,
    "tutorNombre" VARCHAR(100) NOT NULL,
    "tutorApellido" VARCHAR(100) NOT NULL,
    "tutorRut" VARCHAR(12) NOT NULL,
    "tutorEmail" VARCHAR(150) NOT NULL,
    "tutorComuna" VARCHAR(100) NOT NULL,
    "tutorSector" VARCHAR(100) NOT NULL,
    "observaciones" TEXT,
    "fechaEnvioCorreo" TIMESTAMP(3),
    "jornadaId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "inscripciones_esterilizacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "especies_nombre_key" ON "especies"("nombre");

-- CreateIndex
CREATE INDEX "animales_estado_idx" ON "animales"("estado");

-- CreateIndex
CREATE INDEX "adopciones_animalId_estado_idx" ON "adopciones"("animalId", "estado");

-- CreateIndex
CREATE INDEX "jornadas_esterilizacion_activa_fecha_idx" ON "jornadas_esterilizacion"("activa", "fecha");

-- CreateIndex
CREATE INDEX "inscripciones_esterilizacion_jornadaId_estado_idx" ON "inscripciones_esterilizacion"("jornadaId", "estado");

-- CreateIndex
CREATE INDEX "inscripciones_esterilizacion_tutorRut_idx" ON "inscripciones_esterilizacion"("tutorRut");

-- AddForeignKey
ALTER TABLE "animales" ADD CONSTRAINT "animales_especieId_fkey" FOREIGN KEY ("especieId") REFERENCES "especies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "adopciones" ADD CONSTRAINT "adopciones_animalId_fkey" FOREIGN KEY ("animalId") REFERENCES "animales"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones_esterilizacion" ADD CONSTRAINT "inscripciones_esterilizacion_especieId_fkey" FOREIGN KEY ("especieId") REFERENCES "especies"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inscripciones_esterilizacion" ADD CONSTRAINT "inscripciones_esterilizacion_jornadaId_fkey" FOREIGN KEY ("jornadaId") REFERENCES "jornadas_esterilizacion"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
