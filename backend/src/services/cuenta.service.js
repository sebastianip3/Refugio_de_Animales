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
