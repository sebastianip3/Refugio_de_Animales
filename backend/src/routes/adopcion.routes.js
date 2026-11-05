import { Router } from 'express';
import {
  listarAdopciones,
  listarAnimalesEnProceso,
  obtenerAdopcion,
  crearAdopcion,
  actualizarAdopcion,
} from '../controllers/adopcion.controller.js';
import { autenticar, autorizar } from '../middleware/auth.middleware.js';

const router = Router();

// Solo el encargado de adopciones (o un administrador) ve y evalúa las solicitudes
const soloEncargado = [autenticar, autorizar('ENCARGADO_ADOPCIONES', 'ADMINISTRADOR')];

// Públicas: cualquier adoptante puede enviar la ficha
router.get('/animales-en-proceso', listarAnimalesEnProceso);
router.post('/', crearAdopcion);

router.get('/', soloEncargado, listarAdopciones);
router.get('/:id', soloEncargado, obtenerAdopcion);
router.patch('/:id', soloEncargado, actualizarAdopcion);
export default router;
