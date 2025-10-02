import { apiService } from './api';

export interface Configuracion {
  clave: string;
  valor: any;
  descripcion: string;
  actualizadoEn: string;
}

interface ConfiguracionResponse {
  success: boolean;
  configuracion?: Configuracion;
  message?: string;
}

class ConfiguracionService {
  private baseUrl = '/configuracion';

  // Obtener configuración por clave
  async obtenerConfiguracion(clave: string): Promise<Configuracion | null> {
    try {
      const response = await apiService.get<{ success: boolean; configuracion: Configuracion }>(`${this.baseUrl}/${clave}`);
      return response.configuracion;
    } catch (error) {
      console.error('Error obteniendo configuración:', error);
      return null;
    }
  }

  // Actualizar configuración
  async actualizarConfiguracion(clave: string, valor: any, descripcion?: string): Promise<boolean> {
    try {
      const response = await apiService.put<{ success: boolean }>(`${this.baseUrl}/${clave}`, {
        valor,
        descripcion
      });
      return response.success;
    } catch (error) {
      console.error('Error actualizando configuración:', error);
      return false;
    }
  }

  // Obtener todas las configuraciones
  async obtenerTodasLasConfiguraciones(): Promise<Configuracion[]> {
    try {
      const response = await apiService.get<{ success: boolean; configuraciones: Configuracion[] }>(this.baseUrl);
      return response.configuraciones;
    } catch (error) {
      console.error('Error obteniendo configuraciones:', error);
      return [];
    }
  }

  // Métodos específicos para graduaciones
  async obtenerVisibilidadContactos(): Promise<boolean> {
    const config = await this.obtenerConfiguracion('graduaciones_mostrar_contactos');
    return config?.valor === true;
  }

  async actualizarVisibilidadContactos(mostrar: boolean): Promise<boolean> {
    return await this.actualizarConfiguracion(
      'graduaciones_mostrar_contactos',
      mostrar,
      `Visibilidad de contactos en graduaciones ${mostrar ? 'activada' : 'desactivada'}`
    );
  }

  // Inicializar permisos faltantes
  async inicializarPermisos(): Promise<boolean> {
    try {
      console.log('🔄 Iniciando llamada a inicializarPermisos...');
      const response = await apiService.post<{ success: boolean; permisosCreados: number }>(`${this.baseUrl}/init-permissions`);
      console.log('🔧 Respuesta de inicializarPermisos:', response);
      if (response.success) {
        console.log('✅ Permisos inicializados correctamente:', response.permisosCreados, 'creados');
        return true;
      } else {
        console.error('❌ Error en la respuesta del servidor:', response);
        return false;
      }
    } catch (error) {
      console.error('❌ Error inicializando permisos:', error);
      return false;
    }
  }

  // Obtener año seleccionado
  async obtenerAnioSeleccionado(): Promise<number | null> {
    try {
      const response = await apiService.get<ConfiguracionResponse>(`${this.baseUrl}/graduaciones_anio_seleccionado`);
      if (response.success && response.configuracion?.valor) {
        return parseInt(response.configuracion.valor);
      }
      return null;
    } catch (error) {
      console.error('Error obteniendo año seleccionado:', error);
      return null;
    }
  }

  // Actualizar año seleccionado
  async actualizarAnioSeleccionado(anio: number): Promise<boolean> {
    try {
      console.log('🔄 Enviando año al backend:', anio, 'tipo:', typeof anio);
      const response = await apiService.put<ConfiguracionResponse>(`${this.baseUrl}/graduaciones_anio_seleccionado`, { 
        anio: Number(anio) // Asegurar que sea un número
      });
      console.log('📥 Respuesta del backend:', response);
      return response.success;
    } catch (error) {
      console.error('Error actualizando año seleccionado:', error);
      return false;
    }
  }
}

const configuracionService = new ConfiguracionService();
export default configuracionService;
