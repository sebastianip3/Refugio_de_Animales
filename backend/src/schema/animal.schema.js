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
export const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+([ '-][A-Za-zÁÉÍÓÚáéíóúÑñÜü]+)*$/;

// Casi todo es opcional: hay animales que llegan sin antecedentes
const animalEsquema = z.object({
  especieId: z.number({ error: 'Debe seleccionar una especie' }).int().positive('Debe seleccionar una especie'),
  nombre: z.string().trim().min(2, "el animal debe tener minimo 2 caracteres").max(30,"el animal debe tener maximo 30 caracteres")
  .regex(SOLO_LETRAS, 'El nombre solo puede tener letras, separadas por un espacio o guion').nullish(),
  fechaNacimiento: z.coerce.date().nullish(),
  sexo: z.enum(SEXOS).optional(),
  peso: z.number().positive('El peso debe ser mayor a 0').max(200, 'Maximo 200 kg')
  .refine((valor) => /^\d+(\.\d{1,2})?$/.test(String(valor)), 'El peso puede tener máximo 2 decimales')
  .nullish(),
  estadoGeneral: z.string().trim().max(300, 'Maximo 300 caracteres').nullish(),
  fotografiaUrl: z.string().trim().url('URL inválida').max(500).nullish(),
  estado: z.enum(ESTADOS_ANIMAL).optional(),
  tieneChip: z.boolean().nullish(),
  numeroChip: z.string().trim().regex(/^\d{15}$/, 'El chip debe tener 15 dígitos').nullish(),
  observaciones: z.string().trim().max(300, 'Maximo 300 caracteres').nullish(),
  fechaIngreso: z.coerce.date().optional(),
  fechaEgreso: z.coerce.date().nullish(),
  motivoEgreso: z.string().trim().max(100).nullish(),
});

// si tiene chip entonces el numero es obligatorio
function reglas(schema) {
  return schema.refine((datos) => datos.tieneChip !== true || Boolean(datos.numeroChip), {
    error: 'Si el animal tiene chip debe ingresar el numero',
    path: ['numeroChip'],
  });
}

export const animalSchema = reglas(animalEsquema);
export const updateAnimalSchema = reglas(animalEsquema.partial());
