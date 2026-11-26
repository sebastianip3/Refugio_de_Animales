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
  it('acepta un registro válido', () => {
    expect(registroClinicoSchema.safeParse(registroValido).success).toBe(true);
  });

  it('no acepta una fecha futura', () => {
    const resultado = registroClinicoSchema.safeParse({ ...registroValido, fecha: '2999-01-01' });
    expect(errores(resultado)).toContain('La fecha no puede ser futura');
  });

  it('solo acepta los tipos de registro definidos', () => {
    expect(registroClinicoSchema.safeParse({ ...registroValido, tipo: 'MASAJE' }).success).toBe(false);
  });

  describe('veterinario responsable', () => {
    it('es obligatorio', () => {
      const { veterinarioId, ...sinVeterinario } = registroValido;
      expect(errores(registroClinicoSchema.safeParse(sinVeterinario))).toContain(
        'Debe seleccionar el veterinario responsable'
      );
    });

    it('ya no acepta los veterinarios de ejemplo del enum antiguo', () => {
      expect(registroClinicoSchema.safeParse({ ...registroValido, veterinarioId: 'JAMES_HERRIOT' }).success).toBe(false);
    });
  });

  describe('límites de caracteres', () => {
    it.each([
      ['descripcion', 200, 'La descripción no puede superar los 200 caracteres'],
      ['diagnostico', 100, 'El diagnóstico no puede superar los 100 caracteres'],
      ['tratamiento', 150, 'El tratamiento no puede superar los 150 caracteres'],
      ['observaciones', 200, 'Las observaciones no puede superar los 200 caracteres'],
    ])('%s acepta hasta %i caracteres', (campo, maximo, mensaje) => {
      expect(registroClinicoSchema.safeParse({ ...registroValido, [campo]: 'x'.repeat(maximo) }).success).toBe(true);
      const resultado = registroClinicoSchema.safeParse({ ...registroValido, [campo]: 'x'.repeat(maximo + 1) });
      expect(errores(resultado)).toContain(mensaje);
    });

    it('la descripción debe tener al menos 3 caracteres', () => {
      const resultado = registroClinicoSchema.safeParse({ ...registroValido, descripcion: 'ab' });
      expect(errores(resultado)).toContain('La descripción debe tener al menos 3 caracteres');
    });
  });

  it('un campo opcional vacío se guarda como null', () => {
    const datos = registroClinicoSchema.parse({ ...registroValido, diagnostico: '   ' });
    expect(datos.diagnostico).toBeNull();
  });
});

describe('Actualización del registro (updateRegistroClinicoSchema)', () => {
  it('permite enviar solo los campos que cambian', () => {
    expect(updateRegistroClinicoSchema.safeParse({ descripcion: 'Nueva descripción' }).success).toBe(true);
  });

  it('exige al menos un campo', () => {
    expect(errores(updateRegistroClinicoSchema.safeParse({}))).toContain('Debes enviar al menos un campo');
  });
});
