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
  nombre: z.string().trim().min(2, "el animal debe tener minimo 2 caracteres").max(30,"el animal debe tener maximo 30 caracteres").nullish(),
  fechaNacimiento: z.coerce.date().max(new Date(), 'No puede ser futura').nullish(),
  sexo: z.enum(SEXOS).optional(),
  peso: z.number().positive().max(200).nullish(),
  estadoGeneral: z.string().trim().max(300).nullish(),
  fotografiaUrl: z.string().trim().url().max(500).nullish(),
  estado: z.enum(ESTADOS_ANIMAL).optional(),
  tieneChip: z.boolean().nullish(),
  numeroChip: z.string().trim().regex(/^\d{15}$/, 'El chip debe tener 15 dígitos').nullish(),
  observaciones: z.string().trim().max(300).nullish(),
  fechaIngreso: z.coerce.date().optional(),
  fechaEgreso: z.coerce.date().nullish(),
  motivoEgreso: z.string().trim().max(100).nullish(),
});

export const updateAnimalSchema = animalSchema.partial();
