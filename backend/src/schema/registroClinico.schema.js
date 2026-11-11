import { z } from 'zod';

export const TIPOS_REGISTRO_CLINICO = [
  'CONSULTA',
  'VACUNA',
  'DESPARASITACION',
  'CIRUGIA',
  'ESTERILIZACION',
  'TRATAMIENTO',
  'EXAMEN',
  'OTRO',
];

// Campos que solo se llenan "cuando corresponde": un texto vacío se guarda como null
function textoOpcional(maximo) {
  const texto = maximo ? z.string().trim().max(maximo) : z.string().trim();
  return texto
    .nullish()
    .transform((valor) => (valor === '' ? null : valor));
}

// Registro que llena el veterinario. El animal viene en la URL, no en el cuerpo
export const registroClinicoSchema = z.object({
  fecha: z.coerce
    .date({ error: 'Fecha inválida o faltante' })
    .refine((fecha) => fecha <= new Date(), 'La fecha no puede ser futura'),
  tipo: z.enum(TIPOS_REGISTRO_CLINICO),
  descripcion: z.string().trim().min(3).max(2000),
  diagnostico: textoOpcional(2000),
  tratamiento: textoOpcional(2000),
  veterinario: textoOpcional(100),
  observaciones: textoOpcional(2000),
});

// Actualización: se envían solo los campos que cambian, pero al menos uno
export const updateRegistroClinicoSchema = registroClinicoSchema
  .partial()
  .refine((datos) => Object.keys(datos).length > 0, 'Debes enviar al menos un campo');
