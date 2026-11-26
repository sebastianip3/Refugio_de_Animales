import { Prisma } from '@prisma/client';
import prisma from '../config/prisma.js';
import { AppError } from '../utils/app-error.js';
import { ESTADOS_EN_PROCESO } from '../schema/adopcion.schema.js';
import {
  enviarSolicitudRecibida,
  enviarResultadoAdopcion,
  enviarAvisoVisita,
  enviarAdopcionRechazadaTrasVisita,
} from './correo.service.js';

// Serializable evita que dos solicitudes simultáneas pasen la verificación a la vez
const TX_OPCIONES = { isolationLevel: Prisma.TransactionIsolationLevel.Serializable };

// Al pasar a estos estados se avisa al adoptante por correo
const ESTADOS_NOTIFICADOS = ['APROBADA', 'RECHAZADA'];

// Una adopción en estos estados impide que el mismo adoptante haga otra solicitud
const ESTADOS_BLOQUEAN_ADOPTANTE = [...ESTADOS_EN_PROCESO, 'APROBADA'];

const INCLUDE_ANIMAL ={ animal: { include: { especie: true } } };

// filtros: { animalId?, estado? }, ya validados por el controller
export function listarAdopciones(filtros = {}) {
  return prisma.adopcion.findMany({
    where: filtros,
    include: INCLUDE_ANIMAL,
    orderBy: { fechaSolicitud: 'desc' },
  });
}

// Pública: solo los IDs, para que la ficha deshabilite esos animales sin exponer datos personales
export async function listarAnimalesEnProceso() {
  const adopciones = await prisma.adopcion.findMany({
    where: { estado: { in: ESTADOS_EN_PROCESO } },
    select: { animalId: true },
    distinct: ['animalId'],
  });
  return adopciones.map((adopcion) => adopcion.animalId);
}

export async function obtenerAdopcion(id) {
  const adopcion = await prisma.adopcion.findUnique({ where: { id }, include: INCLUDE_ANIMAL });
  if (!adopcion) throw new AppError(404, 'Adopción no encontrada');
  return adopcion;
}

// Un animal adoptado o con una adopción en proceso no puede recibir otra solicitud.
// Después de guardar se envía al adoptante un correo de confirmación
export async function crearAdopcion(data) {
  const adopcion = await prisma.$transaction(async (tx) => {
    const animal = await tx.animal.findUnique({ where: { id: data.animalId } });
    if (!animal) throw new AppError(404, 'Animal no encontrado');
    // Solo se puede postular a un animal ADOPTABLE (ciclo: ADOPTABLE → EN_ADOPCION → ADOPTADO)
    if (animal.estado !== 'ADOPTABLE') throw new AppError(409, 'El animal no está disponible para adopción');

    const enProceso = await tx.adopcion.findFirst({
      where: { animalId: data.animalId, estado: { in: ESTADOS_EN_PROCESO } },
    });
    if (enProceso) throw new AppError(409, 'El animal ya tiene una adopción en proceso');

    // Cada adoptante (RUT) puede tener solo una adopción; si fue rechazada o cancelada puede volver a postular
    const adopcionDelAdoptante = await tx.adopcion.findFirst({
      where: { rut: data.rut, estado: { in: ESTADOS_BLOQUEAN_ADOPTANTE } },
    });
    if (adopcionDelAdoptante) {
      throw new AppError(
        409,
        adopcionDelAdoptante.estado === 'APROBADA'
          ? 'Este adoptante ya realizó una adopción y no puede adoptar otro animal'
          : 'Este adoptante ya tiene una solicitud de adopción en proceso'
      );
    }

    // mientras se revisa la solicitud, nadie más puede postular a este animal
    await tx.animal.update({ where: { id: data.animalId }, data: { estado: 'EN_ADOPCION' } });

    return tx.adopcion.create({ data, include: INCLUDE_ANIMAL });
  }, TX_OPCIONES);

  // Si el correo falla, la solicitud igual queda guardada; el formulario avisa al adoptante
  try {
    await enviarSolicitudRecibida(adopcion);
    return { ...adopcion, correoEnviado: true };
  } catch (error) {
    console.error('No se pudo enviar el correo de solicitud recibida:', error.message);
    return { ...adopcion, correoEnviado: false };
  }
}

