
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


export async function registrarMovimientoInsumo(
  insumoId,
  datos,
  cuentaId
) {
  return prisma.$transaction(async (tx) => {
    // Verificar que el insumo exista
    const insumo = await tx.insumo.findUnique({
      where: { id: insumoId },
    });

    if (!insumo) {
      const error = new Error("Insumo no encontrado");
      error.status = 404;
      throw error;
    }

    // INGRESO: aumentar el stock
    if (datos.tipo === "INGRESO") {
      await tx.insumo.update({
        where: { id: insumoId },
        data: {
          stockActual: {
            increment: datos.cantidad,
          },
        },
      });
    } else {
      // RETIRO o CONSUMO: descontar del stock
      // Solo se permite si hay cantidad suficiente.
      const resultado = await tx.insumo.updateMany({
        where: {
          id: insumoId,
          stockActual: {
            gte: datos.cantidad,
          },
        },
        data: {
          stockActual: {
            decrement: datos.cantidad,
          },
        },
      });

      if (resultado.count === 0) {
        const error = new Error(
          "No hay stock suficiente para esta operación"
        );
        error.status = 409;
        throw error;
      }
    }

    // Guardar el movimiento en el historial
    const movimiento = await tx.movimientoInsumo.create({
      data: {
        insumoId,
        tipo: datos.tipo,
        cantidad: datos.cantidad,
        observacion: datos.observacion || null,
        realizadoPorId: cuentaId,
      },
    });

    // Obtener la cantidad actualizada
    const insumoActualizado = await tx.insumo.findUnique({
      where: { id: insumoId },
    });

    return {
      insumo: insumoActualizado,
      movimiento,
    };
  });
}

