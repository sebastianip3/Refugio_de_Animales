import { z } from "zod";

export const registroFormSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(2, "El nombre debe tener al menos 2 caracteres")
      .max(100, "El nombre no puede superar los 100 caracteres"),

    apellido: z
      .string()
      .trim()
      .min(2, "El apellido debe tener al menos 2 caracteres")
      .max(100, "El apellido no puede superar los 100 caracteres"),

    correo: z
      .string()
      .trim()
      .email("Ingrese un correo electrónico válido")
      .max(254, "El correo es demasiado largo"),

    contrasena: z
      .string()
      .min(8, "La contraseña debe tener al menos 8 caracteres")
      .max(100, "La contraseña es demasiado larga")
      .regex(
        /[A-Z]/,
        "La contraseña debe contener al menos una mayúscula"
      )
      .regex(
        /[a-z]/,
        "La contraseña debe contener al menos una minúscula"
      )
      .regex(
        /\d/,
        "La contraseña debe contener al menos un número"
      ),

    confirmarContrasena: z.string(),
  })
  .refine(
    (datos) =>
      datos.contrasena === datos.confirmarContrasena,
    {
      message: "Las contraseñas no coinciden",
      path: ["confirmarContrasena"],
    }
  );