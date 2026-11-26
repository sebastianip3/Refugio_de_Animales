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
  // Test 1: Bloqueo de solicitudes para un animal que no existe
  it('rechaza si el animal no existe', async () => {
    prisma.animal.findUnique.mockResolvedValue(null);
    // Comprueba que el servicio responde con el código y mensaje de error esperados
    expect(await errorDe(crearAdopcion(solicitud))).toEqual({ status: 404, message: 'Animal no encontrado' });
  });

  // Test 2: Bloqueo de solicitudes para animales que no están ADOPTABLES
  it.each(['ADOPTADO', 'EN_ADOPCION', 'EN_TRATAMIENTO', 'CUARENTENA', 'NO_ADOPTABLE'])(
    'solo se puede postular a un animal ADOPTABLE (rechaza %s)',
    async (estado) => {
      prisma.animal.findUnique.mockResolvedValue({ id: 1, estado });
      // Comprueba que el servicio responde con el código y mensaje de error esperados
      expect(await errorDe(crearAdopcion(solicitud))).toEqual({
        status: 409,
        message: 'El animal no está disponible para adopción',
      });
      // Comprueba que no se modificó la base de datos (prisma.adopcion.create)
      expect(prisma.adopcion.create).not.toHaveBeenCalled();
    }
  );

  // Test 3: Bloqueo de una segunda solicitud para un animal con adopción en proceso
  it('rechaza si el animal ya tiene una adopción en proceso', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 1, estado: 'ADOPTABLE' });
    prisma.adopcion.findFirst.mockResolvedValueOnce({ id: 3, estado: 'PENDIENTE' });
    // Comprueba que el servicio responde con el código y mensaje de error esperados
    expect(await errorDe(crearAdopcion(solicitud))).toEqual({
      status: 409,
      message: 'El animal ya tiene una adopción en proceso',
    });
  });

  // Test 4: Bloqueo de una nueva adopción para un adoptante que ya adoptó
  it('un adoptante que ya adoptó no puede adoptar otro animal', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 1, estado: 'ADOPTABLE' });
    prisma.adopcion.findFirst
      .mockResolvedValueOnce(null) // el animal no tiene adopción en proceso
      .mockResolvedValueOnce({ id: 9, estado: 'APROBADA' }); // el RUT ya tiene una adopción aprobada
    // Comprueba que el servicio responde con el código y mensaje de error esperados
    expect(await errorDe(crearAdopcion(solicitud))).toEqual({
      status: 409,
      message: 'Este adoptante ya realizó una adopción y no puede adoptar otro animal',
    });
  });

  // Test 5: Bloqueo de una segunda solicitud del mismo adoptante en proceso
  it('un adoptante con una solicitud en proceso no puede enviar otra', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 1, estado: 'ADOPTABLE' });
    prisma.adopcion.findFirst.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 9, estado: 'EN_REVISION' });
    // Comprueba que el servicio responde con el código y mensaje de error esperados
    expect(await errorDe(crearAdopcion(solicitud))).toEqual({
      status: 409,
      message: 'Este adoptante ya tiene una solicitud de adopción en proceso',
    });
  });

  // Test 6: Registro de la solicitud, cambio del animal a EN_ADOPCION y correo de confirmación
  it('guarda la solicitud, deja al animal EN_ADOPCION y envía el correo de confirmación', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 1, estado: 'ADOPTABLE' });
    prisma.adopcion.findFirst.mockResolvedValue(null);
    prisma.adopcion.create.mockResolvedValue({ id: 30, ...solicitud, estado: 'PENDIENTE' });

    const creada = await crearAdopcion(solicitud);

    // Mientras se revisa la solicitud, nadie más puede postular a este animal
    expect(prisma.animal.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { estado: 'EN_ADOPCION' } });
    // Comprueba que se guardaron los datos esperados en la base de datos (prisma.adopcion.create)
    expect(prisma.adopcion.create).toHaveBeenCalledOnce();
    // Comprueba que se envió el correo con los datos esperados (correo.enviarSolicitudRecibida)
    expect(correo.enviarSolicitudRecibida).toHaveBeenCalledWith(expect.objectContaining({ id: 30 }));
    // Comprueba que el resultado indica que el correo se envió
    expect(creada.correoEnviado).toBe(true);
  });

  // Test 7: Registro de la solicitud aunque falle el envío del correo
  it('si el correo falla, la solicitud igual queda guardada', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 1, estado: 'ADOPTABLE' });
    prisma.adopcion.findFirst.mockResolvedValue(null);
    prisma.adopcion.create.mockResolvedValue({ id: 30, ...solicitud, estado: 'PENDIENTE' });
    correo.enviarSolicitudRecibida.mockRejectedValue(new Error('Gmail no responde'));

    const creada = await crearAdopcion(solicitud);

    // Comprueba que la solicitud quedó guardada aunque el correo falló
    expect(creada.id).toBe(30);
    expect(creada.correoEnviado).toBe(false);
  });
});

