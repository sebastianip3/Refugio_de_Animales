import { Router } from 'express';
import{
    listarJornadas, listarJornadasDisponibles, obtenerJornada, crearJornada, actualizarJornada,
    abrirFormulario, cerrarFormulario, eliminarJornada,
    crearInscripcion, listarInscripciones, obtenerInscripcion, actualizarInscripcion, reenviarComprobante,
} from '../controllers/esterilizacion.controller.js';

const router = Router();

// jornadas
router.get('/jornadas', listarJornadas);
router.get('/jornadas/disponibles', listarJornadasDisponibles);
router.get('/jornadas/:id', obtenerJornada);
router.post('/jornadas', crearJornada);
router.patch('/jornadas/:id', actualizarJornada);
router.patch('/jornadas/:id/abrir', abrirFormulario);
router.patch('/jornadas/:id/cerrar', cerrarFormulario);
router.delete('/jornadas/:id', eliminarJornada);

// inscripciones
router.get('/jornadas/:id/inscripciones', listarInscripciones);
router.post('/jornadas/:id/inscripciones', crearInscripcion);
router.get('/inscripciones/:id', obtenerInscripcion);
router.patch('/inscripciones/:id', actualizarInscripcion);
router.post('/inscripciones/:id/reenviar-comprobante', reenviarComprobante);

export default router;