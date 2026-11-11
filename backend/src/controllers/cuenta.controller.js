import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import * as authService from '../services/auth.service.js';
import * as cuentaService from '../services/cuenta.service.js';
import {
  actualizarDisponibilidadHorariaSchema,
  cambiarDisponibilidadCuidadoSchema,
  cambiarCorreoCuentaSchema,
  crearVoluntarioSchema,
  idVoluntarioSchema,
  loginCuentaSchema,
} from '../schema/cuenta.schema.js';
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
    const { token, cuenta } = await authService.iniciarSesion(correo, contrasena);

    // El token no va en la respuesta: queda en la cookie httpOnly
    res.cookie(authService.COOKIE_SESION, token, {
      ...authService.opcionesCookieSesion,
      maxAge: authService.DURACION_SESION_MS,
    });
    return res.json({ cuenta });
  } catch (error) {
    return manejarErrorCuenta(res, error);
  }
}

// POST /cuentas/logout
export function cerrarSesion(req, res) {
  res.clearCookie(authService.COOKIE_SESION, authService.opcionesCookieSesion);
  return res.status(204).end();
}

// GET /cuentas/perfil: datos de la cuenta con sesión iniciada (sin la contraseña)
export function obtenerPerfil(req, res) {
  return res.json(req.cuenta);
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

export async function cambiarDisponibilidadCuidado(req, res) {
  try {
    const { disponibleCuidado } = cambiarDisponibilidadCuidadoSchema.parse(req.body);
    const cuenta = await cuentaService.cambiarDisponibilidadCuidado(
      req.cuenta.id,
      disponibleCuidado,
    );
    return res.json(cuenta);
  } catch (error) {
    return manejarErrorCuenta(res, error);
  }
}

export async function listarVoluntarios(req, res) {
  try {
    const voluntarios = await cuentaService.listarVoluntarios();
    return res.json(voluntarios);
  } catch (error) {
    return manejarErrorCuenta(res, error);
  }
}

export async function crearVoluntario(req, res) {
  try {
    const datos = crearVoluntarioSchema.parse(req.body);
    const voluntario = await cuentaService.crearVoluntario(datos);
    return res.status(201).json(voluntario);
  } catch (error) {
    return manejarErrorCuenta(res, error);
  }
}

export async function eliminarVoluntario(req, res) {
  try {
    const { id } = idVoluntarioSchema.parse(req.params);
    await cuentaService.eliminarVoluntario(id);
    return res.status(204).end();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') {
      return res.status(409).json({
        message: 'No se puede eliminar el voluntario porque tiene registros de cuidado; desactiva su disponibilidad',
      });
    }
    return manejarErrorCuenta(res, error);
  }
}

export async function obtenerCalendarioVoluntariado(req, res) {
  try {
    const calendario = await cuentaService.obtenerCalendarioVoluntariado();
    return res.json(calendario);
  } catch (error) {
    return manejarErrorCuenta(res, error);
  }
}

export async function actualizarDisponibilidadHoraria(req, res) {
  try {
    const { id } = idVoluntarioSchema.parse(req.params);
    const { bloques } = actualizarDisponibilidadHorariaSchema.parse(req.body);

    if (req.cuenta) {
      if (req.cuenta.tipo === 'VOLUNTARIO' && req.cuenta.id !== id) {
        throw new AppError(403, 'Solo puedes modificar tu propia disponibilidad horaria');
      }
      if (!['VOLUNTARIO', 'ADMINISTRADOR'].includes(req.cuenta.tipo)) {
        throw new AppError(403, 'No tienes permisos para modificar horarios de voluntariado');
      }
    }

    const calendarioActualizado = await cuentaService.actualizarDisponibilidadHoraria(id, bloques);
    return res.json(calendarioActualizado);
  } catch (error) {
    return manejarErrorCuenta(res, error);
  }
}
