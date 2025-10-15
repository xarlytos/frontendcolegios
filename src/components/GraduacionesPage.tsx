import { useState, useEffect } from 'react';
import { Building, Users, Search, Calendar, X, BarChart3, Eye, Edit3, Save, X as XIcon } from 'lucide-react';
import graduacionesService, { Graduacion, Contacto } from '../services/graduacionesService';
import configuracionService from '../services/configuracionService';
import ContactosModal from './ContactosModal';

interface GraduacionesPageProps {
  currentUser?: any;
}

export default function GraduacionesPage({ currentUser }: GraduacionesPageProps) {
  const [graduaciones, setGraduaciones] = useState<Graduacion[]>([]);
  const [aniosDisponibles, setAniosDisponibles] = useState<number[]>([]);
  const [selectedAnio, setSelectedAnio] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingGraduaciones, setLoadingGraduaciones] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filtroPrevision, setFiltroPrevision] = useState('');
  const [filtroEstado, setFiltroEstado] = useState('');
  const [totalContactos, setTotalContactos] = useState(0);
  const [mostrarContactos, setMostrarContactos] = useState(false);
  
  // Estados para modal de contactos
  const [contactosModal, setContactosModal] = useState<{
    isOpen: boolean;
    contactos: Contacto[];
    nombreColegio: string;
  }>({
    isOpen: false,
    contactos: [],
    nombreColegio: ''
  });
  
  // Estados para edición
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<{
    responsable: string;
    tipoProducto: string;
    prevision: string;
    estado: string;
    observaciones: string;
  }>({
    responsable: '',
    tipoProducto: '',
    prevision: '',
    estado: '',
    observaciones: ''
  });

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadAniosDisponibles();
      loadConfiguracionInicial();
    } else {
      // Para comerciales, cargar la configuración desde la base de datos
      loadConfiguracionComercial();
    }
  }, [isAdmin]);

  const loadConfiguracionComercial = async () => {
    try {
      setLoading(true);
      console.log('🔄 Cargando configuración para comercial...');
      
      // Verificar si hay un año seleccionado y visibilidad activada
      const [anioSeleccionado, visibilidad] = await Promise.all([
        configuracionService.obtenerAnioSeleccionado(),
        configuracionService.obtenerVisibilidadContactos()
      ]);
      
      console.log('📅 Año seleccionado:', anioSeleccionado);
      console.log('👁️ Visibilidad:', visibilidad);
      
      if (anioSeleccionado && visibilidad) {
        setSelectedAnio(anioSeleccionado);
        setMostrarContactos(true);
        // Cargar las graduaciones automáticamente
        await loadGraduacionesPorAnio(anioSeleccionado);
      } else {
        setMostrarContactos(false);
      }
    } catch (error) {
      console.error('Error cargando configuración para comercial:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadConfiguracionInicial = async () => {
    try {
      console.log('🔄 Cargando configuración inicial desde BD...');
      const visibilidad = await configuracionService.obtenerVisibilidadContactos();
      setMostrarContactos(visibilidad);
      console.log('🔧 Configuración inicial cargada desde BD:', visibilidad);
      
      // Si hay configuración en BD, también cargar el año desde la BD
      if (visibilidad) {
        const anio = await configuracionService.obtenerAnioSeleccionado();
        console.log('📅 Año obtenido desde BD:', anio);
        if (anio && anio > 0) {
          console.log('📅 Cargando año desde BD:', anio);
          setSelectedAnio(anio);
          // Cargar los datos para este año
          loadGraduacionesPorAnio(anio);
        } else {
          console.log('❌ No hay año válido en BD');
        }
      } else {
        console.log('❌ Visibilidad desactivada en BD');
      }
    } catch (error) {
      console.error('❌ Error cargando configuración inicial:', error);
    }
  };

  useEffect(() => {
    if (selectedAnio) {
      loadGraduacionesPorAnio(selectedAnio);
    }
  }, [selectedAnio]);

  // Cargar graduaciones cuando el comercial recibe el filtro inicial
  useEffect(() => {
    console.log('🔄 useEffect loadGraduaciones - isAdmin:', isAdmin, 'selectedAnio:', selectedAnio, 'loading:', loading);
    if (!isAdmin && selectedAnio && !loading) {
      console.log('📥 Comercial cargando graduaciones para año:', selectedAnio);
      loadGraduacionesPorAnio(selectedAnio);
    }
  }, [isAdmin, selectedAnio, loading]);

  // Listener para cambios en el filtro (para comerciales)
  useEffect(() => {
    if (!isAdmin) {
      // Usar BroadcastChannel para comunicación entre pestañas
      const channel = new BroadcastChannel('graduaciones-updates');
      
      const handleMessage = (event: MessageEvent) => {
        console.log('📡 Comercial recibió mensaje:', event.data);
        
        if (event.data.type === 'filter_changed') {
          if (event.data.anio) {
            const anio = parseInt(event.data.anio);
            if (!isNaN(anio)) {
              console.log('📅 Comercial actualizando año:', anio);
              setSelectedAnio(anio);
            }
          } else {
            console.log('🗑️ Comercial limpiando año');
            setSelectedAnio(null);
            setGraduaciones([]);
            setTotalContactos(0);
          }
        }
        
        if (event.data.type === 'visibility_changed') {
          console.log('👁️ Comercial actualizando visibilidad:', event.data.mostrar);
          setMostrarContactos(event.data.mostrar);
        }
      };

      channel.addEventListener('message', handleMessage);
      
      // También mantener el listener de storage como respaldo
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'graduaciones_filter_anio') {
          if (e.newValue) {
            const anio = parseInt(e.newValue);
            if (!isNaN(anio)) {
              setSelectedAnio(anio);
            }
          } else {
            setSelectedAnio(null);
            setGraduaciones([]);
            setTotalContactos(0);
          }
        }
        if (e.key === 'graduaciones_mostrar_contactos') {
          setMostrarContactos(e.newValue === 'true');
        }
      };

      window.addEventListener('storage', handleStorageChange);
      
      return () => {
        channel.removeEventListener('message', handleMessage);
        channel.close();
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, [isAdmin]);

  // Cargar estado inicial para comerciales
  useEffect(() => {
    const loadInitialData = async () => {
      if (!isAdmin) {
        console.log('🔍 Comercial cargando estado inicial...');
        console.log('👤 Usuario actual:', currentUser);
        
        // Cargar año desde la base de datos
        const anio = await configuracionService.obtenerAnioSeleccionado();
        console.log('📅 Año obtenido desde BD:', anio);
        if (anio && anio > 0) {
          console.log('✅ Año válido cargado desde BD:', anio);
          setSelectedAnio(anio);
        }
        
        // Cargar estado de visibilidad
        const savedVisibility = localStorage.getItem('graduaciones_mostrar_contactos');
        console.log('👁️ Visibilidad guardada:', savedVisibility);
        setMostrarContactos(savedVisibility === 'true');
        
        // Cargar configuración inicial desde la base de datos
        loadConfiguracionInicial();
        
        setLoading(false);
      }
    };
    
    loadInitialData();
  }, [isAdmin, currentUser]);

  const loadAniosDisponibles = async () => {
    try {
      setLoading(true);
      setError(null);
      const anios = await graduacionesService.getAniosDisponibles();
      setAniosDisponibles(anios);
    } catch (err) {
      console.error('Error loading años disponibles:', err);
      setError('Error al cargar los años disponibles');
    } finally {
      setLoading(false);
    }
  };

  const loadGraduacionesPorAnio = async (anio: number) => {
    try {
      console.log('📥 Cargando graduaciones para año:', anio);
      console.log('👤 Usuario actual:', currentUser);
      console.log('🔑 Es admin:', isAdmin);
      setLoadingGraduaciones(true);
      setError(null);
      const response = await graduacionesService.getColegiosPorAnio(anio);
      console.log('📊 Respuesta del servicio:', response);
      if (response.success) {
        setGraduaciones(response.graduaciones);
        setTotalContactos(response.totalContactos);
        console.log('✅ Graduaciones cargadas:', response.graduaciones.length);
        console.log('📋 Detalles de graduaciones:', response.graduaciones);
      } else {
        console.error('❌ Error en respuesta:', response);
        setError('Error al cargar las graduaciones');
      }
    } catch (err) {
      console.error('❌ Error loading graduaciones por año:', err);
      setError('Error al cargar las graduaciones');
    } finally {
      setLoadingGraduaciones(false);
    }
  };

  const handleAnioChange = async (anio: number | null) => {
    console.log('📅 Admin cambió año:', anio);
    setSelectedAnio(anio);
    
    if (anio) {
      // Solo los admins pueden cambiar el año
      if (!isAdmin) {
        alert('Solo los administradores pueden cambiar el año de filtro');
        return;
      }
      
      // Guardar el año en la base de datos
      const success = await configuracionService.actualizarAnioSeleccionado(anio);
      if (success) {
        console.log('💾 Año guardado en BD:', anio);
        // Año seleccionado silenciosamente - sin alert
      } else {
        console.error('❌ Error guardando año en BD');
        alert('Error al guardar el año seleccionado');
      }
    } else {
      // Si se deselecciona el año, limpiar la configuración
      setMostrarContactos(false);
      setGraduaciones([]);
      setTotalContactos(0);
    }
  };

  const clearFilter = async () => {
    // Solo los admins pueden limpiar el filtro
    if (!isAdmin) {
      alert('Solo los administradores pueden limpiar el filtro');
      return;
    }
    
    try {
      // Limpiar en la base de datos
      await configuracionService.actualizarAnioSeleccionado(0);
      await configuracionService.actualizarVisibilidadContactos(false);
      
      setSelectedAnio(null);
      setMostrarContactos(false);
      setGraduaciones([]);
      setTotalContactos(0);
      
      alert('✅ Filtro limpiado. Los comerciales ya no verán contactos filtrados');
      console.log('🔄 Admin limpió filtro (clearFilter)');
    } catch (error) {
      console.error('Error limpiando filtro:', error);
      alert('Error al limpiar el filtro');
    }
  };

  const toggleMostrarContactos = async () => {
    const newState = !mostrarContactos;
    
    try {
      // Solo los admins pueden activar/desactivar la visibilidad
      if (!isAdmin) {
        alert('Solo los administradores pueden cambiar esta configuración');
        return;
      }
      
      // Actualizar en la base de datos
      const success = await configuracionService.actualizarVisibilidadContactos(newState);
      
      if (success) {
        setMostrarContactos(newState);
        localStorage.setItem('graduaciones_mostrar_contactos', newState.toString());
        
        // Si se activa la visibilidad y hay un año seleccionado, cargar las graduaciones
        if (newState && selectedAnio) {
          await loadGraduacionesPorAnio(selectedAnio);
        }
        
        // Mostrar mensaje de confirmación
        if (newState) {
          alert(`✅ Los comerciales ahora pueden ver los contactos del año ${selectedAnio}`);
        } else {
          alert('❌ Los comerciales ya no pueden ver los contactos');
        }
        
        console.log('🔄 Admin cambió visibilidad de contactos en BD:', newState);
      } else {
        console.error('❌ Error actualizando visibilidad en BD');
        alert('Error al actualizar la configuración');
      }
    } catch (error) {
      console.error('❌ Error en toggleMostrarContactos:', error);
      alert('Error al actualizar la configuración');
    }
  };

  const filteredGraduaciones = graduaciones.filter(graduacion => {
    const matchesNombre = graduacion.nombreColegio.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPrevision = !filtroPrevision || graduacion.prevision === filtroPrevision;
    const matchesEstado = !filtroEstado || graduacion.estado === filtroEstado;
    
    return matchesNombre && matchesPrevision && matchesEstado;
  });

  // Función para abrir modal de contactos
  const abrirModalContactos = (contactos: Contacto[], nombreColegio: string) => {
    setContactosModal({
      isOpen: true,
      contactos,
      nombreColegio
    });
  };

  // Función para cerrar modal de contactos
  const cerrarModalContactos = () => {
    setContactosModal({
      isOpen: false,
      contactos: [],
      nombreColegio: ''
    });
  };

  // Función para iniciar edición
  const iniciarEdicion = (graduacion: Graduacion) => {
    setEditingId(graduacion.id);
    setEditData({
      responsable: graduacion.responsable || '',
      tipoProducto: graduacion.tipoProducto || '',
      prevision: graduacion.prevision || '',
      estado: graduacion.estado || '',
      observaciones: graduacion.observaciones || ''
    });
  };

  // Función para cancelar edición
  const cancelarEdicion = () => {
    setEditingId(null);
    setEditData({
      responsable: '',
      tipoProducto: '',
      prevision: '',
      estado: '',
      observaciones: ''
    });
  };

  // Función para guardar cambios
  const guardarCambios = async (id: string) => {
    try {
      const response = await graduacionesService.actualizarGraduacion(id, editData);
      if (response.success) {
        // Actualizar la graduación en el estado local
        setGraduaciones(prev => prev.map(g => 
          g.id === id 
            ? { ...g, ...response.graduacion }
            : g
        ));
        setEditingId(null);
        alert('✅ Graduación actualizada correctamente');
      } else {
        alert('❌ Error al actualizar la graduación');
      }
    } catch (error) {
      console.error('Error actualizando graduación:', error);
      alert('❌ Error al actualizar la graduación');
    }
  };


  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Cargando graduaciones...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="text-red-500 text-xl mb-4">⚠️</div>
          <p className="text-red-600 mb-4">{error}</p>
          <button
            onClick={isAdmin ? loadAniosDisponibles : () => {}}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Graduaciones</h1>
          <p className="text-gray-600">
            {isAdmin 
              ? "Selecciona un año para ver los colegios con contactos de ese año"
              : "Los datos se mostrarán cuando el administrador seleccione un año"
            }
          </p>
        </div>
      </div>

      {/* Filtro de año (solo para administradores) */}
      {isAdmin && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center mb-4">
            <Calendar className="w-5 h-5 mr-2 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">Filtro por Año</h3>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <label className="text-sm font-medium text-gray-700">
                Año de nacimiento:
              </label>
              {mostrarContactos && (
                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                  Filtro bloqueado mientras los contactos están visibles
                </span>
              )}
              <select
                value={selectedAnio || ''}
                onChange={(e) => handleAnioChange(e.target.value ? parseInt(e.target.value) : null)}
                className={`border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                  mostrarContactos ? 'bg-gray-100 cursor-not-allowed' : ''
                }`}
                disabled={aniosDisponibles.length === 0 || mostrarContactos}
              >
                <option value="">
                  {aniosDisponibles.length === 0 ? 'No hay años disponibles' : 'Seleccionar año...'}
                </option>
                {aniosDisponibles.map(anio => (
                  <option key={anio} value={anio}>
                    {anio}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex items-center space-x-3">
              {selectedAnio && (
                <button
                  onClick={toggleMostrarContactos}
                  className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                    mostrarContactos
                      ? 'bg-red-600 text-white hover:bg-red-700'
                      : 'bg-green-600 text-white hover:bg-green-700'
                  }`}
                >
                  <Users className="w-4 h-4 mr-2" />
                  {mostrarContactos ? 'Dejar de mostrar contactos' : 'Mostrar contactos'}
                </button>
              )}
              {selectedAnio && (
                <button
                  onClick={clearFilter}
                  className="flex items-center px-3 py-2 text-sm text-red-600 hover:text-red-700 hover:bg-red-50 rounded-md transition-colors"
                >
                  <X className="w-4 h-4 mr-1" />
                  Borrar filtro
                </button>
              )}
            </div>
          </div>
          
        </div>
      )}

      {/* Mensaje para comerciales sin filtro */}
      {!isAdmin && !selectedAnio && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center">
            <div className="text-yellow-600 mr-3">⚠️</div>
            <div>
              <p className="text-yellow-800 font-medium">Esperando filtro del administrador</p>
              <p className="text-yellow-700 text-sm">
                Los datos se mostrarán cuando el administrador seleccione un año para filtrar.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Mensaje para comerciales cuando el admin no ha activado la visibilidad */}
      {!isAdmin && selectedAnio && !mostrarContactos && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center">
            <div className="text-blue-600 mr-3">ℹ️</div>
            <div>
              <p className="text-blue-800 font-medium">Contactos ocultos</p>
              <p className="text-blue-700 text-sm">
                El administrador ha ocultado los contactos. Los datos se mostrarán cuando active la visibilidad.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Estadísticas cuando hay filtro aplicado - Solo mostrar si es admin o si los contactos están visibles */}
      {selectedAnio && (isAdmin || mostrarContactos) && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center mb-4">
            <BarChart3 className="w-5 h-5 mr-2 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">Estadísticas del Filtro</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex items-center">
                <Calendar className="w-6 h-6 text-blue-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Año Seleccionado</p>
                  <p className="text-xl font-bold text-gray-900">{selectedAnio}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex items-center">
                <Building className="w-6 h-6 text-green-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Colegios</p>
                  <p className="text-xl font-bold text-gray-900">{graduaciones.length}</p>
                </div>
              </div>
            </div>
            <div className="bg-gray-50 p-4 rounded-md">
              <div className="flex items-center">
                <Users className="w-6 h-6 text-purple-600 mr-2" />
                <div>
                  <p className="text-sm font-medium text-gray-600">Total Contactos</p>
                  <p className="text-xl font-bold text-gray-900">{totalContactos}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Búsqueda (solo cuando hay datos y contactos visibles) */}
      {selectedAnio && graduaciones.length > 0 && (isAdmin || mostrarContactos) && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center mb-4">
            <Search className="w-5 h-5 mr-2 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">Búsqueda y Filtros</h3>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Filtro por nombre de colegio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Buscar colegio
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
                <input
                  type="text"
                  placeholder="Buscar colegio..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Filtro por previsión */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filtrar por previsión
              </label>
              <select
                value={filtroPrevision}
                onChange={(e) => setFiltroPrevision(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todas las previsiónes</option>
                <option value="Buena">Buena</option>
                <option value="Regular">Regular</option>
                <option value="Mala">Mala</option>
              </select>
            </div>

            {/* Filtro por estado */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Filtrar por estado
              </label>
              <select
                value={filtroEstado}
                onChange={(e) => setFiltroEstado(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Todos los estados</option>
                <option value="NO CONTACTADO">NO CONTACTADO</option>
                <option value="CONTACTADO">CONTACTADO</option>
                <option value="REUNION CONTACTO">REUNION CONTACTO</option>
                <option value="GRUPO CLASE">GRUPO CLASE</option>
                <option value="INFO ENVIADA">INFO ENVIADA</option>
                <option value="PERDIDO">PERDIDO</option>
                <option value="GANADO">GANADO</option>
              </select>
            </div>
          </div>

          {/* Botón para limpiar filtros */}
          {(searchTerm || filtroPrevision || filtroEstado) && (
            <div className="mt-4 flex justify-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setFiltroPrevision('');
                  setFiltroEstado('');
                }}
                className="flex items-center px-3 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md transition-colors"
              >
                <X className="w-4 h-4 mr-1" />
                Limpiar filtros
              </button>
            </div>
          )}
        </div>
      )}

      {/* Loading de graduaciones - Solo mostrar si es admin o si los contactos están visibles */}
      {loadingGraduaciones && (isAdmin || mostrarContactos) && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-600">Cargando graduaciones...</span>
          </div>
        </div>
      )}

      {/* Tabla de graduaciones - Solo mostrar si es admin o si los contactos están visibles */}
      {selectedAnio && !loadingGraduaciones && (isAdmin || mostrarContactos) && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Graduaciones por Colegio</h2>
          {filteredGraduaciones.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
              <Building className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-lg">
                {searchTerm ? 'No se encontraron graduaciones' : 'No hay graduaciones para este año'}
              </p>
              {searchTerm && (
                <p className="text-sm mt-2">Intenta ajustar el término de búsqueda</p>
              )}
            </div>
          ) : (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              {/* Información de la tabla */}
              <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-gray-600">
                    Mostrando {filteredGraduaciones.length} de {graduaciones.length} colegios
                  </p>
                  <div className="text-sm text-gray-500">
                    Año: {selectedAnio}
                  </div>
                </div>
              </div>
              
              {/* Tabla estilo Excel */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  {/* Encabezados de la tabla */}
                  <thead className="bg-blue-50 border-b-2 border-blue-200">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900 border-r border-blue-200">
                        Nombre Colegio
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900 border-r border-blue-200">
                        Total Contactos
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900 border-r border-blue-200">
                        Responsable
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900 border-r border-blue-200">
                        Tipo Producto
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900 border-r border-blue-200">
                        Previsión
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900 border-r border-blue-200">
                        Estado
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900 border-r border-blue-200">
                        Observaciones
                      </th>
                      <th className="px-6 py-4 text-left text-sm font-semibold text-blue-900">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {filteredGraduaciones.map((graduacion, index) => (
                      <tr key={graduacion.id} className={`hover:bg-blue-50 transition-colors ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        {/* Nombre Colegio */}
                        <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                          <div className="text-sm font-medium text-gray-900">
                            {graduacion.nombreColegio}
                          </div>
                        </td>
                        
                        {/* Total Contactos */}
                        <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                          <div className="flex items-center">
                            <span className="text-sm text-gray-900 font-medium">
                              {graduacion.totalContactos}
                            </span>
                            <button
                              onClick={() => abrirModalContactos(graduacion.contactos, graduacion.nombreColegio)}
                              className="ml-2 flex items-center px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-md hover:bg-blue-200 transition-colors"
                            >
                              <Eye className="w-3 h-3 mr-1" />
                              Ver
                            </button>
                          </div>
                        </td>
                        
                        {/* Responsable */}
                        <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                          {editingId === graduacion.id ? (
                            <input
                              type="text"
                              value={editData.responsable}
                              onChange={(e) => setEditData(prev => ({ ...prev, responsable: e.target.value }))}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Nombre del responsable"
                            />
                          ) : (
                            <div className="text-sm text-gray-900">
                              {graduacion.responsable || 'Sin asignar'}
                            </div>
                          )}
                        </td>
                        
                        {/* Tipo Producto */}
                        <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                          {editingId === graduacion.id ? (
                            <input
                              type="text"
                              value={editData.tipoProducto}
                              onChange={(e) => setEditData(prev => ({ ...prev, tipoProducto: e.target.value }))}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Tipo de producto"
                            />
                          ) : (
                            <div className="text-sm text-gray-900">
                              {graduacion.tipoProducto || 'Sin especificar'}
                            </div>
                          )}
                        </td>
                        
                        {/* Previsión */}
                        <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                          {editingId === graduacion.id ? (
                            <select
                              value={editData.prevision}
                              onChange={(e) => setEditData(prev => ({ ...prev, prevision: e.target.value }))}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Seleccionar previsión</option>
                              <option value="Buena">Buena</option>
                              <option value="Regular">Regular</option>
                              <option value="Mala">Mala</option>
                            </select>
                          ) : (
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              graduacion.prevision === 'Buena' 
                                ? 'bg-green-100 text-green-800' 
                                : graduacion.prevision === 'Regular' 
                                ? 'bg-yellow-100 text-yellow-800' 
                                : graduacion.prevision === 'Mala' 
                                ? 'bg-red-100 text-red-800' 
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {graduacion.prevision || 'Sin especificar'}
                            </span>
                          )}
                        </td>
                        
                        {/* Estado */}
                        <td className="px-6 py-4 whitespace-nowrap border-r border-gray-200">
                          {editingId === graduacion.id ? (
                            <select
                              value={editData.estado}
                              onChange={(e) => setEditData(prev => ({ ...prev, estado: e.target.value }))}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            >
                              <option value="">Seleccionar estado</option>
                              <option value="NO CONTACTADO">NO CONTACTADO</option>
                              <option value="CONTACTADO">CONTACTADO</option>
                              <option value="REUNION CONTACTO">REUNION CONTACTO</option>
                              <option value="GRUPO CLASE">GRUPO CLASE</option>
                              <option value="INFO ENVIADA">INFO ENVIADA</option>
                              <option value="PERDIDO">PERDIDO</option>
                              <option value="GANADO">GANADO</option>
                            </select>
                          ) : (
                            <div className="text-sm text-gray-900">
                              {graduacion.estado || 'Sin especificar'}
                            </div>
                          )}
                        </td>
                        
                        {/* Observaciones */}
                        <td className="px-6 py-4 border-r border-gray-200">
                          {editingId === graduacion.id ? (
                            <textarea
                              value={editData.observaciones}
                              onChange={(e) => setEditData(prev => ({ ...prev, observaciones: e.target.value }))}
                              rows={2}
                              className="w-full px-2 py-1 text-sm border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              placeholder="Observaciones adicionales"
                            />
                          ) : (
                            <div className="text-sm text-gray-900 max-w-xs truncate" title={graduacion.observaciones || 'Sin observaciones'}>
                              {graduacion.observaciones || 'Sin observaciones'}
                            </div>
                          )}
                        </td>
                        
                        {/* Acciones */}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {editingId === graduacion.id ? (
                            <div className="flex space-x-2">
                              <button
                                onClick={() => guardarCambios(graduacion.id)}
                                className="text-green-600 hover:text-green-900 flex items-center"
                              >
                                <Save className="w-4 h-4 mr-1" />
                                Guardar
                              </button>
                              <button
                                onClick={cancelarEdicion}
                                className="text-gray-600 hover:text-gray-900 flex items-center"
                              >
                                <XIcon className="w-4 h-4 mr-1" />
                                Cancelar
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => iniciarEdicion(graduacion)}
                              className="text-blue-600 hover:text-blue-900 flex items-center"
                            >
                              <Edit3 className="w-4 h-4 mr-1" />
                              Editar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Modal de contactos */}
      <ContactosModal
        isOpen={contactosModal.isOpen}
        onClose={cerrarModalContactos}
        contactos={contactosModal.contactos}
        nombreColegio={contactosModal.nombreColegio}
      />
    </div>
  );
}
