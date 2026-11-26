import { describe, it, expect, vi, beforeEach } from 'vitest';
import request from 'supertest';

// Prisma y los correos son falsos: las peticiones HTTP recorren las rutas, los middlewares
// de sesión y permisos, y los controladores reales, pero sin base de datos ni correos
vi.mock('../src/config/prisma.js', async () => {
  const { crearPrismaMock } = await import('./helpers/prismaMock.js');
  return { default: crearPrismaMock() };
});
vi.mock('../src/services/correo.service.js', () => ({
  enviarSolicitudRecibida: vi.fn(),
  enviarResultadoAdopcion: vi.fn(),
  enviarAvisoVisita: vi.fn(),
  enviarAdopcionRechazadaTrasVisita: vi.fn(),
  enviarComprobanteInscripcion: vi.fn(),
  enviarCambiosJornada: vi.fn(),
  enviarCancelacionInscripcion: vi.fn(),
}));

import prisma from '../src/config/prisma.js';
import * as correo from '../src/services/correo.service.js';
import { crearApp, cookieSesion, ENCARGADO, VETERINARIO, VOLUNTARIO } from './helpers/app.js';

const app = crearApp();

// El middleware de sesión busca la cuenta en Prisma: se devuelve la cuenta de prueba
function iniciarSesion(cuenta) {
  prisma.cuenta.findUnique.mockResolvedValueOnce(cuenta);
  return cookieSesion(cuenta);
}

const solicitudValida = {
  animalId: 1,
  nombre: 'Ana Soto',
  rut: '12.345.678-5',
  email: 'ana@correo.cl',
  telefono: '9 1234 5678',
  direccion: 'Los Aromos 123',
  comuna: 'CONCEPCION',
};

beforeEach(() => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
});

describe('Adopciones: permisos', () => {
  // Test 1: Bloqueo de la lista de solicitudes sin iniciar sesión (401)
  it('ver las solicitudes requiere iniciar sesión (401)', async () => {
    const respuesta = await request(app).get('/api/adopciones');
    // Comprueba que la API responde 401 (falta iniciar sesión)
    expect(respuesta.status).toBe(401);
  });

  // Test 2: Bloqueo de la lista de solicitudes para un voluntario (403)
  it('un voluntario no puede ver las solicitudes (403)', async () => {
    const respuesta = await request(app).get('/api/adopciones').set('Cookie', iniciarSesion(VOLUNTARIO));
    // Comprueba que la API responde 403 (el rol no tiene permiso)
    expect(respuesta.status).toBe(403);
  });

  // Test 3: Acceso del encargado de adopciones a la lista de solicitudes (200)
  it('el encargado de adopciones sí puede ver las solicitudes (200)', async () => {
    prisma.adopcion.findMany.mockResolvedValue([{ id: 1, nombre: 'Ana Soto', estado: 'PENDIENTE' }]);
    const respuesta = await request(app).get('/api/adopciones').set('Cookie', iniciarSesion(ENCARGADO));
    // Comprueba que la API responde 200 (petición correcta)
    expect(respuesta.status).toBe(200);
    // Comprueba los datos que devuelve la API
    expect(respuesta.body).toHaveLength(1);
  });

  // Test 4: Bloqueo de la aprobación de una solicitud por un voluntario (403)
  it('un voluntario no puede aprobar una solicitud (403)', async () => {
    const respuesta = await request(app)
      .patch('/api/adopciones/3')
      .set('Cookie', iniciarSesion(VOLUNTARIO))
      .send({ estado: 'APROBADA' });
    // Comprueba que la API responde 403 (el rol no tiene permiso)
    expect(respuesta.status).toBe(403);
    // Comprueba que no se modificó la base de datos (prisma.adopcion.update)
    expect(prisma.adopcion.update).not.toHaveBeenCalled();
  });

  // Test 5: Bloqueo del agendamiento de visitas sin iniciar sesión (401)
  it('agendar una visita requiere ser encargado (401 sin sesión)', async () => {
    const respuesta = await request(app).post('/api/adopciones/3/visitas').send({ fecha: '2026-12-03', hora: '10:00' });
    // Comprueba que la API responde 401 (falta iniciar sesión)
    expect(respuesta.status).toBe(401);
  });
});

