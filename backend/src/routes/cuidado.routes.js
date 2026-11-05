import { Router } from 'express';
import {
  asignarCuidado,
  consultarDisponibilidad,
} from '../controllers/cuidado.controller.js';

const router = Router();

router.get('/disponibilidad', consultarDisponibilidad);
router.post('/', asignarCuidado);

export default router;
