import prisma from '../config/prisma.js';
import { AppError } from '../utils/app-error.js';

// Datos del veterinario que se muestran en cada registro 
const CAMPOS_VETERINARIO = { id: true, nombre: true, apellido: true };

// El veterinario responsable debe ser una cuenta de tipo VETERINARIO
async function validarVeterinario(veterinarioId) {
  const cuenta = await prisma.cuenta.findUnique({ where: { id: veterinarioId }, select: { tipo: true } });
  if (!cuenta || cuenta.tipo !== 'VETERINARIO') {
    throw new AppError(400, 'El veterinario seleccionado no trabaja en el refugio');
  }
}

// Consulta pública del historial; solo el veterinario lo modifica (rutas protegidas)
export async function obtenerHistorialClinico(animalId) {
  const animal = await prisma.animal.findUnique({
    where: { id: animalId },
    include: {
      especie: true,
      registrosClinicos: {
        orderBy: { fecha: 'desc' },
        include: { veterinario: { select: CAMPOS_VETERINARIO } },
      },
    },
  });
  if (!animal) throw new AppError(404, 'Animal no encontrado');
  return animal;
}

// data ya validada con registroClinicoSchema
export async function crearRegistroClinico(animalId, data) {
  const animal = await prisma.animal.findUnique({ where: { id: animalId }, select: { id: true } });
  if (!animal) throw new AppError(404, 'Animal no encontrado');

  await validarVeterinario(data.veterinarioId);

  return prisma.registroClinico.create({
    data: { ...data, animalId },
    include: { veterinario: { select: CAMPOS_VETERINARIO } },
  });
}

export async function actualizarRegistroClinico(animalId, registroId, data) {
  const registro = await prisma.registroClinico.findFirst({
    where: { id: registroId, animalId },
    select: { id: true, veterinarioId: true },
  });
  if (!registro) throw new AppError(404, 'Registro clínico no encontrado');

  // Al cambiar el veterinario, el nuevo debe trabajar actualmente en el refugio
  if (data.veterinarioId !== undefined && data.veterinarioId !== registro.veterinarioId) {
    await validarVeterinario(data.veterinarioId);
  }

  return prisma.registroClinico.update({
    where: { id: registroId },
    data,
    include: { veterinario: { select: CAMPOS_VETERINARIO } },
  });
}
