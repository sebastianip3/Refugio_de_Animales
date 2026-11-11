import { ZodError } from 'zod';
import * as registroClinicoService from '../services/registroClinico.service.js';
import { AppError } from '../utils/app-error.js';
import {
  registroClinicoSchema,
  updateRegistroClinicoSchema,
} from '../schema/registroClinico.schema.js';

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
  console.error(error);
  res.status(500).json({ message: 'Error interno del servidor' });
}

// GET /animales/:id/historial
export async function obtenerHistorialClinico(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });

    const animal = await registroClinicoService.obtenerHistorialClinico(id);
    res.json(animal);
  } catch (error) {
    manejarError(res, error);
  }
}

// POST /animales/:id/historial (veterinario)
export async function crearRegistroClinico(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });

    const data = registroClinicoSchema.parse(req.body);
    const registro = await registroClinicoService.crearRegistroClinico(id, data);
    res.status(201).json(registro);
  } catch (error) {
    manejarError(res, error);
  }
}

// PATCH /animales/:id/historial/:registroId (veterinario)
export async function actualizarRegistroClinico(req, res) {
  try {
    const id = parseId(req.params.id);
    const registroId = parseId(req.params.registroId);
    if (!id || !registroId) return res.status(400).json({ message: 'ID inválido' });

    const data = updateRegistroClinicoSchema.parse(req.body);
    const registro = await registroClinicoService.actualizarRegistroClinico(id, registroId, data);
    res.json(registro);
  } catch (error) {
    manejarError(res, error);
  }
}
