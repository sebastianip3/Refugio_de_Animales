import { z } from 'zod';

export const SEXOS = ['MACHO', 'HEMBRA', 'DESCONOCIDO'];
export const ESTADOS_ANIMAL = [
  'EN_EVALUACION',
  'CUARENTENA',
  'EN_TRATAMIENTO',
  'EN_ADOPCION',
  'ADOPTADO',
  'OTRO',
];

// Casi todo es opcional: hay animales que llegan sin antecedentes
export const animalSchema = z.object({
  especieId: z.number().int().positive(),
  nombre: z.string().trim().max(100).nullish(),
  edadEstimada: z.number().int().min(0).nullish(), // en meses
  sexo: z.enum(SEXOS).optional(),
  peso: z.number().positive().nullish(),
  estadoGeneral: z.string().trim().nullish(),
  fotografiaUrl: z.string().trim().url().max(500).nullish(),
  estado: z.enum(ESTADOS_ANIMAL).optional(),
  tieneChip: z.boolean().nullish(),
  numeroChip: z.string().trim().max(50).nullish(),
  observaciones: z.string().trim().nullish(),
  fechaIngreso: z.coerce.date().optional(),
  fechaEgreso: z.coerce.date().nullish(),
  motivoEgreso: z.string().trim().max(255).nullish(),
});

export const updateAnimalSchema = animalSchema.partial();
