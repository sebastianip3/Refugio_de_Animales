import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { AppError } from '../utils/app-error.js';
import { ESTADOS_EN_PROCESO } from '../schema/adopcion.schema.js';
import { enviarResultadoAdopcion } from './correo.service.js';

// Serializable evita que dos solicitudes simultáneas pasen la verificación a la vez
const TX_OPCIONES = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable };

// Al pasar a estos estados se avisa al adoptante por correo
const ESTADOS_NOTIFICADOS = ['APROBADA', 'RECHAZADA'];

// Una adopción en estos estados impide que el mismo adoptante haga otra solicitud
const ESTADOS_BLOQUEAN_ADOPTANTE = [...ESTADOS_EN_PROCESO, 'APROBADA'];

const INCLUDE_ANIMAL ={ animal: { include: { especie: true } } };

// filtros: { animalId?, estado? }, ya validados por el controller
export function listarAdopciones(filtros = {}) {
  return prisma.adopcion.findMany({
    where: filtros,
    include: INCLUDE_ANIMAL,
    orderBy: { fechaSolicitud: 'desc' },
  });
}

// Pública: solo los IDs, para que la ficha deshabilite esos animales sin exponer datos personales
export async function listarAnimalesEnProceso() {
  const adopciones = await prisma.adopcion.findMany({
    where: { estado: { in: ESTADOS_EN_PROCESO } },
    select: { animalId: true },
    distinct: ['animalId'],
  });
  return adopciones.map((adopcion) => adopcion.animalId);
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

    // Cada adoptante (RUT) puede tener solo una adopción; si fue rechazada o cancelada puede volver a postular
    const adopcionDelAdoptante = await tx.adopcion.findFirst({
      where: { rut: data.rut, estado: { in: ESTADOS_BLOQUEAN_ADOPTANTE } },
    });
    if (adopcionDelAdoptante) {
      throw new AppError(
        409,
        adopcionDelAdoptante.estado === 'APROBADA'
          ? 'Este adoptante ya realizó una adopción y no puede adoptar otro animal'
          : 'Este adoptante ya tiene una solicitud de adopción en proceso'
      );
    }

    return tx.adopcion.create({ data, include: { animal: true } });
  }, TX_OPCIONES);
}

// Solo se puede cambiar el estado mientras la adopción está en proceso.
// Al aprobarla, el animal pasa a ADOPTADO y se registra su egreso.
// Si se aprueba o rechaza, se avisa al adoptante por correo después de guardar.
export async function actualizarAdopcion(id, data) {
  let cambioEstado = false;

  const adopcion = await prisma.$transaction(async (tx) => {
    const actual = await tx.adopcion.findUnique({ where: { id } });
    if (!actual) throw new AppError(404, 'Adopción no encontrada');

    if (data.estado && data.estado !== actual.estado) {
      if (!ESTADOS_EN_PROCESO.includes(actual.estado)) {
        throw new AppError(409, `La adopción ya está cerrada (${actual.estado}) y no puede cambiar de estado`);
      }
      cambioEstado = true;

      if (data.estado === 'APROBADA') {
        await tx.animal.update({
          where: { id: actual.animalId },
          data: { estado: 'ADOPTADO', fechaEgreso: new Date(), motivoEgreso: 'Adoptado' },
        });
      }
    }

    return tx.adopcion.update({ where: { id }, data, include: { animal: true } });
  }, TX_OPCIONES);

  if (!cambioEstado || !ESTADOS_NOTIFICADOS.includes(adopcion.estado)) return adopcion;

  // Si el correo falla, el cambio de estado igual queda guardado; el encargado ve el aviso
  try {
    await enviarResultadoAdopcion(adopcion);
    return { ...adopcion, correoEnviado: true };
  } catch (error) {
    console.error('No se pudo enviar el correo de la adopción:', error.message);
    return { ...adopcion, correoEnviado: false };
  }
}
