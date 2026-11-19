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

// Valores del enum Veterinario del backend y su nombre para mostrar
export const VETERINARIOS = {
  JAMES_HERRIOT: "Dr. James Herriot",
  KAREN_BECKER: "Dra. Karen Becker",
  FRANCISCA_GONZALEZ: "Dra. Francisca González",
};

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
    .max(200, "La descripción no puede superar los 200 caracteres"),

  diagnostico: textoOpcional(100, "El diagnóstico"),
  tratamiento: textoOpcional(150, "El tratamiento"),
  veterinario: z.enum(Object.keys(VETERINARIOS), {
    error: "Seleccione el veterinario responsable",
  }),
  observaciones: textoOpcional(200, "Las observaciones"),
});
