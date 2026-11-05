import jwt from 'jsonwebtoken';
import { JWT_SECRET } from '../config/configEnv.js';

export function autenticar(req, res, next) {
  if (!JWT_SECRET) return next(new Error('Falta JWT_SECRET en backend/.env'));

  const tokenMatch = req.get('authorization')?.match(/^Bearer ([^\s]+)$/i);
  if (!tokenMatch) {
    return res.status(401).json({ message: 'Se requiere autenticación' });
  }

  try {
    const payload = jwt.verify(tokenMatch[1], JWT_SECRET, { algorithms: ['HS256'] });
    const id = Number(payload && typeof payload === 'object' ? payload.sub : NaN);
    if (!Number.isSafeInteger(id) || id <= 0) {
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }

    req.cuenta = { id };
    return next();
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Token inválido o expirado' });
    }
    return next(error);
  }
}
