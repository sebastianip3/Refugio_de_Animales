import { Router } from 'express';
import {
  asignarCuidado,
  consultarDisponibilidad,
  listarAnimalesConCuidadorVigente,
} from '../controllers/cuidado.controller.js';
import { autenticar, autorizar } from '../middleware/auth.middleware.js';

const router = Router();

router.get('/animales', listarAnimalesConCuidadorVigente);
router.get('/disponibilidad', consultarDisponibilidad);
router.post('/', autenticar, autorizar('ADMINISTRADOR'), asignarCuidado);

export default router;
