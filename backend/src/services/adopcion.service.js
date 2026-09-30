import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { AppError } from '../utils/app-error.js';
import { ESTADOS_EN_PROCESO } from '../schema/adopcion.schema.js';

// Serializable evita que dos solicitudes simultáneas pasen la verificación a la vez
const TX_OPCIONES = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable };

const INCLUDE_ANIMAL = { animal: { include: { especie: true } } };

// filtros: { animalId?, estado? }, ya validados por el controller
export function listarAdopciones(filtros = {}) {
  return prisma.adopcion.findMany({
    where: filtros,
    include: INCLUDE_ANIMAL,
    orderBy: { fechaSolicitud: 'desc' },
  });
}

export async function obtenerAdopcion(id) {
  const adopcion = await prisma.adopcion.findUnique({ where: { id }, include: INCLUDE_ANIMAL });
  if (!adopcion) throw new AppError(404, 'Adopción no encontrada');
  return adopcion;
}

// Un animal adoptado o con una adopción en proceso no puede recibir otra solicitud
export function crearAdopcion(data) {
  return prisma.$transaction(async (tx) => {
    const animal = await tx.animal.findUnique({ where: { id: data.animalId } });
    if (!animal) throw new AppError(404, 'Animal no encontrado');
    if (animal.estado === 'ADOPTADO') throw new AppError(409, 'El animal ya fue adoptado');

    const enProceso = await tx.adopcion.findFirst({
      where: { animalId: data.animalId, estado: { in: ESTADOS_EN_PROCESO } },
    });
    if (enProceso) throw new AppError(409, 'El animal ya tiene una adopción en proceso');

    return tx.adopcion.create({ data, include: { animal: true } });
  }, TX_OPCIONES);
}

// Solo se puede cambiar el estado mientras la adopción está en proceso.
// Al aprobarla, el animal pasa a ADOPTADO y se registra su egreso.
export function actualizarAdopcion(id, data) {
  return prisma.$transaction(async (tx) => {
    const actual = await tx.adopcion.findUnique({ where: { id } });
    if (!actual) throw new AppError(404, 'Adopción no encontrada');

    if (data.estado && data.estado !== actual.estado) {
      if (!ESTADOS_EN_PROCESO.includes(actual.estado)) {
        throw new AppError(409, `La adopción ya está cerrada (${actual.estado}) y no puede cambiar de estado`);
      }

      if (data.estado === 'APROBADA') {
        await tx.animal.update({
          where: { id: actual.animalId },
          data: { estado: 'ADOPTADO', fechaEgreso: new Date(), motivoEgreso: 'Adoptado' },
        });
      }
    }

    return tx.adopcion.update({ where: { id }, data, include: { animal: true } });
  }, TX_OPCIONES);
}
