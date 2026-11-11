-- CreateTable
CREATE TABLE "disponibilidades_voluntarios" (
    "id" SERIAL NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "hora" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "cuentaId" INTEGER NOT NULL,

    CONSTRAINT "disponibilidades_voluntarios_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "turnos_voluntarios" (
    "id" SERIAL NOT NULL,
    "diaSemana" INTEGER NOT NULL,
    "hora" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "cuentaId" INTEGER NOT NULL,

    CONSTRAINT "turnos_voluntarios_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "disponibilidades_voluntarios_diaSemana_hora_idx" ON "disponibilidades_voluntarios"("diaSemana", "hora");

-- CreateIndex
CREATE UNIQUE INDEX "disponibilidades_voluntarios_cuentaId_diaSemana_hora_key" ON "disponibilidades_voluntarios"("cuentaId", "diaSemana", "hora");

-- CreateIndex
CREATE INDEX "turnos_voluntarios_cuentaId_idx" ON "turnos_voluntarios"("cuentaId");

-- CreateIndex
CREATE UNIQUE INDEX "turnos_voluntarios_diaSemana_hora_key" ON "turnos_voluntarios"("diaSemana", "hora");

-- AddForeignKey
ALTER TABLE "disponibilidades_voluntarios" ADD CONSTRAINT "disponibilidades_voluntarios_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "cuentas"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "turnos_voluntarios" ADD CONSTRAINT "turnos_voluntarios_cuentaId_fkey" FOREIGN KEY ("cuentaId") REFERENCES "cuentas"("id") ON DELETE CASCADE ON UPDATE CASCADE;
