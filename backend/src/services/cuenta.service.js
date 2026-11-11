import bcrypt from 'bcryptjs';
import prisma from '../config/prisma.js';
import { AppError } from '../utils/app-error.js';

export async function cambiarCorreo(id, correo, contrasena) {
  const cuenta = await prisma.cuenta.findUnique({ where: { id } });
  if (!cuenta) throw new AppError(404, 'Cuenta no encontrada');

  const valida = await bcrypt.compare(contrasena, cuenta.contrasenaHash);
  if (!valida) throw new AppError(401, 'Contraseña incorrecta');

  return prisma.cuenta.update({
    where: { id },
    data: { correo },
    omit: { contrasenaHash: true },
  });
}

export async function cambiarDisponibilidadCuidado(id, disponibleCuidado) {
  const cuenta = await prisma.cuenta.findUnique({
    where: { id },
    select: { id: true, tipo: true },
  });
  if (!cuenta) throw new AppError(404, 'Cuenta no encontrada');
  if (cuenta.tipo !== 'VOLUNTARIO') {
    throw new AppError(403, 'Solo los voluntarios pueden cambiar su disponibilidad de cuidado');
  }

  return prisma.cuenta.update({
    where: { id },
    data: { disponibleCuidado },
    select: {
      id: true,
      nombre: true,
      apellido: true,
      tipo: true,
      disponibleCuidado: true,
    },
  });
}

export async function eliminarVoluntario(id) {
  const cuenta = await prisma.cuenta.findUnique({
    where: { id },
    select: { id: true, tipo: true },
  });
  if (!cuenta || cuenta.tipo !== 'VOLUNTARIO') {
    throw new AppError(404, 'Voluntario no encontrado');
  }

  const cantidadCuidados = await prisma.cuidadoAnimal.count({ where: { cuentaId: id } });
  if (cantidadCuidados > 0) {
    throw new AppError(
      409,
      'No se puede eliminar el voluntario porque tiene registros de cuidado; desactiva su disponibilidad',
    );
  }

  return prisma.cuenta.delete({ where: { id } });
}
