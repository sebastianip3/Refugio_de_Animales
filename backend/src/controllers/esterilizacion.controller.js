import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import * as esterilizacionService from '../services/esterilizacion.service.js';
import { AppError } from '../utils/app-error.js';
import { jornadaSchema, updateJornadaSchema, inscripcionSchema, updateInscripcionSchema, ESTADOS_INSCRIPCION, ESTADOS_CORREO,
} from '../schema/esterilizacion.schema.js'; 

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
    if (error.code === 'P2025') return res.status(404).json({ message: 'Registro no encontrado' });
    if (error.code === 'P2034') {
      return res.status(409).json({ message: 'Otra inscripción se procesó al mismo tiempo, intenta nuevamente' });
    }
  }
  console.error(error);
  res.status(500).json({ message: 'Error interno del servidor' });
}

export async function listarJornadas(req, res) {
  try {
    const { activa } = req.query;
    const filtros = {};

    if (activa) {
      if (activa === 'true') {
        filtros.activa = true;
      } else if (activa === 'false') {
        filtros.activa = false;
      } else {
        return res.status(400).json({ message: 'activa debe ser true o false' });
      }
    }
    const jornadas = await esterilizacionService.listarJornadas(filtros);
    res.json(jornadas);
  } catch (error) {
    manejarError(res, error);
  }
}

export async function listarJornadasDisponibles(req, res) {
  try {
    const jornadas = await esterilizacionService.listarJornadasDisponibles();
    res.json(jornadas);
  } catch (error) {
    manejarError(res, error);
  }
}

export async function obtenerJornada(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });

    const jornada = await esterilizacionService.obtenerJornada(id);
    res.json(jornada);
  } catch (error) {
    manejarError(res, error);
  }
}

export async function crearJornada(req, res) {
  try {
    const data = jornadaSchema.parse(req.body);
    const jornada = await esterilizacionService.crearJornada(data);
    res.status(201).json(jornada);
  } catch (error) {
    manejarError(res, error);
  }
}

export async function actualizarJornada(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });

    const data = updateJornadaSchema.parse(req.body);
    const jornada = await esterilizacionService.actualizarJornada(id, data);
    res.json(jornada);
  } catch (error) {
    manejarError(res, error);
  }
}

export async function abrirFormulario(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });

    const jornada = await esterilizacionService.abrirFormulario(id);
    res.json(jornada);
  } catch (error) {
    manejarError(res, error);
  }
}

export async function cerrarFormulario(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });

    const jornada = await esterilizacionService.cerrarFormulario(id);
    res.json(jornada);
  } catch (error) {
    manejarError(res, error);
  }
}

export async function eliminarJornada(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });

    await esterilizacionService.eliminarJornada(id);
    res.status(204).end();
  } catch (error) {
    manejarError(res, error);
  }
}

// ---------- Inscripciones ----------

export async function crearInscripcion(req, res) {
  try {
    const jornadaId = parseId(req.params.id);
    if (!jornadaId) return res.status(400).json({ message: 'ID de jornada inválido' });

    const data = inscripcionSchema.parse(req.body);
    const { errorCorreo, ...inscripcion } = await esterilizacionService.crearInscripcion(jornadaId, data);

    const message =
      inscripcion.estadoCorreo === 'ENVIADO'
        ? 'Inscripción confirmada. Te enviamos el comprobante y las indicaciones a tu correo'
        : 'Inscripción confirmada, pero no pudimos enviarte el correo. Contacta al refugio con tu folio';

    res.status(201).json({ message, inscripcion });
  } catch (error) {
    manejarError(res, error);
  }
}

export async function listarInscripciones(req, res) {
  try {
    const jornadaId = parseId(req.params.id);
    if (!jornadaId) return res.status(400).json({ message: 'ID de jornada inválido' });

    const { estado, estadoCorreo } = req.query;
    const filtros = {};

    if (estado) {
      if (!ESTADOS_INSCRIPCION.includes(estado)) return res.status(400).json({ message: 'Estado inválido' });
      filtros.estado = estado;
    }
    if (estadoCorreo) {
      if (!ESTADOS_CORREO.includes(estadoCorreo)) {
        return res.status(400).json({ message: 'Estado de correo inválido' });
      }
      filtros.estadoCorreo = estadoCorreo;
    }

    const inscripciones = await esterilizacionService.listarInscripciones(jornadaId, filtros);
    res.json(inscripciones);
  } catch (error) {
    manejarError(res, error);
  }
}

export async function obtenerInscripcion(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });

    const inscripcion = await esterilizacionService.obtenerInscripcion(id);
    res.json(inscripcion);
  } catch (error) {
    manejarError(res, error);
  }
}

export async function actualizarInscripcion(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });

    const data = updateInscripcionSchema.parse(req.body);
    const inscripcion = await esterilizacionService.actualizarInscripcion(id, data);
    res.json(inscripcion);
  } catch (error) {
    manejarError(res, error);
  }
}

export async function reenviarComprobante(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });

    const inscripcion = await esterilizacionService.reenviarComprobante(id);

    // la API funciono, pero el servidor de correo no aceptó el envio
    if (inscripcion.estadoCorreo !== 'ENVIADO') {
      return res.status(502).json({ message: 'No se pudo reenviar el comprobante', inscripcion });
    }

    res.json({ message: 'Comprobante reenviado', inscripcion });
  } catch (error) {
    manejarError(res, error);
  }
}
