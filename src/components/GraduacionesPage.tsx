import React, { useState, useEffect } from 'react';
import { Building, Users, Search, ChevronDown, ChevronUp, Calendar, X, BarChart3 } from 'lucide-react';
import graduacionesService, { ColegioConContactos } from '../services/graduacionesService';

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
  const [expandedColegio, setExpandedColegio] = useState<string | null>(null);
  const [totalContactos, setTotalContactos] = useState(0);

  const isAdmin = currentUser?.role?.toLowerCase() === 'admin';

  useEffect(() => {
    if (isAdmin) {
      loadAniosDisponibles();
    } else {
      // Para comerciales, verificar si hay un filtro aplicado por el administrador
      const savedFilter = localStorage.getItem('graduaciones_filter_anio');
      if (savedFilter) {
        const anio = parseInt(savedFilter);
        if (!isNaN(anio)) {
          setSelectedAnio(anio);
        }
      }
      setLoading(false);
    }
  }, [isAdmin]);

  useEffect(() => {
    if (selectedAnio) {
      loadColegiosPorAnio(selectedAnio);
    }
  }, [selectedAnio]);

  // Listener para cambios en el filtro (para comerciales)
  useEffect(() => {
    if (!isAdmin) {
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
            setExpandedColegio(null);
          }
        }
      };

      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
    }
  }, [isAdmin]);

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
      setLoadingColegios(true);
      setError(null);
      const response = await graduacionesService.getColegiosPorAnio(anio);
      if (response.success) {
        setColegios(response.colegios);
        setTotalContactos(response.totalContactos);
      } else {
        setError('Error al cargar los colegios');
      }
    } catch (err) {
      console.error('Error loading colegios por año:', err);
      setError('Error al cargar los colegios');
    } finally {
      setLoadingColegios(false);
    }
  };

  const handleAnioChange = (anio: number | null) => {
    setSelectedAnio(anio);
    if (anio) {
      // Guardar el filtro en localStorage para que los comerciales puedan verlo
      localStorage.setItem('graduaciones_filter_anio', anio.toString());
    } else {
      // Limpiar el filtro
      localStorage.removeItem('graduaciones_filter_anio');
      setColegios([]);
      setTotalContactos(0);
      setExpandedColegio(null);
    }
  };

  const clearFilter = () => {
    setSelectedAnio(null);
    localStorage.removeItem('graduaciones_filter_anio');
    setColegios([]);
    setTotalContactos(0);
    setExpandedColegio(null);
  };

  const filteredColegios = colegios.filter(colegio => 
    colegio.nombreColegio.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const toggleColegio = (colegioNombre: string) => {
    setExpandedColegio(expandedColegio === colegioNombre ? null : colegioNombre);
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

      {/* Estadísticas cuando hay filtro aplicado */}
      {selectedAnio && (
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

      {/* Búsqueda (solo cuando hay datos) */}
      {selectedAnio && colegios.length > 0 && (
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

      {/* Loading de colegios */}
      {loadingColegios && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex justify-center items-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
            <span className="text-gray-600">Cargando colegios...</span>
          </div>
        </div>
      )}

      {/* Lista de colegios */}
      {selectedAnio && !loadingColegios && (
        <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="flex items-center mb-4">
            <Building className="w-5 h-5 mr-2 text-gray-500" />
            <h3 className="text-lg font-medium text-gray-900">Colegios</h3>
          </div>
          
          {filteredColegios.length === 0 ? (
            <div className="text-center py-8">
              <Building className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <p className="text-gray-500 text-lg">
                {searchTerm ? 'No se encontraron colegios' : 'No hay colegios con contactos para este año'}
              </p>
              {searchTerm && (
                <p className="text-gray-400 text-sm">Intenta ajustar el término de búsqueda</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredColegios.map((colegio) => (
                <div key={colegio.nombreColegio} className="border border-gray-200 rounded-md">
                  {/* Header del colegio */}
                  <div
                    className="p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => toggleColegio(colegio.nombreColegio)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Building className="w-5 h-5 text-blue-600 mr-3" />
                        <div>
                          <h4 className="font-medium text-gray-900">{colegio.nombreColegio}</h4>
                          <p className="text-sm text-gray-600">
                            {colegio.totalContactos} contacto{colegio.totalContactos !== 1 ? 's' : ''}
                          </p>
                        </div>
                      </div>
                      {expandedColegio === colegio.nombreColegio ? (
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      )}
                    </div>
                  </div>

                  {/* Contenido expandible */}
                  {expandedColegio === colegio.nombreColegio && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                      <div className="space-y-3">
                        {colegio.contactos.map((contacto) => (
                          <div key={contacto.id} className="bg-white rounded-md p-3 border border-gray-200">
                            <div className="flex items-center justify-between">
                              <div className="flex-1">
                                <h5 className="font-medium text-gray-900">{contacto.nombreCompleto}</h5>
                                <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                                  {contacto.telefono && (
                                    <span>📞 {contacto.telefono}</span>
                                  )}
                                  {contacto.instagram && (
                                    <span>📷 @{contacto.instagram}</span>
                                  )}
                                  <span>👤 {contacto.comercialNombre || 'Sin asignar'}</span>
                                </div>
                              </div>
                              <div className="text-right text-sm text-gray-500">
                                <p>Nacido en {contacto.anioNacimiento}</p>
                                <p>Alta: {new Date(contacto.fechaAlta).toLocaleDateString()}</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
