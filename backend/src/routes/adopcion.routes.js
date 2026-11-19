import { Router } from 'express';
import {
  listarAdopciones,
  listarAnimalesEnProceso,
  obtenerAdopcion,
  crearAdopcion,
  consultarSolicitudes,
  actualizarAdopcion,
  listarProximasVisitas,
  listarVisitas,
  agendarVisita,
  cancelarVisita,
  registrarResultadoVisita,
  rechazarAdopcionTrasVisita,
} from '../controllers/adopcion.controller.js';
import { autenticar, autorizar } from '../middleware/auth.middleware.js';

const router = Router();

// Solo el encargado de adopciones (o un administrador) ve y evalúa las solicitudes
const soloEncargado = [autenticar, autorizar('ENCARGADO_ADOPCIONES', 'ADMINISTRADOR')];

// Públicas: cualquier adoptante puede enviar la ficha
router.get('/animales-en-proceso', listarAnimalesEnProceso);
router.post('/', crearAdopcion);
// El adoptante consulta el estado de sus solicitudes con su RUT y su correo
router.post('/consultar', consultarSolicitudes);

// Antes de /:id para que "visitas" no se lea como un ID
router.get('/visitas/proximas', soloEncargado, listarProximasVisitas);

router.get('/', soloEncargado, listarAdopciones);
router.get('/:id', soloEncargado, obtenerAdopcion);
router.patch('/:id', soloEncargado, actualizarAdopcion);

// Visitas post adopción
router.get('/:id/visitas', soloEncargado, listarVisitas);
router.post('/:id/visitas', soloEncargado, agendarVisita);
router.patch('/:id/visitas/:visitaId/cancelar', soloEncargado, cancelarVisita);
router.patch('/:id/visitas/:visitaId/resultado', soloEncargado, registrarResultadoVisita);
router.patch('/:id/visitas/:visitaId/rechazar-adopcion', soloEncargado, rechazarAdopcionTrasVisita);
export default router;
