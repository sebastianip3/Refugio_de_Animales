import prisma from '../config/prisma.js';
import { AppError } from '../utils/app-error.js';

const ESTADOS_INICIALES = ['EN_EVALUACION', 'CUARENTENA', 'EN_TRATAMIENTO'];
const EDAD_MAXIMA = { Perro: 60, Gato: 50 };
const PESO_MAXIMO = { Perro: 200, Gato: 25 };

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

  if(data.especieId && data.especieId !== actual.especieId){
    throw new AppError(409, 'No se puede cambiar la especie de un animal ya registrado');
  }

  const especieId = data.especieId ?? actual.especieId;

  const MaxCambioSexo = 2;
  
  if (data.sexo && data.sexo !== actual.sexo) {
    // una vez definido no puede volver a desconocido 
    if (data.sexo === 'DESCONOCIDO') {
      throw new AppError(409, 'Un animal con sexo ya definido no puede volver a desconocido');
    }

    // solo cuenta si ya tenía sexo definido 
    if (actual.sexo !== 'DESCONOCIDO') {
      if (actual.cambioSexo >= MaxCambioSexo) {
        throw new AppError(409, `El sexo ya se corrigió ${MaxCambioSexo} veces y no se puede volver a cambiar`);
      }
      data.cambioSexo = actual.cambioSexo + 1;
    }
  }

  const fechaNacimiento = data.fechaNacimiento !== undefined ? data.fechaNacimiento : actual.fechaNacimiento;
  await validarFechaNacimiento(especieId, fechaNacimiento);

  const peso = data.peso !== undefined ? data.peso : actual.peso;
  await validarPeso(especieId, peso);

  if (data.tieneChip === false) data.numeroChip = null;

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
