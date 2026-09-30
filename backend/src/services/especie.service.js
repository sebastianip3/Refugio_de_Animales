import prisma from '../config/prisma.js';

export function listarEspecies() {
  return prisma.especie.findMany({ orderBy: { nombre: 'asc' } });
}
