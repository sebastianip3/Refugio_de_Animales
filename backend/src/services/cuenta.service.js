import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { AppError } from '../utils/app-error.js';

const CAMPOS_VOLUNTARIO = {
  id: true,
  nombre: true,
  apellido: true,
  tipo: true,
  correo: true,
  horario: true,
  disponibleCuidado: true,
  createdAt: true,
  updatedAt: true,
};

export const DIAS_SEMANA = [
  { id: 0, nombre: 'Lunes', abreviatura: 'Lun' },
  { id: 1, nombre: 'Martes', abreviatura: 'Mar' },
  { id: 2, nombre: 'Miércoles', abreviatura: 'Mié' },
  { id: 3, nombre: 'Jueves', abreviatura: 'Jue' },
  { id: 4, nombre: 'Viernes', abreviatura: 'Vie' },
  { id: 5, nombre: 'Sábado', abreviatura: 'Sáb' },
  { id: 6, nombre: 'Domingo', abreviatura: 'Dom' },
];

export const HORAS_REFUGIO = Array.from({ length: 12 }, (_, idx) => idx + 8); // 08:00 a 20:00

function formatearHora(hora) {
  return `${String(hora).padStart(2, '0')}:00`;
}

function resumirBloquesHorarios(bloques) {
  if (!bloques || bloques.length === 0) return null;

  const porDia = new Map();
  for (const { diaSemana, hora } of bloques) {
    if (!porDia.has(diaSemana)) porDia.set(diaSemana, []);
    porDia.get(diaSemana).push(hora);
  }

  const segmentos = [];
  for (const dia of DIAS_SEMANA) {
    const horas = porDia.get(dia.id);
    if (!horas || horas.length === 0) continue;

    horas.sort((a, b) => a - b);
    let inicio = horas[0];
    let anterior = horas[0];

    const rangosDia = [];
    for (let i = 1; i < horas.length; i += 1) {
      const actual = horas[i];
      if (actual === anterior + 1) {
        anterior = actual;
      } else {
        rangosDia.push(`${formatearHora(inicio)}-${formatearHora(anterior + 1)}`);
        inicio = actual;
        anterior = actual;
      }
    }
    rangosDia.push(`${formatearHora(inicio)}-${formatearHora(anterior + 1)}`);
    segmentos.push(`${dia.abreviatura} ${rangosDia.join(', ')}`);
  }

  const texto = segmentos.join(' · ');
  return texto.length > 255 ? `${texto.slice(0, 252)}...` : texto;
}

/**
 * Optimiza la asignación de un día procurando:
 * 1. Cubrir el 100% de las horas donde exista al menos un voluntario disponible (sin tiempos muertos en el refugio).
 * 2. Evitar ventanas o tiempos muertos para un mismo voluntario dentro del mismo día (bloques continuos).
 * 3. Minimizar cambios innecesarios de turno y equilibrar la carga horaria semanal entre voluntarios.
 */
function optimizarAsignacionDia(candidatosPorHora, horasAcumuladasSemana) {
  const ANCHO_HAZ = 80;
  const COSTO_TIEMPO_MUERTO_VOLUNTARIO = 100_000;
  const COSTO_CAMBIO_TURNO = 60;
  const PESO_EQUIDAD = 15;

  let estados = [
    {
      asignaciones: [],
      ultimoVoluntario: null,
      usadosHoy: new Set(),
      horasHoy: new Map(),
      costo: 0,
    },
  ];

  for (const hora of HORAS_REFUGIO) {
    const candidatos = candidatosPorHora.get(hora) || [];

    if (candidatos.length === 0) {
      estados = estados.map((estado) => ({
        ...estado,
        asignaciones: [...estado.asignaciones, { hora, cuentaId: null }],
        ultimoVoluntario: null,
      }));
      continue;
    }

    const siguientesEstados = [];

    for (const estado of estados) {
      for (const cuentaId of candidatos) {
        const horasPreviasHoy = estado.horasHoy.get(cuentaId) || 0;
        const horasPreviasSemana = horasAcumuladasSemana.get(cuentaId) || 0;
        const nuevasHorasTotales = horasPreviasSemana + horasPreviasHoy + 1;

        let incrementoCosto = (2 * nuevasHorasTotales - 1) * PESO_EQUIDAD;

        if (estado.ultimoVoluntario !== null && estado.ultimoVoluntario !== cuentaId) {
          incrementoCosto += COSTO_CAMBIO_TURNO;
        }

        // Si el voluntario ya trabajó más temprano hoy y dejó de trabajar en al menos un bloque intermedio,
        // reasignarlo en el mismo día le generaría un tiempo muerto (ventana).
        if (estado.usadosHoy.has(cuentaId) && estado.ultimoVoluntario !== cuentaId) {
          incrementoCosto += COSTO_TIEMPO_MUERTO_VOLUNTARIO;
        }

        const nuevosUsados = new Set(estado.usadosHoy);
        nuevosUsados.add(cuentaId);

        const nuevasHorasHoy = new Map(estado.horasHoy);
        nuevasHorasHoy.set(cuentaId, horasPreviasHoy + 1);

        siguientesEstados.push({
          asignaciones: [...estado.asignaciones, { hora, cuentaId }],
          ultimoVoluntario: cuentaId,
          usadosHoy: nuevosUsados,
          horasHoy: nuevasHorasHoy,
          costo: estado.costo + incrementoCosto,
        });
      }
    }

    siguientesEstados.sort((a, b) => a.costo - b.costo);
    estados = siguientesEstados.slice(0, ANCHO_HAZ);
  }

  return estados[0].asignaciones.filter((bloque) => bloque.cuentaId !== null);
}

