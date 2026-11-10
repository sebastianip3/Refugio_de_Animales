-- CreateEnum
CREATE TYPE "CategoriaInsumo" AS ENUM ('ALIMENTO', 'MEDICAMENTO', 'OTRO');

-- CreateEnum
CREATE TYPE "TipoMovimientoInsumo" AS ENUM ('INGRESO', 'RETIRO', 'CONSUMO');

-- CreateTable
CREATE TABLE "insumos" (
    "id" SERIAL NOT NULL,
    "nombre" VARCHAR(150) NOT NULL,
    "categoria" "CategoriaInsumo" NOT NULL,
    "descripcion" TEXT,
    "unidadMedida" VARCHAR(30) NOT NULL,
    "stockActual" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "stockMinimo" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "insumos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "movimientos_insumos" (
    "id" SERIAL NOT NULL,
    "tipo" "TipoMovimientoInsumo" NOT NULL,
    "cantidad" DECIMAL(12,2) NOT NULL,
    "observacion" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "insumoId" INTEGER NOT NULL,
    "realizadoPorId" INTEGER NOT NULL,

    CONSTRAINT "movimientos_insumos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "insumos_categoria_idx" ON "insumos"("categoria");

-- CreateIndex
CREATE INDEX "movimientos_insumos_insumoId_fecha_idx" ON "movimientos_insumos"("insumoId", "fecha");

-- CreateIndex
CREATE INDEX "movimientos_insumos_realizadoPorId_idx" ON "movimientos_insumos"("realizadoPorId");

-- AddForeignKey
ALTER TABLE "movimientos_insumos" ADD CONSTRAINT "movimientos_insumos_insumoId_fkey" FOREIGN KEY ("insumoId") REFERENCES "insumos"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "movimientos_insumos" ADD CONSTRAINT "movimientos_insumos_realizadoPorId_fkey" FOREIGN KEY ("realizadoPorId") REFERENCES "cuentas"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