describe('Evaluar solicitud (aprobar o rechazar)', () => {
  // Test 8: Bloqueo del cambio de estado en una adopción ya cerrada
  it('no se puede cambiar el estado de una adopción ya cerrada', async () => {
    prisma.adopcion.findUnique.mockResolvedValue({ id: 3, estado: 'RECHAZADA', animalId: 1 });
    const error = await errorDe(actualizarAdopcion(3, { estado: 'APROBADA' }, ENCARGADO));
    // Comprueba que el servicio responde 409 indicando que la adopción ya está cerrada
    expect(error.status).toBe(409);
    expect(error.message).toContain('ya está cerrada');
  });

  // Test 9: Aprobación: el animal queda ADOPTADO y el correo lleva la firma del encargado
  it('al aprobar, el animal queda ADOPTADO y se avisa al adoptante con la firma del encargado', async () => {
    prisma.adopcion.findUnique.mockResolvedValue({ id: 3, estado: 'PENDIENTE', animalId: 1 });
    prisma.adopcion.update.mockResolvedValue({ id: 3, estado: 'APROBADA', animalId: 1 });

    const resultado = await actualizarAdopcion(3, { estado: 'APROBADA' }, ENCARGADO);

    // Comprueba que se guardaron los datos esperados en la base de datos (prisma.animal.update)
    expect(prisma.animal.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: expect.objectContaining({ estado: 'ADOPTADO', motivoEgreso: 'Adoptado' }),
    });
    // Comprueba que se envió el correo con los datos esperados (correo.enviarResultadoAdopcion)
    expect(correo.enviarResultadoAdopcion).toHaveBeenCalledWith(expect.objectContaining({ estado: 'APROBADA' }), ENCARGADO);
    // Comprueba que el resultado indica que el correo se envió
    expect(resultado.correoEnviado).toBe(true);
  });

  // Test 10: Rechazo: el animal vuelve a ADOPTABLE y se avisa al adoptante
  it('al rechazar, el animal vuelve a estar ADOPTABLE y se avisa al adoptante', async () => {
    prisma.adopcion.findUnique.mockResolvedValue({ id: 3, estado: 'EN_REVISION', animalId: 1 });
    prisma.adopcion.update.mockResolvedValue({ id: 3, estado: 'RECHAZADA', observaciones: 'Sin patio' });

    await actualizarAdopcion(3, { estado: 'RECHAZADA', observaciones: 'Sin patio' }, ENCARGADO);

    // Comprueba que se guardaron los datos esperados en la base de datos (prisma.animal.update)
    expect(prisma.animal.update).toHaveBeenCalledWith({ where: { id: 1 }, data: { estado: 'ADOPTABLE' } });
    // Comprueba que se envió el correo con los datos esperados (correo.enviarResultadoAdopcion)
    expect(correo.enviarResultadoAdopcion).toHaveBeenCalledOnce();
  });

  // Test 11: Paso a revisión sin cambiar el animal ni enviar correo
  it('pasar a revisión no cambia el animal ni envía correo', async () => {
    prisma.adopcion.findUnique.mockResolvedValue({ id: 3, estado: 'PENDIENTE', animalId: 1 });
    prisma.adopcion.update.mockResolvedValue({ id: 3, estado: 'EN_REVISION' });

    await actualizarAdopcion(3, { estado: 'EN_REVISION' }, ENCARGADO);

    // Comprueba que no se modificó la base de datos (prisma.animal.update)
    expect(prisma.animal.update).not.toHaveBeenCalled();
    // Comprueba que no se envió el correo (correo.enviarResultadoAdopcion)
    expect(correo.enviarResultadoAdopcion).not.toHaveBeenCalled();
  });
});

