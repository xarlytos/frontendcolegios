import { Router } from 'express';
import { GraduacionesController } from '../controllers/GraduacionesController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// GET /graduaciones/anios - Obtener años disponibles
router.get('/anios', GraduacionesController.getAniosDisponibles);

// GET /graduaciones/colegios/:anio - Obtener graduaciones de un año específico
router.get('/colegios/:anio', GraduacionesController.getColegiosPorAnio);

// PUT /graduaciones/:id - Actualizar campos editables de una graduación
router.put('/:id', GraduacionesController.actualizarGraduacion);

// POST /graduaciones/sync - Sincronizar graduaciones con contactos existentes
router.post('/sync', GraduacionesController.sincronizarGraduaciones);

export default router;
