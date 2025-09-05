import { Router } from 'express';
import { GraduacionesController } from '../controllers/GraduacionesController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// GET /graduaciones/anios - Obtener años disponibles
router.get('/anios', GraduacionesController.getAniosDisponibles);

// GET /graduaciones/colegios/:anio - Obtener colegios con contactos de un año específico
router.get('/colegios/:anio', GraduacionesController.getColegiosPorAnio);

export default router;
