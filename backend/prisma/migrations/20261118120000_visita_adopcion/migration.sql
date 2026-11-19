-- CreateTable
CREATE TABLE "visitas_adopcion" (
    "id" SERIAL NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "adopcionId" INTEGER NOT NULL,

    CONSTRAINT "visitas_adopcion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "visitas_adopcion_adopcionId_fecha_idx" ON "visitas_adopcion"("adopcionId", "fecha");

-- AddForeignKey
ALTER TABLE "visitas_adopcion" ADD CONSTRAINT "visitas_adopcion_adopcionId_fkey" FOREIGN KEY ("adopcionId") REFERENCES "adopciones"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
