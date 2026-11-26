import { z } from "zod";

export const SEXOS = ["DESCONOCIDO", "MACHO", "HEMBRA"];
export const ESTADOS = [
  "EN_EVALUACION", "CUARENTENA", "EN_TRATAMIENTO", "ADOPTABLE",
  "EN_ADOPCION", "ADOPTADO", "NO_ADOPTABLE", "FALLECIDO", "EXTRAVIADO",
];
export const ESTADOS_INICIALES = ["EN_EVALUACION", "CUARENTENA", "EN_TRATAMIENTO"];
export const ESTADOS_MANUALES = ["EN_EVALUACION", "CUARENTENA", "EN_TRATAMIENTO", "ADOPTABLE", "NO_ADOPTABLE", "FALLECIDO", "EXTRAVIADO"];
export const ESTADOS_BLOQUEADOS = ["ADOPTADO", "FALLECIDO", "EXTRAVIADO"];

export const EDAD_MAXIMA = { Perro: 60, Gato: 50 };
export const PESO_MAXIMO = { Perro: 200, Gato: 25 };
export const MAX_CAMBIOS = 2;
export const MAX_CAMBIOS_FECHA = 1;

const SOLO_LETRAS = /^[A-Za-zÁÉÍÓÚáéíóúÑñÜü]+([ '-][A-Za-zÁÉÍÓÚáéíóúÑñÜü]+)*$/;

export function fechaMinimaNacimiento(nombreEspecie) {
  const edadMaxima = EDAD_MAXIMA[nombreEspecie];
  if (!edadMaxima) return undefined;

  const fecha = new Date();
  fecha.setFullYear(fecha.getFullYear() - edadMaxima);
  return fecha.toLocaleDateString("en-CA");
}

export const animalFormSchema = (nombreEspecie) => {
  const pesoMaximo = PESO_MAXIMO[nombreEspecie] ?? 200;
  const fechaMinima = fechaMinimaNacimiento(nombreEspecie);

  return z.object({
    nombre: z
      .string()
      .trim()
      .max(30, "Maximo 30 caracteres")
      .refine((valor) => valor === "" || valor.length >= 2, "Minimo 2 caracteres")
      .refine((valor) => valor === "" || SOLO_LETRAS.test(valor), "Solo puede tener letras")
      .transform((valor) => valor || null),
    especieId: z.coerce.number().int().positive("Debe seleccionar especie"),
    sexo: z.enum(SEXOS, { error: "Debe seleccionar sexo" }),
    fechaNacimiento: z
      .string()
      .refine((valor) => valor === "" || valor <= new Date().toLocaleDateString("en-CA"), "La fecha no puede ser futura")
      .refine((valor) => valor === "" || !fechaMinima || valor >= fechaMinima,
        `Un ${nombreEspecie?.toLowerCase()} no puede superar los ${EDAD_MAXIMA[nombreEspecie]} años`)
      .transform((valor) => valor || null),
    peso: z.coerce
      .number({ error: "Ingrese un número" })
      .positive("El peso debe ser mayor a 0")
      .max(pesoMaximo, `El peso no puede ser mayor a ${pesoMaximo} kg`)
      .refine((valor) => /^\d+(\.\d{1,2})?$/.test(String(valor)), "Maximo 2 decimales")
      .nullable(),
    estado: z.enum(ESTADOS, { error: "Debe seleccionar estado" }),
    tieneChip: z.boolean(),
    numeroChip: z.string().trim(),
    fotografiaUrl: z
      .string()
      .trim()
      .max(500, "Maximo 500 caracteres")
      .refine((valor) => valor === "" || /^https?:\/\/\S+$/.test(valor), "Debe empezar con http:// o https://")
      .transform((valor) => valor || null),
    estadoGeneral: z.string().trim().max(300, "Maximo 300 caracteres").transform((valor) => valor || null),
    observaciones: z.string().trim().max(300, "Maximo 300 caracteres").transform((valor) => valor || null),
  })
    .refine((datos) => !datos.tieneChip || /^\d{15}$/.test(datos.numeroChip), {
      error: "El chip debe tener 15 digitos",
      path: ["numeroChip"],
    })
    .transform((datos) => ({ ...datos, numeroChip: datos.tieneChip ? datos.numeroChip : null }));
};