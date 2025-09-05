import { apiService } from './api';

export interface ColegioConContactos {
  nombreColegio: string;
  totalContactos: number;
  contactos: {
    id: string;
    nombreCompleto: string;
    telefono?: string;
    instagram?: string;
    anioNacimiento: number;
    fechaAlta: string;
    comercialId: string;
    comercialNombre?: string;
  }[];
}

export interface AniosDisponiblesResponse {
  success: boolean;
  anios: number[];
}

export interface ColegiosPorAnioResponse {
  success: boolean;
  colegios: ColegioConContactos[];
  totalContactos: number;
}

class GraduacionesService {
  private baseUrl = '/graduaciones';

  // Obtener años disponibles en los contactos
  async getAniosDisponibles(): Promise<number[]> {
    const response = await apiService.get<AniosDisponiblesResponse>(`${this.baseUrl}/anios`);
    return response.anios || [];
  }

  // Obtener colegios con contactos de un año específico
  async getColegiosPorAnio(anio: number): Promise<ColegiosPorAnioResponse> {
    const response = await apiService.get<ColegiosPorAnioResponse>(`${this.baseUrl}/colegios/${anio}`);
    return response;
  }
}

const graduacionesService = new GraduacionesService();
export default graduacionesService;
