import { Router } from 'express';
import { autenticar, autorizar } from '../middleware/auth.middleware.js';
import{
    listarJornadas, listarJornadasDisponibles, obtenerJornada, crearJornada, actualizarJornada,
    abrirFormulario, cerrarFormulario, eliminarJornada,
    crearInscripcion, listarInscripciones, obtenerInscripcion, actualizarInscripcion, reenviarComprobante,
} from '../controllers/esterilizacion.controller.js';

const router = Router();

const permisoAdministrador = [autenticar, autorizar('ADMINISTRADOR')];

// jornadas
router.get('/jornadas', permisoAdministrador, listarJornadas);
router.get('/jornadas/disponibles', listarJornadasDisponibles);
router.get('/jornadas/:id', obtenerJornada);
router.post('/jornadas', permisoAdministrador, crearJornada);
router.patch('/jornadas/:id', permisoAdministrador, actualizarJornada);
router.patch('/jornadas/:id/abrir', permisoAdministrador, abrirFormulario);
router.patch('/jornadas/:id/cerrar', permisoAdministrador, cerrarFormulario);
router.delete('/jornadas/:id', permisoAdministrador, eliminarJornada);

// inscripciones
router.get('/jornadas/:id/inscripciones', permisoAdministrador, listarInscripciones);
router.post('/jornadas/:id/inscripciones', crearInscripcion);
router.get('/inscripciones/:id', permisoAdministrador, obtenerInscripcion);
router.patch('/inscripciones/:id', permisoAdministrador, actualizarInscripcion);
router.post('/inscripciones/:id/reenviar-comprobante', permisoAdministrador, reenviarComprobante);

export default router;