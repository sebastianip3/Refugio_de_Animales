import { z } from 'zod';

const correoSchema = z.string().trim().toLowerCase().email().max(254);

export const loginCuentaSchema = z.object({
  correo: correoSchema,
  contrasena: z.string().min(1).max(72),
});

// Pide la contraseña actual para confirmar que es el dueño de la cuenta
export const cambiarCorreoCuentaSchema = z.object({
  correo: correoSchema,
  contrasena: z.string().min(1).max(72),
});

export const cambiarDisponibilidadCuidadoSchema = z.object({
  disponibleCuidado: z.boolean(),
});

export const idVoluntarioSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const crearVoluntarioSchema = z.object({
  nombre: z.string().trim().min(1).max(100),
  apellido: z.string().trim().min(1).max(100),
  correo: correoSchema,
  contrasena: z.string().min(8).max(72),
  horario: z.string().trim().max(255).optional().transform((valor) => valor || null),
  disponibleCuidado: z.boolean().default(true),
});
