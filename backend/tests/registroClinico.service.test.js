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
  // Test 1: Error 404 al ver el historial de un animal que no existe
  it('responde 404 si el animal no existe', async () => {
    prisma.animal.findUnique.mockResolvedValue(null);
    // Comprueba que el servicio responde con el código y mensaje de error esperados
    expect(await errorDe(obtenerHistorialClinico(99))).toEqual({ status: 404, message: 'Animal no encontrado' });
  });

  // Test 2: Inclusión del veterinario de cada registro sin datos privados
  it('incluye el veterinario de cada registro, solo con su nombre y apellido', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 1, registrosClinicos: [] });
    await obtenerHistorialClinico(1);

    const consulta = prisma.animal.findUnique.mock.calls[0][0];
    // Comprueba que del veterinario solo se piden el id, nombre y apellido
    expect(consulta.include.registrosClinicos.include.veterinario).toEqual({
      select: { id: true, nombre: true, apellido: true },
    });
  });
});

describe('Crear registro clínico', () => {
  // Test 3: Error 404 al crear un registro para un animal que no existe
  it('responde 404 si el animal no existe', async () => {
    prisma.animal.findUnique.mockResolvedValue(null);
    // Comprueba que el servicio responde con el código y mensaje de error esperados
    expect(await errorDe(crearRegistroClinico(99, registro))).toEqual({ status: 404, message: 'Animal no encontrado' });
  });

  // Test 4: Bloqueo de registros con un responsable que no es veterinario
  it('el veterinario debe ser una cuenta de tipo VETERINARIO', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 1 });
    prisma.cuenta.findUnique.mockResolvedValue({ tipo: 'VOLUNTARIO' });
    // Comprueba que el servicio responde con el código y mensaje de error esperados
    expect(await errorDe(crearRegistroClinico(1, registro))).toEqual({
      status: 400,
      message: 'El veterinario seleccionado no trabaja en el refugio',
    });
    // Comprueba que no se modificó la base de datos (prisma.registroClinico.create)
    expect(prisma.registroClinico.create).not.toHaveBeenCalled();
  });

  // Test 5: Bloqueo de registros con un veterinario que no existe
  it('rechaza un veterinario que no existe', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 1 });
    prisma.cuenta.findUnique.mockResolvedValue(null);
    // Comprueba que el servicio responde con el código y mensaje de error esperados
    expect((await errorDe(crearRegistroClinico(1, registro))).status).toBe(400);
  });

  // Test 6: Creación del registro clínico con su veterinario
  it('guarda el registro del animal con su veterinario', async () => {
    prisma.animal.findUnique.mockResolvedValue({ id: 1 });
    prisma.cuenta.findUnique.mockResolvedValue({ tipo: 'VETERINARIO' });
    prisma.registroClinico.create.mockResolvedValue({ id: 50, ...registro, animalId: 1 });

    const creado = await crearRegistroClinico(1, registro);

    // Comprueba que el registro se creó
    expect(creado.id).toBe(50);
    // Comprueba la consulta que se hizo a la base de datos
    expect(prisma.registroClinico.create.mock.calls[0][0].data).toEqual({ ...registro, animalId: 1 });
  });
});

describe('Actualizar registro clínico', () => {
  // Test 7: Bloqueo de la edición de un registro de otro animal
  it('no se puede editar un registro de otro animal cambiando la URL', async () => {
    prisma.registroClinico.findFirst.mockResolvedValue(null);
    // Comprueba que el servicio responde con el código y mensaje de error esperados
    expect(await errorDe(actualizarRegistroClinico(1, 77, { descripcion: 'Cambio' }))).toEqual({
      status: 404,
      message: 'Registro clínico no encontrado',
    });
  });

  // Test 8: Edición sin volver a validar al mismo veterinario
  it('si el veterinario no cambia, no se vuelve a validar (aunque ya no trabaje en el refugio)', async () => {
    prisma.registroClinico.findFirst.mockResolvedValue({ id: 77, veterinarioId: 8 });
    prisma.registroClinico.update.mockResolvedValue({ id: 77 });

    await actualizarRegistroClinico(1, 77, { descripcion: 'Cambio', veterinarioId: 8 });

    // Comprueba que no se modificó la base de datos (prisma.cuenta.findUnique)
    expect(prisma.cuenta.findUnique).not.toHaveBeenCalled();
    // Comprueba que se guardaron los datos esperados en la base de datos (prisma.registroClinico.update)
    expect(prisma.registroClinico.update).toHaveBeenCalledOnce();
  });

  // Test 9: Validación del nuevo veterinario al cambiarlo en un registro
  it('al cambiar a otro veterinario, el nuevo debe trabajar en el refugio', async () => {
    prisma.registroClinico.findFirst.mockResolvedValue({ id: 77, veterinarioId: 8 });
    prisma.cuenta.findUnique.mockResolvedValue({ tipo: 'ENCARGADO_ADOPCIONES' });

    // Comprueba que el servicio responde con el código y mensaje de error esperados
    expect((await errorDe(actualizarRegistroClinico(1, 77, { veterinarioId: 5 }))).status).toBe(400);
    // Comprueba que no se modificó la base de datos (prisma.registroClinico.update)
    expect(prisma.registroClinico.update).not.toHaveBeenCalled();
  });
});

describe('Lista de veterinarios del refugio', () => {
  // Test 10: Lista de veterinarios del refugio sin datos privados
  it('solo trae cuentas de tipo VETERINARIO y sin datos privados', async () => {
    prisma.cuenta.findMany.mockResolvedValue([{ id: 8, nombre: 'Jorge', apellido: 'Palacio' }]);
    await listarVeterinarios();

    const consulta = prisma.cuenta.findMany.mock.calls[0][0];
    // Comprueba que solo se buscan cuentas de tipo VETERINARIO y sin datos privados
    expect(consulta.where).toEqual({ tipo: 'VETERINARIO' });
    expect(consulta.select).toEqual({ id: true, nombre: true, apellido: true });
  });
});
