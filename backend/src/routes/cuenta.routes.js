import { Router } from 'express';
import {
  iniciarSesion,
  cerrarSesion,
  obtenerPerfil,
  cambiarCorreo,
  cambiarDisponibilidadCuidado,
  listarVoluntarios,
  crearVoluntario,
  eliminarVoluntario,
} from '../controllers/cuenta.controller.js';
import { autenticar, autorizar } from '../middleware/auth.middleware.js';
import { NODE_ENV } from '../config/configEnv.js';

const router = Router();

function esSolicitudLocalDesarrollo(req) {
  if (
    NODE_ENV !== 'development'
    || !['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(req.socket.remoteAddress)
  ) {
    return false;
  }

  const { origin } = req.headers;
  if (!origin) return true;

  try {
    return ['localhost', '127.0.0.1', '[::1]'].includes(new URL(origin).hostname);
  } catch {
    return false;
  }
}

function autenticarVoluntariado(req, res, next) {
  if (esSolicitudLocalDesarrollo(req)) return next();
  return autenticar(req, res, next);
}

router.post('/login', iniciarSesion);
router.post('/logout', cerrarSesion);
router.get('/perfil', autenticar, obtenerPerfil);
router.patch('/correo', autenticar, cambiarCorreo);
router.patch('/disponibilidad-cuidado', autenticar, cambiarDisponibilidadCuidado);
router.get('/voluntarios', autenticarVoluntariado, listarVoluntarios);
router.post('/voluntarios', autenticar, autorizar('ADMINISTRADOR'), crearVoluntario);
router.delete('/:id', autenticar, autorizar('ADMINISTRADOR'), eliminarVoluntario);

export default router;
