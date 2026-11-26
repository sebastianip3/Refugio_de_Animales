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
  it('acepta una solicitud válida', () => {
    expect(adopcionSchema.safeParse(solicitudValida).success).toBe(true);
  });

  describe('nombre completo', () => {
    it.each(['Ana', 'María José Núñez', "O'Higgins", 'D’Angelo Rossi'])('acepta "%s"', (nombre) => {
      expect(adopcionSchema.safeParse({ ...solicitudValida, nombre }).success).toBe(true);
    });

    it('exige al menos 3 caracteres', () => {
      const resultado = adopcionSchema.safeParse({ ...solicitudValida, nombre: 'Al' });
      expect(errores(resultado)).toContain('El nombre debe tener al menos 3 caracteres');
    });

    it('no permite más de 57 caracteres', () => {
      const resultado = adopcionSchema.safeParse({ ...solicitudValida, nombre: 'a'.repeat(58) });
      expect(errores(resultado)).toContain('El nombre no puede superar los 57 caracteres');
    });

    it.each(['Juan Pérez2', 'Ana@Soto', 'Juan_Pérez', 'Ana-María'])('rechaza números y caracteres especiales: "%s"', (nombre) => {
      expect(adopcionSchema.safeParse({ ...solicitudValida, nombre }).success).toBe(false);
    });

    it.each(["'Ana Soto", "Ana 'Soto", "Ana Soto'", "O''Higgins", "O' Higgins"])(
      'rechaza un apóstrofo que no está entre dos letras: "%s"',
      (nombre) => {
        const resultado = adopcionSchema.safeParse({ ...solicitudValida, nombre });
        expect(errores(resultado)).toContain("El apóstrofo (') debe ir entre dos letras, por ejemplo O'Higgins");
      }
    );
  });

  describe('RUT', () => {
    it('normaliza el RUT con o sin puntos y guion', () => {
      expect(rutSchema.parse('12.345.678-5')).toBe('12345678-5');
      expect(rutSchema.parse('123456785')).toBe('12345678-5');
      // RUT con dígito verificador K (en minúscula se pasa a mayúscula)
      expect(rutSchema.parse('7.654.333-k')).toBe('7654333-K');
    });

    it('rechaza un dígito verificador incorrecto', () => {
      expect(errores(rutSchema.safeParse('12.345.678-9'))).toContain('Dígito verificador del RUT inválido');
    });

    it('rechaza RUT de prueba con todos los dígitos iguales', () => {
      expect(rutSchema.safeParse('11.111.111-1').success).toBe(false);
    });

    it('no acepta más de 12 caracteres', () => {
      expect(errores(rutSchema.safeParse('12.345.678-55'))).toContain('El RUT no puede superar los 12 caracteres');
    });
  });

  describe('teléfono', () => {
    it('acepta un celular que empieza con 9 y lo guarda con +56', () => {
      expect(telefonoSchema.parse('9 1234 5678')).toBe('+56912345678');
      expect(telefonoSchema.parse('+56912345678')).toBe('+56912345678');
    });

    it.each(['2 1234 5678', '9 1234 567', '91234567890'])('rechaza "%s"', (telefono) => {
      expect(telefonoSchema.safeParse(telefono).success).toBe(false);
    });
  });

  describe('límites de caracteres', () => {
    it('la dirección debe tener entre 5 y 100 caracteres', () => {
      expect(adopcionSchema.safeParse({ ...solicitudValida, direccion: 'Cal' }).success).toBe(false);
      expect(adopcionSchema.safeParse({ ...solicitudValida, direccion: 'x'.repeat(100) }).success).toBe(true);
      expect(adopcionSchema.safeParse({ ...solicitudValida, direccion: 'x'.repeat(101) }).success).toBe(false);
    });

    it('otras mascotas tiene un máximo de 200 caracteres', () => {
      expect(adopcionSchema.safeParse({ ...solicitudValida, otrasMascotas: 'x'.repeat(200) }).success).toBe(true);
      expect(adopcionSchema.safeParse({ ...solicitudValida, otrasMascotas: 'x'.repeat(201) }).success).toBe(false);
    });

    it('el motivo tiene un máximo de 300 caracteres', () => {
      expect(adopcionSchema.safeParse({ ...solicitudValida, motivo: 'x'.repeat(300) }).success).toBe(true);
      expect(adopcionSchema.safeParse({ ...solicitudValida, motivo: 'x'.repeat(301) }).success).toBe(false);
    });
  });

  it('solo acepta las comunas permitidas', () => {
    expect(adopcionSchema.safeParse({ ...solicitudValida, comuna: 'SANTIAGO' }).success).toBe(false);
  });

  it('solo acepta los tipos de vivienda permitidos', () => {
    expect(adopcionSchema.safeParse({ ...solicitudValida, tipoVivienda: 'CASTILLO' }).success).toBe(false);
  });
});

