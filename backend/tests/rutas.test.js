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
  it('ver las solicitudes requiere iniciar sesión (401)', async () => {
    const respuesta = await request(app).get('/api/adopciones');
    expect(respuesta.status).toBe(401);
  });

  it('un voluntario no puede ver las solicitudes (403)', async () => {
    const respuesta = await request(app).get('/api/adopciones').set('Cookie', iniciarSesion(VOLUNTARIO));
    expect(respuesta.status).toBe(403);
  });

  it('el encargado de adopciones sí puede ver las solicitudes (200)', async () => {
    prisma.adopcion.findMany.mockResolvedValue([{ id: 1, nombre: 'Ana Soto', estado: 'PENDIENTE' }]);
    const respuesta = await request(app).get('/api/adopciones').set('Cookie', iniciarSesion(ENCARGADO));
    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toHaveLength(1);
  });

  it('un voluntario no puede aprobar una solicitud (403)', async () => {
    const respuesta = await request(app)
      .patch('/api/adopciones/3')
      .set('Cookie', iniciarSesion(VOLUNTARIO))
      .send({ estado: 'APROBADA' });
    expect(respuesta.status).toBe(403);
    expect(prisma.adopcion.update).not.toHaveBeenCalled();
  });

  it('agendar una visita requiere ser encargado (401 sin sesión)', async () => {
    const respuesta = await request(app).post('/api/adopciones/3/visitas').send({ fecha: '2026-12-03', hora: '10:00' });
    expect(respuesta.status).toBe(401);
  });
});

describe('Adopciones: enviar solicitud (pública)', () => {
  it('responde 400 con el detalle de cada campo inválido', async () => {
    const respuesta = await request(app)
      .post('/api/adopciones')
      .send({ ...solicitudValida, nombre: 'Al', rut: '12.345.678-9', telefono: '2 1234 5678' });

    expect(respuesta.status).toBe(400);
    const campos = respuesta.body.errors.map((error) => error.campo);
    expect(campos).toEqual(expect.arrayContaining(['nombre', 'rut', 'telefono']));
    expect(prisma.adopcion.create).not.toHaveBeenCalled();
  });

  it('guarda una solicitud válida (201) con los datos normalizados y avisa por correo', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 1, estado: 'ADOPTABLE' });
    prisma.adopcion.findFirst.mockResolvedValue(null);
    prisma.adopcion.create.mockImplementation(({ data }) => Promise.resolve({ id: 30, ...data, estado: 'PENDIENTE' }));

    const respuesta = await request(app).post('/api/adopciones').send(solicitudValida);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.rut).toBe('12345678-5');
    expect(respuesta.body.telefono).toBe('+56912345678');
    expect(respuesta.body.correoEnviado).toBe(true);
    expect(correo.enviarSolicitudRecibida).toHaveBeenCalledOnce();
  });

  it('responde 409 si el animal no está ADOPTABLE', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 1, estado: 'ADOPTADO' });
    const respuesta = await request(app).post('/api/adopciones').send(solicitudValida);
    expect(respuesta.status).toBe(409);
    expect(respuesta.body.message).toBe('El animal no está disponible para adopción');
  });

  it('el adoptante consulta su solicitud con RUT y correo, sin iniciar sesión', async () => {
    prisma.adopcion.findMany.mockResolvedValue([{ estado: 'PENDIENTE', observaciones: null, visitas: [] }]);
    const respuesta = await request(app)
      .post('/api/adopciones/consultar')
      .send({ rut: '12.345.678-5', email: 'ana@correo.cl' });

    expect(respuesta.status).toBe(200);
    expect(respuesta.body[0].estado).toBe('PENDIENTE');
  });
});

