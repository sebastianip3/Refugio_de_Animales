import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { JWT_SECRET, NODE_ENV } from '../config/configEnv.js';
import { AppError } from '../utils/app-error.js';

const DURACION_SESION_SEGUNDOS = 8 * 60 * 60;

// El token viaja en una cookie httpOnly: el navegador la envía sola y
// el JavaScript de la página no puede leerla. sameSite 'lax' evita que otro
// sitio la use para enviar POST/PATCH en nombre del usuario.
export const COOKIE_SESION = 'sesion';

export const opcionesCookieSesion = {
  httpOnly: true,
  sameSite: 'lax',
  secure: NODE_ENV === 'production',
  path: '/',
};

function firmarToken(cuenta) {
  if (!JWT_SECRET) throw new Error('Falta JWT_SECRET en backend/.env');
  return jwt.sign({ sub: String(cuenta.id), tipo: cuenta.tipo }, JWT_SECRET, {
    expiresIn: DURACION_SESION_SEGUNDOS,
  });
}

export const DURACION_SESION_MS = DURACION_SESION_SEGUNDOS * 1000;

// Mismo mensaje en ambos casos para no revelar qué correos tienen cuenta
export async function iniciarSesion(correo, contrasena) {
  const cuenta = await prisma.cuenta.findUnique({ where: { correo } });
  const valida = cuenta && (await bcrypt.compare(contrasena, cuenta.contrasenaHash));
  if (!valida) throw new AppError(401, 'Correo o contraseña incorrectos');

  const { contrasenaHash, ...datosCuenta } = cuenta;
  return { token: firmarToken(cuenta), cuenta: datosCuenta };
}
