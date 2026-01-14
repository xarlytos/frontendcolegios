import { apiService } from './api';

export interface Contacto {
  id: string;
  nombreCompleto: string;
  telefono?: string;
  instagram?: string;
  anioNacimiento: number;
  fechaAlta: string;
  comercialId: string;
  comercialNombre?: string;
}

export interface Graduacion {
  id: string;
  nombreColegio: string;
  anioNacimiento: number;
  responsable: string;
  tipoProducto: string;
  prevision: string;
  estado: string;
  observaciones: string;
  fechaGraduacion?: string;
  totalContactos: number;
  contactos: Contacto[];
  creadoPor: any;
  actualizadoPor?: any;
  createdAt: string;
  updatedAt: string;
}

export interface AniosDisponiblesResponse {
  success: boolean;
  anios: number[];
}

export interface GraduacionesPorAnioResponse {
  success: boolean;
  graduaciones: Graduacion[];
  totalContactos: number;
}

export interface ActualizarGraduacionData {
  responsable?: string;
  tipoProducto?: string;
  prevision?: string;
  estado?: string;
  observaciones?: string;
  fechaGraduacion?: string;
}

export interface ActualizarGraduacionResponse {
  success: boolean;
  message: string;
  graduacion: {
    id: string;
    nombreColegio: string;
    responsable: string;
    tipoProducto: string;
    prevision: string;
    estado: string;
    observaciones: string;
    fechaGraduacion?: string;
  };
}

export interface SincronizarResponse {
  success: boolean;
  message: string;
  graduacionesCreadas: number;
  graduacionesActualizadas: number;
  totalProcesadas: number;
}

class GraduacionesService {
  private baseUrl = '/graduaciones';

  // Obtener años disponibles en los contactos
  async getAniosDisponibles(): Promise<number[]> {
    const response = await apiService.get<AniosDisponiblesResponse>(`${this.baseUrl}/anios`);
    return response.anios || [];
  }

  // Obtener graduaciones de un año específico
  async getColegiosPorAnio(anio: number): Promise<GraduacionesPorAnioResponse> {
    const response = await apiService.get<GraduacionesPorAnioResponse>(`${this.baseUrl}/colegios/${anio}`);
    return response;
  }

  // Actualizar campos editables de una graduación
  async actualizarGraduacion(id: string, data: ActualizarGraduacionData): Promise<ActualizarGraduacionResponse> {
    const response = await apiService.put<ActualizarGraduacionResponse>(`${this.baseUrl}/${id}`, data);
    return response;
  }

  // Sincronizar graduaciones con contactos existentes
  async sincronizarGraduaciones(): Promise<SincronizarResponse> {
    const response = await apiService.post<SincronizarResponse>(`${this.baseUrl}/sync`);
    return response;
  }
}

const graduacionesService = new GraduacionesService();
export default graduacionesService;
