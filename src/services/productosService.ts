import { api } from './api';

export interface Producto {
  _id: string;
  nombre: string;
  descripcion?: string;
  activo: boolean;
  creadoPor: string;
  actualizadoPor?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CrearProductoRequest {
  nombre: string;
  descripcion?: string;
}

export interface ActualizarProductoRequest {
  nombre: string;
  descripcion?: string;
}

class ProductosService {
  // Obtener todos los productos
  async getProductos(): Promise<{ success: boolean; productos: Producto[] }> {
    try {
      const response = await api.get('/productos');
      return response.data;
    } catch (error) {
      console.error('Error obteniendo productos:', error);
      throw error;
    }
  }

  // Crear nuevo producto
  async crearProducto(data: CrearProductoRequest): Promise<{ success: boolean; message: string; producto: Producto }> {
    try {
      const response = await api.post('/productos', data);
      return response.data;
    } catch (error) {
      console.error('Error creando producto:', error);
      throw error;
    }
  }

  // Actualizar producto
  async actualizarProducto(id: string, data: ActualizarProductoRequest): Promise<{ success: boolean; message: string; producto: Producto }> {
    try {
      const response = await api.put(`/productos/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('Error actualizando producto:', error);
      throw error;
    }
  }

  // Eliminar producto
  async eliminarProducto(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await api.delete(`/productos/${id}`);
      return response.data;
    } catch (error) {
      console.error('Error eliminando producto:', error);
      throw error;
    }
  }
}

const productosService = new ProductosService();
export default productosService;
