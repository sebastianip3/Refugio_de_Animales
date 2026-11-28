import { Router } from 'express';
import { autenticar, autorizar, autenticarOpcional } from '../middleware/auth.middleware.js';
import {
  listarAnimales,
  obtenerAnimal,
  crearAnimal,
  actualizarAnimal,
  eliminarAnimal,
  marcarEncontrado,
} from '../controllers/animal.controller.js';

const permisoActualizar = [autenticar, autorizar('ADMINISTRADOR', 'TRABAJADOR', 'VOLUNTARIO', 'ENCARGADO_ADOPCIONES')];
const permisoCrear = [autenticar, autorizar('ADMINISTRADOR', 'TRABAJADOR', 'VOLUNTARIO')];
const permisoEliminar = [autenticar, autorizar('ADMINISTRADOR')];

const router = Router();

router.get('/', autenticarOpcional, listarAnimales);
router.get('/:id', autenticarOpcional, obtenerAnimal);
router.post('/', permisoCrear, crearAnimal);
router.patch('/:id/encontrado', permisoActualizar, marcarEncontrado);
router.patch('/:id', permisoActualizar, actualizarAnimal);
router.delete('/:id', permisoEliminar, eliminarAnimal);

export default router;
