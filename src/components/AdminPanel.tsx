import React, { useState, useEffect } from 'react';
import { User } from '../types/auth';
import { Shield, Key, Users, Trash2, Check, X, Settings, GraduationCap, ChevronDown, ChevronUp, Building2, BookOpen, Loader2, Plus, TrendingUp, Edit, Database } from 'lucide-react';
import { usersService } from '../services/usersService';
import { AVAILABLE_PERMISSIONS, Permission } from '../constants/permissions';
import universidadesService, { Universidad, CreateUniversidadData, UpdateUniversidadData } from '../services/universidadesService';
import titulacionesService, { CreateTitulacionData as CreateTitulacionFormData } from '../services/titulacionesService';
import { contactsService } from '../services/contactsService';
import configuracionService from '../services/configuracionService';

interface AdminPanelProps {
  users: User[];
  currentUser: User;
  onUpdateUserPassword: (userId: string, newPassword: string) => Promise<boolean>;
  onToggleDeletePermission: (userId: string, canDelete: boolean) => Promise<boolean>;
  getUserDeletePermission: (userId: string) => Promise<boolean>;
}

export default function AdminPanel({ 
  users, 
  currentUser, 
  onUpdateUserPassword, 
  onToggleDeletePermission,
  getUserDeletePermission 
}: AdminPanelProps) {
  console.log('AdminPanel - users recibidos:', users);
  console.log('AdminPanel - tipo de users:', typeof users);
  console.log('AdminPanel - es array:', Array.isArray(users));
  
  const [activeTab, setActiveTab] = useState<'permissions' | 'passwords' | 'universities' | 'contacts'>('permissions');
  const [passwordForm, setPasswordForm] = useState<{userId: string; newPassword: string; confirmPassword: string} | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [permissionsModal, setPermissionsModal] = useState<{userId: string; userName: string; userPermissions: string[]; selectedPermissionIds: string[]} | null>(null);
  const [selectedPermissions, setSelectedPermissions] = useState<string[]>([]);
  const [userPermissionsMap, setUserPermissionsMap] = useState<Map<string, string[]>>(new Map());
  const [availablePermissions, setAvailablePermissions] = useState<Array<{ id: string; clave: string; descripcion: string }>>([]);
  const [loadingAvailablePermissions, setLoadingAvailablePermissions] = useState(true);
  const [loadingPermissions, setLoadingPermissions] = useState(false);
  const [universities, setUniversities] = useState<Universidad[]>([]);
  const [loadingUniversities, setLoadingUniversities] = useState(false);
  const [showCreateUniversityModal, setShowCreateUniversityModal] = useState(false);
  const [createUniversityForm, setCreateUniversityForm] = useState<CreateUniversidadData>({
    nombre: '',
    codigo: '',
    ciudad: '',
    pais: 'España',
    tipo: 'publica',
    activa: true
  });
  const [creatingUniversity, setCreatingUniversity] = useState(false);
  const [increasingCourse, setIncreasingCourse] = useState(false);
  const [showEditUniversityModal, setShowEditUniversityModal] = useState(false);
  const [editUniversityForm, setEditUniversityForm] = useState<{ id: string; nombre: string; tipo: string; ciudad: string }>({
    id: '',
    nombre: '',
    tipo: 'publica',
    ciudad: ''
  });
  const [editingUniversity, setEditingUniversity] = useState(false);
  const [deletingUniversity, setDeletingUniversity] = useState(false);
  const [editingUniversityTitulaciones, setEditingUniversityTitulaciones] = useState<any[]>([]);
  const [showInlineTitulacionForm, setShowInlineTitulacionForm] = useState(false);
  const [editingTitulacionIndex, setEditingTitulacionIndex] = useState<number | null>(null);
  const [editTitulacionForm, setEditTitulacionForm] = useState({
    id: '',
    nombre: '',
    codigo: '',
    duracion: 4
  });
  const [creatingTitulacion, setCreatingTitulacion] = useState(false);
  const [editingTitulacion, setEditingTitulacion] = useState(false);

  // Debug useEffect para monitorear cambios en selectedPermissions
  useEffect(() => {
    console.log('🔍 selectedPermissions cambió:', selectedPermissions);
  }, [selectedPermissions]);
  
  // Sincronizar selectedPermissions cuando el modal se abre con permisos precargados
  useEffect(() => {
    if (permissionsModal && permissionsModal.selectedPermissionIds) {
      console.log('🔍 Sincronizando permisos del modal:', permissionsModal.selectedPermissionIds);
      setSelectedPermissions(permissionsModal.selectedPermissionIds);
    }
  }, [permissionsModal]);
  
  // Cargar permisos disponibles al montar el componente
  useEffect(() => {
    const loadAvailablePermissions = async () => {
      try {
        console.log('🔄 Loading available permissions...');
        setLoadingAvailablePermissions(true);
        const response = await usersService.getAvailablePermissions();
        console.log('📥 Available permissions response:', response);
        console.log('📥 Response type:', typeof response);
        console.log('📥 Response keys:', Object.keys(response));
        
        if (response.success && response.permisos) {
          console.log('✅ Setting available permissions:', response.permisos);
          console.log('✅ Permissions count:', response.permisos.length);
          setAvailablePermissions(response.permisos);
        } else {
          console.log('❌ No permissions in response or not successful');
          console.log('❌ Response success:', response.success);
          console.log('❌ Response permisos:', response.permisos);
          // Usar fallback temporalmente para que funcione
          console.log('🔄 Using fallback permissions from constants');
          setAvailablePermissions(AVAILABLE_PERMISSIONS);
        }
      } catch (error) {
        console.error('❌ Error loading available permissions:', error);
        console.error('❌ Error details:', error.message);
        // Fallback a permisos estáticos si hay error
        console.log('🔄 Using fallback permissions from constants due to error');
        setAvailablePermissions(AVAILABLE_PERMISSIONS);
      } finally {
        setLoadingAvailablePermissions(false);
      }
    };
    
    loadAvailablePermissions();
  }, []);

  // Cargar permisos de todos los usuarios comerciales al montar el componente
  useEffect(() => {
    const loadAllUserPermissions = async () => {
      const newPermissionsMap = new Map<string, string[]>();
      for (const user of comercialUsers) {
        try {
          const response = await usersService.getUserPermissions(user.id) as any;
          if (response.success && response.permisos) {
            newPermissionsMap.set(user.id, response.permisos);
          }
        } catch (error) {
          console.error(`Error loading permissions for user ${user.id}:`, error);
        }
      }
      setUserPermissionsMap(newPermissionsMap);
    };
    
    if (comercialUsers.length > 0) {
      loadAllUserPermissions();
    }
  }, [users]);
  
  // Cargar universidades cuando se selecciona el tab de universidades
  useEffect(() => {
    const loadUniversities = async () => {
      if (activeTab === 'universities') {
        setLoadingUniversities(true);
        try {
          console.log('🔄 Cargando universidades...');
          // Cargar todas las universidades (activas e inactivas) para el admin
          const data = await universidadesService.getUniversidades(true);
          console.log('🎓 Universidades cargadas:', data);
          console.log('📊 Cantidad de universidades:', data.length);
          setUniversities(data);
        } catch (error) {
          console.error('❌ Error loading universities:', error);
          console.error('❌ Error details:', error);
          setUniversities([]);
        } finally {
          setLoadingUniversities(false);
        }
      }
    };
    
    loadUniversities();
  }, [activeTab]);

  const comercialUsers = users.filter(user => user.role === 'comercial');
  

  // Función para mapear IDs del frontend a ObjectIds de la base de datos
  const mapFrontendIdsToObjectIds = (frontendIds: string[]): string[] => {
    // Mapeo de IDs del frontend a ObjectIds reales de la base de datos
    const ID_MAPPING: { [key: string]: string } = {
      '1': '68ddca89495f5253741767ac', // CREAR_CONTACTOS
      '2': '68ddca89495f5253741767b8', // CREAR_USUARIOS
      '3': '68ddca89495f5253741767af', // EDITAR_CONTACTOS
      '4': '68ddca89495f5253741767bb', // EDITAR_USUARIOS
      '5': '68ddca89495f5253741767b2', // ELIMINAR_CONTACTOS
      '6': '68ddca89495f5253741767be', // ELIMINAR_USUARIOS
      '7': '68ddca89495f5253741767c1', // GESTIONAR_PERMISOS
      '8': '68ddca89495f5253741767a7', // VER_CONTACTOS
      '9': '68ddd4300ef5d037b6afdbf8', // VER_GRADUACIONES
      '10': '68ddca89495f5253741767b5'  // VER_USUARIOS
    };
    
    return frontendIds.map(id => ID_MAPPING[id]).filter(Boolean);
  };

  // Función para abrir el modal de configuración de permisos
  const openPermissionsModal = async (userId: string, userName: string) => {
    console.log('🚀🚀🚀 openPermissionsModal INICIADO para:', { userId, userName });
    console.log('🚀 availablePermissions length:', availablePermissions.length);
    
    // Si no hay permisos disponibles, cargar desde el backend
    if (availablePermissions.length === 0 && !loadingAvailablePermissions) {
      console.log('⚠️ No hay permisos disponibles, cargando desde backend...');
      try {
        const response = await usersService.getAvailablePermissions();
        if (response.success && response.permisos) {
          console.log('✅ Permisos cargados desde backend:', response.permisos.length);
          setAvailablePermissions(response.permisos);
        } else {
          console.log('❌ Error cargando permisos desde backend');
          throw new Error('Failed to load permissions from backend');
        }
      } catch (error) {
        console.error('❌ Error reloading permissions:', error);
        throw new Error('Cannot load permissions - backend endpoint failed');
      }
    }
    
    setLoadingPermissions(true);
    try {
      console.log('🚀 Fetching permissions for user:', userId);
      const response = await usersService.getUserPermissions(userId) as any;
      console.log('🚀 API Response completa:', JSON.stringify(response, null, 2));
      console.log('🚀 response.success:', response.success);
      console.log('🚀 response.permisos:', response.permisos);
      
      if (response.success && response.permisos) {
        // Los permisos vienen directamente en response.permisos, no en response.data.permisos
        const userPermissions = response.permisos || [];
        console.log('🚀 User permissions (claves) extraídas:', userPermissions);
        console.log('🚀 Tipo de userPermissions:', typeof userPermissions);
        console.log('🚀 Es array?:', Array.isArray(userPermissions));
        console.log('🚀 Longitud del array:', userPermissions.length);
        console.log('🚀 availablePermissions completo:', availablePermissions);
        
        // Convertir las claves de permisos a IDs
        console.log('🚀 Iniciando conversión de claves a IDs...');
        const permissionIds: string[] = [];
        
        if (Array.isArray(userPermissions) && userPermissions.length > 0) {
          for (let i = 0; i < userPermissions.length; i++) {
            const userPermission = userPermissions[i];
            console.log(`🚀 [${i}] Buscando clave: "${userPermission}" (tipo: ${typeof userPermission})`);
            const found = availablePermissions.find(p => {
              console.log(`   Comparando con: "${p.clave}" - ¿Coincide? ${p.clave === userPermission}`);
              return p.clave === userPermission;
            });
            if (found) {
              console.log(`✅✅✅ Encontrado: ${found.clave} -> ID: ${found.id}`);
              permissionIds.push(found.id);
            } else {
              console.log(`❌❌❌ No encontrado: ${userPermission}`);
            }
          }
        } else {
          console.log('⚠️⚠️⚠️ userPermissions está vacío o no es un array válido');
        }
        
        console.log('🚀🚀 Permission IDs finales:', permissionIds);
        console.log('🚀🚀 Cantidad de IDs convertidos:', permissionIds.length);
        
        // IMPORTANTE: Actualizar el estado de los permisos seleccionados ANTES de abrir el modal
        setSelectedPermissions(permissionIds);
        // Pasar los IDs directamente al modal para evitar problemas de sincronización de estado
        setPermissionsModal({ userId, userName, userPermissions, selectedPermissionIds: permissionIds });
        console.log('🔍 Modal state set with selected permissions:', permissionIds);
      } else {
        console.log('❌ API response not successful or no data:', response);
        // Aún así, abrir el modal con permisos vacíos
        setSelectedPermissions([]);
        setPermissionsModal({ userId, userName, userPermissions: [], selectedPermissionIds: [] });
        console.log('🔍 Modal opened with empty permissions');
      }
    } catch (error) {
      console.error('❌ Error loading user permissions:', error);
      alert('Error al cargar los permisos del usuario');
    } finally {
      setLoadingPermissions(false);
    }
  };

  // Función para guardar los permisos
  const savePermissions = async () => {
    if (!permissionsModal) return;

    setLoadingPermissions(true);
    try {
      // Mapear los IDs del frontend a ObjectIds de la base de datos
      const objectIds = mapFrontendIdsToObjectIds(selectedPermissions);
      console.log('🔄 Mapeando IDs del frontend a ObjectIds:', { selectedPermissions, objectIds });
      
      const response = await usersService.updateUserPermissions(permissionsModal.userId, objectIds);
      if (response.success) {
        // Actualizar el mapa de permisos con los nuevos permisos
        const permissionClaves = selectedPermissions.map(id => {
          const permission = availablePermissions.find(p => p.id === id);
          return permission ? permission.clave : '';
        }).filter(clave => clave !== '');
        
        setUserPermissionsMap(prev => {
          const newMap = new Map(prev);
          newMap.set(permissionsModal.userId, permissionClaves);
          return newMap;
        });
        
        alert('Permisos actualizados correctamente');
        setPermissionsModal(null);
        setSelectedPermissions([]);
      } else {
        alert('Error al actualizar los permisos');
      }
    } catch (error) {
      console.error('Error updating permissions:', error);
      alert('Error al actualizar los permisos');
    } finally {
      setLoadingPermissions(false);
    }
  };

  // Función para alternar un permiso
  const togglePermission = (permissionId: string) => {
    setSelectedPermissions(prev => 
      prev.includes(permissionId)
        ? prev.filter(id => id !== permissionId)
        : [...prev, permissionId]
    );
  };

  const handlePasswordSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordForm) return;

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Las contraseñas no coinciden');
      return;
    }

    if (passwordForm.newPassword.length < 6) {
      alert('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    onUpdateUserPassword(passwordForm.userId, passwordForm.newPassword);
    setPasswordForm(null);
    alert('Contraseña actualizada exitosamente');
  };

  const handleCreateUniversity = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Generate codigo if it's empty
    let codigo = createUniversityForm.codigo;
    if (!codigo && createUniversityForm.nombre) {
      codigo = createUniversityForm.nombre
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, '')
        .slice(0, 10);
    }
    
    if (!createUniversityForm.nombre || !createUniversityForm.ciudad) {
      alert('El nombre y ciudad son obligatorios');
      return;
    }
    
    if (!codigo) {
      alert('No se pudo generar un código válido. Por favor, ingrese un nombre con letras o números.');
      return;
    }

    setCreatingUniversity(true);
    try {
      // Prepare data with generated codigo
      const dataToSend = {
        ...createUniversityForm,
        codigo: codigo
      };
      
      console.log('📤 Datos a enviar para crear colegio:', dataToSend);
      console.log('📤 Tipo de datos:', typeof dataToSend.tipo, dataToSend.tipo);
      console.log('📤 Ciudad de datos:', typeof dataToSend.ciudad, dataToSend.ciudad);
      console.log('📤 Código generado:', codigo);
      
      // Crear el colegio y obtener la respuesta con información de contactos asociados
      const response = await universidadesService.createUniversidad(dataToSend);
      
      // Recargar la lista de universidades
      const data = await universidadesService.getUniversidades();
      setUniversities(data);
      
      // Resetear el formulario y cerrar el modal
      setCreateUniversityForm({
        nombre: '',
        codigo: '',
        ciudad: '',
        pais: 'España',
        tipo: 'publica',
        activa: true
      });
      setShowCreateUniversityModal(false);
      
      // Mostrar mensaje con información de contactos asociados
      if (response.contactosAsociados && response.contactosAsociados > 0) {
        alert(`Colegio creado exitosamente. Se asociaron automáticamente ${response.contactosAsociados} contactos existentes.`);
      } else {
        alert('Colegio creado exitosamente');
      }
    } catch (error: any) {
      console.error('Error creating university:', error);
      alert(error.message || 'Error al crear el colegio');
    } finally {
      setCreatingUniversity(false);
    }
  };

  const openEditUniversityModal = (university: Universidad) => {
    setEditUniversityForm({
      id: (university as any)._id || university.id,
      nombre: university.nombre,
      tipo: university.tipo || 'publica',
      ciudad: university.ciudad || ''
    });
    setShowEditUniversityModal(true);
  };

  const openEditTitulacionModal = (titulacion: any, index: number) => {
    setEditTitulacionForm({
      id: titulacion._id || titulacion.id,
      nombre: titulacion.nombre,
      codigo: titulacion.codigo,
      duracion: titulacion.duracion || 4
    });
    setEditingTitulacionIndex(index);
    setShowInlineTitulacionForm(true);
  };

  const handleDeleteTitulacion = async (titulacionId: string) => {
    if (!confirm('¿Estás seguro de que quieres eliminar esta titulación?')) {
      return;
    }

    try {
      await titulacionesService.deleteTitulacion(titulacionId);
      setEditingUniversityTitulaciones(prev => prev.filter(t => t._id !== titulacionId));
      alert('Titulación eliminada exitosamente');
    } catch (error: any) {
      console.error('Error deleting titulacion:', error);
      alert(error.message || 'Error al eliminar la titulación');
    }
  };

  const handleCreateTitulacion = async (e: React.FormEvent) => {
    console.log('🚀 handleCreateTitulacion iniciado');
    console.log('📝 Event:', e);
    
    e.preventDefault();
    e.stopPropagation();
    
    console.log('📋 Form data:', editTitulacionForm);
    console.log('🏫 University ID:', editUniversityForm.id);
    
    if (!editTitulacionForm.nombre || !editTitulacionForm.codigo) {
      console.log('❌ Validación fallida: campos obligatorios vacíos');
      alert('El nombre y código son obligatorios');
      return;
    }

    setCreatingTitulacion(true);
    try {
      const createData = {
        nombre: editTitulacionForm.nombre,
        codigo: editTitulacionForm.codigo,
        duracion: editTitulacionForm.duracion,
        universidadId: editUniversityForm.id, // Corregir nombre del campo
        tipo: 'grado',
        activa: true
      };
      
      console.log('📤 Datos a enviar:', createData);
      
      const response = await titulacionesService.createTitulacion(createData);
      console.log('📥 Respuesta del servidor:', response);
      
      // Verificar estructura de respuesta
      const newTitulacion = response.data || response;
      console.log('🆕 Nueva titulación procesada:', newTitulacion);
      
      // Add the new titulacion to the local state
      setEditingUniversityTitulaciones(prev => {
        const updated = [...prev, {
          _id: newTitulacion.id || newTitulacion._id,
          nombre: newTitulacion.nombre,
          codigo: newTitulacion.codigo,
          duracion: newTitulacion.duracion
        }];
        console.log('📊 Estado actualizado:', updated);
        return updated;
      });
      
      // Reset form and hide it
      setEditTitulacionForm({ id: '', nombre: '', codigo: '', duracion: 4 });
      setShowInlineTitulacionForm(false);
      
      console.log('✅ Titulación creada exitosamente');
      alert('Titulación creada exitosamente');
    } catch (error: any) {
      console.error('❌ Error creating titulacion:', error);
      console.log('📄 Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data
      });
      
      if (error.message?.includes('permisos')) {
        alert('No tienes permisos para crear titulaciones. Contacta al administrador.');
      } else {
        alert(error.message || 'Error al crear la titulación');
      }
    } finally {
      setCreatingTitulacion(false);
      console.log('🏁 handleCreateTitulacion finalizado');
    }
  };

  const handleUpdateTitulacion = async (e: React.FormEvent) => {
    console.log('🔄 handleUpdateTitulacion iniciado');
    console.log('📝 Event:', e);
    
    e.preventDefault();
    e.stopPropagation();
    
    console.log('📋 Form data:', editTitulacionForm);
    console.log('📍 Editing index:', editingTitulacionIndex);
    
    if (!editTitulacionForm.nombre || !editTitulacionForm.codigo || editingTitulacionIndex === null) {
      console.log('❌ Validación fallida: campos obligatorios vacíos o índice nulo');
      alert('El nombre y código son obligatorios');
      return;
    }

    setEditingTitulacion(true);
    try {
      const { id, ...updateData } = editTitulacionForm;
      const requestData = {
        nombre: updateData.nombre,
        codigo: updateData.codigo,
        duracion: updateData.duracion,
        tipo: 'grado'
      };
      
      console.log('📤 Datos a enviar:', requestData);
      console.log('🆔 ID de titulación:', id);
      
      const response = await titulacionesService.updateTitulacion(id, requestData);
      console.log('📥 Respuesta del servidor:', response);
      
      // Verificar estructura de respuesta
      const updatedTitulacion = response.data || response;
      console.log('🔄 Titulación actualizada procesada:', updatedTitulacion);
      
      // Update the titulacion in the local state
      setEditingUniversityTitulaciones(prev => {
        const updated = prev.map((t, index) => index === editingTitulacionIndex ? {
          ...t,
          nombre: updatedTitulacion.nombre,
          codigo: updatedTitulacion.codigo,
          duracion: updatedTitulacion.duracion
        } : t);
        console.log('📊 Estado actualizado:', updated);
        return updated;
      });
      
      // Reset form and hide it
      setEditTitulacionForm({ id: '', nombre: '', codigo: '', duracion: 4 });
      setEditingTitulacionIndex(null);
      setShowInlineTitulacionForm(false);
      
      console.log('✅ Titulación actualizada exitosamente');
      alert('Titulación actualizada exitosamente');
    } catch (error: any) {
      console.error('❌ Error updating titulacion:', error);
      console.log('📄 Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data
      });
      
      if (error.message?.includes('permisos')) {
        alert('No tienes permisos para actualizar titulaciones. Contacta al administrador.');
      } else {
        alert(error.message || 'Error al actualizar la titulación');
      }
    } finally {
      setEditingTitulacion(false);
      console.log('🏁 handleUpdateTitulacion finalizado');
    }
  };

  const handleEditUniversity = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!editUniversityForm.nombre || !editUniversityForm.tipo || !editUniversityForm.ciudad) {
      alert('El nombre, régimen y localidad son obligatorios');
      return;
    }

    setEditingUniversity(true);
    try {
      const { id, ...updateData } = editUniversityForm;
      // Generar código automáticamente desde el nombre
      const codigo = updateData.nombre
        .split(' ')
        .map(word => word.charAt(0).toUpperCase())
        .join('')
        .substring(0, 6);
      
      const finalUpdateData = {
        ...updateData,
        codigo,
        activa: true
      };
      
      console.log('📤 Datos a enviar para actualizar colegio:', finalUpdateData);
      console.log('📤 ID del colegio:', id);
      console.log('📤 Tipo de datos:', typeof finalUpdateData.tipo, finalUpdateData.tipo);
      console.log('📤 Ciudad de datos:', typeof finalUpdateData.ciudad, finalUpdateData.ciudad);
      
      await universidadesService.updateUniversidad(id, finalUpdateData);
      
      // Recargar la lista de universidades
      const data = await universidadesService.getUniversidades();
      // Mostrar todos los colegios (activos e inactivos) en el admin
      setUniversities(data);
      
      // Cerrar el modal
      setShowEditUniversityModal(false);
      
      alert('Colegio actualizado exitosamente');
    } catch (error: any) {
      console.error('Error updating university:', error);
      alert(error.message || 'Error al actualizar el colegio');
    } finally {
      setEditingUniversity(false);
    }
  };

  // Función para eliminar universidad
  const handleDeleteUniversity = async () => {
    if (!confirm('¿Estás seguro de que quieres eliminar este colegio? Esta acción no se puede deshacer.')) {
      return;
    }

    setDeletingUniversity(true);
    try {
      await universidadesService.deleteUniversidad(editUniversityForm.id);
      
      // Recargar la lista de universidades
      const data = await universidadesService.getUniversidades();
      // Mostrar todos los colegios (activos e inactivos) en el admin
      setUniversities(data);
      
      // Cerrar el modal
      setShowEditUniversityModal(false);
      
      alert('Colegio eliminado exitosamente');
    } catch (error: any) {
      console.error('Error deleting university:', error);
      alert(error.message || 'Error al eliminar el colegio');
    } finally {
      setDeletingUniversity(false);
    }
  };

  const cancelTitulacionForm = () => {
    setEditTitulacionForm({ id: '', nombre: '', codigo: '', duracion: 4 });
    setEditingTitulacionIndex(null);
    setShowInlineTitulacionForm(false);
  };

  const handleIncreaseAllCourses = async () => {
    if (!confirm('¿Estás seguro de que quieres aumentar el curso de todos los contactos en 1? Esta acción no se puede deshacer.')) {
      return;
    }

    setIncreasingCourse(true);
    try {
      const response = await contactsService.aumentarCursoTodos();
      if (response.success) {
        alert(`Curso aumentado exitosamente. ${response.data.modifiedCount} contactos actualizados.`);
      } else {
        alert('Error al aumentar el curso de los contactos');
      }
    } catch (error: any) {
      console.error('Error increasing courses:', error);
      alert(error.message || 'Error al aumentar el curso de los contactos');
    } finally {
      setIncreasingCourse(false);
    }
  };


  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center">
          <Shield className="w-6 h-6 mr-2 text-purple-600" />
          Panel de Administrador
        </h1>
        <p className="text-gray-600 mt-1">Gestión de permisos y usuarios del sistema</p>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('permissions')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'permissions'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            Gestión de Permisos
          </button>
          <button
            onClick={() => setActiveTab('passwords')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'passwords'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Key className="w-4 h-4 inline mr-2" />
            Gestión de Contraseñas
          </button>
          <button
            onClick={() => setActiveTab('universities')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'universities'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <GraduationCap className="w-4 h-4 inline mr-2" />
            Colegios
          </button>
          {/* Pestaña de contactos oculta - mantener código por si se necesita en el futuro */}
          <button
            onClick={() => setActiveTab('contacts')}
            className={`py-2 px-1 border-b-2 font-medium text-sm hidden ${
              activeTab === 'contacts'
                ? 'border-purple-500 text-purple-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <TrendingUp className="w-4 h-4 inline mr-2" />
            Gestión de Contactos
          </button>
        </nav>
      </div>

      {/* Permissions Tab */}
      {activeTab === 'permissions' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-medium text-blue-900 mb-2">Gestión de Permisos del Sistema</h3>
            <p className="text-sm text-blue-700">
              Administra todos los permisos de los usuarios comerciales del sistema. Cada permiso controla el acceso a diferentes funcionalidades.
            </p>
            {/* Botón oculto - mantener código por si se necesita en el futuro */}
            <div className="mt-4 hidden">
              <button
                onClick={async () => {
                  try {
                    console.log('🔧 Iniciando inicialización de permisos...');
                    console.log('👤 Usuario actual:', currentUser);
                    console.log('🔑 Token en localStorage:', localStorage.getItem('auth_token') ? 'Presente' : 'Ausente');
                    
                    const success = await configuracionService.inicializarPermisos();
                    if (success) {
                      alert('Permisos inicializados correctamente');
                      window.location.reload(); // Recargar para ver los cambios
                    } else {
                      alert('Error al inicializar permisos');
                    }
                  } catch (error) {
                    console.error('❌ Error:', error);
                    alert('Error al inicializar permisos: ' + error.message);
                  }
                }}
                className="inline-flex items-center px-3 py-2 border border-transparent text-sm leading-4 font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Database className="w-4 h-4 mr-2" />
                Inicializar Permisos Faltantes
              </button>
            </div>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200">
              <h4 className="font-medium text-gray-900">Usuarios Comerciales</h4>
            </div>
            <div className="divide-y divide-gray-200">
              {comercialUsers.map((user) => {
                const userPermissions = userPermissionsMap.get(user.id) || [];
                const filteredPermissions = userPermissions.filter(permiso => 
                  permiso === 'VER_CONTACTOS' || permiso === 'ELIMINAR_CONTACTOS' || permiso === 'VER_GRADUACIONES' || permiso === 'VER_CONTACTOS_GRADUACIONES'
                );
                const hasPermissions = filteredPermissions.length > 0;
                
                return (
                  <div key={user.id} className="px-4 py-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center mt-1">
                          <Users className="w-4 h-4 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900">{user.nombre}</p>
                          <p className="text-sm text-gray-500">{user.email}</p>
                          
                          {/* Mostrar permisos */}
                          <div className="mt-2 flex flex-wrap gap-1">
                            {hasPermissions ? (
                              filteredPermissions.map((permiso) => (
                                <span 
                                  key={permiso}
                                  className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                                  title={availablePermissions.find(p => p.clave === permiso)?.descripcion}
                                >
                                  {permiso === 'ELIMINAR_CONTACTOS' && <Trash2 className="w-3 h-3 mr-1" />}
                                  {permiso === 'CREAR_CONTACTOS' && '➕'}
                                  {permiso === 'EDITAR_CONTACTOS' && '✏️'}
                                  {permiso === 'VER_CONTACTOS' && '👁️'}
                                  {permiso === 'VER_GRADUACIONES' && <GraduationCap className="w-3 h-3 mr-1" />}
                                  {permiso === 'VER_CONTACTOS_GRADUACIONES' && '👁️📊'}
                                  {permiso === 'IMPORTAR_CONTACTOS' && '📥'}
                                  {permiso === 'EXPORTAR_CONTACTOS' && '📤'}
                                  {permiso === 'GESTIONAR_USUARIOS' && '👥'}
                                  {permiso === 'VER_ESTADISTICAS' && '📊'}
                                  {permiso === 'GESTIONAR_UNIVERSIDADES' && '🎓'}
                                  {permiso.replace(/_/g, ' ')}
                                </span>
                              ))
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                                <X className="w-3 h-3 mr-1" /> Sin permisos asignados
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <button
                        onClick={() => openPermissionsModal(user.id, user.nombre)}
                        disabled={loadingPermissions}
                        className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-sm font-medium transition-colors disabled:opacity-50 ml-4"
                      >
                        <Settings className="w-4 h-4 inline mr-1" />
                        Configurar
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Passwords Tab */}
      {activeTab === 'passwords' && (
        <div className="space-y-4">
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
            <h3 className="font-medium text-yellow-900 mb-2">Gestión de Contraseñas</h3>
            <p className="text-sm text-yellow-700">
              Cambia las contraseñas de cualquier usuario del sistema. Los usuarios serán notificados del cambio.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200">
              <h4 className="font-medium text-gray-900">Todos los Usuarios</h4>
            </div>
            <div className="divide-y divide-gray-200">
              {users.filter(user => user.id !== currentUser.id).map((user) => (
                <div key={user.id} className="px-4 py-4 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                      user.role === 'admin' ? 'bg-purple-100' : 'bg-green-100'
                    }`}>
                      {user.role === 'admin' ? (
                        <Shield className="w-4 h-4 text-purple-600" />
                      ) : (
                        <Users className="w-4 h-4 text-green-600" />
                      )}
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{user.nombre}</p>
                      <p className="text-sm text-gray-500">{user.email}</p>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-green-100 text-green-800'
                      }`}>
                        {user.role === 'admin' ? 'Administrador' : 'Comercial'}
                      </span>
                    </div>
                  </div>
                  <button
                    onClick={() => setPasswordForm({
                      userId: user.id,
                      newPassword: '',
                      confirmPassword: ''
                    })}
                    className="px-3 py-1 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded text-sm font-medium transition-colors"
                  >
                    <Key className="w-4 h-4 inline mr-1" />
                    Cambiar Contraseña
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Universities Tab */}
      {activeTab === 'universities' && (
        <div className="space-y-4">
          <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
            <h3 className="font-medium text-indigo-900 mb-2">Gestión de Colegios</h3>
            <p className="text-sm text-indigo-700 mb-4">
              Visualiza todos los colegios disponibles en el sistema. 
              Total de colegios: {universities.length}
            </p>
          </div>

          {loadingUniversities ? (
            <div className="bg-white border border-gray-200 rounded-lg p-8">
              <div className="flex flex-col items-center justify-center">
                <Loader2 className="w-8 h-8 text-indigo-600 animate-spin mb-4" />
                <p className="text-gray-600">Cargando colegios...</p>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-lg">
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h4 className="font-medium text-gray-900 flex items-center">
                  <Building2 className="w-5 h-5 mr-2 text-indigo-600" />
                  Listado de Colegios
                </h4>
                <button
                  onClick={() => setShowCreateUniversityModal(true)}
                  className="flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors text-sm font-medium"
                >
                  <Plus className="w-4 h-4 mr-1" />
                  Nuevo Colegio
                </button>
              </div>
              
              {universities.length === 0 ? (
                <div className="px-4 py-8 text-center text-gray-500">
                  <GraduationCap className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                  <p>No hay colegios registrados en el sistema.</p>
                </div>
              ) : (
                <>
                  <div className="divide-y divide-gray-200">
                    {universities.map((university) => {
                      const universityId = (university as any)._id || university.id;
                      
                      return (
                        <div key={universityId} className="overflow-hidden">
                          <div className="px-4 py-4 hover:bg-gray-50 transition-colors">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3 flex-1">
                                <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                                  <GraduationCap className="w-5 h-5 text-indigo-600" />
                                </div>
                                <div>
                                  <p className="font-medium text-gray-900 text-lg">
                                    {university.nombre}
                                  </p>
                                  <div className="flex items-center space-x-4 text-sm text-gray-500">
                                    <span>Código: {university.codigo}</span>
                                    {university.tipo && (
                                      <span className="capitalize">
                                        {university.tipo === 'publica' ? 'Público' : 'Privado'}
                                      </span>
                                    )}
                                    {university.ciudad && (
                                      <span>📍 {university.ciudad}</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    openEditUniversityModal(university);
                                  }}
                                  className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-md transition-colors"
                                  title="Editar colegio"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          </div>
                          
                        </div>
                      );
                    })}
                  </div>
                  
                  <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center space-x-4">
                        <span className="text-gray-600">
                          Total de colegios: 
                          <span className="font-medium text-gray-900 ml-1">{universities.length}</span>
                        </span>
                        <span className="text-blue-600">
                          Total: 
                          <span className="font-medium ml-1">
                            {universities.length}
                          </span>
                        </span>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}

      {/* Contacts Tab - Oculto - mantener código por si se necesita en el futuro */}
      {activeTab === 'contacts' && (
        <div className="space-y-4 hidden">
          <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
            <h3 className="font-medium text-orange-900 mb-2">Gestión de Contactos</h3>
            <p className="text-sm text-orange-700">
              Herramientas administrativas para la gestión masiva de contactos en el sistema.
            </p>
          </div>

          <div className="bg-white border border-gray-200 rounded-lg">
            <div className="px-4 py-3 border-b border-gray-200">
              <h4 className="font-medium text-gray-900 flex items-center">
                <TrendingUp className="w-5 h-5 mr-2 text-orange-600" />
                Operaciones Masivas
              </h4>
            </div>
            <div className="p-6">
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
                <div className="flex items-start">
                  <div className="flex-shrink-0">
                    <TrendingUp className="w-5 h-5 text-yellow-600 mt-0.5" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-yellow-800">
                      Aumentar Curso de Todos los Contactos
                    </h3>
                    <div className="mt-2 text-sm text-yellow-700">
                      <p>
                        Esta operación incrementará en 1 el campo "curso" de todos los contactos en la base de datos.
                        <strong className="block mt-1">⚠️ Esta acción no se puede deshacer.</strong>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-lg font-medium text-gray-900">Promoción de Curso</h4>
                  <p className="text-sm text-gray-600 mt-1">
                    Actualiza automáticamente el curso de todos los estudiantes para el nuevo año académico.
                  </p>
                </div>
                <button
                  onClick={handleIncreaseAllCourses}
                  disabled={increasingCourse}
                  className="flex items-center px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
                >
                  {increasingCourse ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Procesando...
                    </>
                  ) : (
                    <>
                      <TrendingUp className="w-4 h-4 mr-2" />
                      Aumentar Curso a Todos
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* Permissions Configuration Modal */}
      {permissionsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          {console.log('🔍 Modal is rendering:', permissionsModal)}
          {console.log('🔍 selectedPermissions en render:', selectedPermissions)}
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Configurar Permisos - {permissionsModal.userName}
            </h3>
            
            <div className="mb-4">
              <p className="text-sm text-gray-600 mb-4">
                Selecciona los permisos que deseas asignar a este usuario:
              </p>
              
              <div className="space-y-3 max-h-96 overflow-y-auto">
                 {console.log('🎯 RENDERIZANDO MODAL - selectedPermissions actual:', selectedPermissions)}
                 {console.log('🎯 RENDERIZANDO MODAL - permissionsModal:', permissionsModal)}
                 {console.log('🎯 RENDERIZANDO MODAL - availablePermissions:', availablePermissions)}
                 {loadingAvailablePermissions ? (
                   <div className="flex items-center justify-center py-8">
                     <Loader2 className="w-6 h-6 animate-spin mr-2" />
                     <span className="text-gray-500">Cargando permisos...</span>
                   </div>
                 ) : availablePermissions.length === 0 ? (
                   <div className="text-center py-8 text-gray-500">
                     No hay permisos disponibles
                   </div>
                 ) : (
                   availablePermissions.filter(permission => 
                     permission.clave === 'VER_CONTACTOS' || permission.clave === 'ELIMINAR_CONTACTOS' || permission.clave === 'VER_GRADUACIONES' || permission.clave === 'VER_CONTACTOS_GRADUACIONES'
                   ).map((permission) => {
                   const isChecked = selectedPermissions.includes(permission.id);
                   console.log(`🔍 Checkbox ${permission.clave} (ID: ${permission.id}): checked=${isChecked}, selectedPermissions=${JSON.stringify(selectedPermissions)}`);
                   return (
                  <div key={permission.id} className="flex items-start space-x-3 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <input
                      type="checkbox"
                      id={`permission-${permission.id}`}
                      checked={isChecked}
                      onChange={() => togglePermission(permission.id)}
                      className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                    />
                    <div className="flex-1">
                      <label htmlFor={`permission-${permission.id}`} className="block text-sm font-medium text-gray-900 cursor-pointer">
                        {permission.clave}
                      </label>
                      <p className="text-sm text-gray-500 mt-1">
                        {permission.descripcion}
                      </p>
                    </div>
                  </div>
                   );
                 })
                 )}
              </div>
            </div>
            
            <div className="flex justify-between items-center pt-4 border-t border-gray-200">
              <div className="text-sm text-gray-500">
                 {selectedPermissions.length} de {availablePermissions.filter(permission => 
                   permission.clave === 'VER_CONTACTOS' || permission.clave === 'ELIMINAR_CONTACTOS' || permission.clave === 'VER_GRADUACIONES' || permission.clave === 'VER_CONTACTOS_GRADUACIONES'
                 ).length} permisos seleccionados
               </div>
              <div className="flex space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setPermissionsModal(null);
                    setSelectedPermissions([]);
                  }}
                  disabled={loadingPermissions}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded-md hover:bg-gray-400 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={savePermissions}
                  disabled={loadingPermissions}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {loadingPermissions ? 'Guardando...' : 'Guardar Permisos'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {passwordForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-md">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Cambiar Contraseña
            </h3>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva Contraseña
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordForm.newPassword}
                  onChange={(e) => setPasswordForm(prev => prev ? {...prev, newPassword: e.target.value} : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={6}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar Contraseña
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordForm.confirmPassword}
                  onChange={(e) => setPasswordForm(prev => prev ? {...prev, confirmPassword: e.target.value} : null)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  minLength={6}
                />
              </div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="showPassword"
                  checked={showPassword}
                  onChange={(e) => setShowPassword(e.target.checked)}
                  className="mr-2"
                />
                <label htmlFor="showPassword" className="text-sm text-gray-600">
                  Mostrar contraseñas
                </label>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="submit"
                  className="flex-1 bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
                >
                  Actualizar
                </button>
                <button
                  type="button"
                  onClick={() => setPasswordForm(null)}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create School (Colegio) Modal */}
      {showCreateUniversityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <GraduationCap className="w-5 h-5 mr-2 text-indigo-600" />
                Nuevo Colegio
              </h3>
              <button
                onClick={() => {
                  setShowCreateUniversityModal(false);
                  setCreateUniversityForm({
                    nombre: '',
                    codigo: '',
                    ciudad: '',
                    pais: 'España',
                    tipo: 'publica',
                    activa: true
                  });
                }}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUniversity} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Colegio <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createUniversityForm.nombre}
                  onChange={(e) => setCreateUniversityForm(prev => ({...prev, nombre: e.target.value, codigo: (e.target.value || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: Colegio San Martín"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Código (se genera automáticamente)
                </label>
                <input
                  type="text"
                  value={createUniversityForm.codigo}
                  onChange={(e) => setCreateUniversityForm(prev => ({...prev, codigo: e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 10)}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-gray-50"
                  placeholder="Se genera automáticamente"
                  maxLength={10}
                />
                <p className="text-xs text-gray-500 mt-1">Máximo 10 caracteres alfanuméricos</p>
              </div>

              {/* Régimen (tipo) */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Régimen
                </label>
                <select
                  value={createUniversityForm.tipo}
                  onChange={(e) => setCreateUniversityForm(prev => ({...prev, tipo: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  <option value="publica">Público</option>
                  <option value="privada">Privado</option>
                </select>
              </div>

              {/* Localidad */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Localidad <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={createUniversityForm.ciudad}
                  onChange={(e) => setCreateUniversityForm(prev => ({...prev, ciudad: e.target.value}))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  placeholder="Ej: Madrid"
                  required
                />
              </div>

              {/* Estado se mantiene pero oculto en UI para simplificar; por ahora lo dejamos como activo por defecto */}

              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={creatingUniversity}
                  className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {creatingUniversity ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Crear Colegio
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateUniversityModal(false);
                    setCreateUniversityForm({
                      nombre: '',
                      codigo: '',
                      ciudad: '',
                      pais: 'España',
                      tipo: 'publica',
                      activa: true
                    });
                  }}
                  disabled={creatingUniversity}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit University Modal */}
      {showEditUniversityModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Edit className="w-5 h-5 mr-2 text-indigo-600" />
                Editar Colegio
              </h3>
              <button
                onClick={() => setShowEditUniversityModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditUniversity} className="space-y-6">
              {/* Información básica del colegio */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-medium text-gray-900 mb-3">Información del Colegio</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre del Colegio <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editUniversityForm.nombre}
                      onChange={(e) => setEditUniversityForm(prev => ({...prev, nombre: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ej: Colegio La Salle Paterna"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Régimen <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={editUniversityForm.tipo}
                      onChange={(e) => setEditUniversityForm(prev => ({...prev, tipo: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      required
                    >
                      <option value="publica">Público</option>
                      <option value="privada">Privado</option>
                    </select>
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Localidad <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={editUniversityForm.ciudad}
                      onChange={(e) => setEditUniversityForm(prev => ({...prev, ciudad: e.target.value}))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      placeholder="Ej: Paterna, Valencia"
                      required
                    />
                  </div>

                </div>
              </div>


              <div className="flex space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="submit"
                  disabled={editingUniversity || deletingUniversity}
                  className="flex-1 bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {editingUniversity ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Actualizando...
                    </>
                  ) : (
                    <>
                      <Check className="w-4 h-4 mr-2" />
                      Actualizar Colegio
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={handleDeleteUniversity}
                  disabled={editingUniversity || deletingUniversity}
                  className="bg-red-600 text-white py-2 px-4 rounded-md hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                >
                  {deletingUniversity ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Eliminando...
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-4 h-4 mr-2" />
                      Borrar Colegio
                    </>
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowEditUniversityModal(false)}
                  disabled={editingUniversity || deletingUniversity}
                  className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded-md hover:bg-gray-400 transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
  