import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

// Prisma y los correos se reemplazan por versiones falsas: no se toca la base de datos ni se envían correos
vi.mock('../src/config/prisma.js', async () => {
  const { crearPrismaMock } = await import('./helpers/prismaMock.js');
  return { default: crearPrismaMock() };
});
vi.mock('../src/services/correo.service.js', () => ({
  enviarSolicitudRecibida: vi.fn(),
  enviarResultadoAdopcion: vi.fn(),
  enviarAvisoVisita: vi.fn(),
  enviarAdopcionRechazadaTrasVisita: vi.fn(),
}));

import prisma from '../src/config/prisma.js';
import * as correo from '../src/services/correo.service.js';
import {
  crearAdopcion,
  actualizarAdopcion,
  consultarSolicitudes,
  agendarVisita,
  cancelarVisita,
  registrarResultadoVisita,
  rechazarAdopcionTrasVisita,
} from '../src/services/adopcion.service.js';

const ENCARGADO = { id: 5, nombre: 'Camila', apellido: 'Rojas', tipo: 'ENCARGADO_ADOPCIONES' };

const solicitud = { animalId: 1, nombre: 'Ana Soto', rut: '12345678-5', email: 'ana@correo.cl' };

// Fecha guardada como en la base de datos: medianoche UTC del día
const dia = (anio, mes, diaDelMes) => new Date(Date.UTC(anio, mes - 1, diaDelMes));

// Los errores del servicio (AppError) tienen status y mensaje
async function errorDe(promesa) {
  try {
    await promesa;
  } catch (error) {
    return { status: error.status, message: error.message };
  }
  throw new Error('Se esperaba un error y no ocurrió');
}

beforeEach(() => {
  // Los errores de correo se registran con console.error; se silencian en las pruebas
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('Crear solicitud de adopción', () => {
  it('rechaza si el animal no existe', async () => {
    prisma.animal.findUnique.mockResolvedValue(null);
    expect(await errorDe(crearAdopcion(solicitud))).toEqual({ status: 404, message: 'Animal no encontrado' });
  });

  it.each(['ADOPTADO', 'EN_ADOPCION', 'EN_TRATAMIENTO', 'CUARENTENA', 'NO_ADOPTABLE'])(
    'solo se puede postular a un animal ADOPTABLE (rechaza %s)',
    async (estado) => {
      prisma.animal.findUnique.mockResolvedValue({ id: 1, estado });
      expect(await errorDe(crearAdopcion(solicitud))).toEqual({
        status: 409,
        message: 'El animal no está disponible para adopción',
      });
      expect(prisma.adopcion.create).not.toHaveBeenCalled();
    }
  );

  it('rechaza si el animal ya tiene una adopción en proceso', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 1, estado: 'ADOPTABLE' });
    prisma.adopcion.findFirst.mockResolvedValueOnce({ id: 3, estado: 'PENDIENTE' });
    expect(await errorDe(crearAdopcion(solicitud))).toEqual({
      status: 409,
      message: 'El animal ya tiene una adopción en proceso',
    });
  });

  it('un adoptante que ya adoptó no puede adoptar otro animal', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 1, estado: 'ADOPTABLE' });
    prisma.adopcion.findFirst
      .mockResolvedValueOnce(null) // el animal no tiene adopción en proceso
      .mockResolvedValueOnce({ id: 9, estado: 'APROBADA' }); // el RUT ya tiene una adopción aprobada
    expect(await errorDe(crearAdopcion(solicitud))).toEqual({
      status: 409,
      message: 'Este adoptante ya realizó una adopción y no puede adoptar otro animal',
    });
  });

  it('un adoptante con una solicitud en proceso no puede enviar otra', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 1, estado: 'ADOPTABLE' });
    prisma.adopcion.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 9, estado: 'EN_REVISION' });
    expect(await errorDe(crearAdopcion(solicitud))).toEqual({
      status: 409,
      message: 'Este adoptante ya tiene una solicitud de adopción en proceso',
    });
  });

  it('guarda la solicitud, deja al animal EN_ADOPCION y envía el correo de confirmación', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 1, estado: 'ADOPTABLE' });
    prisma.adopcion.findFirst.mockResolvedValue(null);
    prisma.adopcion.create.mockResolvedValue({ id: 30, ...solicitud, estado: 'PENDIENTE' });

    const creada = await crearAdopcion(solicitud);

    // Mientras se revisa la solicitud, nadie más puede postular a este animal
    expect(prisma.animal.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { estado: 'EN_ADOPCION' } });
    expect(prisma.adopcion.create).toHaveBeenCalledOnce();
    expect(correo.enviarSolicitudRecibida).toHaveBeenCalledWith(expect.objectContaining({ id: 30 }));
    expect(creada.correoEnviado).toBe(true);
  });

  it('si el correo falla, la solicitud igual queda guardada', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 1, estado: 'ADOPTABLE' });
    prisma.adopcion.findFirst.mockResolvedValue(null);
    prisma.adopcion.create.mockResolvedValue({ id: 30, ...solicitud, estado: 'PENDIENTE' });
    correo.enviarSolicitudRecibida.mockRejectedValue(new Error('Gmail no responde'));

    const creada = await crearAdopcion(solicitud);

    expect(creada.id).toBe(30);
    expect(creada.correoEnviado).toBe(false);
  });
});

