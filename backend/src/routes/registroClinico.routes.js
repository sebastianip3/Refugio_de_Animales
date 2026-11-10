import { Router } from 'express';
import {
  obtenerHistorialClinico,
  crearRegistroClinico,
  actualizarRegistroClinico,
} from '../controllers/registroClinico.controller.js';
import { autenticar, autorizar } from '../middleware/auth.middleware.js';

// Se monta en /animales/:id/historial; mergeParams deja leer el :id del animal
const router = Router({ mergeParams: true });

// Solo el veterinario (o un administrador) registra y actualiza el historial clínico
const soloVeterinario = [autenticar, autorizar('VETERINARIO', 'ADMINISTRADOR')];

router.get('/', obtenerHistorialClinico);
router.post('/', soloVeterinario, crearRegistroClinico);
router.patch('/:registroId', soloVeterinario, actualizarRegistroClinico);

export default router;
