import { apiService } from './api';

export interface Titulacion {
  _id: string;
  nombre: string;
  codigo: string;
  tipo: string;
  duracion: number;
  creditos: number;
  modalidad: string;
}

export interface Universidad {
  id: string;
  nombre: string;
  codigo: string;
  ciudad?: string;
  pais?: string;
  tipo?: string;
  activa: boolean;
  created_at?: string;
  updated_at?: string;
  titulaciones?: Titulacion[];
}

export interface Curso {
  curso: string;
  totalAlumnos: number;
  alumnos: {
    _id: string;
    nombreCompleto: string;
    telefono?: string;
    instagram?: string;
    anioNacimiento?: number;
    fechaAlta: string;
    comercialId?: string;
  }[];
}

export interface TitulacionConEstadisticas extends Titulacion {
  totalAlumnos: number;
  cursos: Curso[];
}

export interface UniversidadConEstadisticas extends Universidad {
  totalAlumnos: number;
  totalTitulaciones: number;
  titulaciones: TitulacionConEstadisticas[];
}

export interface EstadisticasGenerales {
  totalUniversidades: number;
  totalTitulaciones: number;
  totalAlumnos: number;
}

export interface UniversidadesConEstadisticasResponse {
  success: boolean;
  estadisticasGenerales: EstadisticasGenerales;
  universidades: UniversidadConEstadisticas[];
}

export interface CreateUniversidadData {
  nombre: string;
  codigo: string;
  ciudad?: string;
  pais?: string;
  tipo?: string;
  activa?: boolean; // Siempre se establece como true en el backend
}

export interface UpdateUniversidadData {
  nombre?: string;
  codigo?: string;
  ciudad?: string;
  pais?: string;
  tipo?: string;
  activa?: boolean; // Siempre se establece como true en el backend
}

class UniversidadesService {
  private baseUrl = '/universidades';

  // Obtener todas las universidades (público para usuarios autenticados)
  async getUniversidades(includeInactive: boolean = false): Promise<Universidad[]> {
    // Solicitar todas las universidades sin límite de paginación
    const url = includeInactive 
      ? `${this.baseUrl}?limit=999999` 
      : `${this.baseUrl}?activa=true&limit=999999`;
    console.log('🔍 URL para obtener universidades:', url);
    const response = await apiService.get<{universidades: Universidad[], pagination: any}>(url);
    console.log('📥 Respuesta del servidor:', response);
    console.log('📊 Universidades en la respuesta:', response.data?.universidades?.length || 0);
    return response.data?.universidades || [];
  }

  // Obtener una universidad por ID
  async getUniversidad(id: string): Promise<Universidad> {
    const response = await apiService.get<Universidad>(`${this.baseUrl}/${id}`);
    if (!response.data) {
      throw new Error('Universidad no encontrada');
    }
    return response.data;
  }

  // Crear una nueva universidad
  async createUniversidad(data: CreateUniversidadData): Promise<Universidad> {
    const response = await apiService.post<Universidad>(this.baseUrl, data);
    if (!response.data) {
      throw new Error('Error al crear la universidad');
    }
    return response.data;
  }

  // Actualizar una universidad
  async updateUniversidad(id: string, data: UpdateUniversidadData): Promise<Universidad> {
    const response = await apiService.put<Universidad>(`${this.baseUrl}/${id}`, data);
    if (!response.data) {
      throw new Error('Error al actualizar la universidad');
    }
    return response.data;
  }

  // Eliminar una universidad
  async deleteUniversidad(id: string): Promise<void> {
    await apiService.delete(`${this.baseUrl}/${id}`);
  }

  // Buscar universidad por código
  async buscarPorCodigo(codigo: string): Promise<Universidad> {
    const response = await apiService.get<Universidad>(`${this.baseUrl}/codigo/${codigo}`);
    if (!response.data) {
      throw new Error('Universidad no encontrada');
    }
    return response.data;
  }

  // Obtener universidades con estadísticas completas (titulaciones, cursos y alumnos)
  async getUniversidadesConEstadisticas(activa: boolean = true): Promise<UniversidadesConEstadisticasResponse> {
    const response = await apiService.get<UniversidadesConEstadisticasResponse>(
      `${this.baseUrl}/estadisticas?activa=${activa}`
    );
    if (!response.data) {
      throw new Error('Error al obtener las estadísticas');
    }
    return response.data;
  }

  // Normalizar nombres de colegios existentes
  async normalizarNombresColegios(): Promise<{success: boolean, contactosActualizados: number, errores: number, totalContactos: number}> {
    const response = await apiService.post<{success: boolean, contactosActualizados: number, errores: number, totalContactos: number}>(
      `${this.baseUrl}/normalizar-nombres`
    );
    if (!response.data) {
      throw new Error('Error al normalizar los nombres');
    }
    return response.data;
  }
}

const universidadesService = new UniversidadesService();
export default universidadesService;