describe('Adopciones: enviar solicitud (pública)', () => {
  // Test 6: Detalle de cada campo inválido al enviar una solicitud (400)
  it('responde 400 con el detalle de cada campo inválido', async () => {
    const respuesta = await request(app)
      .post('/api/adopciones')
      .send({ ...solicitudValida, nombre: 'Al', rut: '12.345.678-9', telefono: '2 1234 5678' });

    // Comprueba que la API responde 400 (datos inválidos)
    expect(respuesta.status).toBe(400);
    const campos = respuesta.body.errors.map((error) => error.campo);
    // Comprueba que la respuesta indica cada campo inválido
    expect(campos).toEqual(expect.arrayContaining(['nombre', 'rut', 'telefono']));
    // Comprueba que no se modificó la base de datos (prisma.adopcion.create)
    expect(prisma.adopcion.create).not.toHaveBeenCalled();
  });

  // Test 7: Registro de una solicitud válida con datos normalizados y correo (201)
  it('guarda una solicitud válida (201) con los datos normalizados y avisa por correo', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 1, estado: 'ADOPTABLE' });
    prisma.adopcion.findFirst.mockResolvedValue(null);
    prisma.adopcion.create.mockImplementation(({ data }) => Promise.resolve({ id: 30, ...data, estado: 'PENDIENTE' }));

    const respuesta = await request(app).post('/api/adopciones').send(solicitudValida);

    // Comprueba que la API responde 201 (registro creado)
    expect(respuesta.status).toBe(201);
    // Comprueba los datos que devuelve la API
    expect(respuesta.body.rut).toBe('12345678-5');
    expect(respuesta.body.telefono).toBe('+56912345678');
    expect(respuesta.body.correoEnviado).toBe(true);
    // Comprueba que se envió el correo con los datos esperados (correo.enviarSolicitudRecibida)
    expect(correo.enviarSolicitudRecibida).toHaveBeenCalledOnce();
  });

  // Test 8: Bloqueo de solicitudes para un animal no ADOPTABLE (409)
  it('responde 409 si el animal no está ADOPTABLE', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 1, estado: 'ADOPTADO' });
    const respuesta = await request(app).post('/api/adopciones').send(solicitudValida);
    // Comprueba que la API responde 409 (la regla de negocio lo impide)
    expect(respuesta.status).toBe(409);
    // Comprueba los datos que devuelve la API
    expect(respuesta.body.message).toBe('El animal no está disponible para adopción');
  });

  // Test 9: Consulta pública del estado con RUT y correo, sin sesión
  it('el adoptante consulta su solicitud con RUT y correo, sin iniciar sesión', async () => {
    prisma.adopcion.findMany.mockResolvedValue([{ estado: 'PENDIENTE', observaciones: null, visitas: [] }]);
    const respuesta = await request(app)
      .post('/api/adopciones/consultar')
      .send({ rut: '12.345.678-5', email: 'ana@correo.cl' });

    // Comprueba que la API responde 200 (petición correcta)
    expect(respuesta.status).toBe(200);
    // Comprueba los datos que devuelve la API
    expect(respuesta.body[0].estado).toBe('PENDIENTE');
  });
});

describe('Adopciones: evaluar solicitud', () => {
  // Test 10: Bloqueo del rechazo de una solicitud sin motivo (400)
  it('no se puede rechazar sin motivo (400)', async () => {
    const respuesta = await request(app)
      .patch('/api/adopciones/3')
      .set('Cookie', iniciarSesion(ENCARGADO))
      .send({ estado: 'RECHAZADA' });
    // Comprueba que la API responde 400 (datos inválidos)
    expect(respuesta.status).toBe(400);
    // Comprueba los datos que devuelve la API
    expect(respuesta.body.errors[0].mensaje).toBe('Debe indicar el motivo del rechazo');
  });

  // Test 11: Firma del correo de aprobación con el encargado que inició sesión
  it('al aprobar, el correo se firma con el encargado que inició sesión', async () => {
    prisma.adopcion.findUnique.mockResolvedValue({ id: 3, estado: 'PENDIENTE', animalId: 1 });
    prisma.adopcion.update.mockResolvedValue({ id: 3, estado: 'APROBADA', animalId: 1 });

    const respuesta = await request(app)
      .patch('/api/adopciones/3')
      .set('Cookie', iniciarSesion(ENCARGADO))
      .send({ estado: 'APROBADA' });

    // Comprueba que la API responde 200 (petición correcta)
    expect(respuesta.status).toBe(200);
    // Comprueba que se envió el correo con los datos esperados (correo.enviarResultadoAdopcion)
    expect(correo.enviarResultadoAdopcion).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'APROBADA' }),
      expect.objectContaining({ nombre: 'Camila', apellido: 'Rojas' })
    );
  });

  // Test 12: Error 400 cuando el id de la solicitud no es un número
  it('responde 400 si el id no es un número', async () => {
    const respuesta = await request(app)
      .patch('/api/adopciones/abc')
      .set('Cookie', iniciarSesion(ENCARGADO))
      .send({ estado: 'APROBADA' });
    // Comprueba que la API responde 400 (datos inválidos)
    expect(respuesta.status).toBe(400);
  });
});

