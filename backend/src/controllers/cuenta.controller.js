import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import * as authService from '../services/auth.service.js';
import * as cuentaService from '../services/cuenta.service.js';
import { cambiarCorreoCuentaSchema, loginCuentaSchema } from '../schema/cuenta.schema.js';
import { AppError } from '../utils/app-error.js';

function manejarErrorCuenta(res, error) {
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

export async function iniciarSesion(req, res) {
  try {
    const { correo, contrasena } = loginCuentaSchema.parse(req.body);
    const resultado = await authService.iniciarSesion(correo, contrasena);
    return res.json(resultado);
  } catch (error) {
    return manejarErrorCuenta(res, error);
  }
}

export async function cambiarCorreo(req, res) {
  try {
    const { correo, contrasena } = cambiarCorreoCuentaSchema.parse(req.body);
    const cuenta = await cuentaService.cambiarCorreo(req.cuenta.id, correo, contrasena);
    return res.json(cuenta);
  } catch (error) {
    return manejarErrorCuenta(res, error);
  }
}