describe('Adopciones: evaluar solicitud', () => {
  it('no se puede rechazar sin motivo (400)', async () => {
    const respuesta = await request(app)
      .patch('/api/adopciones/3')
      .set('Cookie', iniciarSesion(ENCARGADO))
      .send({ estado: 'RECHAZADA' });
    expect(respuesta.status).toBe(400);
    expect(respuesta.body.errors[0].mensaje).toBe('Debe indicar el motivo del rechazo');
  });

  it('al aprobar, el correo se firma con el encargado que inició sesión', async () => {
    prisma.adopcion.findUnique.mockResolvedValue({ id: 3, estado: 'PENDIENTE', animalId: 1 });
    prisma.adopcion.update.mockResolvedValue({ id: 3, estado: 'APROBADA', animalId: 1 });

    const respuesta = await request(app)
      .patch('/api/adopciones/3')
      .set('Cookie', iniciarSesion(ENCARGADO))
      .send({ estado: 'APROBADA' });

    expect(respuesta.status).toBe(200);
    expect(correo.enviarResultadoAdopcion).toHaveBeenCalledWith(
      expect.objectContaining({ estado: 'APROBADA' }),
      expect.objectContaining({ nombre: 'Camila', apellido: 'Rojas' })
    );
  });

  it('responde 400 si el id no es un número', async () => {
    const respuesta = await request(app)
      .patch('/api/adopciones/abc')
      .set('Cookie', iniciarSesion(ENCARGADO))
      .send({ estado: 'APROBADA' });
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

  it('cualquiera puede ver el historial de un animal (200)', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 1, nombre: 'Michi', registrosClinicos: [] });
    const respuesta = await request(app).get('/api/animales/1/historial');
    expect(respuesta.status).toBe(200);
    expect(respuesta.body.nombre).toBe('Michi');
  });

  it('crear un registro requiere iniciar sesión (401)', async () => {
    const respuesta = await request(app).post('/api/animales/1/historial').send(registroValido);
    expect(respuesta.status).toBe(401);
  });

  it('el encargado de adopciones no puede crear registros clínicos (403)', async () => {
    const respuesta = await request(app)
      .post('/api/animales/1/historial')
      .set('Cookie', iniciarSesion(ENCARGADO))
      .send(registroValido);
    expect(respuesta.status).toBe(403);
  });

  it('el veterinario crea un registro válido (201)', async () => {
    const cookie = iniciarSesion(VETERINARIO);
    prisma.animal.findUnique.mockResolvedValue({ id: 1 });
    prisma.cuenta.findUnique.mockResolvedValueOnce({ tipo: 'VETERINARIO' }); // veterinario responsable
    prisma.registroClinico.create.mockResolvedValue({ id: 50, ...registroValido, animalId: 1 });

    const respuesta = await request(app).post('/api/animales/1/historial').set('Cookie', cookie).send(registroValido);

    expect(respuesta.status).toBe(201);
    expect(respuesta.body.id).toBe(50);
  });

  it('responde 400 si el veterinario responsable no trabaja en el refugio', async () => {
    const cookie = iniciarSesion(VETERINARIO);
    prisma.animal.findUnique.mockResolvedValue({ id: 1 });
    prisma.cuenta.findUnique.mockResolvedValueOnce({ tipo: 'VOLUNTARIO' });

    const respuesta = await request(app)
      .post('/api/animales/1/historial')
      .set('Cookie', cookie)
      .send({ ...registroValido, veterinarioId: VOLUNTARIO.id });

    expect(respuesta.status).toBe(400);
    expect(respuesta.body.message).toBe('El veterinario seleccionado no trabaja en el refugio');
  });

  it('responde 400 si la descripción supera los 200 caracteres', async () => {
    const respuesta = await request(app)
      .post('/api/animales/1/historial')
      .set('Cookie', iniciarSesion(VETERINARIO))
      .send({ ...registroValido, descripcion: 'x'.repeat(201) });
    expect(respuesta.status).toBe(400);
    expect(prisma.registroClinico.create).not.toHaveBeenCalled();
  });

  it('el veterinario puede ver la lista de veterinarios del refugio', async () => {
    prisma.cuenta.findMany.mockResolvedValue([{ id: 8, nombre: 'Jorge', apellido: 'Palacio' }]);
    const respuesta = await request(app).get('/api/cuentas/veterinarios').set('Cookie', iniciarSesion(VETERINARIO));
    expect(respuesta.status).toBe(200);
    expect(respuesta.body).toEqual([{ id: 8, nombre: 'Jorge', apellido: 'Palacio' }]);
  });

  it('un voluntario no puede ver la lista de veterinarios (403)', async () => {
    const respuesta = await request(app).get('/api/cuentas/veterinarios').set('Cookie', iniciarSesion(VOLUNTARIO));
    expect(respuesta.status).toBe(403);
  });
});