describe('Evaluar solicitud (aprobar o rechazar)', () => {
  it('no se puede cambiar el estado de una adopción ya cerrada', async () => {
    prisma.adopcion.findUnique.mockResolvedValue({ id: 3, estado: 'RECHAZADA', animalId: 1 });
    const error = await errorDe(actualizarAdopcion(3, { estado: 'APROBADA' }, ENCARGADO));
    expect(error.status).toBe(409);
    expect(error.message).toContain('ya está cerrada');
  });

  it('al aprobar, el animal queda ADOPTADO y se avisa al adoptante con la firma del encargado', async () => {
    prisma.adopcion.findUnique.mockResolvedValue({ id: 3, estado: 'PENDIENTE', animalId: 1 });
    prisma.adopcion.update.mockResolvedValue({ id: 3, estado: 'APROBADA', animalId: 1 });

    const resultado = await actualizarAdopcion(3, { estado: 'APROBADA' }, ENCARGADO);

    expect(prisma.animal.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ estado: 'ADOPTADO', motivoEgreso: 'Adoptado' }),
    });
    expect(correo.enviarResultadoAdopcion).toHaveBeenCalledWith(expect.objectContaining({ estado: 'APROBADA' }), ENCARGADO);
    expect(resultado.correoEnviado).toBe(true);
  });

  it('al rechazar, el animal vuelve a estar ADOPTABLE y se avisa al adoptante', async () => {
    prisma.adopcion.findUnique.mockResolvedValue({ id: 3, estado: 'EN_REVISION', animalId: 1 });
    prisma.adopcion.update.mockResolvedValue({ id: 3, estado: 'RECHAZADA', observaciones: 'Sin patio' });

    await actualizarAdopcion(3, { estado: 'RECHAZADA', observaciones: 'Sin patio' }, ENCARGADO);

    expect(prisma.animal.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { estado: 'ADOPTABLE' } });
    expect(correo.enviarResultadoAdopcion).toHaveBeenCalledOnce();
  });

  it('pasar a revisión no cambia el animal ni envía correo', async () => {
    prisma.adopcion.findUnique.mockResolvedValue({ id: 3, estado: 'PENDIENTE', animalId: 1 });
    prisma.adopcion.update.mockResolvedValue({ id: 3, estado: 'EN_REVISION' });

    await actualizarAdopcion(3, { estado: 'EN_REVISION' }, ENCARGADO);

    expect(prisma.animal.update).not.toHaveBeenCalled();
    expect(correo.enviarResultadoAdopcion).not.toHaveBeenCalled();
  });
});

describe('Consulta del estado por el adoptante', () => {
  it('busca con el RUT y el correo juntos', async () => {
    prisma.adopcion.findMany.mockResolvedValue([]);
    await consultarSolicitudes('12345678-5', 'ana@correo.cl');
    expect(prisma.adopcion.findMany.mock.calls[0][0].where).toEqual({ rut: '12345678-5', email: 'ana@correo.cl' });
  });

  it('solo muestra el motivo si la solicitud fue rechazada, nunca las notas internas', async () => {
    prisma.adopcion.findMany.mockResolvedValue([
      { estado: 'RECHAZADA', observaciones: 'Vivienda pequeña', visitas: [] },
      { estado: 'EN_REVISION', observaciones: 'Nota interna del encargado', visitas: [] },
    ]);

    const [rechazada, enRevision] = await consultarSolicitudes('12345678-5', 'ana@correo.cl');

    expect(rechazada.motivoRechazo).toBe('Vivienda pequeña');
    expect(enRevision.motivoRechazo).toBeNull();
    expect(enRevision).not.toHaveProperty('observaciones');
  });

  it('incluye la próxima visita agendada', async () => {
    prisma.adopcion.findMany.mockResolvedValue([
      { estado: 'APROBADA', observaciones: null, visitas: [{ fecha: dia(2026, 12, 3), hora: '12:00' }] },
    ]);
    const [solicitudAprobada] = await consultarSolicitudes('12345678-5', 'ana@correo.cl');
    expect(solicitudAprobada.proximaVisita).toEqual({ fecha: dia(2026, 12, 3), hora: '12:00' });
  });
});

