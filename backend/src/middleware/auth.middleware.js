import jwt from 'jsonwebtoken';
import prisma from '../config/prisma.js';
import { JWT_SECRET } from '../config/configEnv.js';
import { COOKIE_SESION } from '../services/auth.service.js';

// Lee el token de la cookie de sesión y deja la cuenta en req.cuenta.
// La cuenta se busca en la BD para usar su rol actual y no el guardado en el token.
export async function autenticar(req, res, next) {
  const token = req.cookies?.[COOKIE_SESION];
  if (!token) {
    return res.status(401).json({ message: 'Debes iniciar sesión' });
  }

  if (!JWT_SECRET) {
    console.error('Falta JWT_SECRET en backend/.env');
    return res.status(500).json({ message: 'Error interno del servidor' });
  }

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return res.status(401).json({ message: 'Sesión inválida o expirada' });
  }

  try {
    const cuenta = await prisma.cuenta.findUnique({
      where: { id: Number(payload.sub) },
      omit: { contrasenaHash: true },
    });
    if (!cuenta) return res.status(401).json({ message: 'Sesión inválida o expirada' });

    req.cuenta = cuenta;
    next();
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Error interno del servidor' });
  }
}

// Usar después de autenticar: router.get('/', autenticar, autorizar('ADMINISTRADOR'), ...)
export function autorizar(...tipos) {
  return (req, res, next) => {
    if (!tipos.includes(req.cuenta?.tipo)) {
      return res.status(403).json({ message: 'No tienes permiso para realizar esta acción' });
    }
    next();
  };
}
