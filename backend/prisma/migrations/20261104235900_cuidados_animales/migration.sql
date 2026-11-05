CREATE TABLE "cuidados_animales" (
    "id" SERIAL NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "animalId" INTEGER NOT NULL,
    "cuentaId" INTEGER NOT NULL,

    CONSTRAINT "cuidados_animales_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "cuidados_animales_animalId_fechaInicio_fechaFin_idx"
    ON "cuidados_animales"("animalId", "fechaInicio", "fechaFin");
CREATE INDEX "cuidados_animales_cuentaId_fechaInicio_fechaFin_idx"
    ON "cuidados_animales"("cuentaId", "fechaInicio", "fechaFin");

ALTER TABLE "cuidados_animales"
    ADD CONSTRAINT "cuidados_animales_animalId_fkey"
    FOREIGN KEY ("animalId") REFERENCES "animales"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "cuidados_animales"
    ADD CONSTRAINT "cuidados_animales_cuentaId_fkey"
    FOREIGN KEY ("cuentaId") REFERENCES "cuentas"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
