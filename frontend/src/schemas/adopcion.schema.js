import { z } from "zod";

function rutValido(rut) {
  const [cuerpo, dv] = rut.split("-");

  let suma = 0;
  let multiplo = 2;

  for (let i = cuerpo.length - 1; i >= 0; i--) {
    suma += Number(cuerpo[i]) * multiplo;
    multiplo = multiplo === 7 ? 2 : multiplo + 1;
  }

  const resto = 11 - (suma % 11);

  const dvEsperado =
    resto === 11
      ? "0"
      : resto === 10
        ? "K"
        : String(resto);

  return dv === dvEsperado;
}

const rutSchema = z
  .string()
  .trim()
  .transform((valor) =>
    valor
      .replace(/\./g, "")
      .replace(/-/g, "")
      .toUpperCase()
  )
  .refine(
    (valor) => /^\d{7,8}[\dK]$/.test(valor),
    "Formato de RUT inválido"
  )
  .transform(
    (valor) =>
      `${valor.slice(0, -1)}-${valor.slice(-1)}`
  )
  .refine(
    rutValido,
    "Dígito verificador del RUT inválido"
  );

export const adopcionFormSchema = z.object({
  animalId: z
    .string()
    .min(1, "Debe seleccionar un animal"),

  nombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(100, "El nombre no puede superar los 100 caracteres"),

  rut: rutSchema,

  email: z
    .string()
    .trim()
    .email("Ingrese un correo electrónico válido"),

  telefono: z
    .string()
    .trim()
    .min(8, "El teléfono debe tener al menos 8 caracteres")
    .max(15, "El teléfono no puede superar los 15 caracteres"),

  direccion: z
    .string()
    .trim()
    .min(3, "La dirección debe tener al menos 3 caracteres")
    .max(255, "La dirección no puede superar los 255 caracteres"),

  comuna: z
    .string()
    .trim()
    .min(2, "La comuna debe tener al menos 2 caracteres")
    .max(100, "La comuna no puede superar los 100 caracteres"),

  tipoVivienda: z
    .string()
    .trim()
    .max(100, "El tipo de vivienda no puede superar los 100 caracteres"),

  otrasMascotas: z
    .string()
    .trim(),

  motivo: z
    .string()
    .trim(),
});