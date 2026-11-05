import { Router } from 'express';
import {
  cambiarDisponibilidadCuidado,
  iniciarSesion,
} from '../controllers/cuenta.controller.js';
import { autenticar } from '../middleware/auth.middleware.js';

const router = Router();

router.post('/login', iniciarSesion);
router.patch('/disponibilidad-cuidado', autenticar, cambiarDisponibilidadCuidado);

export default router;
