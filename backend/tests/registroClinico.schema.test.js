import { describe, it, expect } from 'vitest';
import {
  registroClinicoSchema,
  updateRegistroClinicoSchema,
} from '../src/schema/registroClinico.schema.js';

const registroValido = {
  fecha: '2026-11-01',
  tipo: 'CONSULTA',
  descripcion: 'Control general',
  diagnostico: 'Sano',
  tratamiento: 'Ninguno',
  veterinarioId: 8,
  observaciones: 'Sin observaciones',
};

const errores = (resultado) => resultado.error?.issues.map((issue) => issue.message) ?? [];

describe('Registro clínico (registroClinicoSchema)', () => {
  // Test 1: Validación de un registro clínico completo y correcto
  it('acepta un registro válido', () => {
    // Comprueba que la validación acepta los datos
    expect(registroClinicoSchema.safeParse(registroValido).success).toBe(true);
  });

  // Test 2: Rechazo de un registro con fecha futura
  it('no acepta una fecha futura', () => {
    const resultado = registroClinicoSchema.safeParse({ ...registroValido, fecha: '2999-01-01' });
    // Comprueba que se entrega el mensaje de error esperado
    expect(errores(resultado)).toContain('La fecha no puede ser futura');
  });

  // Test 3: Rechazo de tipos de registro que no existen
  it('solo acepta los tipos de registro definidos', () => {
    // Comprueba que la validación rechaza los datos
    expect(registroClinicoSchema.safeParse({ ...registroValido, tipo: 'MASAJE' }).success).toBe(false);
  });

  describe('veterinario responsable', () => {
    // Test 4: Obligatoriedad del veterinario responsable
    it('es obligatorio', () => {
      const { veterinarioId, ...sinVeterinario } = registroValido;
      // Comprueba que se entrega el mensaje de error esperado
      expect(errores(registroClinicoSchema.safeParse(sinVeterinario))).toContain(
        'Debe seleccionar el veterinario responsable'
      );
    });

    // Test 5: Rechazo de los veterinarios de ejemplo del enum antiguo
    it('ya no acepta los veterinarios de ejemplo del enum antiguo', () => {
      // Comprueba que la validación rechaza los datos
      expect(registroClinicoSchema.safeParse({ ...registroValido, veterinarioId: 'JAMES_HERRIOT' }).success).toBe(false);
    });
  });

  describe('límites de caracteres', () => {
    // Test 6: Validación del máximo de caracteres de cada campo
    it.each([
      ['descripcion', 200, 'La descripción no puede superar los 200 caracteres'],
      ['diagnostico', 100, 'El diagnóstico no puede superar los 100 caracteres'],
      ['tratamiento', 150, 'El tratamiento no puede superar los 150 caracteres'],
      ['observaciones', 200, 'Las observaciones no puede superar los 200 caracteres'],
    ])('%s acepta hasta %i caracteres', (campo, maximo, mensaje) => {
      // Comprueba que la validación acepta los datos
      expect(registroClinicoSchema.safeParse({ ...registroValido, [campo]: 'x'.repeat(maximo) }).success).toBe(true);
      const resultado = registroClinicoSchema.safeParse({ ...registroValido, [campo]: 'x'.repeat(maximo + 1) });
      // Comprueba que se entrega el mensaje de error esperado
      expect(errores(resultado)).toContain(mensaje);
    });

    // Test 7: Rechazo de una descripción con menos de 3 caracteres
    it('la descripción debe tener al menos 3 caracteres', () => {
      const resultado = registroClinicoSchema.safeParse({ ...registroValido, descripcion: 'ab' });
      // Comprueba que se entrega el mensaje de error esperado
      expect(errores(resultado)).toContain('La descripción debe tener al menos 3 caracteres');
    });
  });

  // Test 8: Conversión de un campo opcional vacío a null
  it('un campo opcional vacío se guarda como null', () => {
    const datos = registroClinicoSchema.parse({ ...registroValido, diagnostico: '   ' });
    // Comprueba que el texto vacío se convierte en null
    expect(datos.diagnostico).toBeNull();
  });
});

describe('Actualización del registro (updateRegistroClinicoSchema)', () => {
  // Test 9: Actualización enviando solo los campos que cambian
  it('permite enviar solo los campos que cambian', () => {
    // Comprueba que la validación acepta los datos
    expect(updateRegistroClinicoSchema.safeParse({ descripcion: 'Nueva descripción' }).success).toBe(true);
  });

  // Test 10: Bloqueo de una actualización sin campos
  it('exige al menos un campo', () => {
    // Comprueba que se entrega el mensaje de error esperado
    expect(errores(updateRegistroClinicoSchema.safeParse({}))).toContain('Debes enviar al menos un campo');
  });
});
