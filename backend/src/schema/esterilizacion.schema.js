import { z } from 'zod';
import { rutSchema } from './adopcion.schema.js';

export const TAMANOS = ['PEQUENO', 'MEDIANO', 'GRANDE'];
export const ESTADOS_INSCRIPCION = ['CONFIRMADA', 'ASISTIO', 'NO_ASISTIO', 'CANCELADA'];
export const ESTADOS_CORREO = ['PENDIENTE', 'ENVIADO', 'FALLIDO'];

export const ESTADOS_SIN_CUPO = ['CANCELADA'];

// Jornada que crea la administradora
export const jornadaSchema = z.object({
  nombre: z.string().trim().min(3).max(150),
  fecha: z.coerce.date(),
  lugar: z.string().trim().min(3).max(255),
  comuna: z.string().trim().min(2).max(100),
  sector: z.string().trim().max(100).nullish(),
  cuposTotales: z.number().int().min(1),
  activa: z.boolean().optional(),
  indicacionesPostOperatorias: z.string().trim().min(1),
});

export const updateJornadaSchema = jornadaSchema.partial();

// Formulario que llena la comunidad. El estado, el folio y los datos del correo
// no se reciben: los asigna el sistema al confirmar la inscripción
export const inscripcionSchema = z.object({
  especieId: z.number().int().positive(),
  sexo: z.enum(['MACHO', 'HEMBRA']),
  tamano: z.enum(TAMANOS),
  pesoEstimado: z.number().positive().max(150), // en kg
  tutorNombre: z.string().trim().min(2).max(100),
  tutorApellido: z.string().trim().min(2).max(100),
  tutorRut: rutSchema,
  tutorEmail: z.string().trim().email().max(150),
  tutorComuna: z.string().trim().min(2).max(100),
  tutorSector: z.string().trim().min(2).max(100),
});

// La administradora registra la asistencia o cancela. No se puede volver a
// CONFIRMADA porque reactivar una cancelada exigiría revisar el cupo de nuevo
export const updateInscripcionSchema = z
  .object({
    estado: z.enum(ESTADOS_INSCRIPCION.filter((e) => e !== 'CONFIRMADA')),
    observaciones: z.string().trim().nullish(),
  })
  .partial();