// Pública: el adoptante consulta sus solicitudes con su RUT y su correo.
// Se piden los dos juntos para que nadie pueda ver solicitudes ajenas sabiendo solo un RUT.
// Solo se devuelven datos para el adoptante, no las notas internas del encargado
export async function consultarSolicitudes(rut, email) {
  const adopciones = await prisma.adopcion.findMany({
    where: { rut, email },
    select: {
      fechaSolicitud: true,
      estado: true,
      observaciones: true,
      animal: {
        select: { nombre: true, fotografiaUrl: true, sexo: true, especie: { select: { nombre: true } } },
      },
      // Próxima visita de seguimiento agendada, si hay
      visitas: {
        where: { estado: 'AGENDADA', fecha: { gte: diaUtc(new Date()) } },
        select: { fecha: true, hora: true },
        orderBy: [{ fecha: 'asc' }, { hora: 'asc' }],
        take: 1,
      },
    },
    orderBy: { fechaSolicitud: 'desc' },
  });

  return adopciones.map(({ observaciones, visitas, ...adopcion }) => ({
    ...adopcion,
    // El motivo solo se muestra si fue rechazada (es el mismo que se envió por correo)
    motivoRechazo: adopcion.estado === 'RECHAZADA' ? observaciones : null,
    proximaVisita: visitas[0] ?? null,
  }));
}

// Solo se puede cambiar el estado mientras la adopción está en proceso.
// Al aprobarla, el animal pasa a ADOPTADO y se registra su egreso.
// Si se aprueba o rechaza, se avisa al adoptante por correo después de guardar.
// encargado: cuenta que hizo el cambio, para indicar en el correo quién aprobó o rechazó
export async function actualizarAdopcion(id, data, encargado) {
  let cambioEstado = false;

  const adopcion = await prisma.$transaction(async (tx) => {
    const actual = await tx.adopcion.findUnique({ where: { id } });
    if (!actual) throw new AppError(404, 'Adopción no encontrada');

    if (data.estado && data.estado !== actual.estado) {
      if (!ESTADOS_EN_PROCESO.includes(actual.estado)) {
        throw new AppError(409, `La adopción ya está cerrada (${actual.estado}) y no puede cambiar de estado`);
      }
      cambioEstado = true;

      if (data.estado === 'APROBADA') {
        await tx.animal.update({
          where: { id: actual.animalId },
          data: { estado: 'ADOPTADO', fechaEgreso: new Date(), motivoEgreso: 'Adoptado' },
        });
      }
      // rechazada: el animal vuelve a estar disponible
      if (data.estado === 'RECHAZADA') {
        await tx.animal.update({ where: { id: actual.animalId }, data: { estado: 'ADOPTABLE' } });
      }
    }

    return tx.adopcion.update({ where: { id }, data, include: { animal: true } });
  }, TX_OPCIONES);

  if (!cambioEstado || !ESTADOS_NOTIFICADOS.includes(adopcion.estado)) return adopcion;

  // Si el correo falla, el cambio de estado igual queda guardado; el encargado ve el aviso
  try {
    await enviarResultadoAdopcion(adopcion, encargado);
    return { ...adopcion, correoEnviado: true };
  } catch (error) {
    console.error('No se pudo enviar el correo de la adopción:', error.message);
    return { ...adopcion, correoEnviado: false };
  }
}

// Próximas visitas de todas las adopciones: agendadas de hoy en adelante, de la más cercana a la más lejana
export function listarProximasVisitas() {
  return prisma.visitaAdopcion.findMany({
    where: { estado: 'AGENDADA', fecha: { gte: diaUtc(new Date()) } },
    include: {
      adopcion: {
        select: {
          id: true,
          nombre: true,
          telefono: true,
          direccion: true,
          comuna: true,
          animal: { select: { nombre: true, especie: { select: { nombre: true } } } },
        },
      },
    },
    orderBy: [{ fecha: 'asc' }, { hora: 'asc' }],
  });
}

// Visitas agendadas de una adopción, de la más próxima a la más lejana
export async function listarVisitas(adopcionId) {
  const adopcion = await prisma.adopcion.findUnique({ where: { id: adopcionId }, select: { id: true } });
  if (!adopcion) throw new AppError(404, 'Adopción no encontrada');

  return prisma.visitaAdopcion.findMany({ where: { adopcionId }, orderBy: { fecha: 'asc' } });
}

// La visita de seguimiento se puede agendar desde el día siguiente a la adopción.
// (El frontend sugiere 15 días después, pero el encargado puede elegir otro día)
const DIAS_MINIMOS_VISITA = 1;

// Medianoche UTC del día (local) de la fecha más N días, igual que las fechas del formulario
function diaUtc(fecha, diasExtra = 0) {
  return new Date(Date.UTC(fecha.getFullYear(), fecha.getMonth(), fecha.getDate() + diasExtra));
}

