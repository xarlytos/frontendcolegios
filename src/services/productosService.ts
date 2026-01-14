import { apiService } from './api';

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
}

export interface ActualizarProductoRequest {
  nombre: string;
}

class ProductosService {
  // Obtener todos los productos
  async getProductos(): Promise<{ success: boolean; productos: Producto[] }> {
    try {
      const response = await apiService.get<{ success: boolean; productos: Producto[] }>('/productos');
      console.log('📥 Respuesta completa de productos:', response);
      
      // El apiService devuelve { success, data, message, error }
      // pero el backend devuelve directamente { success, productos }
      if (response.success && response.data?.productos) {
        return response.data;
      } else if (response.success && (response as any).productos) {
        // Si la respuesta viene directamente sin envolver en data
        return response as any;
      } else {
        console.error('❌ Estructura de respuesta inesperada:', response);
        return { success: false, productos: [] };
      }
    } catch (error) {
      console.error('Error obteniendo productos:', error);
      throw error;
    }
  }

  // Crear nuevo producto
  async crearProducto(data: CrearProductoRequest): Promise<{ success: boolean; message: string; producto: Producto }> {
    try {
      const response = await apiService.post<{ success: boolean; message: string; producto: Producto }>('/productos', data);
      console.log('📥 Respuesta de crear producto:', response);
      
      if (response.success && response.data) {
        return response.data;
      } else if (response.success && (response as any).producto) {
        return response as any;
      } else {
        throw new Error('Error en la respuesta del servidor');
      }
    } catch (error) {
      console.error('Error creando producto:', error);
      throw error;
    }
  }

  // Actualizar producto
  async actualizarProducto(id: string, data: ActualizarProductoRequest): Promise<{ success: boolean; message: string; producto: Producto }> {
    try {
      const response = await apiService.put<{ success: boolean; message: string; producto: Producto }>(`/productos/${id}`, data);
      console.log('📥 Respuesta de actualizar producto:', response);
      
      if (response.success && response.data) {
        return response.data;
      } else if (response.success && (response as any).producto) {
        return response as any;
      } else {
        throw new Error('Error en la respuesta del servidor');
      }
    } catch (error) {
      console.error('Error actualizando producto:', error);
      throw error;
    }
  }

  // Eliminar producto
  async eliminarProducto(id: string): Promise<{ success: boolean; message: string }> {
    try {
      const response = await apiService.delete<{ success: boolean; message: string }>(`/productos/${id}`);
      console.log('📥 Respuesta de eliminar producto:', response);
      
      if (response.success && response.data) {
        return response.data;
      } else if (response.success && (response as any).message) {
        return response as any;
      } else {
        throw new Error('Error en la respuesta del servidor');
      }
    } catch (error) {
      console.error('Error eliminando producto:', error);
      throw error;
    }
  }
}

const productosService = new ProductosService();
export default productosService;