describe('Agendar visita de seguimiento', () => {
  // "Hoy" para estas pruebas: 20-11-2026 a las 09:00 (hora local). La adopción fue ese mismo día
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 20, 9, 0));
  });
  afterEach(() => vi.useRealTimers());

  const adopcionAprobada = {
    nombre: 'Ana Soto',
    email: 'ana@correo.cl',
    estado: 'APROBADA',
    updatedAt: new Date(2026, 10, 20, 8, 0),
    animal: { nombre: 'Michi', fechaEgreso: new Date(2026, 10, 20, 8, 0) },
  };

  it('solo se agendan visitas a adopciones aprobadas', async () => {
    prisma.adopcion.findUnique.mockResolvedValue({ ...adopcionAprobada, estado: 'PENDIENTE' });
    const error = await errorDe(agendarVisita(3, { fecha: dia(2026, 11, 21), hora: '10:00' }, ENCARGADO));
    expect(error).toEqual({ status: 409, message: 'Solo se pueden agendar visitas a una adopción aprobada' });
  });

  it('no se puede agendar el mismo día de la adopción', async () => {
    prisma.adopcion.findUnique.mockResolvedValue(adopcionAprobada);
    const error = await errorDe(agendarVisita(3, { fecha: dia(2026, 11, 20), hora: '15:00' }, ENCARGADO));
    expect(error.status).toBe(409);
    expect(error.message).toContain('desde el día siguiente a la adopción');
  });

  it('se puede agendar desde el día siguiente a la adopción (ya no exige 15 días)', async () => {
    prisma.adopcion.findUnique.mockResolvedValue(adopcionAprobada);
    prisma.visitaAdopcion.findFirst.mockResolvedValue(null);
    prisma.visitaAdopcion.create.mockResolvedValue({ id: 40, fecha: dia(2026, 11, 21), hora: '10:00', estado: 'AGENDADA' });

    const visita = await agendarVisita(3, { fecha: dia(2026, 11, 21), hora: '10:00' }, ENCARGADO);

    expect(visita.id).toBe(40);
    expect(visita.correoEnviado).toBe(true);
    // El correo de la visita lleva al encargado que la agendó (para la firma)
    expect(correo.enviarAvisoVisita).toHaveBeenCalledWith(adopcionAprobada, expect.objectContaining({ id: 40 }), ENCARGADO);
  });

  it('no se puede tomar un horario ocupado por otra visita', async () => {
    prisma.adopcion.findUnique.mockResolvedValue(adopcionAprobada);
    prisma.visitaAdopcion.findFirst.mockResolvedValueOnce({ id: 7 }); // ya hay una visita a esa hora
    const error = await errorDe(agendarVisita(3, { fecha: dia(2026, 12, 3), hora: '12:00' }, ENCARGADO));
    expect(error.message).toBe('El horario del 03-12-2026 a las 12:00 ya está ocupado por otra visita, elija otra hora');
  });

  it('la nueva visita debe ser después de la última', async () => {
    prisma.adopcion.findUnique.mockResolvedValue(adopcionAprobada);
    prisma.visitaAdopcion.findFirst
      .mockResolvedValueOnce(null) // horario libre
      .mockResolvedValueOnce({ fecha: dia(2026, 12, 5), estado: 'REALIZADA' }); // última visita
    const error = await errorDe(agendarVisita(3, { fecha: dia(2026, 12, 3), hora: '10:00' }, ENCARGADO));
    expect(error.message).toContain('debe ser después de la última visita (05-12-2026)');
  });

  it('no se agenda otra visita si ya tiene una pendiente', async () => {
    prisma.adopcion.findUnique.mockResolvedValue(adopcionAprobada);
    prisma.visitaAdopcion.findFirst
      .mockResolvedValueOnce(null) // horario libre
      .mockResolvedValueOnce(null) // sin visitas anteriores
      .mockResolvedValueOnce({ fecha: dia(2026, 11, 25), estado: 'AGENDADA' }); // visita pendiente
    const error = await errorDe(agendarVisita(3, { fecha: dia(2026, 12, 3), hora: '10:00' }, ENCARGADO));
    expect(error.message).toBe('Este adoptante ya tiene una visita agendada para el 25-11-2026');
  });

  it('no se agenda en una hora que ya pasó', async () => {
    vi.setSystemTime(new Date(2026, 10, 21, 16, 39)); // 21-11 a las 16:39
    prisma.adopcion.findUnique.mockResolvedValue(adopcionAprobada);
    const error = await errorDe(agendarVisita(3, { fecha: dia(2026, 11, 21), hora: '15:00' }, ENCARGADO));
    expect(error.message).toBe('La hora de la visita ya pasó, elija una hora posterior a la actual');
  });
});

