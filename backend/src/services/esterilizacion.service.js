import { randomUUID } from 'node:crypto';
import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { AppError } from '../utils/app-error.js';
import { enviarComprobanteInscripcion } from './correo.service.js';

// Cuenta cuantas personas ocupan cupo en una jornada, las inscripciones canceladas no ocupan cupo
async function contarCuposOcupados(db, jornadaId) {
  const ocupados = await db.inscripcionEsterilizacion.count({
    where: {
      jornadaId: jornadaId,
      estado: { not: 'CANCELADA' },
    },
  });
  return ocupados;
}

// agrega a la jornada cuántos cupos le quedan
async function agregarCuposDisponibles(jornada) {
  const ocupados = await contarCuposOcupados(prisma, jornada.id);
  jornada.cuposDisponibles = jornada.cuposTotales - ocupados;
  return jornada;
}

// genera el folio del comprobante
function generarCodigoComprobante() {
  const codigo = randomUUID().slice(0, 8).toUpperCase();
  return `EST-${codigo}`;
}

// lista las jornadas (la administra la administradora)
export async function listarJornadas(filtros = {}) {
  const jornadas = await prisma.jornadaEsterilizacion.findMany({
    where: filtros,
    orderBy: { fecha: 'asc' },
  });

  for (const jornada of jornadas) {
    await agregarCuposDisponibles(jornada);
  }
  return jornadas;
}

// jornadas que ve la comunidad
export async function listarJornadasDisponibles() {
  const ahora = new Date();
  return listarJornadas({ activa: true, fecha: { gt: ahora } });
}

export async function obtenerJornada(id) {
  const jornada = await prisma.jornadaEsterilizacion.findUnique({ where: { id: id } });

  if (!jornada) {
    throw new AppError(404, 'Jornada no encontrada');
  }
  return agregarCuposDisponibles(jornada);
}

// la jornada se crea con el formulario cerrado.
export async function crearJornada(data) {
  if (data.fecha <= new Date()) {
    throw new AppError(400, 'La fecha de la jornada debe ser futura');
  }

  data.activa = false;
  return prisma.jornadaEsterilizacion.create({ data: data });
}

// no se puede dejar menos cupos que personas inscritas
export async function actualizarJornada(id, data) {
  await obtenerJornada(id);

  if (data.fecha && data.fecha <= new Date()) {
    throw new AppError(400, 'La fecha de la jornada debe ser futura');
  }

  if (data.cuposTotales !== undefined) {
    const ocupados = await contarCuposOcupados(prisma, id);
    if (data.cuposTotales < ocupados) {
      throw new AppError(409, `No se puede: ya hay ${ocupados} personas inscritas`);
    }
  }

  return prisma.jornadaEsterilizacion.update({ where: { id: id }, data: data });
}

// la administradora abre el formulario para que la comunidad se inscriba
export async function abrirFormulario(id) {
  const jornada = await obtenerJornada(id);

  if (jornada.fecha <= new Date()) {
    throw new AppError(409, 'No se puede abrir el formulario de una jornada que ya pasó');
  }

  await prisma.jornadaEsterilizacion.update({ where: { id: id }, data: { activa: true } });
  return obtenerJornada(id);
}

// La administradora cierra el formulario
export async function cerrarFormulario(id) {
  await obtenerJornada(id);

  await prisma.jornadaEsterilizacion.update({ where: { id: id }, data: { activa: false } });
  return obtenerJornada(id);
}

// no se puede eliminar una jornada que ya tiene inscritos
export async function eliminarJornada(id) {
  await obtenerJornada(id);

  const totalInscripciones = await prisma.inscripcionEsterilizacion.count({
    where: { jornadaId: id },
  });

  if (totalInscripciones > 0) {
    throw new AppError(409, 'La jornada tiene inscripciones, ciérrala en lugar de eliminarla');
  }

  return prisma.jornadaEsterilizacion.delete({ where: { id: id } });
}

