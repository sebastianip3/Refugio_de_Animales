import { Router } from 'express';
import {
  asignarCuidado,
  consultarDisponibilidad,
  listarAnimalesConCuidadorVigente,
} from '../controllers/cuidado.controller.js';
import { autenticar } from '../middleware/auth.middleware.js';
import { permitirCuenta } from '../middleware/rol.middleware.js';

const router = Router();

router.get('/animales', listarAnimalesConCuidadorVigente);
router.get('/disponibilidad', consultarDisponibilidad);
router.post('/', autenticar, permitirCuenta('ADMINISTRADOR'), asignarCuidado);

export default router;
