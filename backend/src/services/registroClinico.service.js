import prisma from '../config/prisma.js';
import { AppError } from '../utils/app-error.js';

// Consulta pública del historial; solo el veterinario lo modifica (rutas protegidas)
export async function obtenerHistorialClinico(animalId) {
  const animal = await prisma.animal.findUnique({
    where: { id: animalId },
    include: {
      especie: true,
      registrosClinicos: { orderBy: { fecha: 'desc' } },
    },
  });
  if (!animal) throw new AppError(404, 'Animal no encontrado');
  return animal;
}

// data ya validada con registroClinicoSchema
export async function crearRegistroClinico(animalId, data) {
  const animal = await prisma.animal.findUnique({ where: { id: animalId }, select: { id: true } });
  if (!animal) throw new AppError(404, 'Animal no encontrado');

  return prisma.registroClinico.create({ data: { ...data, animalId } });
}

// El registro debe ser de ese animal, para no editar uno ajeno cambiando la URL
export async function actualizarRegistroClinico(animalId, registroId, data) {
  const registro = await prisma.registroClinico.findFirst({
    where: { id: registroId, animalId },
    select: { id: true },
  });
  if (!registro) throw new AppError(404, 'Registro clínico no encontrado');

  return prisma.registroClinico.update({ where: { id: registroId }, data });
}
