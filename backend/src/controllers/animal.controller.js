import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import * as animalService from '../services/animal.service.js';
import { AppError } from '../utils/app-error.js';
import { animalSchema, updateAnimalSchema, ESTADOS_ANIMAL } from '../schema/animal.schema.js';

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
    if (error.code === 'P2025') return res.status(404).json({ message: 'Animal no encontrado' });
    if (error.code === 'P2003') {
      return res.status(409).json({ message: 'La especie no existe o el animal tiene registros asociados' });
    }
  }
  console.error(error);
  res.status(500).json({ message: 'Error interno del servidor' });
}

// GET /animales?estado=EN_ADOPCION&especieId=1
export async function listarAnimales(req, res) {
  try {
    const { estado, especieId } = req.query;
    const filtros = {};

    if (estado) {
      if (!ESTADOS_ANIMAL.includes(estado)) return res.status(400).json({ message: 'Estado inválido' });
      filtros.estado = estado;
    }
    if (especieId) {
      filtros.especieId = parseId(especieId);
      if (!filtros.especieId) return res.status(400).json({ message: 'especieId inválido' });
    }

    const animales = await animalService.listarAnimales(filtros);
    res.json(animales);
  } catch (error) {
    manejarError(res, error);
  }
}

export async function obtenerAnimal(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });

    const animal = await animalService.obtenerAnimal(id);
    res.json(animal);
  } catch (error) {
    manejarError(res, error);
  }
}

export async function crearAnimal(req, res) {
  try {
    const data = animalSchema.parse(req.body);
    const animal = await animalService.crearAnimal(data);
    res.status(201).json(animal);
  } catch (error) {
    manejarError(res, error);
  }
}

export async function actualizarAnimal(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });

    const data = updateAnimalSchema.parse(req.body);
    const animal = await animalService.actualizarAnimal(id, data);
    res.json(animal);
  } catch (error) {
    manejarError(res, error);
  }
}

export async function eliminarAnimal(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });

    await animalService.eliminarAnimal(id);
    res.status(204).end();
  } catch (error) {
    manejarError(res, error);
  }
}