// lista los inscritos de una jornada
export async function listarInscripciones(jornadaId, filtros = {}) {
  await obtenerJornada(jornadaId);

  filtros.jornadaId = jornadaId;
  return prisma.inscripcionEsterilizacion.findMany({
    where: filtros,
    include: { especie: true },
    orderBy: { createdAt: 'asc' },
  });
}

export async function obtenerInscripcion(id) {
  const inscripcion = await prisma.inscripcionEsterilizacion.findUnique({
    where: { id: id },
    include: { especie: true, jornada: true },
  });

  if (!inscripcion) {
    throw new AppError(404, 'Inscripción no encontrada');
  }
  return inscripcion;
}

/* envia el correo con el PDF y guarda si se envio o no.
 Si el correo falla la inscripción no se borra, se puede reenviar */
async function enviarComprobante(inscripcion) {
  let datosCorreo;

  try {
    await enviarComprobanteInscripcion(inscripcion);
    datosCorreo = {
      estadoCorreo: 'ENVIADO',
      fechaEnvioCorreo: new Date(),
      errorCorreo: null,
    };
  } catch (error) {
    console.error('No se pudo enviar el correo:', error.message);
    datosCorreo = {
      estadoCorreo: 'FALLIDO',
      errorCorreo: error.message,
    };
  }

  datosCorreo.intentosCorreo = inscripcion.intentosCorreo + 1;

  return prisma.inscripcionEsterilizacion.update({
    where: { id: inscripcion.id },
    data: datosCorreo,
    include: { especie: true, jornada: true },
  });
}

// revisa que se pueda inscribir y guarda la inscripción
export async function crearInscripcion(jornadaId, data) {
 // van dentro de una transacción: si dos personas toman el ultimo cupo al mismo tiempo, la base de datos deja pasar solo a una
  const inscripcion = await prisma.$transaction(
    async (tx) => {
      const jornada = await tx.jornadaEsterilizacion.findUnique({ where: { id: jornadaId } });

      if (!jornada) {
        throw new AppError(404, 'Jornada no encontrada');
      }
      if (!jornada.activa) {
        throw new AppError(409, 'El formulario de esta jornada no está abierto');
      }
      if (jornada.fecha <= new Date()) {
        throw new AppError(409, 'La jornada ya se realizó');
      }

      const especie = await tx.especie.findUnique({ where: { id: data.especieId } });
      if (!especie) {
        throw new AppError(404, 'Especie no encontrada');
      }

      const ocupados = await contarCuposOcupados(tx, jornadaId);
      if (ocupados >= jornada.cuposTotales) {
        throw new AppError(409, 'La jornada no tiene cupos disponibles');
      }

      data.jornadaId = jornadaId;
      data.codigoComprobante = generarCodigoComprobante();

      return tx.inscripcionEsterilizacion.create({
        data: data,
        include: { especie: true, jornada: true },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
  );

  // el correo va despues de guardar
  return enviarComprobante(inscripcion);
}

// la administradora marca asistencia 
export async function actualizarInscripcion(id, data) {
  const actual = await obtenerInscripcion(id);

  const estaCerrada = actual.estado !== 'CONFIRMADA';
  const cambiaEstado = data.estado && data.estado !== actual.estado;

  if (estaCerrada && cambiaEstado) {
    throw new AppError(409, `La inscripción ya está ${actual.estado} y no puede cambiar de estado`);
  }

  return prisma.inscripcionEsterilizacion.update({
    where: { id: id },
    data: data,
    include: { especie: true, jornada: true },
  });
}

// la administradora reenvia el correo si falló o el tutor no lo recibió
export async function reenviarComprobante(id) {
  const inscripcion = await obtenerInscripcion(id);

  if (inscripcion.estado === 'CANCELADA') {
    throw new AppError(409, 'No se puede reenviar el comprobante de una inscripción cancelada');
  }
  return enviarComprobante(inscripcion);
}
