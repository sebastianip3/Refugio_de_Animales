import { Router } from 'express';
import animalRoutes from './animal.routes.js';
import especieRoutes from './especie.routes.js';

const router = Router();

router.use('/animales', animalRoutes);
router.use('/especies', especieRoutes);

export default router;