describe('Consulta del estado por el adoptante', () => {
  // Test 12: Consulta de solicitudes usando el RUT y el correo juntos
  it('busca con el RUT y el correo juntos', async () => {
    prisma.adopcion.findMany.mockResolvedValue([]);
    await consultarSolicitudes('12345678-5', 'ana@correo.cl');
    // Comprueba la consulta que se hizo a la base de datos
    expect(prisma.adopcion.findMany.mock.calls[0][0].where).toEqual({ rut: '12345678-5', email: 'ana@correo.cl' });
  });

  // Test 13: Protección de las notas internas en la consulta del adoptante
  it('solo muestra el motivo si la solicitud fue rechazada, nunca las notas internas', async () => {
    prisma.adopcion.findMany.mockResolvedValue([
      { estado: 'RECHAZADA', observaciones: 'Vivienda pequeña', visitas: [] },
      { estado: 'EN_REVISION', observaciones: 'Nota interna del encargado', visitas: [] },
    ]);

    const [rechazada, enRevision] = await consultarSolicitudes('12345678-5', 'ana@correo.cl');

    // Comprueba que solo la solicitud rechazada muestra el motivo y que no se exponen las notas internas
    expect(rechazada.motivoRechazo).toBe('Vivienda pequeña');
    expect(enRevision.motivoRechazo).toBeNull();
    expect(enRevision).not.toHaveProperty('observaciones');
  });

  // Test 14: Inclusión de la próxima visita agendada en la consulta
  it('incluye la próxima visita agendada', async () => {
    prisma.adopcion.findMany.mockResolvedValue([
      { estado: 'APROBADA', observaciones: null, visitas: [{ fecha: dia(2026, 12, 3), hora: '12:00' }] },
    ]);
    const [solicitudAprobada] = await consultarSolicitudes('12345678-5', 'ana@correo.cl');
    // Comprueba que la consulta incluye la fecha y hora de la próxima visita
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

  // Test 15: Bloqueo de visitas para adopciones que no están aprobadas
  it('solo se agendan visitas a adopciones aprobadas', async () => {
    prisma.adopcion.findUnique.mockResolvedValue({ ...adopcionAprobada, estado: 'PENDIENTE' });
    const error = await errorDe(agendarVisita(3, { fecha: dia(2026, 11, 21), hora: '10:00' }, ENCARGADO));
    // Comprueba que el servicio responde con el código y mensaje de error esperados
    expect(error).toEqual({ status: 409, message: 'Solo se pueden agendar visitas a una adopción aprobada' });
  });

  // Test 16: Bloqueo de visitas el mismo día de la adopción
  it('no se puede agendar el mismo día de la adopción', async () => {
    prisma.adopcion.findUnique.mockResolvedValue(adopcionAprobada);
    const error = await errorDe(agendarVisita(3, { fecha: dia(2026, 11, 20), hora: '15:00' }, ENCARGADO));
    // Comprueba que el servicio responde 409 indicando que debe ser desde el día siguiente
    expect(error.status).toBe(409);
    expect(error.message).toContain('desde el día siguiente a la adopción');
  });

  // Test 17: Agendamiento de visitas desde el día siguiente a la adopción
  it('se puede agendar desde el día siguiente a la adopción (ya no exige 15 días)', async () => {
    prisma.adopcion.findUnique.mockResolvedValue(adopcionAprobada);
    prisma.visitaAdopcion.findFirst.mockResolvedValue(null);
    prisma.visitaAdopcion.create.mockResolvedValue({ id: 40, fecha: dia(2026, 11, 21), hora: '10:00', estado: 'AGENDADA' });

    const visita = await agendarVisita(3, { fecha: dia(2026, 11, 21), hora: '10:00' }, ENCARGADO);

    // Comprueba que la visita quedó agendada y que el correo se envió
    expect(visita.id).toBe(40);
    expect(visita.correoEnviado).toBe(true);
    // El correo de la visita lleva al encargado que la agendó (para la firma)
    expect(correo.enviarAvisoVisita).toHaveBeenCalledWith(adopcionAprobada, expect.objectContaining({ id: 40 }), ENCARGADO);
  });

  // Test 18: Bloqueo de un horario de visita ya ocupado
  it('no se puede tomar un horario ocupado por otra visita', async () => {
    prisma.adopcion.findUnique.mockResolvedValue(adopcionAprobada);
    prisma.visitaAdopcion.findFirst.mockResolvedValueOnce({ id: 7 }); // ya hay una visita a esa hora
    const error = await errorDe(agendarVisita(3, { fecha: dia(2026, 12, 3), hora: '12:00' }, ENCARGADO));
    // Comprueba que el mensaje indica que el horario ya está ocupado
    expect(error.message).toBe('El horario del 03-12-2026 a las 12:00 ya está ocupado por otra visita, elija otra hora');
  });

  // Test 19: Bloqueo de una visita anterior a la última visita
  it('la nueva visita debe ser después de la última', async () => {
    prisma.adopcion.findUnique.mockResolvedValue(adopcionAprobada);
    prisma.visitaAdopcion.findFirst
      .mockResolvedValueOnce(null) // horario libre
      .mockResolvedValueOnce({ fecha: dia(2026, 12, 5), estado: 'REALIZADA' }); // última visita
    const error = await errorDe(agendarVisita(3, { fecha: dia(2026, 12, 3), hora: '10:00' }, ENCARGADO));
    // Comprueba que el mensaje indica la fecha de la última visita
    expect(error.message).toContain('debe ser después de la última visita (05-12-2026)');
  });

  // Test 20: Bloqueo de una segunda visita mientras hay otra pendiente
  it('no se agenda otra visita si ya tiene una pendiente', async () => {
    prisma.adopcion.findUnique.mockResolvedValue(adopcionAprobada);
    prisma.visitaAdopcion.findFirst
      .mockResolvedValueOnce(null) // horario libre
      .mockResolvedValueOnce(null) // sin visitas anteriores
      .mockResolvedValueOnce({ fecha: dia(2026, 11, 25), estado: 'AGENDADA' }); // visita pendiente
    const error = await errorDe(agendarVisita(3, { fecha: dia(2026, 12, 3), hora: '10:00' }, ENCARGADO));
    // Comprueba que el mensaje indica la fecha de la visita pendiente
    expect(error.message).toBe('Este adoptante ya tiene una visita agendada para el 25-11-2026');
  });

  // Test 21: Bloqueo de visitas en una hora que ya pasó
  it('no se agenda en una hora que ya pasó', async () => {
    vi.setSystemTime(new Date(2026, 10, 21, 16, 39)); // 21-11 a las 16:39
    prisma.adopcion.findUnique.mockResolvedValue(adopcionAprobada);
    const error = await errorDe(agendarVisita(3, { fecha: dia(2026, 11, 21), hora: '15:00' }, ENCARGADO));
    // Comprueba que el mensaje indica que la hora ya pasó
    expect(error.message).toBe('La hora de la visita ya pasó, elija una hora posterior a la actual');
  });
});

describe('Cancelar visita', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 10, 20, 9, 0));
  });
  afterEach(() => vi.useRealTimers());

  // Test 22: Bloqueo de la cancelación de una visita ya realizada
  it('no se puede cancelar una visita ya realizada', async () => {
    prisma.visitaAdopcion.findFirst.mockResolvedValue({ id: 40, estado: 'REALIZADA', fecha: dia(2026, 12, 3) });
    // Comprueba que el servicio responde con el código y mensaje de error esperados
    expect((await errorDe(cancelarVisita(3, 40, ENCARGADO))).message).toBe('No se puede cancelar una visita ya realizada');
  });

  // Test 23: Cancelación de la visita con aviso firmado por el encargado
  it('cancela la visita y avisa al adoptante con la firma del encargado', async () => {
    const adopcion = { nombre: 'Ana Soto', email: 'ana@correo.cl', animal: { nombre: 'Michi' } };
    prisma.visitaAdopcion.findFirst.mockResolvedValue({ id: 40, estado: 'AGENDADA', fecha: dia(2026, 12, 3), adopcion });
    prisma.visitaAdopcion.update.mockResolvedValue({ id: 40, estado: 'CANCELADA', fecha: dia(2026, 12, 3) });

    const cancelada = await cancelarVisita(3, 40, ENCARGADO);

    // Comprueba que la visita quedó CANCELADA
    expect(cancelada.estado).toBe('CANCELADA');
    // Comprueba que se envió el correo con los datos esperados (correo.enviarAvisoVisita)
    expect(correo.enviarAvisoVisita).toHaveBeenCalledWith(adopcion, expect.objectContaining({ estado: 'CANCELADA' }), ENCARGADO);
  });
});