describe('Registro clínico', () => {
  const registroValido = {
    fecha: '2026-11-01',
    tipo: 'CONSULTA',
    descripcion: 'Control general',
    veterinarioId: VETERINARIO.id,
  };

  // Test 13: Consulta pública del historial clínico de un animal (200)
  it('cualquiera puede ver el historial de un animal (200)', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 1, nombre: 'Michi', registrosClinicos: [] });
    const respuesta = await request(app).get('/api/animales/1/historial');
    // Comprueba que la API responde 200 (petición correcta)
    expect(respuesta.status).toBe(200);
    // Comprueba los datos que devuelve la API
    expect(respuesta.body.nombre).toBe('Michi');
  });

  // Test 14: Bloqueo de la creación de registros clínicos sin sesión (401)
  it('crear un registro requiere iniciar sesión (401)', async () => {
    const respuesta = await request(app).post('/api/animales/1/historial').send(registroValido);
    // Comprueba que la API responde 401 (falta iniciar sesión)
    expect(respuesta.status).toBe(401);
  });

  // Test 15: Bloqueo de la creación de registros clínicos por el encargado (403)
  it('el encargado de adopciones no puede crear registros clínicos (403)', async () => {
    const respuesta = await request(app)
      .post('/api/animales/1/historial')
      .set('Cookie', iniciarSesion(ENCARGADO))
      .send(registroValido);
    // Comprueba que la API responde 403 (el rol no tiene permiso)
    expect(respuesta.status).toBe(403);
  });

  // Test 16: Creación de un registro clínico válido por el veterinario (201)
  it('el veterinario crea un registro válido (201)', async () => {
    const cookie = iniciarSesion(VETERINARIO);
    prisma.animal.findUnique.mockResolvedValue({ id: 1 });
    prisma.cuenta.findUnique.mockResolvedValueOnce({ tipo: 'VETERINARIO' }); // veterinario responsable
    prisma.registroClinico.create.mockResolvedValue({ id: 50, ...registroValido, animalId: 1 });

    const respuesta = await request(app).post('/api/animales/1/historial').set('Cookie', cookie).send(registroValido);

    // Comprueba que la API responde 201 (registro creado)
    expect(respuesta.status).toBe(201);
    // Comprueba los datos que devuelve la API
    expect(respuesta.body.id).toBe(50);
  });

  // Test 17: Bloqueo de registros con un responsable que no es veterinario (400)
  it('responde 400 si el veterinario responsable no trabaja en el refugio', async () => {
    const cookie = iniciarSesion(VETERINARIO);
    prisma.animal.findUnique.mockResolvedValue({ id: 1 });
    prisma.cuenta.findUnique.mockResolvedValueOnce({ tipo: 'VOLUNTARIO' });

    const respuesta = await request(app)
      .post('/api/animales/1/historial')
      .set('Cookie', cookie)
      .send({ ...registroValido, veterinarioId: VOLUNTARIO.id });

    // Comprueba que la API responde 400 (datos inválidos)
    expect(respuesta.status).toBe(400);
    // Comprueba los datos que devuelve la API
    expect(respuesta.body.message).toBe('El veterinario seleccionado no trabaja en el refugio');
  });

  // Test 18: Bloqueo de una descripción de más de 200 caracteres (400)
  it('responde 400 si la descripción supera los 200 caracteres', async () => {
    const respuesta = await request(app)
      .post('/api/animales/1/historial')
      .set('Cookie', iniciarSesion(VETERINARIO))
      .send({ ...registroValido, descripcion: 'x'.repeat(201) });
    // Comprueba que la API responde 400 (datos inválidos)
    expect(respuesta.status).toBe(400);
    // Comprueba que no se modificó la base de datos (prisma.registroClinico.create)
    expect(prisma.registroClinico.create).not.toHaveBeenCalled();
  });

  // Test 19: Acceso del veterinario a la lista de veterinarios del refugio
  it('el veterinario puede ver la lista de veterinarios del refugio', async () => {
    prisma.cuenta.findMany.mockResolvedValue([{ id: 8, nombre: 'Jorge', apellido: 'Palacio' }]);
    const respuesta = await request(app).get('/api/cuentas/veterinarios').set('Cookie', iniciarSesion(VETERINARIO));
    // Comprueba que la API responde 200 (petición correcta)
    expect(respuesta.status).toBe(200);
    // Comprueba los datos que devuelve la API
    expect(respuesta.body).toEqual([{ id: 8, nombre: 'Jorge', apellido: 'Palacio' }]);
  });

  // Test 20: Bloqueo de la lista de veterinarios para un voluntario (403)
  it('un voluntario no puede ver la lista de veterinarios (403)', async () => {
    const respuesta = await request(app).get('/api/cuentas/veterinarios').set('Cookie', iniciarSesion(VOLUNTARIO));
    // Comprueba que la API responde 403 (el rol no tiene permiso)
    expect(respuesta.status).toBe(403);
  });
});
