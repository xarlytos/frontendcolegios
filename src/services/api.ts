// Configuración base de la API
const API_BASE_URL = import.meta.env.VITE_API_URL || 
  (import.meta.env.DEV ? 'http://localhost:3001/api' : 'https://tu-backend.railway.app/api');
console.log('API_BASE_URL:', API_BASE_URL);
console.log('Environment:', import.meta.env.MODE);

interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor(baseURL: string) {
    this.baseURL = baseURL;
    this.loadToken();
  }

  private loadToken() {
    this.token = localStorage.getItem('auth_token');
    console.log('🔑 Token cargado:', this.token ? 'Token encontrado' : 'No hay token');
  }

  private saveToken(token: string) {
    this.token = token;
    localStorage.setItem('auth_token', token);
  }

  private removeToken() {
    this.token = null;
    localStorage.removeItem('auth_token');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseURL}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers.Authorization = `Bearer ${this.token}`;
    }

    try {
      console.log('🔄 API Request:', { url, method: options.method || 'GET', headers });
      console.log('🔑 Token actual:', this.token ? 'Presente' : 'Ausente');
      
      const response = await fetch(url, {
        ...options,
        headers,
      });

      console.log('📡 Response status:', response.status, response.statusText);
      console.log('📡 Response ok:', response.ok);

      const data = await response.json();
      
      console.log('📥 API Response:', {
        url,
        status: response.status,
        ok: response.ok,
        data
      });

      if (!response.ok) {
        console.error('❌ API Error Response:', { status: response.status, data });
        throw new Error(data.message || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('❌ API request failed:', { url, error });
      throw error;
    }
  }

  // Métodos HTTP
  async get<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async put<T>(endpoint: string, data?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: data ? JSON.stringify(data) : undefined,
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Métodos de autenticación
  setToken(token: string) {
    this.saveToken(token);
  }

  clearToken() {
    this.removeToken();
  }

  getToken(): string | null {
    return this.token;
  }
}

export const apiService = new ApiService(API_BASE_URL);
export type { ApiResponse };