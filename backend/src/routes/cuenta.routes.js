import { Router } from 'express';
import { iniciarSesion } from '../controllers/cuenta.controller.js';

const router = Router();

router.post('/login', iniciarSesion);

export default router;
