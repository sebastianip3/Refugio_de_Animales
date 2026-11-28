import prisma from '../config/prisma.js';
import { AppError } from '../utils/app-error.js';

const ESTADOS_INICIALES = ['EN_EVALUACION', 'CUARENTENA', 'EN_TRATAMIENTO'];
const ESTADOS_MANUALES = ['EN_EVALUACION', 'CUARENTENA', 'EN_TRATAMIENTO', 'ADOPTABLE', 'NO_ADOPTABLE', 'FALLECIDO', 'EXTRAVIADO'];
const ESTADOS_BLOQUEADOS = ['ADOPTADO', 'FALLECIDO', 'EXTRAVIADO'];
const ESTADOS_EGRESO = ['FALLECIDO', 'EXTRAVIADO'];

const EDAD_MAXIMA = { Perro: 60, Gato: 50 };
const PESO_MAXIMO = { Perro: 200, Gato: 25 };
const MAX_CAMBIOS = 2;
const MAX_CAMBIOS_FECHA = 1;

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

async function validarPeso(especieId, peso) {
  if (peso == null) return;

  const especie = await prisma.especie.findUnique({where: {id: especieId}});
  if (!especie) throw new AppError(404, 'Especie no encontrada');

  const pesoMaximo = PESO_MAXIMO[especie.nombre];
  if (pesoMaximo && peso > pesoMaximo) {
    throw new AppError(400, `Un ${especie.nombre.toLocaleLowerCase()} no puede pesar más de ${pesoMaximo} kg`);
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
  if(data.estado && !ESTADOS_INICIALES.includes(data.estado)){
    throw new AppError(400, 'Un animal nuevo solo puede ingresar en evaluación, cuarentena o tratamiento');
  }
  //si no tiene chip no se guarda
  if(!data.tieneChip) data.numeroChip = null;
  await validarFechaNacimiento(data.especieId, data.fechaNacimiento);
  await validarPeso(data.especieId, data.peso);
  return prisma.animal.create({ data, include: { especie: true } });
}

export async function actualizarAnimal(id, data) {
  const actual = await obtenerAnimal(id);

  if (ESTADOS_BLOQUEADOS.includes(actual.estado)) {
    throw new AppError(409, 'Un animal adoptado, fallecido o extraviado no se puede editar');
  }

  if(data.especieId && data.especieId !== actual.especieId){
    throw new AppError(409, 'No se puede cambiar la especie de un animal ya registrado');
  }

  // el encargado de adopcion tiene permitido cambiar esatdo en_adopcion y adoptado
  if(data.estado && data.estado !== actual.estado) {
    if (actual.estado === 'EN_ADOPCION' && !ESTADOS_EGRESO.includes(data.estado)) {
      throw new AppError(409, 'El animal tiene una solicitud de adopción en curso; primero apruébela o recházela');
    }
    if (!ESTADOS_MANUALES.includes(data.estado)) {
      throw new AppError(409, 'Ese estado lo asigna el proceso de adopción');
    }
  }

  const especieId = data.especieId ?? actual.especieId;
  
  if (data.sexo && data.sexo !== actual.sexo) {
    // una vez definido no puede volver a desconocido 
    if (data.sexo === 'DESCONOCIDO') {
      throw new AppError(409, 'Un animal con sexo ya definido no puede volver a desconocido');
    }
    // solo cuenta si ya tenía sexo definido 
    if (actual.sexo !== 'DESCONOCIDO') {
      if (actual.cambioSexo >= MAX_CAMBIOS) {
        throw new AppError(409, `El sexo ya se corrigió ${MAX_CAMBIOS} veces y no se puede volver a cambiar`);
      }
      data.cambioSexo = actual.cambioSexo + 1;
    }
  }

  // al editar nombre tiene hasta 2 intentos
  if (data.nombre !== undefined && data.nombre !== actual.nombre && actual.nombre) {
    if (!data.nombre) {
      throw new AppError(409, 'Un animal con nombre no puede quedar sin nombre');
    }
    if (actual.cambioNombre >= MAX_CAMBIOS) {
      throw new AppError(409, `El nombre ya se cambió ${MAX_CAMBIOS} veces y no se puede volver a cambiar`);
    }
    data.cambioNombre = actual.cambioNombre + 1;
  }

  // al editar chip tiene hasta 2 intentos
  if (actual.numeroChip) {
    if (data.tieneChip === false || data.numeroChip === null) {
      throw new AppError(409, 'Un animal con chip registrado no puede quedar sin chip');
    }
    if (data.numeroChip !== undefined && data.numeroChip !== actual.numeroChip) {
      if (actual.cambioChip >= MAX_CAMBIOS) {
        throw new AppError(409, `El chip ya se corrigió ${MAX_CAMBIOS} veces y no se puede volver a cambiar`);
      }
      data.cambioChip = actual.cambioChip + 1;
    }
  }
 // al volver a editar una fecha de nacimiento solo tiene 1 intento
  if (data.fechaNacimiento !== undefined && actual.fechaNacimiento) {
    if (!data.fechaNacimiento) {
      throw new AppError(409, 'Un animal con fecha de nacimiento no puede quedar sin ella');
    }
    if (data.fechaNacimiento.getTime() !== actual.fechaNacimiento.getTime()) {
      if (actual.cambioFechaNacimiento >= MAX_CAMBIOS_FECHA) {
        throw new AppError(409, 'La fecha de nacimiento ya se corrigió y no se puede volver a cambiar');
      }
      data.cambioFechaNacimiento = actual.cambioFechaNacimiento + 1;
    }
  }

  const fechaNacimiento = data.fechaNacimiento !== undefined ? data.fechaNacimiento : actual.fechaNacimiento;
  await validarFechaNacimiento(especieId, fechaNacimiento);

  const peso = data.peso !== undefined ? data.peso : actual.peso;
  await validarPeso(especieId, peso);

  if (data.tieneChip === false) data.numeroChip = null;

  // el motivo solo se guarda al registrar un egreso; en cualquier otra edición se ignora
  if (!ESTADOS_EGRESO.includes(data.estado)) delete data.motivoEgreso;

  // fallecido o extraviado sale del refugio y se libera todo lo que tenía pendiente
  if (ESTADOS_EGRESO.includes(data.estado) && data.estado !== actual.estado) {
    const ahora = new Date();
    data.fechaEgreso = ahora;
    if (!data.motivoEgreso) {
      throw new AppError(400, 'Debe escribir el motivo de egreso');
    }

    const [, , , animal] = await prisma.$transaction([
      // las solicitudes en curso se rechazan
      prisma.adopcion.updateMany({
        where: { animalId: id, estado: { in: ['PENDIENTE', 'EN_REVISION'] } },
        data: { estado: 'RECHAZADA', observaciones: `El animal fue registrado como ${data.estado.toLowerCase()}: ${data.motivoEgreso}` },
      }),
      // los cuidados futuros se borran y los que están en curso terminan hoy
      prisma.cuidadoAnimal.deleteMany({ where: { animalId: id, fechaInicio: { gt: ahora } } }),
      prisma.cuidadoAnimal.updateMany({
        where: { animalId: id, fechaInicio: { lte: ahora }, fechaFin: { gt: ahora } },
        data: { fechaFin: ahora },
      }),
      prisma.animal.update({ where: { id }, data, include: { especie: true } }),
    ]);
    return animal;
  }

  return prisma.animal.update({ where: { id }, data, include: { especie: true } });
}

// un animal extraviado que aparece vuelve al refugio y pasa por evaluación
export async function marcarEncontrado(id) {
  const actual = await obtenerAnimal(id);
  if (actual.estado !== 'EXTRAVIADO') {
    throw new AppError(409, 'Solo un animal extraviado puede marcarse como encontrado');
  }

  return prisma.animal.update({
    where: { id },
    data: { estado: 'EN_EVALUACION', fechaEgreso: null, motivoEgreso: null },
    include: { especie: true },
  });
}

export async function eliminarAnimal(id){
  const actual = await obtenerAnimal(id);

  if (ESTADOS_EGRESO.includes(actual.estado)) {
    throw new AppError(409, 'Un animal fallecido o extraviado queda como registro y no se puede eliminar')
  }

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
