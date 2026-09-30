import { z } from 'zod';

const adopcionSchema = z.object({
  nombre: z.string().min(2).max(100),
  rut: z.string().min(9).max(9).regex(/^[0-9]{9}$/),
  email: z.string().email(),
  telefono: z.string().min(9).max(15),
  direccion: z.number().int(),
  comuna: z.string(),
  tipoVivienda: z.string().optional().max(100),
  otrasMascotas: z.string().optional(),
  motivo: z.string().optional(),
  estado: z.string(),
  observaciones: z.string().optional(),
});

export const updateAdopcionSchema = adopcionSchema.partial();