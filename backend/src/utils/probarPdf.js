import { writeFile } from 'node:fs/promises';
import { generarComprobantePdf } from './comprobantePdf.js';

const inscripcion = {
  codigoComprobante: 'COMP-001',
  createdAt: new Date(),

  tutorNombre: 'benja',
  tutorApellido: 'bj',
  tutorRut: '21.999.676-7',
  tutorEmail: 'benja@gmail.com',
  tutorComuna: 'Coronel',
  tutorSector: 'LCN',

  sexo: 'MACHO',
  tamano: 'MEDIANO',
  pesoEstimado: 12,

  jornada: {
    nombre: 'Jornada de esterilización',
    fecha: new Date('2026-11-15T10:00:00'),
    lugar: 'Sede comunitaria',
    comuna: 'Coronel',
    sector: 'Centro',
    indicacionesPostOperatorias:
      'Mantener reposo, evitar que la mascota lama la herida y seguir las indicaciones del veterinario.',
  },

  especie: {
    nombre: 'Perro',
  },
};

const pdf = await generarComprobantePdf(inscripcion);

await writeFile('./comprobante-prueba.pdf', pdf);

console.log('PDF generado correctamente');