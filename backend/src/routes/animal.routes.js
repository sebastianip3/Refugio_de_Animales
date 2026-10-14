import { Router } from 'express';
import {
  listarAnimales,
  obtenerAnimal,
  obtenerHistorialClinico,
  crearAnimal,
  actualizarAnimal,
  eliminarAnimal,
} from '../controllers/animal.controller.js';

const router = Router();

router.get('/', listarAnimales);
router.get('/:id', obtenerAnimal);
// El historial clínico solo se expone para consulta (sin POST/PATCH/DELETE)
router.get('/:id/historial', obtenerHistorialClinico);
router.post('/', crearAnimal);
router.patch('/:id', actualizarAnimal);
router.delete('/:id', eliminarAnimal);

export default router;
