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

// Nombre para mostrar de un veterinario (cuenta de tipo VETERINARIO)
export const nombreVeterinario = (veterinario) =>
  veterinario ? `${veterinario.nombre} ${veterinario.apellido}` : "Veterinario no indicado";

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
  // El select entrega el id como texto; al backend se envía como número
  veterinarioId: z
    .string()
    .min(1, "Seleccione el veterinario responsable")
    .transform(Number),
  observaciones: textoOpcional(200, "Las observaciones"),
});
