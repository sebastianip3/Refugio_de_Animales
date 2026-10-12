import { z } from 'zod';
import { rutSchema } from './adopcion.schema.js';

export const TAMANOS = ['PEQUENO', 'MEDIANO', 'GRANDE'];
export const ESTADOS_INSCRIPCION = ['PENDIENTE', 'CITADA', 'ASISTIO', 'NO_ASISTIO', 'RECHAZADA', 'CANCELADA'];

export const ESTADOS_SIN_CUPO = ['RECHAZADA', 'CANCELADA'];

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

// Formulario que llena la comunidad
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

// Revisión de la administradora
export const updateInscripcionSchema = z
  .object({
    estado: z.enum(ESTADOS_INSCRIPCION.filter((e) => e !== 'CITADA')),
    observaciones: z.string().trim().nullish(),
  })
  .partial();
