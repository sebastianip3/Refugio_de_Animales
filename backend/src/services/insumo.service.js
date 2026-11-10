
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
