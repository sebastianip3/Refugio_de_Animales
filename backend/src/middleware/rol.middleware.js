import prisma from '../config/prisma.js';

// despues de autenticar solo deja pasar a las cuentas de los tipos indicados
export function permitirCuenta(...tipos) {
  return async (req, res, next) => {
    try {
      const cuenta = await prisma.cuenta.findUnique({
        where: { id: req.cuenta.id },
        select: { tipo: true }
      });

      if (!cuenta || !tipos.includes(cuenta.tipo)) {
        return res.status(403).json({ message: 'No tienes permiso para realizar esta acción' });
      }
      req.cuenta.tipo = cuenta.tipo;
      next();
    } catch (error) {
      next(error);
    }
  };
}