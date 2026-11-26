import { describe, it, expect, vi } from 'vitest';

// Prisma falso: no se toca la base de datos
vi.mock('../src/config/prisma.js', async () => {
  const { crearPrismaMock } = await import('./helpers/prismaMock.js');
  return { default: crearPrismaMock() };
});

import prisma from '../src/config/prisma.js';
import {
  obtenerHistorialClinico,
  crearRegistroClinico,
  actualizarRegistroClinico,
} from '../src/services/registroClinico.service.js';
import { listarVeterinarios } from '../src/services/cuenta.service.js';

const registro = {
  fecha: new Date('2026-11-01'),
  tipo: 'CONSULTA',
  descripcion: 'Control general',
  veterinarioId: 8,
};

async function errorDe(promesa) {
  try {
    await promesa;
  } catch (error) {
    return { status: error.status, message: error.message };
  }
  throw new Error('Se esperaba un error y no ocurrió');
}

describe('Ver historial clínico', () => {
  it('responde 404 si el animal no existe', async () => {
    prisma.animal.findUnique.mockResolvedValue(null);
    expect(await errorDe(obtenerHistorialClinico(99))).toEqual({ status: 404, message: 'Animal no encontrado' });
  });

  it('incluye el veterinario de cada registro, solo con su nombre y apellido', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 1, registrosClinicos: [] });
    await obtenerHistorialClinico(1);

    const consulta = prisma.animal.findUnique.mock.calls[0][0];
    expect(consulta.include.registrosClinicos.include.veterinario).toEqual({
      select: { id: true, nombre: true, apellido: true },
    });
  });
});

describe('Crear registro clínico', () => {
  it('responde 404 si el animal no existe', async () => {
    prisma.animal.findUnique.mockResolvedValue(null);
    expect(await errorDe(crearRegistroClinico(99, registro))).toEqual({ status: 404, message: 'Animal no encontrado' });
  });

  it('el veterinario debe ser una cuenta de tipo VETERINARIO', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 1 });
    prisma.cuenta.findUnique.mockResolvedValue({ tipo: 'VOLUNTARIO' });
    expect(await errorDe(crearRegistroClinico(1, registro))).toEqual({
      status: 400,
      message: 'El veterinario seleccionado no trabaja en el refugio',
    });
    expect(prisma.registroClinico.create).not.toHaveBeenCalled();
  });

  it('rechaza un veterinario que no existe', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 1 });
    prisma.cuenta.findUnique.mockResolvedValue(null);
    expect((await errorDe(crearRegistroClinico(1, registro))).status).toBe(400);
  });

  it('guarda el registro del animal con su veterinario', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 1 });
    prisma.cuenta.findUnique.mockResolvedValue({ tipo: 'VETERINARIO' });
    prisma.registroClinico.create.mockResolvedValue({ id: 50, ...registro, animalId: 1 });

    const creado = await crearRegistroClinico(1, registro);

    expect(creado.id).toBe(50);
    expect(prisma.registroClinico.create.mock.calls[0][0].data).toEqual({ ...registro, animalId: 1 });
  });
});

describe('Actualizar registro clínico', () => {
  it('no se puede editar un registro de otro animal cambiando la URL', async () => {
    prisma.registroClinico.findFirst.mockResolvedValue(null);
    expect(await errorDe(actualizarRegistroClinico(1, 77, { descripcion: 'Cambio' }))).toEqual({
      status: 404,
      message: 'Registro clínico no encontrado',
    });
  });

  it('si el veterinario no cambia, no se vuelve a validar (aunque ya no trabaje en el refugio)', async () => {
    prisma.registroClinico.findFirst.mockResolvedValue({ id: 77, veterinarioId: 8 });
    prisma.registroClinico.update.mockResolvedValue({ id: 77 });

    await actualizarRegistroClinico(1, 77, { descripcion: 'Cambio', veterinarioId: 8 });

    expect(prisma.cuenta.findUnique).not.toHaveBeenCalled();
    expect(prisma.registroClinico.update).toHaveBeenCalledOnce();
  });

  it('al cambiar a otro veterinario, el nuevo debe trabajar en el refugio', async () => {
    prisma.registroClinico.findFirst.mockResolvedValue({ id: 77, veterinarioId: 8 });
    prisma.cuenta.findUnique.mockResolvedValue({ tipo: 'ENCARGADO_ADOPCIONES' });

    expect((await errorDe(actualizarRegistroClinico(1, 77, { veterinarioId: 5 }))).status).toBe(400);
    expect(prisma.registroClinico.update).not.toHaveBeenCalled();
  });
});

describe('Lista de veterinarios del refugio', () => {
  it('solo trae cuentas de tipo VETERINARIO y sin datos privados', async () => {
    prisma.cuenta.findMany.mockResolvedValue([{ id: 8, nombre: 'Jorge', apellido: 'Palacio' }]);
    await listarVeterinarios();

    const consulta = prisma.cuenta.findMany.mock.calls[0][0];
    expect(consulta.where).toEqual({ tipo: 'VETERINARIO' });
    expect(consulta.select).toEqual({ id: true, nombre: true, apellido: true });
  });
});