export async function recalcularAsignacionHorarios(db = prisma) {
  const voluntariosActivos = await db.cuenta.findMany({
    where: {
      tipo: 'VOLUNTARIO',
      disponibleCuidado: true,
    },
    select: { id: true },
    orderBy: { id: 'asc' },
  });

  const idsActivos = new Set(voluntariosActivos.map((v) => v.id));

  const todasDisponibilidades = await db.disponibilidadVoluntario.findMany({
    orderBy: [{ diaSemana: 'asc' }, { hora: 'asc' }, { cuentaId: 'asc' }],
  });

  const disponibilidadesActivas = todasDisponibilidades.filter((d) => idsActivos.has(d.cuentaId));

  const horasAcumuladasSemana = new Map();
  for (const { id } of voluntariosActivos) {
    horasAcumuladasSemana.set(id, 0);
  }

  const turnosCalculados = [];

  for (const dia of DIAS_SEMANA) {
    const candidatosPorHora = new Map();
    for (const hora of HORAS_REFUGIO) {
      candidatosPorHora.set(hora, []);
    }

    for (const disp of disponibilidadesActivas) {
      if (disp.diaSemana === dia.id && candidatosPorHora.has(disp.hora)) {
        candidatosPorHora.get(disp.hora).push(disp.cuentaId);
      }
    }

    const asignacionesDia = optimizarAsignacionDia(candidatosPorHora, horasAcumuladasSemana);
    for (const { hora, cuentaId } of asignacionesDia) {
      turnosCalculados.push({
        diaSemana: dia.id,
        hora,
        cuentaId,
      });
      horasAcumuladasSemana.set(cuentaId, (horasAcumuladasSemana.get(cuentaId) || 0) + 1);
    }
  }

  await db.turnoVoluntario.deleteMany({});
  if (turnosCalculados.length > 0) {
    await db.turnoVoluntario.createMany({
      data: turnosCalculados,
    });
  }

  // Sincroniza el campo resumen "horario" de cada voluntario que utiliza el calendario
  const todosVoluntarios = await db.cuenta.findMany({
    where: { tipo: 'VOLUNTARIO' },
    select: { id: true, horario: true },
  });

  for (const vol of todosVoluntarios) {
    const turnosVol = turnosCalculados.filter((t) => t.cuentaId === vol.id);
    const dispVol = todasDisponibilidades.filter((d) => d.cuentaId === vol.id);

    if (turnosVol.length > 0) {
      const resumenAsignado = resumirBloquesHorarios(turnosVol);
      await db.cuenta.update({
        where: { id: vol.id },
        data: { horario: resumenAsignado },
      });
    } else if (dispVol.length > 0) {
      const resumenDisponible = resumirBloquesHorarios(dispVol);
      await db.cuenta.update({
        where: { id: vol.id },
        data: { horario: `Disponible: ${resumenDisponible}`.slice(0, 255) },
      });
    }
  }

  return turnosCalculados;
}

export async function obtenerCalendarioVoluntariado(db = prisma) {
  const [voluntarios, disponibilidades, turnos] = await Promise.all([
    db.cuenta.findMany({
      where: { tipo: 'VOLUNTARIO' },
      select: CAMPOS_VOLUNTARIO,
      orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
    }),
    db.disponibilidadVoluntario.findMany({
      include: {
        cuenta: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            disponibleCuidado: true,
          },
        },
      },
      orderBy: [{ diaSemana: 'asc' }, { hora: 'asc' }, { cuentaId: 'asc' }],
    }),
    db.turnoVoluntario.findMany({
      include: {
        cuenta: {
          select: {
            id: true,
            nombre: true,
            apellido: true,
            disponibleCuidado: true,
          },
        },
      },
      orderBy: [{ diaSemana: 'asc' }, { hora: 'asc' }],
    }),
  ]);

  // Calcular métricas de continuidad y cobertura del calendario
  let bloquesConDisponibilidad = 0;
  let tiemposMuertosEvitados = 0;
  const setTurnos = new Map(turnos.map((t) => [`${t.diaSemana}-${t.hora}`, t.cuentaId]));
  const setDisp = new Set(
    disponibilidades
      .filter((d) => d.cuenta.disponibleCuidado)
      .map((d) => `${d.diaSemana}-${d.hora}`),
  );
  bloquesConDisponibilidad = setDisp.size;

  // Contar bloques continuos asignados sin interrupción
  for (const dia of DIAS_SEMANA) {
    for (let i = 1; i < HORAS_REFUGIO.length; i += 1) {
      const hPrev = HORAS_REFUGIO[i - 1];
      const hAct = HORAS_REFUGIO[i];
      if (setTurnos.has(`${dia.id}-${hPrev}`) && setTurnos.has(`${dia.id}-${hAct}`)) {
        tiemposMuertosEvitados += 1;
      }
    }
  }

  return {
    dias: DIAS_SEMANA,
    horas: HORAS_REFUGIO,
    voluntarios,
    disponibilidades,
    turnos,
    resumen: {
      totalBloquesSemana: DIAS_SEMANA.length * HORAS_REFUGIO.length,
      bloquesConDisponibilidad,
      bloquesAsignados: turnos.length,
      conexionesContinuas: tiemposMuertosEvitados,
    },
  };
}

