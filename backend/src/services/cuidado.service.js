import prisma from '../config/prisma.js';
import { AppError } from '../utils/app-error.js';

const TIPOS_CUIDADOR = ['ADMINISTRADOR', 'VOLUNTARIO', 'TRABAJADOR'];

function filtroSolapamiento({ animalId, fechaInicio, fechaFin }) {
  return {
    animalId,
    fechaInicio: { lt: fechaFin },
    fechaFin: { gt: fechaInicio },
  };
}

export async function consultarDisponibilidad({ animalId, fechaInicio, fechaFin }) {
  const animal = await prisma.animal.findUnique({
    where: { id: animalId },
    select: { id: true, nombre: true, especie: { select: { nombre: true } } },
  });
  if (!animal) throw new AppError(404, 'Animal no encontrado');

  const asignacionesAnimal = await prisma.cuidadoAnimal.findMany({
    where: filtroSolapamiento({ animalId, fechaInicio, fechaFin }),
    include: {
      cuenta: { select: { id: true, nombre: true, apellido: true, tipo: true } },
    },
    orderBy: { fechaInicio: 'asc' },
  });

  const cuentasOcupadas = await prisma.cuidadoAnimal.findMany({
    where: {
      fechaInicio: { lt: fechaFin },
      fechaFin: { gt: fechaInicio },
    },
    select: { cuentaId: true },
    distinct: ['cuentaId'],
  });

  const personasDisponibles = asignacionesAnimal.length > 0
    ? []
    : await prisma.cuenta.findMany({
      where: {
        tipo: { in: TIPOS_CUIDADOR },
        id: { notIn: cuentasOcupadas.map(({ cuentaId }) => cuentaId) },
      },
      select: { id: true, nombre: true, apellido: true, tipo: true, horario: true },
      orderBy: [{ nombre: 'asc' }, { apellido: 'asc' }],
    });

  return { animal, asignacionesAnimal, personasDisponibles };
}

export async function asignarCuidado({ animalId, cuentaId, fechaInicio, fechaFin }) {
  return prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(1, ${animalId})`;
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(2, ${cuentaId})`;

    const animal = await tx.animal.findUnique({
      where: { id: animalId },
      select: { id: true },
    });
    if (!animal) throw new AppError(404, 'Animal no encontrado');

    const cuenta = await tx.cuenta.findUnique({
      where: { id: cuentaId },
      select: { id: true, tipo: true },
    });
    if (!cuenta || !TIPOS_CUIDADOR.includes(cuenta.tipo)) {
      throw new AppError(404, 'Persona cuidadora no encontrada o no habilitada');
    }

    const asignacionAnimal = await tx.cuidadoAnimal.findFirst({
      where: filtroSolapamiento({ animalId, fechaInicio, fechaFin }),
      select: { id: true },
    });
    if (asignacionAnimal) {
      throw new AppError(409, 'El animal ya tiene una persona asignada en ese horario');
    }

    const asignacionCuenta = await tx.cuidadoAnimal.findFirst({
      where: {
        cuentaId,
        fechaInicio: { lt: fechaFin },
        fechaFin: { gt: fechaInicio },
      },
      select: { id: true },
    });
    if (asignacionCuenta) {
      throw new AppError(409, 'La persona cuidadora ya tiene una asignación en ese horario');
    }

    return tx.cuidadoAnimal.create({
      data: { animalId, cuentaId, fechaInicio, fechaFin },
      include: {
        animal: { select: { id: true, nombre: true } },
        cuenta: { select: { id: true, nombre: true, apellido: true, tipo: true } },
      },
    });
  });
}
