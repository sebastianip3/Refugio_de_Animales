import prisma from '../config/prisma.js';
import { AppError } from '../utils/app-error.js';

// filtros: { estado?, especieId? }, ya validados por el controller
export function listarAnimales(filtros = {}) {
  return prisma.animal.findMany({
    where: filtros,
    include: { especie: true },
    orderBy: { fechaIngreso: 'desc' },
  });
}

export async function obtenerAnimal(id) {
  const animal = await prisma.animal.findUnique({ where: { id }, include: { especie: true } });
  if (!animal) throw new AppError(404, 'Animal no encontrado');
  return animal;
}

export function crearAnimal(data) {
  return prisma.animal.create({ data, include: { especie: true } });
}

export function actualizarAnimal(id, data) {
  return prisma.animal.update({ where: { id }, data, include: { especie: true } });
}

export function eliminarAnimal(id) {
  return prisma.animal.delete({ where: { id } });
}
