import { z } from 'zod';

const intervaloSchema = z.object({
  animalId: z.coerce.number().int().positive(),
  fechaInicio: z.coerce.date(),
  fechaFin: z.coerce.date(),
}).refine(({ fechaInicio, fechaFin }) => fechaInicio < fechaFin, {
  message: 'La fecha de inicio debe ser anterior a la fecha de término',
  path: ['fechaFin'],
});

export const consultarDisponibilidadSchema = intervaloSchema;

export const crearCuidadoSchema = intervaloSchema.extend({
  cuentaId: z.number().int().positive(),
});
