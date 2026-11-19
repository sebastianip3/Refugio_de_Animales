import { z } from 'zod';

export const ESTADOS_ADOPCION = ['PENDIENTE', 'EN_REVISION', 'APROBADA', 'RECHAZADA'];

// Una adopción en estos estados bloquea nuevas solicitudes para el mismo animal
export const ESTADOS_EN_PROCESO = ['PENDIENTE', 'EN_REVISION'];

// Valores del enum TipoVivienda de Prisma
export const TIPOS_VIVIENDA = ['CASA_CON_PATIO', 'CASA_SIN_PATIO', 'CABANA', 'DEPARTAMENTO', 'CONDOMINIO'];

// Valores del enum Comuna de Prisma (comunas donde el refugio acepta adopciones)
export const COMUNAS = [
  'CONCEPCION',
  'CORONEL',
  'CHIGUAYANTE',
  'FLORIDA',
  'HUALQUI',
  'LOTA',
  'PENCO',
  'SAN_PEDRO_DE_LA_PAZ',
  'SANTA_JUANA',
  'TALCAHUANO',
];

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
  // El RUT real más largo es "99.999.999-9": 12 caracteres con puntos y guion
  .max(12, 'El RUT no puede superar los 12 caracteres')
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

// Celular chileno: 9 dígitos que empiezan con 9 (9XXXXXXXX), con o sin +56.
// Acepta espacios, guiones y paréntesis y lo guarda como "+56912345678"
export const telefonoSchema = z
  .string()
  .trim()
  .max(20, 'El teléfono es demasiado largo')
  .transform((valor) => valor.replace(/[\s\-().]/g, '').replace(/^(\+?56)/, ''))
  .refine((valor) => /^9\d{8}$/.test(valor), 'Teléfono inválido: debe ser un celular de 9 dígitos que empiece con 9')
  .transform((valor) => `+56${valor}`);

// Ficha que llena el adoptante. El estado no se recibe: siempre parte en PENDIENTE
export const adopcionSchema = z.object({
  animalId: z.number().int().positive(),
  nombre: z
    .string()
    .trim()
    .min(2)
    .max(57, 'El nombre no puede superar los 57 caracteres')
    // Solo letras (con tildes, ñ y ü), espacios y apóstrofo (O'Higgins): sin números ni otros caracteres especiales
    .regex(/^[\p{L} '’]+$/u, "El nombre solo puede tener letras, espacios y apóstrofo ('), sin números ni otros caracteres especiales"),
  rut: rutSchema,
  email: correoSchema,
  telefono: telefonoSchema,
  direccion: z
    .string()
    .trim()
    .min(5, 'La dirección debe tener al menos 5 caracteres')
    .max(100, 'La dirección no puede superar los 100 caracteres'),
  comuna: z.enum(COMUNAS, { error: 'Debe seleccionar una comuna válida' }),
  tipoVivienda: z.enum(TIPOS_VIVIENDA, { error: 'Tipo de vivienda inválido' }).nullish(),
  otrasMascotas: z.string().trim().max(200, 'Otras mascotas no puede superar los 200 caracteres').nullish(),
  motivo: z.string().trim().max(300, 'El motivo no puede superar los 300 caracteres').nullish(),
});

// Consulta pública del estado de las solicitudes: se piden el RUT y el correo juntos
export const consultaSolicitudSchema = z.object({
  rut: rutSchema,
  email: correoSchema,
});

// Revisión de la solicitud por parte del refugio
export const updateAdopcionSchema = z
  .object({
    // No incluye CANCELADA: las solicitudes no se cancelan, se rechazan indicando el motivo
    estado: z.enum(ESTADOS_ADOPCION, { error: 'Estado inválido' }),
    observaciones: z
      .string()
      .trim()
      .max(300, 'Las observaciones no pueden superar los 300 caracteres')
      .nullish(),
  })
  .partial()
  .refine(
    (datos) => datos.estado !== 'RECHAZADA' || Boolean(datos.observaciones),
    {message: 'Debe indicar el motivo del rechazo', path: ['observaciones'] }
  )
  // Al rechazar, el motivo debe tener al menos 4 caracteres
  .refine(
    (datos) => datos.estado !== 'RECHAZADA' || !datos.observaciones || datos.observaciones.length >= 4,
    { message: 'El motivo del rechazo debe tener al menos 4 caracteres', path: ['observaciones'] }
  );

// Horarios fijos de visita. Son pocos porque entre una visita y otra hay que viajar
// de una comuna a otra, y solo el viaje toma cerca de 1 hora
export const HORAS_VISITA = ['10:00', '12:00', '15:00'];

// Visita post adopción: la fecha llega como "AAAA-MM-DD" y se guarda a medianoche UTC
export const visitaSchema = z.object({
  fecha: z.coerce
    .date({ error: 'Fecha inválida o faltante' })
    .refine((fecha) => {
      const ahora = new Date();
      const hoy = Date.UTC(ahora.getFullYear(), ahora.getMonth(), ahora.getDate());
      return fecha.getTime() >= hoy;
    }, 'La fecha de la visita no puede ser anterior a hoy'),
  // "HH:MM" en formato 24 horas, solo uno de los horarios fijos
  hora: z.enum(HORAS_VISITA, {
    error: `La hora de la visita debe ser una de estas: ${HORAS_VISITA.join(', ')}`,
  }),
});

// Resultado de una visita post adopción
export const resultadoVisitaSchema = z.object({
  estadoAnimal: z.enum(['BIEN', 'REGULAR', 'CON_PROBLEMAS'], { error: 'Seleccione cómo se encontró al animal' }),
  observaciones: z
    .string({ error: 'Escriba las observaciones de la visita' })
    .trim()
    .min(3, 'Las observaciones deben tener al menos 3 caracteres')
    .max(300, 'Las observaciones no pueden superar los 300 caracteres'),
});
