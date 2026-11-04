import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { JWT_SECRET } from '../config/configEnv.js';
import { AppError } from '../utils/app-error.js';

const DURACION_SESION = '8h';

function firmarToken(cuenta) {
  if (!JWT_SECRET) throw new Error('Falta JWT_SECRET en backend/.env');
  return jwt.sign({ sub: String(cuenta.id), tipo: cuenta.tipo }, JWT_SECRET, {
    expiresIn: DURACION_SESION,
  });
}

// Mismo mensaje en ambos casos para no revelar qué correos tienen cuenta
export async function iniciarSesion(correo, contrasena) {
  const cuenta = await prisma.cuenta.findUnique({ where: { correo } });
  const valida = cuenta && (await bcrypt.compare(contrasena, cuenta.contrasenaHash));
  if (!valida) throw new AppError(401, 'Correo o contraseña incorrectos');

  const { contrasenaHash, ...datosCuenta } = cuenta;
  return { token: firmarToken(cuenta), cuenta: datosCuenta };
}
