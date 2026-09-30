import { ZodError } from 'zod';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { animalSchema, updateAnimalSchema, ESTADOS_ANIMAL } from '../schema/animal.schema.js';

function parseId(value) {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

function manejarError(res, error) {
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
    const where = {};

    if (estado) {
      if (!ESTADOS_ANIMAL.includes(estado)) return res.status(400).json({ message: 'Estado inválido' });
      where.estado = estado;
    }
    if (especieId) {
      where.especieId = parseId(especieId);
      if (!where.especieId) return res.status(400).json({ message: 'especieId inválido' });
    }

    const animales = await prisma.animal.findMany({
      where,
      include: { especie: true },
      orderBy: { fechaIngreso: 'desc' },
    });
    res.json(animales);
  } catch (error) {
    manejarError(res, error);
  }
}

export async function obtenerAnimal(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });

    const animal = await prisma.animal.findUniqueOrThrow({ where: { id }, include: { especie: true } });
    res.json(animal);
  } catch (error) {
    manejarError(res, error);
  }
}

export async function crearAnimal(req, res) {
  try {
    const data = animalSchema.parse(req.body);
    const animal = await prisma.animal.create({ data, include: { especie: true } });
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
    const animal = await prisma.animal.update({ where: { id }, data, include: { especie: true } });
    res.json(animal);
  } catch (error) {
    manejarError(res, error);
  }
}

export async function eliminarAnimal(req, res) {
  try {
    const id = parseId(req.params.id);
    if (!id) return res.status(400).json({ message: 'ID inválido' });

    await prisma.animal.delete({ where: { id } });
    res.status(204).end();
  } catch (error) {
    manejarError(res, error);
  }
}
