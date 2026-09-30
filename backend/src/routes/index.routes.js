import { Router } from 'express';
import animalRoutes from './animal.routes.js';

const router = Router();

router.use('/animales', animalRoutes);

export default router;
