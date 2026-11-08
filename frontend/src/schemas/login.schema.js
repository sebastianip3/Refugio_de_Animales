import { z } from "zod";

export const loginFormSchema = z.object({
  correo: z
    .string()
    .trim()
    .email("Ingrese un correo electrónico válido")
    .max(254, "El correo es demasiado largo"),

  contrasena: z
    .string()
    .min(1, "Ingrese su contraseña")
    .max(72, "La contraseña es demasiado larga"),
});
