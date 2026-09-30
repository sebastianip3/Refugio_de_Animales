import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import * as adopcionService from '../services/adopcion.service.js';
import { AppError } from '../utils/app-error.js';
import { adopcionSchema, updateAdopcionSchema, ESTADOS_ADOPCION } from '../schema/adopcion.schema.js';

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function manejarError(res, error) {
  if (error instanceof AppError) return res.status(error.status).json({ message: error.message });
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
    const filtros = {};

    if (estado) {
      if (!ESTADOS_ADOPCION.includes(estado)) return res.status(400).json({ message: 'Estado inválido' });
      filtros.estado = estado;
    }
    if (animalId) {
      filtros.animalId = parseId(animalId);
      if (!filtros.animalId) return res.status(400).json({ message: 'animalId inválido' });
    }

    const adopciones = await adopcionService.listarAdopciones(filtros);
    res.json(adopciones);
  } catch (error) {
    manejarError(res, error);
  }
}

export async function obtenerAdopcion(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });

    const adopcion = await adopcionService.obtenerAdopcion(id);
    res.json(adopcion);
  } catch (error) {
    manejarError(res, error);
  }
}

export async function crearAdopcion(req, res) {
  try {
    const data = adopcionSchema.parse(req.body);
    const adopcion = await adopcionService.crearAdopcion(data);
    res.status(201).json(adopcion);
  } catch (error) {
    manejarError(res, error);
  }
}

export async function actualizarAdopcion(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });

    const data = updateAdopcionSchema.parse(req.body);
    const adopcion = await adopcionService.actualizarAdopcion(id, data);
    res.json(adopcion);
  } catch (error) {
    manejarError(res, error);
  }
}
