import { Router } from 'express';
import { listarEspecies } from '../controllers/especie.controller.js';

const router = Router();

router.get('/', listarEspecies);

export default router;
