import { Router } from 'express';
import {
  listarAdopciones,
  obtenerAdopcion,
  crearAdopcion,
  actualizarAdopcion,
} from '../controllers/adopcion.controller.js';

const router = Router();

router.get('/', listarAdopciones);
router.get('/:id', obtenerAdopcion);
router.post('/', crearAdopcion);
router.patch('/:id', actualizarAdopcion);

export default router;
