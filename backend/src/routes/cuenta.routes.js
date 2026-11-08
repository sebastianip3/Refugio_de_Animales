import { Router } from 'express';
import {
  iniciarSesion,
  cerrarSesion,
  obtenerPerfil,
  cambiarCorreo,
} from '../controllers/cuenta.controller.js';
import { autenticar } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/login', iniciarSesion);
router.post('/logout', cerrarSesion);
router.get('/perfil', autenticar, obtenerPerfil);
router.patch('/correo', autenticar, cambiarCorreo);

export default router;
