// Permisos disponibles en el sistema
// Esta lista debe mantenerse sincronizada con los permisos definidos en backend/src/scripts/seed.ts

export interface Permission {
  id: string;
  clave: string;
  descripcion: string;
}

export const AVAILABLE_PERMISSIONS: Permission[] = [
  {
    id: '1',
    clave: 'CREAR_CONTACTOS',
    descripcion: 'Permite crear nuevos contactos'
  },
  {
    id: '2',
    clave: 'CREAR_USUARIOS',
    descripcion: 'Permite crear usuarios'
  },
  {
    id: '3',
    clave: 'EDITAR_CONTACTOS',
    descripcion: 'Permite editar contactos existentes'
  },
  {
    id: '4',
    clave: 'EDITAR_USUARIOS',
    descripcion: 'Permite editar usuarios'
  },
  {
    id: '5',
    clave: 'ELIMINAR_CONTACTOS',
    descripcion: 'Permite eliminar contactos'
  },
  {
    id: '6',
    clave: 'ELIMINAR_USUARIOS',
    descripcion: 'Permite eliminar usuarios'
  },
  {
    id: '7',
    clave: 'GESTIONAR_PERMISOS',
    descripcion: 'Permite gestionar permisos de usuarios'
  },
  {
    id: '8',
    clave: 'VER_CONTACTOS',
    descripcion: 'Permite ver contactos'
  },
  {
    id: '9',
    clave: 'VER_GRADUACIONES',
    descripcion: 'Permite ver la página de graduaciones'
  },
  {
    id: '10',
    clave: 'VER_USUARIOS',
    descripcion: 'Permite ver usuarios'
  }
];