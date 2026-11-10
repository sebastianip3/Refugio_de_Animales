import { Router } from 'express';
import animalRoutes from './animal.routes.js';
import especieRoutes from './especie.routes.js';
import adopcionRoutes from './adopcion.routes.js';
import esterilizacionRoutes from './esterilizacion.routes.js';
import cuentaRoutes from './cuenta.routes.js';
import cuidadoRoutes from './cuidado.routes.js';
import insumoRoutes from './insumo.routes.js';

const router = Router();

router.use('/animales', animalRoutes);
router.use('/especies', especieRoutes);
router.use('/adopciones', adopcionRoutes);
router.use('/esterilizacion', esterilizacionRoutes);
router.use('/cuentas', cuentaRoutes);
router.use('/cuidados', cuidadoRoutes);
router.use('/insumos', insumoRoutes);

export default router;