describe('Cancelar visita', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 20, 9, 0));
  });
  afterEach(() => vi.useRealTimers());

  it('no se puede cancelar una visita ya realizada', async () => {
    prisma.visitaAdopcion.findFirst.mockResolvedValue({ id: 40, estado: 'REALIZADA', fecha: dia(2026, 12, 3) });
    expect((await errorDe(cancelarVisita(3, 40, ENCARGADO))).message).toBe('No se puede cancelar una visita ya realizada');
  });

  it('cancela la visita y avisa al adoptante con la firma del encargado', async () => {
    const adopcion = { nombre: 'Ana Soto', email: 'ana@correo.cl', animal: { nombre: 'Michi' } };
    prisma.visitaAdopcion.findFirst.mockResolvedValue({ id: 40, estado: 'AGENDADA', fecha: dia(2026, 12, 3), adopcion });
    prisma.visitaAdopcion.update.mockResolvedValue({ id: 40, estado: 'CANCELADA', fecha: dia(2026, 12, 3) });

    const cancelada = await cancelarVisita(3, 40, ENCARGADO);

    expect(cancelada.estado).toBe('CANCELADA');
    expect(correo.enviarAvisoVisita).toHaveBeenCalledWith(adopcion, expect.objectContaining({ estado: 'CANCELADA' }), ENCARGADO);
  });
});

describe('Resultado de la visita y rechazo posterior', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 11, 3, 11, 0)); // 03-12-2026 a las 11:00
  });
  afterEach(() => vi.useRealTimers());

  it('el resultado no se puede registrar antes de la hora de la visita', async () => {
    prisma.visitaAdopcion.findFirst.mockResolvedValue({ id: 40, estado: 'AGENDADA', fecha: dia(2026, 12, 3), hora: '12:00' });
    const error = await errorDe(registrarResultadoVisita(3, 40, { estadoAnimal: 'BIEN', observaciones: 'Todo bien' }));
    expect(error.message).toBe('El resultado se puede registrar desde la hora de la visita (03-12-2026 a las 12:00)');
  });

  it('registra el resultado cuando ya llegó la hora', async () => {
    prisma.visitaAdopcion.findFirst.mockResolvedValue({ id: 40, estado: 'AGENDADA', fecha: dia(2026, 12, 3), hora: '10:00' });
    prisma.visitaAdopcion.update.mockResolvedValue({ id: 40, estado: 'REALIZADA' });

    await registrarResultadoVisita(3, 40, { estadoAnimal: 'BIEN', observaciones: 'Todo bien' });

    expect(prisma.visitaAdopcion.update).toHaveBeenCalledWith({
      where: { id: 40 },
      data: { estadoAnimal: 'BIEN', observaciones: 'Todo bien', estado: 'REALIZADA' },
    });
  });

  it('no se puede rechazar la adopción sin registrar antes el resultado de la visita', async () => {
    prisma.visitaAdopcion.findFirst.mockResolvedValue({ id: 40, estado: 'AGENDADA', adopcion: { estado: 'APROBADA' } });
    expect((await errorDe(rechazarAdopcionTrasVisita(3, 40, ENCARGADO))).message).toBe(
      'Primero registre el resultado de la visita'
    );
  });

  it('al rechazar tras la visita, el animal vuelve al refugio y se cancelan las visitas pendientes', async () => {
    prisma.visitaAdopcion.findFirst.mockResolvedValue({
      id: 40,
      estado: 'REALIZADA',
      fecha: dia(2026, 12, 3),
      observaciones: 'El hogar no tiene espacio',
      adopcion: { nombre: 'Ana Soto', email: 'ana@correo.cl', estado: 'APROBADA', animalId: 1 },
    });

    const resultado = await rechazarAdopcionTrasVisita(3, 40, ENCARGADO);

    expect(prisma.adopcion.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { estado: 'RECHAZADA', observaciones: 'Adopción rechazada tras la visita del 03-12-2026: El hogar no tiene espacio' },
    });
    expect(prisma.animal.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { estado: 'ADOPTABLE', fechaEgreso: null, motivoEgreso: null },
    });
    expect(prisma.visitaAdopcion.updateMany).toHaveBeenCalledWith({
      where: { adopcionId: 3, estado: 'AGENDADA' },
      data: { estado: 'CANCELADA' },
    });
    expect(correo.enviarAdopcionRechazadaTrasVisita).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      ENCARGADO
    );
    expect(resultado).toEqual({ adopcionId: 3, correoEnviado: true });
  });
});
