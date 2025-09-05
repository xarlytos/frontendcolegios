import { useState, useEffect } from 'react';
import { Building, Users, Search, Calendar, X, BarChart3 } from 'lucide-react';
import graduacionesService, { ColegioConContactos } from '../services/graduacionesService';
import configuracionService from '../services/configuracionService';

interface GraduacionesPageProps {
  currentUser?: any;
}

export default function GraduacionesPage({ currentUser }: GraduacionesPageProps) {
  const [colegios, setColegios] = useState<ColegioConContactos[]>([]);
  const [aniosDisponibles, setAniosDisponibles] = useState<number[]>([]);
  const [selectedAnio, setSelectedAnio] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadingColegios, setLoadingColegios] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [totalContactos, setTotalContactos] = useState(0);
  const [mostrarContactos, setMostrarContactos] = useState(false);

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
        // Cargar los contactos automáticamente
        await loadColegiosPorAnio(anioSeleccionado);
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
          loadColegiosPorAnio(anio);
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
      loadColegiosPorAnio(selectedAnio);
    }
  }, [selectedAnio]);

  // Cargar colegios cuando el comercial recibe el filtro inicial
  useEffect(() => {
    console.log('🔄 useEffect loadColegios - isAdmin:', isAdmin, 'selectedAnio:', selectedAnio, 'loading:', loading);
    if (!isAdmin && selectedAnio && !loading) {
      console.log('📥 Comercial cargando colegios para año:', selectedAnio);
      loadColegiosPorAnio(selectedAnio);
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
            setColegios([]);
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
            setColegios([]);
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

  const loadColegiosPorAnio = async (anio: number) => {
    try {
      console.log('📥 Cargando colegios para año:', anio);
      console.log('👤 Usuario actual:', currentUser);
      console.log('🔑 Es admin:', isAdmin);
      setLoadingColegios(true);
      setError(null);
      const response = await graduacionesService.getColegiosPorAnio(anio);
      console.log('📊 Respuesta del servicio:', response);
      if (response.success) {
        setColegios(response.colegios);
        setTotalContactos(response.totalContactos);
        console.log('✅ Colegios cargados:', response.colegios.length);
        console.log('📋 Detalles de colegios:', response.colegios);
      } else {
        console.error('❌ Error en respuesta:', response);
        setError('Error al cargar los colegios');
      }
    } catch (err) {
      console.error('❌ Error loading colegios por año:', err);
      setError('Error al cargar los colegios');
    } finally {
      setLoadingColegios(false);
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
      setColegios([]);
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
      setColegios([]);
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
        
        // Si se activa la visibilidad y hay un año seleccionado, cargar los contactos
        if (newState && selectedAnio) {
          await loadColegiosPorAnio(selectedAnio);
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

  const filteredColegios = colegios.filter(colegio => 
    colegio.nombreColegio.toLowerCase().includes(searchTerm.toLowerCase())
  );


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
              <select
                value={selectedAnio || ''}
                onChange={(e) => handleAnioChange(e.target.value ? parseInt(e.target.value) : null)}
                className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={aniosDisponibles.length === 0}
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
                  <p className="text-xl font-bold text-gray-900">{colegios.length}</p>
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
      {selectedAnio && colegios.length > 0 && (isAdmin || mostrarContactos) && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center mb-4">
            <Search className="w-5 h-5 mr-2 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">Búsqueda</h3>
          </div>
          
          <div className="max-w-md">
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
        </div>
      )}

      {/* Loading de colegios - Solo mostrar si es admin o si los contactos están visibles */}
      {loadingColegios && (isAdmin || mostrarContactos) && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-600">Cargando colegios...</span>
          </div>
        </div>
      )}

      {/* Lista de colegios - Estilo similar a CountPage - Solo mostrar si es admin o si los contactos están visibles */}
      {selectedAnio && !loadingColegios && (isAdmin || mostrarContactos) && (
        <div className="mb-8">
          <h2 className="text-xl font-bold text-gray-900 mb-4">Contactos por Colegio</h2>
          {filteredColegios.length === 0 ? (
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
              <Building className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-lg">
                {searchTerm ? 'No se encontraron colegios' : 'No hay colegios con contactos para este año'}
              </p>
              {searchTerm && (
                <p className="text-sm mt-2">Intenta ajustar el término de búsqueda</p>
              )}
            </div>
          ) : (
            <div className="space-y-6">
              {filteredColegios.map((colegio) => (
                <div key={colegio.nombreColegio} className="rounded-lg overflow-hidden border border-gray-200">
                  {/* Encabezado azul del colegio */}
                  <div className="bg-gradient-to-r from-blue-700 to-blue-800 px-6 py-4 flex items-center justify-between">
                    <div>
                      <h3 className="text-white text-lg font-bold">{colegio.nombreColegio}</h3>
                      <p className="text-blue-100 text-sm">Total contactos: {colegio.totalContactos}</p>
                    </div>
                    <div className="text-blue-100 text-sm">
                      Año: {selectedAnio}
                    </div>
                  </div>
                  
                  {/* Contenido con tabla de contactos */}
                  <div className="bg-white">
                    {mostrarContactos || isAdmin ? (
                      <div className="overflow-x-auto">
                        {/* Encabezado de la tabla */}
                        <div className="px-6 py-3 border-b border-gray-200 bg-gray-50">
                          <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
                            <div className="col-span-3">Nombre Completo</div>
                            <div className="col-span-2">Teléfono</div>
                            <div className="col-span-2">Instagram</div>
                            <div className="col-span-2">Año Nacimiento</div>
                            <div className="col-span-2">Comercial</div>
                            <div className="col-span-1">Fecha Alta</div>
                          </div>
                        </div>
                        
                        {/* Filas de contactos */}
                        <div className="divide-y divide-gray-200">
                          {colegio.contactos.map((contacto) => (
                            <div key={contacto.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                              <div className="grid grid-cols-12 gap-4 items-center text-sm">
                                <div className="col-span-3">
                                  <div className="font-medium text-gray-900">{contacto.nombreCompleto}</div>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-gray-600">
                                    {contacto.telefono || '-'}
                                  </span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-gray-600">
                                    {contacto.instagram ? `@${contacto.instagram}` : '-'}
                                  </span>
                                </div>
                                <div className="col-span-2">
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                    {contacto.anioNacimiento}
                                  </span>
                                </div>
                                <div className="col-span-2">
                                  <span className="text-gray-600">
                                    {contacto.comercialNombre || 'Sin asignar'}
                                  </span>
                                </div>
                                <div className="col-span-1">
                                  <span className="text-gray-500 text-xs">
                                    {new Date(contacto.fechaAlta).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : (
                      <div className="px-6 py-8 text-center">
                        <div className="text-blue-600 mb-3 text-2xl">🔒</div>
                        <p className="text-blue-800 font-medium">Contactos ocultos</p>
                        <p className="text-blue-700 text-sm">
                          El administrador ha ocultado los detalles de los contactos.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
