
import { z } from "zod";

// Validar los datos al crear un evento
export const crearEventoSchema = z.object({
  nombre: z.string().trim().min(3).max(150),

  tipo: z.enum(["ADOPCION", "OTRO"]).optional(),

  descripcion: z.string().trim().min(1).max(2000),

  fecha: z.coerce.date(),

  lugar: z.string().trim().min(3).max(255),

  comuna: z.string().trim().min(2).max(100),

  cuposTotales: z.number().int().positive().nullish(),

  estado: z.enum([
    "PROGRAMADO",
    "CANCELADO",
    "FINALIZADO",
  ]).optional(),

  publicado: z.boolean().optional(),
}).strict();

// Al editar, no es obligatorio enviar todos los campos
export const actualizarEventoSchema = crearEventoSchema
  .partial()
  .refine(
    (datos) => Object.keys(datos).length > 0,
    "Debes enviar al menos un campo para actualizar"
  );
