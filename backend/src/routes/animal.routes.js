import { Router } from 'express';
import {
  listarAnimales,
  obtenerAnimal,
  crearAnimal,
  actualizarAnimal,
  eliminarAnimal,
} from '../controllers/animal.controller.js';

const router = Router();

router.get('/', listarAnimales);
router.get('/:id', obtenerAnimal);
router.post('/', crearAnimal);
router.patch('/:id', actualizarAnimal);
router.delete('/:id', eliminarAnimal);

export default router;
