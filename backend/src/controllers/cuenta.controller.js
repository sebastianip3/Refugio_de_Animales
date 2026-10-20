import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { AppError } from '../utils/app-error.js';

export function manejarErrorCuenta(res, error) {
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

  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === 'P2002') {
      return res.status(409).json({ message: 'Ya existe una cuenta con ese correo electrónico' });
    }
    if (error.code === 'P2025') {
      return res.status(404).json({ message: 'Cuenta no encontrada' });
    }
  }

  console.error(error);
  return res.status(500).json({ message: 'Error interno del servidor' });
}
