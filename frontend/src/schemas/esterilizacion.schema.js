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
  const dvEsperado = resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
  return dv === dvEsperado;
}

const rutSchema = z
  .string()
  .trim()
  .transform((valor) => valor.replace(/\./g, "").replace(/-/g, "").toUpperCase())
  .refine((valor) => /^\d{7,8}[\dK]$/.test(valor), "Formato de RUT inválido")
  .transform((valor) => `${valor.slice(0, -1)}-${valor.slice(-1)}`)
  .refine(rutValido, "RUT inválido");

  export const inscripcionFormSchema = z.object({
    especieId: z.coerce.number().int().positive("Debe seleccionar especie"),
    sexo: z.enum(["MACHO", "HEMBRA"], {error: "Debe seleccionar sexo"}),
    tamano: z.enum(["PEQUENO", "MEDIANO", "GRANDE"], {error: "Debe seleccionar tamaño"}),
    pesoEstimado: z.coerce
        .number({error: "Ingrese un número"})
        .positive("El peso debe ser mayor a 0")
        .max(150, "El peso no puede ser mayor a 150 kg"),
    tutorNombre: z.string().trim().min(2, "Minimo 2 caracteres").max(100, "Maximo 100 caracteres"),
    tutorApellido: z.string().trim().min(2,"Minimo 2 caracteres").max(100, "Maximo 100 caracteres"),
    tutorRut: rutSchema,
    tutorEmail: z.string().trim().email("Correo invalido").max(150, "Maximo 150 caracteres"),
    tutorComuna: z.string().trim().min(2, "Minimo 2 caracteres").max(100, "Maximo 100 caracteres"),
    tutorSector: z.string().trim().min(2, "Minimo 2 caracteres").max(100, "Maximo 100 caracteres"),
  });