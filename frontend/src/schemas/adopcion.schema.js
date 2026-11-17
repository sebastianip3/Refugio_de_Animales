import { z } from "zod";

// Valores del enum TipoVivienda del backend y su texto para mostrar
export const TIPOS_VIVIENDA = {
  CASA_CON_PATIO: "Casa con patio",
  CASA_SIN_PATIO: "Casa sin patio",
  CABANA: "Cabaña",
  DEPARTAMENTO: "Departamento",
  CONDOMINIO: "Condominio",
};

// Valores del enum Comuna del backend y su texto para mostrar
export const COMUNAS = {
  CONCEPCION: "Concepción",
  CORONEL: "Coronel",
  CHIGUAYANTE: "Chiguayante",
  FLORIDA: "Florida",
  HUALQUI: "Hualqui",
  LOTA: "Lota",
  PENCO: "Penco",
  SAN_PEDRO_DE_LA_PAZ: "San Pedro de la Paz",
  SANTA_JUANA: "Santa Juana",
  TALCAHUANO: "Talcahuano",
};

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
  )
  // RUT de prueba como 11.111.111-1 cumplen el dígito verificador, pero no son reales
  .refine(
    (valor) => !/^(\d)\1+-/.test(valor),
    "Ingrese un RUT válido"
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
    .toLowerCase()
    .max(254, "El correo es demasiado largo")
    .email("Ingrese un correo electrónico válido"),

  // Teléfono chileno de 9 dígitos, con o sin +56 (igual que en el backend)
  telefono: z
    .string()
    .trim()
    .transform((valor) =>
      valor.replace(/[\s\-().]/g, "").replace(/^(\+?56)/, "")
    )
    .refine(
      (valor) => /^[2-9]\d{8}$/.test(valor),
      "Ingrese un teléfono de 9 dígitos, por ejemplo 9 1234 5678"
    )
    .transform((valor) => `+56${valor}`),

  direccion: z
    .string()
    .trim()
    .min(3, "La dirección debe tener al menos 3 caracteres")
    .max(255, "La dirección no puede superar los 255 caracteres"),

  comuna: z.enum(Object.keys(COMUNAS), { error: "Debe seleccionar una comuna" }),

  // Opcional: "" significa que no seleccionó
  tipoVivienda: z.union([
    z.literal(""),
    z.enum(Object.keys(TIPOS_VIVIENDA), { error: "Seleccione un tipo de vivienda válido" }),
  ]),

  otrasMascotas: z
    .string()
    .trim(),

  motivo: z
    .string()
    .trim(),
});