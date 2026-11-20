import { Router } from 'express';
import { autenticar, autorizar } from '../middleware/auth.middleware.js';
import {
  listarAnimales,
  obtenerAnimal,
  crearAnimal,
  actualizarAnimal,
  eliminarAnimal,
} from '../controllers/animal.controller.js';

const permisoActualizar = [autenticar, autorizar('ADMINISTRADOR', 'TRABAJADOR', 'VOLUNTARIO', 'ENCARGADO_ADOPCIONES')];
const permisoCrear = [autenticar, autorizar('ADMINISTRADOR', 'TRABAJADOR', 'VOLUNTARIO')];
const permisoEliminar = [autenticar, autorizar('ADMINISTRADOR')];

const router = Router();

router.get('/', listarAnimales);
router.get('/:id', obtenerAnimal);
router.post('/', permisoCrear, crearAnimal);
router.patch('/:id', permisoActualizar, actualizarAnimal);
router.delete('/:id', permisoEliminar, eliminarAnimal);

export default router;
