import { Router } from 'express';
import { ProductosController } from '../controllers/ProductosController';
import { authenticateToken } from '../middleware/auth';

const router = Router();

// Todas las rutas requieren autenticación
router.use(authenticateToken);

// GET /productos - Obtener todos los productos
router.get('/', ProductosController.getProductos);

// POST /productos - Crear nuevo producto
router.post('/', ProductosController.crearProducto);

// PUT /productos/:id - Actualizar producto
router.put('/:id', ProductosController.actualizarProducto);

// DELETE /productos/:id - Eliminar producto
router.delete('/:id', ProductosController.eliminarProducto);

export default router;