export async function actualizarDisponibilidadHoraria(cuentaId, bloques) {
  return prisma.$transaction(async (tx) => {
    const cuenta = await tx.cuenta.findUnique({
      where: { id: cuentaId },
      select: { id: true, tipo: true },
    });

    if (!cuenta || cuenta.tipo !== 'VOLUNTARIO') {
      throw new AppError(404, 'Voluntario no encontrado');
    }

    // Eliminar duplicados del payload si existieran
    const vistos = new Set();
    const bloquesUnicos = [];
    for (const bloque of bloques) {
      const clave = `${bloque.diaSemana}-${bloque.hora}`;
      if (!vistos.has(clave)) {
        vistos.add(clave);
        bloquesUnicos.push({
          cuentaId,
          diaSemana: bloque.diaSemana,
          hora: bloque.hora,
        });
      }
    }

    await tx.disponibilidadVoluntario.deleteMany({
      where: { cuentaId },
    });

    if (bloquesUnicos.length > 0) {
      await tx.disponibilidadVoluntario.createMany({
        data: bloquesUnicos,
      });
    } else {
      await tx.cuenta.update({
        where: { id: cuentaId },
        data: { horario: null },
      });
    }

    await recalcularAsignacionHorarios(tx);
    return obtenerCalendarioVoluntariado(tx);
  });
}

export function listarVoluntarios() {
  return prisma.cuenta.findMany({
    where: { tipo: 'VOLUNTARIO' },
    select: CAMPOS_VOLUNTARIO,
    orderBy: [{ apellido: 'asc' }, { nombre: 'asc' }],
  });
}

export async function crearVoluntario(datos) {
  const contrasenaHash = await bcrypt.hash(datos.contrasena, 10);
  const { contrasena, ...datosVoluntario } = datos;
  return prisma.cuenta.create({
    data: {
      ...datosVoluntario,
      contrasenaHash,
      tipo: 'VOLUNTARIO',
    },
    select: CAMPOS_VOLUNTARIO,
  });
}

export async function cambiarCorreo(id, correo, contrasena) {
  const cuenta = await prisma.cuenta.findUnique({ where: { id } });
  if (!cuenta) throw new AppError(404, 'Cuenta no encontrada');

  const valida = await bcrypt.compare(contrasena, cuenta.contrasenaHash);
  if (!valida) throw new AppError(401, 'Contraseña incorrecta');

  return prisma.cuenta.update({
    where: { id },
    data: { correo },
    omit: { contrasenaHash: true },
  });
}

export async function cambiarDisponibilidadCuidado(id, disponibleCuidado) {
  return prisma.$transaction(async (tx) => {
    const cuenta = await tx.cuenta.findUnique({
      where: { id },
      select: { id: true, tipo: true },
    });
    if (!cuenta) throw new AppError(404, 'Cuenta no encontrada');
    if (cuenta.tipo !== 'VOLUNTARIO') {
      throw new AppError(403, 'Solo los voluntarios pueden cambiar su disponibilidad de cuidado');
    }

    const actualizada = await tx.cuenta.update({
      where: { id },
      data: { disponibleCuidado },
      select: {
        id: true,
        nombre: true,
        apellido: true,
        tipo: true,
        disponibleCuidado: true,
      },
    });

    await recalcularAsignacionHorarios(tx);
    return actualizada;
  });
}

export async function eliminarVoluntario(id) {
  return prisma.$transaction(async (tx) => {
    const cuenta = await tx.cuenta.findUnique({
      where: { id },
      select: { id: true, tipo: true },
    });
    if (!cuenta || cuenta.tipo !== 'VOLUNTARIO') {
      throw new AppError(404, 'Voluntario no encontrado');
    }

    const cantidadCuidados = await tx.cuidadoAnimal.count({ where: { cuentaId: id } });
    if (cantidadCuidados > 0) {
      throw new AppError(
        409,
        'No se puede eliminar el voluntario porque tiene registros de cuidado; desactiva su disponibilidad',
      );
    }

    await tx.cuenta.delete({ where: { id } });
    await recalcularAsignacionHorarios(tx);
  });
}
