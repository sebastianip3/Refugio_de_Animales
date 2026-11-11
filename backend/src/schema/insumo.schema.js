
import { z } from "zod";

export const crearInsumoSchema = z.object({
  nombre: z.string().trim().min(1).max(150),
  categoria: z.enum(["ALIMENTO", "MEDICAMENTO", "OTRO"]),
  descripcion: z.string().trim().max(1000).optional(),
  unidadMedida: z.string().trim().min(1).max(30),
  stockActual: z.number().min(0).max(9999999999).multipleOf(0.01),
  stockMinimo: z.number().min(0).max(9999999999).multipleOf(0.01),
}).strict();


export const movimientoInsumoSchema = z.object({
  tipo: z.enum(["INGRESO", "RETIRO", "CONSUMO"]),
  cantidad: z.number()
    .positive("La cantidad debe ser mayor que cero")
    .max(9999999999)
    .multipleOf(0.01),
  observacion: z.string().trim().max(1000).optional(),
}).strict();
