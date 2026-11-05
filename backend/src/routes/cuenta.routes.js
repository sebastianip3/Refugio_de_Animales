import { Router } from 'express';
import { iniciarSesion, obtenerPerfil, cambiarCorreo } from '../controllers/cuenta.controller.js';
import { autenticar } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/login', iniciarSesion);
router.get('/perfil', autenticar, obtenerPerfil);
router.patch('/correo', autenticar, cambiarCorreo);

export default router;
