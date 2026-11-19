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

// Da formato al RUT mientras se escribe: "123456785" -> "12.345.678-5".
// El último carácter siempre es el dígito verificador (número o K)
export function formatearRut(valor) {
  const limpio = valor
    .toUpperCase()
    .replace(/[^0-9K]/g, "")
    // La K solo puede ser el dígito verificador, al final
    .replace(/K(?!$)/g, "")
    .slice(0, 9);

  if (limpio.length <= 1) return limpio;

  const cuerpo = limpio.slice(0, -1).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${cuerpo}-${limpio.slice(-1)}`;
}

// Da formato al celular mientras se escribe: "912345678" -> "9 1234 5678".
// Siempre empieza con 9: lo que se escriba antes del 9 (por ejemplo +56) se descarta
export function formatearTelefono(valor) {
  const digitos = valor
    .replace(/\D/g, "")
    .replace(/^[^9]+/, "")
    .slice(0, 9);

  return [digitos.slice(0, 1), digitos.slice(1, 5), digitos.slice(5)]
    .filter(Boolean)
    .join(" ");
}

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
  // El RUT real más largo es "99.999.999-9": 12 caracteres con puntos y guion
  .max(12, "El RUT no puede superar los 12 caracteres")
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

const correoSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "El correo es demasiado largo")
  .email("Ingrese un correo electrónico válido");

// Consulta del estado de la solicitud: RUT y correo con los que se envió
export const consultaSolicitudSchema = z.object({
  rut: rutSchema,
  email: correoSchema,
});

export const adopcionFormSchema = z.object({
  animalId: z
    .string()
    .min(1, "Debe seleccionar un animal"),

  nombre: z
    .string()
    .trim()
    .min(2, "El nombre debe tener al menos 2 caracteres")
    .max(57, "El nombre no puede superar los 57 caracteres")
    // Solo letras (con tildes, ñ y ü), espacios y apóstrofo (O'Higgins): sin números ni otros caracteres especiales
    .regex(/^[\p{L} '’]+$/u, "El nombre solo puede tener letras, espacios y apóstrofo ('), sin números ni otros caracteres especiales"),

  rut: rutSchema,

  email: correoSchema,

  // Celular chileno: 9 dígitos que empiezan con 9, con o sin +56 (igual que en el backend)
  telefono: z
    .string()
    .trim()
    .transform((valor) =>
      valor.replace(/[\s\-().]/g, "").replace(/^(\+?56)/, "")
    )
    .refine(
      (valor) => /^9\d{8}$/.test(valor),
      "Ingrese un celular de 9 dígitos que empiece con 9, por ejemplo 9 1234 5678"
    )
    .transform((valor) => `+56${valor}`),

  direccion: z
    .string()
    .trim()
    .min(5, "La dirección debe tener al menos 5 caracteres")
    .max(100, "La dirección no puede superar los 100 caracteres"),

  comuna: z.enum(Object.keys(COMUNAS), { error: "Debe seleccionar una comuna" }),

  // Opcional: "" significa que no seleccionó
  tipoVivienda: z.union([
    z.literal(""),
    z.enum(Object.keys(TIPOS_VIVIENDA), { error: "Seleccione un tipo de vivienda válido" }),
  ]),

  otrasMascotas: z
    .string()
    .trim()
    .max(200, "Otras mascotas no puede superar los 200 caracteres"),

  motivo: z
    .string()
    .trim()
    .max(300, "El motivo no puede superar los 300 caracteres"),
});