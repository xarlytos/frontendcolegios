export interface Contact {
  id: string;
  nombre: string;
  telefono?: string;
  instagram?: string;
  nombre_colegio: string;
  año_nacimiento: number;
  fecha_alta: string;
  comercial_id?: string;
  comercial_nombre?: string;
  comercial?: string;
  email?: string;
  aportado_por?: string;
  dia_libre?: string;
}

export interface ContactFilters {
  nombre_colegio: string;
  aportado_por: string;
  consentimiento: string;
  search: string;
}