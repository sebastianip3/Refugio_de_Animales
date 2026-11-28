import { describe, it, expect } from 'vitest';
import {
  adopcionSchema,
  updateAdopcionSchema,
  visitaSchema,
  resultadoVisitaSchema,
  consultaSolicitudSchema,
  rutSchema,
  telefonoSchema,
} from '../src/schema/adopcion.schema.js';

// Solicitud válida; cada prueba cambia solo el campo que quiere probar
const solicitudValida = {
  animalId: 1,
  nombre: 'María José Núñez',
  rut: '12.345.678-5',
  email: 'maria@correo.cl',
  telefono: '9 1234 5678',
  direccion: 'Los Aromos 123',
  comuna: 'CONCEPCION',
  tipoVivienda: 'CASA_CON_PATIO',
  otrasMascotas: 'Un gato',
  motivo: 'Quiero darle un hogar',
};

// Mensajes de error de un resultado de Zod
const errores = (resultado) => resultado.error?.issues.map((issue) => issue.message) ?? [];

describe('Solicitud de adopción (adopcionSchema)', () => {
  // Test 1: Validación de una solicitud de adopción completa y correcta
  it('acepta una solicitud válida', () => {
    // Comprueba que la validación acepta los datos
    expect(adopcionSchema.safeParse(solicitudValida).success).toBe(true);
  });

  describe('nombre completo', () => {
    // Test 2: Aceptación de nombres con tildes, ñ y apóstrofo
    it.each(['Ana', 'María José Núñez', "O'Higgins", 'D’Angelo Rossi'])('acepta "%s"', (nombre) => {
      // Comprueba que la validación acepta los datos
      expect(adopcionSchema.safeParse({ ...solicitudValida, nombre }).success).toBe(true);
    });

    // Test 3: Rechazo de nombres con menos de 3 caracteres
    it('exige al menos 3 caracteres', () => {
      const resultado = adopcionSchema.safeParse({ ...solicitudValida, nombre: 'Al' });
      // Comprueba que se entrega el mensaje de error esperado
      expect(errores(resultado)).toContain('El nombre debe tener al menos 3 caracteres');
    });

    // Test 4: Rechazo de nombres con más de 57 caracteres
    it('no permite más de 57 caracteres', () => {
      const resultado = adopcionSchema.safeParse({ ...solicitudValida, nombre: 'a'.repeat(58) });
      // Comprueba que se entrega el mensaje de error esperado
      expect(errores(resultado)).toContain('El nombre no puede superar los 57 caracteres');
    });

    // Test 5: Rechazo de nombres con números o caracteres especiales
    it.each(['Juan Pérez2', 'Ana@Soto', 'Juan_Pérez', 'Ana-María'])('rechaza números y caracteres especiales: "%s"', (nombre) => {
      // Comprueba que la validación rechaza los datos
      expect(adopcionSchema.safeParse({ ...solicitudValida, nombre }).success).toBe(false);
    });

    // Test 6: Rechazo del apóstrofo cuando no está entre dos letras
    it.each(["'Ana Soto", "Ana 'Soto", "Ana Soto'", "O''Higgins", "O' Higgins"])(
      'rechaza un apóstrofo que no está entre dos letras: "%s"',
      (nombre) => {
        const resultado = adopcionSchema.safeParse({ ...solicitudValida, nombre });
        // Comprueba que se entrega el mensaje de error esperado
        expect(errores(resultado)).toContain("El apóstrofo (') debe ir entre dos letras, por ejemplo O'Higgins");
      }
    );
  });

  describe('RUT', () => {
    // Test 7: Normalización del RUT con y sin puntos, guion o K minúscula
    it('normaliza el RUT con o sin puntos y guion', () => {
      // Comprueba cómo quedan los datos después de validarlos
      expect(rutSchema.parse('12.345.678-5')).toBe('12345678-5');
      expect(rutSchema.parse('123456785')).toBe('12345678-5');
      // RUT con dígito verificador K (en minúscula se pasa a mayúscula)
      expect(rutSchema.parse('7.654.333-k')).toBe('7654333-K');
    });

    // Test 8: Rechazo de un RUT con dígito verificador incorrecto
    it('rechaza un dígito verificador incorrecto', () => {
      // Comprueba que se entrega el mensaje de error esperado
      expect(errores(rutSchema.safeParse('12.345.678-9'))).toContain('Dígito verificador del RUT inválido');
    });

    // Test 9: Rechazo de RUT de prueba con todos los dígitos iguales
    it('rechaza RUT de prueba con todos los dígitos iguales', () => {
      // Comprueba que la validación rechaza los datos
      expect(rutSchema.safeParse('11.111.111-1').success).toBe(false);
    });

    // Test 10: Rechazo de un RUT con más de 12 caracteres
    it('no acepta más de 12 caracteres', () => {
      // Comprueba que se entrega el mensaje de error esperado
      expect(errores(rutSchema.safeParse('12.345.678-55'))).toContain('El RUT no puede superar los 12 caracteres');
    });
  });

  describe('teléfono', () => {
    // Test 11: Aceptación de un celular que empieza con 9 y guardado con +56
    it('acepta un celular que empieza con 9 y lo guarda con +56', () => {
      // Comprueba cómo quedan los datos después de validarlos
      expect(telefonoSchema.parse('9 1234 5678')).toBe('+56912345678');
      expect(telefonoSchema.parse('+56912345678')).toBe('+56912345678');
    });

    // Test 12: Rechazo de teléfonos fijos, incompletos o demasiado largos
    it.each(['2 1234 5678', '9 1234 567', '91234567890'])('rechaza "%s"', (telefono) => {
      // Comprueba que la validación rechaza los datos
      expect(telefonoSchema.safeParse(telefono).success).toBe(false);
    });
  });

  describe('límites de caracteres', () => {
    // Test 13: Validación del largo de la dirección (5 a 100 caracteres)
    it('la dirección debe tener entre 5 y 100 caracteres', () => {
      // Comprueba que la validación rechaza los datos
      expect(adopcionSchema.safeParse({ ...solicitudValida, direccion: 'Cal' }).success).toBe(false);
      // Comprueba que la validación acepta los datos
      expect(adopcionSchema.safeParse({ ...solicitudValida, direccion: 'x'.repeat(100) }).success).toBe(true);
      // Comprueba que la validación rechaza los datos
      expect(adopcionSchema.safeParse({ ...solicitudValida, direccion: 'x'.repeat(101) }).success).toBe(false);
    });

    // Test 14: Validación del máximo de caracteres de otras mascotas (200)
    it('otras mascotas tiene un máximo de 200 caracteres', () => {
      // Comprueba que la validación acepta los datos
      expect(adopcionSchema.safeParse({ ...solicitudValida, otrasMascotas: 'x'.repeat(200) }).success).toBe(true);
      // Comprueba que la validación rechaza los datos
      expect(adopcionSchema.safeParse({ ...solicitudValida, otrasMascotas: 'x'.repeat(201) }).success).toBe(false);
    });

    // Test 15: Validación del máximo de caracteres del motivo de adopción (300)
    it('el motivo tiene un máximo de 300 caracteres', () => {
      // Comprueba que la validación acepta los datos
      expect(adopcionSchema.safeParse({ ...solicitudValida, motivo: 'x'.repeat(300) }).success).toBe(true);
      // Comprueba que la validación rechaza los datos
      expect(adopcionSchema.safeParse({ ...solicitudValida, motivo: 'x'.repeat(301) }).success).toBe(false);
    });
  });

  // Test 16: Rechazo de comunas fuera de la lista permitida
  it('solo acepta las comunas permitidas', () => {
    // Comprueba que la validación rechaza los datos
    expect(adopcionSchema.safeParse({ ...solicitudValida, comuna: 'SANTIAGO' }).success).toBe(false);
  });

  // Test 17: Rechazo de tipos de vivienda fuera de la lista permitida
  it('solo acepta los tipos de vivienda permitidos', () => {
    // Comprueba que la validación rechaza los datos
    expect(adopcionSchema.safeParse({ ...solicitudValida, tipoVivienda: 'CASTILLO' }).success).toBe(false);
  });
});

