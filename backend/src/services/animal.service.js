import prisma from '../config/prisma.js';
import { AppError } from '../utils/app-error.js';

const EDAD_MAXIMA = { Perro: 60, Gato: 50 };

// la fecha de nacimiento no puede ser futura ni superar la edad máxima de su especie
async function validarFechaNacimiento(especieId, fechaNacimiento) {
  if (!fechaNacimiento) return;

  if (fechaNacimiento > new Date()) {
    throw new AppError(400, 'La fecha de nacimiento no puede ser futura');
  }

  const especie = await prisma.especie.findUnique({ where: { id: especieId } });
  if (!especie) throw new AppError(404, 'Especie no encontrada');

  const edadMaxima = EDAD_MAXIMA[especie.nombre];
  if (!edadMaxima) return;

  const fechaLimite = new Date();
  fechaLimite.setFullYear(fechaLimite.getFullYear() - edadMaxima);

  if (fechaNacimiento < fechaLimite) {
    throw new AppError(400, `Un ${especie.nombre.toLowerCase()} no puede tener más de ${edadMaxima} años`);
  }
}

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

export async function crearAnimal(data) {
  await validarFechaNacimiento(data.especieId, data.fechaNacimiento);
  return prisma.animal.create({ data, include: { especie: true } });
}

export async function actualizarAnimal(id, data) {
  const actual = await obtenerAnimal(id);

  if(data.especieId && data.especieId !== actual.especieId){
    throw new AppError(409, 'No se puede cambiar la especie de un animal ya registrado');
  }

  const especieId = data.especieId ?? actual.especieId;
  const fechaNacimiento = data.fechaNacimiento !== undefined ? data.fechaNacimiento : actual.fechaNacimiento;
  await validarFechaNacimiento(especieId, fechaNacimiento);

  return prisma.animal.update({ where: { id }, data, include: { especie: true } });
}

export async function eliminarAnimal(id){
  await obtenerAnimal(id);

  const [adopciones, registros, cuidados] = await Promise.all([
    prisma.adopcion.count({where: {animalId: id}}),
    prisma.registroClinico.count({where: {animalId: id}}),
    prisma.cuidadoAnimal.count({where: {animalId: id}}),
  ]);

  if (adopciones + registros + cuidados > 0){
    throw new AppError(409, 'El animal tiene historial, registra su egreso en lugar de eliminarlo');
  }

  return prisma.animal.delete({where: {id}});
}