// "AAAA-MM-DD..." → "DD-MM-AAAA"
const formatearDia = (fecha) => fecha.toISOString().slice(0, 10).split('-').reverse().join('-');

// Datos del adoptante que necesita el correo de la visita
const DATOS_AVISO_VISITA = { nombre: true, email: true, animal: { select: { nombre: true } } };

// Envía el aviso de la visita al adoptante, indicando qué encargado la agendó o canceló.
// Si el correo falla, la visita igual queda guardada
async function avisarVisita(adopcion, visita, encargado) {
  try {
    await enviarAvisoVisita(adopcion, visita, encargado);
    return { ...visita, correoEnviado: true };
  } catch (error) {
    console.error('No se pudo enviar el correo de la visita:', error.message);
    return { ...visita, correoEnviado: false };
  }
}

// Solo se agendan visitas a adopciones aprobadas, desde el día siguiente a la adopción,
// y una a la vez: si ya tiene una visita agendada próxima no se agenda otra.
// Después de guardar se avisa al adoptante por correo
export async function agendarVisita(adopcionId, data, encargado) {
  const { adopcion, visita } = await prisma.$transaction(async (tx) => {
    const adopcion = await tx.adopcion.findUnique({
      where: { id: adopcionId },
      select: { ...DATOS_AVISO_VISITA, estado: true, updatedAt: true, animal: { select: { nombre: true, fechaEgreso: true } } },
    });
    if (!adopcion) throw new AppError(404, 'Adopción no encontrada');
    if (adopcion.estado !== 'APROBADA') {
      throw new AppError(409, 'Solo se pueden agendar visitas a una adopción aprobada');
    }

    // Al aprobar, el animal registra su egreso: esa es la fecha de la adopción
    const fechaAdopcion = adopcion.animal.fechaEgreso ?? adopcion.updatedAt;
    const fechaMinima = diaUtc(fechaAdopcion, DIAS_MINIMOS_VISITA);
    if (data.fecha < fechaMinima) {
      throw new AppError(
        409,
        `La visita debe ser desde el día siguiente a la adopción (desde el ${formatearDia(fechaMinima)})`
      );
    }

    // No se agenda en una hora que ya pasó (por ejemplo hoy a las 16:30 si son las 16:39)
    if (inicioVisita(data) <= new Date()) {
      throw new AppError(409, 'La hora de la visita ya pasó, elija una hora posterior a la actual');
    }

    // Un horario ocupado por otra visita (de cualquier adopción) no se puede volver a tomar
    const horarioOcupado = await tx.visitaAdopcion.findFirst({
      where: { fecha: data.fecha, hora: data.hora, estado: { not: 'CANCELADA' } },
    });
    if (horarioOcupado) {
      throw new AppError(
        409,
        `El horario del ${formatearDia(data.fecha)} a las ${data.hora} ya está ocupado por otra visita, elija otra hora`
      );
    }

    // La nueva visita debe ser al menos el día después de la última (las canceladas no cuentan)
    const ultimaVisita = await tx.visitaAdopcion.findFirst({
      where: { adopcionId, estado: { not: 'CANCELADA' } },
      orderBy: { fecha: 'desc' },
    });
    if (ultimaVisita && data.fecha <= ultimaVisita.fecha) {
      const desde = new Date(ultimaVisita.fecha.getTime() + 24 * 60 * 60 * 1000);
      throw new AppError(
        409,
        `La nueva visita debe ser después de la última visita (${formatearDia(ultimaVisita.fecha)}), desde el ${formatearDia(desde)}`
      );
    }

    // Las visitas canceladas no cuentan
    const visitaPendiente = await tx.visitaAdopcion.findFirst({
      where: { adopcionId, estado: 'AGENDADA', fecha: { gte: diaUtc(new Date()) } },
      orderBy: { fecha: 'asc' },
    });
    if (visitaPendiente) {
      throw new AppError(
        409,
        `Este adoptante ya tiene una visita agendada para el ${formatearDia(visitaPendiente.fecha)}`
      );
    }

    const visita = await tx.visitaAdopcion.create({ data: { ...data, adopcionId } });
    return { adopcion, visita };
  }, TX_OPCIONES);

  return avisarVisita(adopcion, visita, encargado);
}

