import { Router } from 'express';
import { ConfiguracionController } from '../controllers/ConfiguracionController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Middleware de logging para todas las rutas
router.use((req, res, next) => {
  console.log(`🔧 ConfiguracionRoutes - ${req.method} ${req.path}`);
  console.log('🔧 Body:', req.body);
  next();
});

// Aplicar autenticación a todas las rutas
router.use(authenticateToken);

// GET /configuracion - Obtener todas las configuraciones
router.get('/', ConfiguracionController.obtenerTodasLasConfiguraciones);

// PUT /configuracion/graduaciones_anio_seleccionado - Actualizar año seleccionado (DEBE ir antes que /:clave)
router.put('/graduaciones_anio_seleccionado', (req, res, next) => {
  console.log('🔧 Ruta graduaciones_anio_seleccionado - Request recibido');
  console.log('🔧 Body:', req.body);
  console.log('🔧 Headers:', req.headers);
  next();
}, ConfiguracionController.actualizarAnioSeleccionado);

// POST /configuracion/init-permissions - Inicializar permisos faltantes
router.post('/init-permissions', ConfiguracionController.inicializarPermisos);

// GET /configuracion/:clave - Obtener configuración por clave
router.get('/:clave', ConfiguracionController.obtenerConfiguracion);

// PUT /configuracion/:clave - Actualizar configuración
router.put('/:clave', ConfiguracionController.actualizarConfiguracion);

export default router;
