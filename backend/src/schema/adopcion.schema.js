import { z } from 'zod';

export const ESTADOS_ADOPCION = ['PENDIENTE', 'EN_REVISION', 'APROBADA', 'RECHAZADA', 'CANCELADA'];

// Una adopción en estos estados bloquea nuevas solicitudes para el mismo animal
export const ESTADOS_EN_PROCESO = ['PENDIENTE', 'EN_REVISION'];

// Valida el dígito verificador (módulo 11) de un RUT normalizado "12345678-K"
function rutValido(rut) {
  const [cuerpo, dv] = rut.split('-');
  let suma = 0;
  let multiplo = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }

  const resto = 11 - (suma % 11);
  const dvEsperado = resto === 11 ? '0' : resto === 10 ? 'K' : String(resto);
  return dv === dvEsperado;
}

// Acepta "12.345.678-k", "12345678-K" o "12345678K" y lo guarda como "12345678-K"
export const rutSchema = z
  .string()
  .trim()
  .transform((valor) => valor.replace(/\./g, '').replace(/-/g, '').toUpperCase())
  .refine((valor) => /^\d{7,8}[\dK]$/.test(valor), 'Formato de RUT inválido')
  .transform((valor) => `${valor.slice(0, -1)}-${valor.slice(-1)}`)
  .refine(rutValido, 'Dígito verificador del RUT inválido')
  // RUT de prueba como 11.111.111-1 cumplen el dígito verificador, pero no son reales
  .refine((valor) => !/^(\d)\1+-/.test(valor), 'RUT inválido');

export const correoSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, 'El correo es demasiado largo')
  .email('Correo electrónico inválido');

// Teléfono chileno: 9 dígitos (celular 9XXXXXXXX o fijo con código de área),
// con o sin +56. Acepta espacios, guiones y paréntesis y lo guarda como "+56912345678"
export const telefonoSchema = z
  .string()
  .trim()
  .transform((valor) => valor.replace(/[\s\-().]/g, '').replace(/^(\+?56)/, ''))
  .refine((valor) => /^[2-9]\d{8}$/.test(valor), 'Teléfono inválido: debe tener 9 dígitos')
  .transform((valor) => `+56${valor}`);

// Ficha que llena el adoptante. El estado no se recibe: siempre parte en PENDIENTE
export const adopcionSchema = z.object({
  animalId: z.number().int().positive(),
  nombre: z.string().trim().min(2).max(100),
  rut: rutSchema,
  email: correoSchema,
  telefono: telefonoSchema,
  direccion: z.string().trim().min(3).max(255),
  comuna: z.string().trim().min(2).max(100),
  tipoVivienda: z.string().trim().max(100).nullish(),
  otrasMascotas: z.string().trim().nullish(),
  motivo: z.string().trim().nullish(),
});

// Revisión de la solicitud por parte del refugio
export const updateAdopcionSchema = z
  .object({
    estado: z.enum(ESTADOS_ADOPCION),
    observaciones: z.string().trim().nullish(),
  })
  .partial();