describe('Evaluación de la solicitud (updateAdopcionSchema)', () => {
  // Test 18: Bloqueo del rechazo de una solicitud sin motivo
  it('al rechazar exige el motivo', () => {
    const resultado = updateAdopcionSchema.safeParse({ estado: 'RECHAZADA' });
    // Comprueba que se entrega el mensaje de error esperado
    expect(errores(resultado)).toContain('Debe indicar el motivo del rechazo');
  });

  // Test 19: Validación del mínimo de 4 caracteres en el motivo del rechazo
  it('el motivo del rechazo debe tener al menos 4 caracteres', () => {
    const resultado = updateAdopcionSchema.safeParse({ estado: 'RECHAZADA', observaciones: 'abc' });
    // Comprueba que se entrega el mensaje de error esperado
    expect(errores(resultado)).toContain('El motivo del rechazo debe tener al menos 4 caracteres');
  });

  // Test 20: Aceptación de un rechazo con motivo válido
  it('acepta un rechazo con motivo válido', () => {
    // Comprueba que la validación acepta los datos
    expect(updateAdopcionSchema.safeParse({ estado: 'RECHAZADA', observaciones: 'Vivienda sin espacio' }).success).toBe(true);
  });

  // Test 21: Aprobación sin observaciones obligatorias
  it('al aprobar las observaciones son opcionales', () => {
    // Comprueba que la validación acepta los datos
    expect(updateAdopcionSchema.safeParse({ estado: 'APROBADA' }).success).toBe(true);
  });

  // Test 22: Validación del máximo de 300 caracteres en las observaciones
  it('las observaciones no pueden superar los 300 caracteres', () => {
    const resultado = updateAdopcionSchema.safeParse({ estado: 'APROBADA', observaciones: 'x'.repeat(301) });
    // Comprueba que se entrega el mensaje de error esperado
    expect(errores(resultado)).toContain('Las observaciones no pueden superar los 300 caracteres');
  });

  // Test 23: Rechazo del estado CANCELADA, que ya no existe
  it('ya no existe el estado CANCELADA', () => {
    // Comprueba que la validación rechaza los datos
    expect(updateAdopcionSchema.safeParse({ estado: 'CANCELADA' }).success).toBe(false);
  });
});

