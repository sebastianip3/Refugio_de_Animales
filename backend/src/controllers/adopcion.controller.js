import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import {
  adopcionSchema,
  updateAdopcionSchema,
  ESTADOS_ADOPCION,
  ESTADOS_EN_PROCESO,
} from '../schema/adopcion.schema.js';

// Serializable evita que dos solicitudes simultáneas pasen la verificación a la vez
const TX_OPCIONES = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable };

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function manejarError(res, error) {
  if (error instanceof HttpError) return res.status(error.status).json({ message: error.message });
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Datos inválidos',
      errors: error.issues.map((i) => ({ campo: i.path.join('.'), mensaje: i.message })),
    });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2025') return res.status(404).json({ message: 'Adopción no encontrada' });
    // Conflicto de serialización: otra solicitud modificó los mismos datos al mismo tiempo
    if (error.code === 'P2034') {
      return res.status(409).json({ message: 'Otra solicitud se procesó al mismo tiempo, intenta nuevamente' });
    }
  }
  console.error(error);
  res.status(500).json({ message: 'Error interno del servidor' });
}

// GET /adopciones?animalId=1&estado=PENDIENTE
export async function listarAdopciones(req, res) {
  try {
    const { animalId, estado } = req.query;
    const where = {};

    if (estado) {
      if (!ESTADOS_ADOPCION.includes(estado)) return res.status(400).json({ message: 'Estado inválido' });
      where.estado = estado;
    }
    if (animalId) {
      where.animalId = parseId(animalId);
      if (!where.animalId) return res.status(400).json({ message: 'animalId inválido' });
    }

    const adopciones = await prisma.adopcion.findMany({
      where,
      include: { animal: { include: { especie: true } } },
      orderBy: { fechaSolicitud: 'desc' },
    });
    res.json(adopciones);
  } catch (error) {
    manejarError(res, error);
  }
}

export async function obtenerAdopcion(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });

    const adopcion = await prisma.adopcion.findUniqueOrThrow({
      where: { id },
      include: { animal: { include: { especie: true } } },
    });
    res.json(adopcion);
  } catch (error) {
    manejarError(res, error);
  }
}

export async function crearAdopcion(req, res) {
  try {
    const data = adopcionSchema.parse(req.body);

    const adopcion = await prisma.$transaction(async (tx) => {
      const animal = await tx.animal.findUnique({ where: { id: data.animalId } });
      if (!animal) throw new HttpError(404, 'Animal no encontrado');
      if (animal.estado === 'ADOPTADO') throw new HttpError(409, 'El animal ya fue adoptado');

      const enProceso = await tx.adopcion.findFirst({
        where: { animalId: data.animalId, estado: { in: ESTADOS_EN_PROCESO } },
      });
      if (enProceso) throw new HttpError(409, 'El animal ya tiene una adopción en proceso');

      return tx.adopcion.create({ data, include: { animal: true } });
    }, TX_OPCIONES);

    res.status(201).json(adopcion);
  } catch (error) {
    manejarError(res, error);
  }
}

// Solo se puede cambiar el estado mientras la adopción está en proceso.
// Al aprobarla, el animal pasa a ADOPTADO y se registra su egreso.
export async function actualizarAdopcion(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });

    const data = updateAdopcionSchema.parse(req.body);

    const adopcion = await prisma.$transaction(async (tx) => {
      const actual = await tx.adopcion.findUniqueOrThrow({ where: { id } });

      if (data.estado && data.estado !== actual.estado) {
        if (!ESTADOS_EN_PROCESO.includes(actual.estado)) {
          throw new HttpError(409, `La adopción ya está cerrada (${actual.estado}) y no puede cambiar de estado`);
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

    res.json(adopcion);
  } catch (error) {
    manejarError(res, error);
  }
}
