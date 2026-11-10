
import prisma from "../config/prisma.js";

// Obtiene todos los insumos registrados en PostgreSQL.
export async function listarInsumos() {
  return await prisma.insumo.findMany({
    orderBy: [
      { categoria: "asc" },
      { nombre: "asc" },
    ],
  });
}


export async function crearInsumo(datos, cuentaId) {
  return prisma.$transaction(async (tx) => {
    const insumo = await tx.insumo.create({
      data: {
        nombre: datos.nombre,
        categoria: datos.categoria,
        descripcion: datos.descripcion ?? null,
        unidadMedida: datos.unidadMedida,
        stockActual: datos.stockActual,
        stockMinimo: datos.stockMinimo,
      },
    });

    // Registrar el stock inicial en el historial.
    if (datos.stockActual > 0) {
      await tx.movimientoInsumo.create({
        data: {
          insumoId: insumo.id,
          tipo: "INGRESO",
          cantidad: datos.stockActual,
          observacion: "Stock inicial",
          realizadoPorId: cuentaId,
        },
      });
    }

    return insumo;
  });
}
