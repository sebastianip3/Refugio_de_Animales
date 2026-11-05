import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import * as cuidadoService from '../services/cuidado.service.js';
import { AppError } from '../utils/app-error.js';
import { consultarDisponibilidadSchema, crearCuidadoSchema } from '../schema/cuidado.schema.js';

function manejarError(res, error) {
  if (error instanceof AppError) {
    return res.status(error.status).json({ message: error.message });
  }
  if (error instanceof ZodError) {
    return res.status(400).json({
      message: 'Datos inválidos',
      errors: error.issues.map((issue) => ({
        campo: issue.path.join('.'),
        mensaje: issue.message,
      })),
    });
  }
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
    return res.status(404).json({ message: 'Animal o persona cuidadora no encontrados' });
  }

  console.error(error);
  return res.status(500).json({ message: 'Error interno del servidor' });
}

export async function consultarDisponibilidad(req, res) {
  try {
    const intervalo = consultarDisponibilidadSchema.parse(req.query);
    const disponibilidad = await cuidadoService.consultarDisponibilidad(intervalo);
    return res.json(disponibilidad);
  } catch (error) {
    return manejarError(res, error);
  }
}

export async function asignarCuidado(req, res) {
  try {
    const datos = crearCuidadoSchema.parse(req.body);
    const cuidado = await cuidadoService.asignarCuidado(datos);
    return res.status(201).json(cuidado);
  } catch (error) {
    return manejarError(res, error);
  }
}
