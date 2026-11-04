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
