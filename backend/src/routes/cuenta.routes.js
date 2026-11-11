import { Router } from 'express';
import {
  iniciarSesion,
  cerrarSesion,
  obtenerPerfil,
  cambiarCorreo,
  cambiarDisponibilidadCuidado,
  eliminarVoluntario,
} from '../controllers/cuenta.controller.js';
import { autenticar } from '../middleware/auth.middleware.js';
import { permitirCuenta } from '../middleware/rol.middleware.js';

const router = Router();

router.post('/login', iniciarSesion);
router.post('/logout', cerrarSesion);
router.get('/perfil', autenticar, obtenerPerfil);
router.patch('/correo', autenticar, cambiarCorreo);
router.patch('/disponibilidad-cuidado', autenticar, cambiarDisponibilidadCuidado);
router.delete('/:id', autenticar, permitirCuenta('ADMINISTRADOR'), eliminarVoluntario);

export default router;