describe('Visita de seguimiento (visitaSchema)', () => {
  // Una fecha que siempre es futura, para que la prueba no dependa del día en que se ejecute
  const fechaFutura = `${new Date().getFullYear() + 1}-01-15`;

  // Test 24: Aceptación de los horarios fijos de visita (10:00, 12:00 y 15:00)
  it('acepta los horarios fijos', () => {
    for (const hora of ['10:00', '12:00', '15:00']) {
      // Comprueba que la validación acepta los datos
      expect(visitaSchema.safeParse({ fecha: fechaFutura, hora }).success).toBe(true);
    }
  });

  // Test 25: Rechazo de una hora de visita fuera de los horarios fijos
  it('rechaza una hora fuera de los horarios fijos', () => {
    // Comprueba que la validación rechaza los datos
    expect(visitaSchema.safeParse({ fecha: fechaFutura, hora: '11:00' }).success).toBe(false);
  });

  // Test 26: Rechazo de una fecha de visita anterior a hoy
  it('rechaza una fecha anterior a hoy', () => {
    const resultado = visitaSchema.safeParse({ fecha: '2020-01-01', hora: '10:00' });
    // Comprueba que se entrega el mensaje de error esperado
    expect(errores(resultado)).toContain('La fecha de la visita no puede ser anterior a hoy');
  });
});

describe('Resultado de la visita (resultadoVisitaSchema)', () => {
  // Test 27: Obligatoriedad del estado en que se encontró al animal
  it('exige cómo se encontró al animal', () => {
    // Comprueba que la validación rechaza los datos
    expect(resultadoVisitaSchema.safeParse({ observaciones: 'Todo bien' }).success).toBe(false);
  });

  // Test 28: Validación del largo de las observaciones de la visita (3 a 300)
  it('las observaciones tienen entre 3 y 300 caracteres', () => {
    // Comprueba que la validación rechaza los datos
    expect(resultadoVisitaSchema.safeParse({ estadoAnimal: 'BIEN', observaciones: 'ok' }).success).toBe(false);
    // Comprueba que la validación acepta los datos
    expect(resultadoVisitaSchema.safeParse({ estadoAnimal: 'BIEN', observaciones: 'x'.repeat(300) }).success).toBe(true);
    // Comprueba que la validación rechaza los datos
    expect(resultadoVisitaSchema.safeParse({ estadoAnimal: 'BIEN', observaciones: 'x'.repeat(301) }).success).toBe(false);
  });
});

describe('Consulta del estado de la solicitud (consultaSolicitudSchema)', () => {
  // Test 29: Normalización del RUT y del correo en la consulta de estado
  it('normaliza el RUT y el correo', () => {
    // Comprueba cómo quedan los datos después de validarlos
    expect(consultaSolicitudSchema.parse({ rut: '12.345.678-5', email: ' Maria@Correo.CL ' })).toEqual({
      rut: '12345678-5',
      email: 'maria@correo.cl',
    });
  });

  // Test 30: Rechazo de una consulta con RUT o correo inválidos
  it('exige RUT y correo válidos', () => {
    // Comprueba que la validación rechaza los datos
    expect(consultaSolicitudSchema.safeParse({ rut: '1', email: 'no-es-correo' }).success).toBe(false);
  });
});