describe('Resultado de la visita y rechazo posterior', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date(2026, 11, 3, 11, 0)); // 03-12-2026 a las 11:00
  });
  afterEach(() => vi.useRealTimers());

  // Test 24: Bloqueo del registro del resultado antes de la hora de la visita
  it('el resultado no se puede registrar antes de la hora de la visita', async () => {
    prisma.visitaAdopcion.findFirst.mockResolvedValue({ id: 40, estado: 'AGENDADA', fecha: dia(2026, 12, 3), hora: '12:00' });
    const error = await errorDe(registrarResultadoVisita(3, 40, { estadoAnimal: 'BIEN', observaciones: 'Todo bien' }));
    // Comprueba que el mensaje indica desde qué hora se puede registrar
    expect(error.message).toBe('El resultado se puede registrar desde la hora de la visita (03-12-2026 a las 12:00)');
  });

  // Test 25: Registro del resultado de la visita cuando ya llegó la hora
  it('registra el resultado cuando ya llegó la hora', async () => {
    prisma.visitaAdopcion.findFirst.mockResolvedValue({ id: 40, estado: 'AGENDADA', fecha: dia(2026, 12, 3), hora: '10:00' });
    prisma.visitaAdopcion.update.mockResolvedValue({ id: 40, estado: 'REALIZADA' });

    await registrarResultadoVisita(3, 40, { estadoAnimal: 'BIEN', observaciones: 'Todo bien' });

    // Comprueba que se guardaron los datos esperados en la base de datos (prisma.visitaAdopcion.update)
    expect(prisma.visitaAdopcion.update).toHaveBeenCalledWith({
      where: { id: 40 },
      data: { estadoAnimal: 'BIEN', observaciones: 'Todo bien', estado: 'REALIZADA' },
    });
  });

  // Test 26: Bloqueo del rechazo de la adopción sin resultado de la visita
  it('no se puede rechazar la adopción sin registrar antes el resultado de la visita', async () => {
    prisma.visitaAdopcion.findFirst.mockResolvedValue({ id: 40, estado: 'AGENDADA', adopcion: { estado: 'APROBADA' } });
    // Comprueba que el servicio responde con el código y mensaje de error esperados
    expect((await errorDe(rechazarAdopcionTrasVisita(3, 40, ENCARGADO))).message).toBe(
      'Primero registre el resultado de la visita'
    );
  });

  // Test 27: Rechazo tras la visita: el animal vuelve al refugio y se cancelan visitas pendientes
  it('al rechazar tras la visita, el animal vuelve al refugio y se cancelan las visitas pendientes', async () => {
    prisma.visitaAdopcion.findFirst.mockResolvedValue({
      id: 40,
      estado: 'REALIZADA',
      fecha: dia(2026, 12, 3),
      observaciones: 'El hogar no tiene espacio',
      adopcion: { nombre: 'Ana Soto', email: 'ana@correo.cl', estado: 'APROBADA', animalId: 1 },
    });

    const resultado = await rechazarAdopcionTrasVisita(3, 40, ENCARGADO);

    // Comprueba que se guardaron los datos esperados en la base de datos (prisma.adopcion.update)
    expect(prisma.adopcion.update).toHaveBeenCalledWith({
      where: { id: 3 },
      data: { estado: 'RECHAZADA', observaciones: 'Adopción rechazada tras la visita del 03-12-2026: El hogar no tiene espacio' },
    });
    // Comprueba que se guardaron los datos esperados en la base de datos (prisma.animal.update)
    expect(prisma.animal.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { estado: 'ADOPTABLE', fechaEgreso: null, motivoEgreso: null },
    });
    // Comprueba que se guardaron los datos esperados en la base de datos (prisma.visitaAdopcion.updateMany)
    expect(prisma.visitaAdopcion.updateMany).toHaveBeenCalledWith({
      where: { adopcionId: 3, estado: 'AGENDADA' },
      data: { estado: 'CANCELADA' },
    });
    // Comprueba que se envió el correo con los datos esperados (correo.enviarAdopcionRechazadaTrasVisita)
    expect(correo.enviarAdopcionRechazadaTrasVisita).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      ENCARGADO
    );
    // Comprueba que el resultado indica que el correo se envió
    expect(resultado).toEqual({ adopcionId: 3, correoEnviado: true });
  });
});
