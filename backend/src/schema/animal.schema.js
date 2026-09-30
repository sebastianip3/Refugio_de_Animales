import { z } from 'zod';

const animalSchema = z.object({
  nombre: z.string().optional(),
  rut: z.string().max(100),
  edadEstimada: z.string().optional(),
  sexo: z.string().optional(),
  peso: z.number().int().optional(),
  estadoGeneral: z.string().optional(),
  fotografiaUrl: z.string().optional().max(200),
  tieneChip: z.boolean().optional(),
  numeroChip: z.string().optional(),
  observaciones: z.string().optional(),
  motivoEgreso: z.string().optional(),
});

export const updateAnimalSchema = animalSchema.partial();