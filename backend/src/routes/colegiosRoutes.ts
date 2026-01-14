import { Router } from 'express';
import { ColegiosController } from '../controllers/ColegiosController';
import { authenticateToken } from '../middleware/auth';
import { requirePermission } from '../middleware/authorization';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// GET /colegios - Obtener colegios con paginación
router.get('/', requirePermission('VER_CONTACTOS'), ColegiosController.obtenerColegios);

// GET /colegios/todos - Obtener todos los colegios sin paginación
router.get('/todos', requirePermission('VER_CONTACTOS'), ColegiosController.obtenerTodosLosColegios);

// GET /colegios/nombres - Obtener solo los nombres (para compatibilidad con el frontend)
router.get('/nombres', requirePermission('VER_CONTACTOS'), ColegiosController.obtenerNombresColegios);

export default router;
