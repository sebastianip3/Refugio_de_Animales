import { z } from "zod";

// Igual que TipoRegistroClinico en el backend
export const TIPOS_REGISTRO_CLINICO = [
  "CONSULTA",
  "VACUNA",
  "DESPARASITACION",
  "CIRUGIA",
  "ESTERILIZACION",
  "TRATAMIENTO",
  "EXAMEN",
  "OTRO",
];

// Fecha de hoy como "AAAA-MM-DD" en hora local, el mismo formato del input type="date"
export const hoyComoTexto = () => {
  const hoy = new Date();
  const mes = String(hoy.getMonth() + 1).padStart(2, "0");
  const dia = String(hoy.getDate()).padStart(2, "0");
  return `${hoy.getFullYear()}-${mes}-${dia}`;
};

// Los campos opcionales pueden quedar vacíos ("cuando corresponda")
const textoOpcional = (maximo, nombre) =>
  z
    .string()
    .trim()
    .max(maximo, `${nombre} no puede superar los ${maximo} caracteres`);

export const registroClinicoFormSchema = z.object({
  fecha: z
    .string()
    .min(1, "Ingrese la fecha del registro")
    .refine((fecha) => fecha <= hoyComoTexto(), "La fecha no puede ser futura"),

  tipo: z.enum(TIPOS_REGISTRO_CLINICO, {
    error: "Seleccione el tipo de registro",
  }),

  descripcion: z
    .string()
    .trim()
    .min(3, "La descripción debe tener al menos 3 caracteres")
    .max(2000, "La descripción no puede superar los 2000 caracteres"),

  diagnostico: textoOpcional(2000, "El diagnóstico"),
  tratamiento: textoOpcional(2000, "El tratamiento"),
  veterinario: textoOpcional(100, "El nombre del veterinario"),
  observaciones: textoOpcional(2000, "Las observaciones"),
});