describe('Evaluación de la solicitud (updateAdopcionSchema)', () => {
  it('al rechazar exige el motivo', () => {
    const resultado = updateAdopcionSchema.safeParse({ estado: 'RECHAZADA' });
    expect(errores(resultado)).toContain('Debe indicar el motivo del rechazo');
  });

  it('el motivo del rechazo debe tener al menos 4 caracteres', () => {
    const resultado = updateAdopcionSchema.safeParse({ estado: 'RECHAZADA', observaciones: 'abc' });
    expect(errores(resultado)).toContain('El motivo del rechazo debe tener al menos 4 caracteres');
  });

  it('acepta un rechazo con motivo válido', () => {
    expect(updateAdopcionSchema.safeParse({ estado: 'RECHAZADA', observaciones: 'Vivienda sin espacio' }).success).toBe(true);
  });

  it('al aprobar las observaciones son opcionales', () => {
    expect(updateAdopcionSchema.safeParse({ estado: 'APROBADA' }).success).toBe(true);
  });

  it('las observaciones no pueden superar los 300 caracteres', () => {
    const resultado = updateAdopcionSchema.safeParse({ estado: 'APROBADA', observaciones: 'x'.repeat(301) });
    expect(errores(resultado)).toContain('Las observaciones no pueden superar los 300 caracteres');
  });

  it('ya no existe el estado CANCELADA', () => {
    expect(updateAdopcionSchema.safeParse({ estado: 'CANCELADA' }).success).toBe(false);
  });
});

describe('Visita de seguimiento (visitaSchema)', () => {
  // Una fecha que siempre es futura, para que la prueba no dependa del día en que se ejecute
  const fechaFutura = `${new Date().getFullYear() + 1}-01-15`;

  it('acepta los horarios fijos', () => {
    for (const hora of ['10:00', '12:00', '15:00']) {
      expect(visitaSchema.safeParse({ fecha: fechaFutura, hora }).success).toBe(true);
    }
  });

  it('rechaza una hora fuera de los horarios fijos', () => {
    expect(visitaSchema.safeParse({ fecha: fechaFutura, hora: '11:00' }).success).toBe(false);
  });

  it('rechaza una fecha anterior a hoy', () => {
    const resultado = visitaSchema.safeParse({ fecha: '2020-01-01', hora: '10:00' });
    expect(errores(resultado)).toContain('La fecha de la visita no puede ser anterior a hoy');
  });
});

describe('Resultado de la visita (resultadoVisitaSchema)', () => {
  it('exige cómo se encontró al animal', () => {
    expect(resultadoVisitaSchema.safeParse({ observaciones: 'Todo bien' }).success).toBe(false);
  });

  it('las observaciones tienen entre 3 y 300 caracteres', () => {
    expect(resultadoVisitaSchema.safeParse({ estadoAnimal: 'BIEN', observaciones: 'ok' }).success).toBe(false);
    expect(resultadoVisitaSchema.safeParse({ estadoAnimal: 'BIEN', observaciones: 'x'.repeat(300) }).success).toBe(true);
    expect(resultadoVisitaSchema.safeParse({ estadoAnimal: 'BIEN', observaciones: 'x'.repeat(301) }).success).toBe(false);
  });
});

describe('Consulta del estado de la solicitud (consultaSolicitudSchema)', () => {
  it('normaliza el RUT y el correo', () => {
    expect(consultaSolicitudSchema.parse({ rut: '12.345.678-5', email: ' Maria@Correo.CL ' })).toEqual({
      rut: '12345678-5',
      email: 'maria@correo.cl',
    });
  });

  it('exige RUT y correo válidos', () => {
    expect(consultaSolicitudSchema.safeParse({ rut: '1', email: 'no-es-correo' }).success).toBe(false);
  });
});