// Solo se cancela una visita agendada que aún no pasa. La visita debe ser de esa adopción,
// para no cancelar una ajena cambiando la URL. Después se avisa al adoptante por correo
export async function cancelarVisita(adopcionId, visitaId, encargado) {
  const visita = await prisma.visitaAdopcion.findFirst({
    where: { id: visitaId, adopcionId },
    include: { adopcion: { select: DATOS_AVISO_VISITA } },
  });
  if (!visita) throw new AppError(404, 'Visita no encontrada');
  if (visita.estado === 'CANCELADA') throw new AppError(409, 'La visita ya está cancelada');
  if (visita.estado === 'REALIZADA') throw new AppError(409, 'No se puede cancelar una visita ya realizada');
  if (visita.fecha < diaUtc(new Date())) {
    throw new AppError(409, 'No se puede cancelar una visita cuya fecha ya pasó');
  }

  const cancelada = await prisma.visitaAdopcion.update({
    where: { id: visitaId },
    data: { estado: 'CANCELADA' },
  });

  return avisarVisita(visita.adopcion, cancelada, encargado);
}

// Momento de la visita en hora local: la fecha es el día (guardado a medianoche UTC) y la hora "HH:MM".
// Las visitas antiguas sin hora comienzan a las 00:00
function inicioVisita(visita) {
  const [horas, minutos] = (visita.hora ?? '00:00').split(':').map(Number);
  const dia = visita.fecha;
  return new Date(dia.getUTCFullYear(), dia.getUTCMonth(), dia.getUTCDate(), horas, minutos);
}

// Cuando llega la hora de la visita, el encargado registra cómo encontró al animal.
// Solo se registra una visita agendada (no cancelada ni ya registrada) cuya hora ya llegó
export async function registrarResultadoVisita(adopcionId, visitaId, data) {
  const visita = await prisma.visitaAdopcion.findFirst({ where: { id: visitaId, adopcionId } });
  if (!visita) throw new AppError(404, 'Visita no encontrada');
  if (visita.estado === 'CANCELADA') throw new AppError(409, 'La visita está cancelada');
  if (visita.estado === 'REALIZADA') throw new AppError(409, 'El resultado de esta visita ya fue registrado');
  if (new Date() < inicioVisita(visita)) {
    const cuando = visita.hora ? `${formatearDia(visita.fecha)} a las ${visita.hora}` : formatearDia(visita.fecha);
    throw new AppError(409, `El resultado se puede registrar desde la hora de la visita (${cuando})`);
  }

  return prisma.visitaAdopcion.update({
    where: { id: visitaId },
    data: { ...data, estado: 'REALIZADA' },
  });
}

// Después de registrar el resultado de una visita, si el hogar no reúne las condiciones,
// el encargado rechaza la adopción: queda RECHAZADA con las observaciones de la visita como motivo,
// el animal vuelve al refugio disponible para adopción, se cancelan las visitas pendientes
// y se avisa al adoptante por correo
export async function rechazarAdopcionTrasVisita(adopcionId, visitaId, encargado) {
  const { visita, adopcion } = await prisma.$transaction(async (tx) => {
    const visita = await tx.visitaAdopcion.findFirst({
      where: { id: visitaId, adopcionId },
      include: { adopcion: { select: { ...DATOS_AVISO_VISITA, estado: true, animalId: true } } },
    });
    if (!visita) throw new AppError(404, 'Visita no encontrada');
    if (visita.estado !== 'REALIZADA') {
      throw new AppError(409, 'Primero registre el resultado de la visita');
    }
    if (visita.adopcion.estado !== 'APROBADA') {
      throw new AppError(409, 'Solo se puede rechazar una adopción aprobada');
    }

    const motivo = `Adopción rechazada tras la visita del ${formatearDia(visita.fecha)}: ${visita.observaciones}`;
    await tx.adopcion.update({ where: { id: adopcionId }, data: { estado: 'RECHAZADA', observaciones: motivo } });

    // El animal vuelve al refugio y queda disponible para una nueva adopción
    await tx.animal.update({
      where: { id: visita.adopcion.animalId },
      data: { estado: 'ADOPTABLE', fechaEgreso: null, motivoEgreso: null },
    });

    // Las visitas que quedaban agendadas ya no se harán
    await tx.visitaAdopcion.updateMany({
      where: { adopcionId, estado: 'AGENDADA' },
      data: { estado: 'CANCELADA' },
    });

    return { visita, adopcion: { ...visita.adopcion, observaciones: visita.observaciones } };
  }, TX_OPCIONES);

  // Si el correo falla, el rechazo igual queda guardado; el encargado ve el aviso
  try {
    await enviarAdopcionRechazadaTrasVisita(adopcion, visita, encargado);
    return { adopcionId, correoEnviado: true };
  } catch (error) {
    console.error('No se pudo enviar el correo del rechazo:', error.message);
    return { adopcionId, correoEnviado: false };
  }
}
