import React, { useState, useMemo, useEffect } from 'react';
import { BarChart3, Users, Filter, ArrowRight } from 'lucide-react';
import { Contact, UniversityStats, TitulationStats } from '../types';
import universidadesService, { UniversidadConEstadisticas } from '../services/universidadesService';
import { schoolsMapping, schoolOrder, getSchoolForTitulation } from '../data/schoolsData';
import { User } from '../types/auth';
import { useAuth } from '../hooks/useAuth';
import { usePermissions } from '../hooks/usePermissions';
import { useContacts } from '../hooks/useContacts';

interface CountPageProps {
  onNavigateToContacts: (filters: any) => void;
  currentUser: User | null;
}

export default function CountPage({ onNavigateToContacts, currentUser }: CountPageProps) {
  const [selectedUniversidad, setSelectedUniversidad] = useState<string>('');
  const [selectedCurso, setSelectedCurso] = useState<string>('');
  const [selectedComercial, setSelectedComercial] = useState<string>('');
  const [allUniversidades, setAllUniversidades] = useState<UniversidadConEstadisticas[]>([]);
  const [loadingUniversidades, setLoadingUniversidades] = useState<boolean>(true);
  const [estadisticasGenerales, setEstadisticasGenerales] = useState<any>(null);
  const [comerciales, setComerciales] = useState<User[]>([]);
  const [loadingComerciales, setLoadingComerciales] = useState<boolean>(false);
  
  // Estados para el autocompletado de colegios
  const [colegioInput, setColegioInput] = useState<string>('');
  const [showColegioDropdown, setShowColegioDropdown] = useState<boolean>(false);
  const [filteredColegios, setFilteredColegios] = useState<string[]>([]);

  const { getAllUsers } = useAuth();
  const { getJefeSubordinados } = usePermissions();
  const { contacts: allContacts } = useContacts(); // ✅ USAR LOS CONTACTOS DEL HOOK

  console.log('🎯 CountPage - Contactos del hook:', allContacts.length, allContacts);

  // Agregar logs para debugging
  console.log('🎯 CountPage - Filtros actuales:', { selectedUniversidad, selectedCurso });

  // CORREGIDO: Crear uniqueUniversidades desde allUniversidades (colegios activos de la BD)
  const uniqueUniversidades = allUniversidades
    .filter(uni => uni.activa !== false)
    .map(uni => uni.nombre)
    .sort((a: any, b: any) => a.localeCompare(b, 'es', { sensitivity: 'base' }));

  // Sincronizar el input con el estado seleccionado
  useEffect(() => {
    setColegioInput(selectedUniversidad);
  }, [selectedUniversidad]);

  // Filtrar colegios cuando se escribe en el input
  useEffect(() => {
    if (colegioInput.trim()) {
      const filtered = uniqueUniversidades.filter(cole =>
        cole.toLowerCase().includes(colegioInput.toLowerCase())
      );
      setFilteredColegios(filtered);
      setShowColegioDropdown(true);
    } else {
      setFilteredColegios([]);
      setShowColegioDropdown(false);
    }
  }, [colegioInput, uniqueUniversidades]);

  useEffect(() => {
    const fetchAllUniversidades = async () => {
      try {
        console.log('📥 Cargando todas las universidades con estadísticas...');
        const response = await universidadesService.getUniversidadesConEstadisticas(true);
        console.log('🏫 Universidades con estadísticas cargadas:', response);
        setAllUniversidades(response.universidades);
        setEstadisticasGenerales(response.estadisticasGenerales);
      } catch (error) {
        console.error('❌ Error cargando universidades con estadísticas:', error);
        setAllUniversidades([]);
        setEstadisticasGenerales(null);
      } finally {
        setLoadingUniversidades(false);
      }
    };

    fetchAllUniversidades();
  }, []);

  // Cargar comerciales si el usuario es admin
  useEffect(() => {
    const fetchComerciales = async () => {
      if (currentUser?.role?.toLowerCase() === 'admin') {
        try {
          setLoadingComerciales(true);
          console.log('🔄 Cargando comerciales para admin...');
          const users = await getAllUsers();
          console.log('👥 Usuarios obtenidos:', users);
          const comercialesOnly = users.filter(user => user.role === 'comercial');
          console.log('💼 Comerciales filtrados:', comercialesOnly);
          setComerciales(comercialesOnly);
        } catch (error) {
          console.error('❌ Error cargando comerciales:', error);
          setComerciales([]);
        } finally {
          setLoadingComerciales(false);
        }
      } else {
        console.log('👤 Usuario no es admin, no se cargan comerciales');
        setComerciales([]);
      }
    };

    fetchComerciales();
  }, [currentUser, getAllUsers]);

  // Remove this entire useMemo block - it's a duplicate!
  // const allContacts = useMemo(() => {
  //   console.log('🔍 Estructura de allUniversidades:', allUniversidades);
  //   console.log('📊 Número de universidades:', allUniversidades.length);
  //   
  //   const contacts: Contact[] = [];
  //   
  //   allUniversidades.forEach((universidad, uniIndex) => {
  //     console.log(`🏫 Universidad ${uniIndex}:`, universidad.nombre, 'Titulaciones:', universidad.titulaciones?.length || 0);
  //     
  //     if (universidad.titulaciones) {
  //       universidad.titulaciones.forEach((titulacion, titIndex) => {
  //         console.log(`  📚 Titulación ${titIndex}:`, titulacion.nombre, 'Cursos:', titulacion.cursos?.length || 0);
  //         
  //         if (titulacion.cursos) {
  //           titulacion.cursos.forEach((curso, cursoIndex) => {
  //             console.log(`    📖 Curso ${cursoIndex}:`, curso.curso, 'Alumnos:', curso.alumnos?.length || 0);
  //             
  //             if (curso.alumnos) {
  //               curso.alumnos.forEach(alumno => {
  //                 console.log(`      👤 Alumno:`, alumno.nombreCompleto, 'ComercialId:', alumno.comercialId);
  //                 contacts.push({
  //                   id: alumno._id,
  //                   nombre: alumno.nombreCompleto,
  //                   telefono: alumno.telefono,
  //                   instagram: alumno.instagram,
  //                   universidad: universidad.nombre,
  //                   universidadId: universidad.id,
  //                   titulacion: titulacion.nombre,
  //                   titulacionId: titulacion._id,
  //                   curso: parseInt(curso.curso),
  //                   año_nacimiento: alumno.anioNacimiento,
  //                   fecha_alta: alumno.fechaAlta,
  //                   comercial_id: alumno.comercialId,
  //                   comercial_nombre: '', // Este campo no está en la estructura actual
  //                   comercial: alumno.comercialId
  //                 });
  //               });
  //             } else {
  //               console.log(`      ❌ No hay alumnos en curso ${curso.curso}`);
  //             }
  //           });
  //         } else {
  //           console.log(`    ❌ No hay cursos en titulación ${titulacion.nombre}`);
  //         }
  //       });
  //     } else {
  //       console.log(`  ❌ No hay titulaciones en universidad ${universidad.nombre}`);
  //     }
  //   });
  //   
  //   console.log('📊 Total contactos extraídos:', contacts.length);
  //   return contacts;
  // }, [allUniversidades]);

  // Función para obtener todos los comerciales visibles (incluyendo subordinados)
  const getComercialVisibles = useMemo(() => {
    // Si no hay comercial seleccionado Y el usuario es admin, mostrar todos
    if (!selectedComercial) {
      if (currentUser?.role?.toLowerCase() === 'admin') {
        console.log('👑 Admin sin filtro de comercial - mostrando todos los contactos');
        return null; // null significa "sin filtro"
      }
      console.log('🚫 No hay comercial seleccionado y no es admin');
      return [];
    }
    
    // Obtener subordinados del comercial seleccionado
    const subordinados = getJefeSubordinados(selectedComercial);
    const comercialesVisibles = [selectedComercial, ...subordinados];
    
    console.log(`👥 Comerciales visibles para ${selectedComercial}:`, comercialesVisibles);
    console.log('🔍 Subordinados encontrados:', subordinados);
    return comercialesVisibles;
  }, [selectedComercial, getJefeSubordinados, currentUser]);

  const filteredContacts = useMemo(() => {
    console.log('🎯 Iniciando filtrado de contactos...');
    console.log('📊 Total contactos disponibles:', allContacts.length);
    console.log('🔧 Filtros activos:', { selectedUniversidad, selectedCurso, selectedComercial });
    
    // En filteredContacts (línea ~160)
    const filtered = allContacts.filter(contact => {
    const matchesUniversidad = !selectedUniversidad || contact.nombre_colegio === selectedUniversidad;
    const matchesCurso = !selectedCurso || (contact.año_nacimiento?.toString() === selectedCurso);
    
    // CORRECCIÓN: Manejar cuando getComercialVisibles es null (admin sin filtro)
    let matchesComercial = true;
    if (selectedComercial && getComercialVisibles !== null) {
    console.log(`🔍 Verificando contacto ${contact.nombre} - comercial_id: ${contact.comercial_id}`);
    console.log('👥 Comerciales visibles:', getComercialVisibles);
    matchesComercial = getComercialVisibles.includes(contact.comercial_id);
    console.log(`✅ Coincide comercial: ${matchesComercial}`);
    }
    
    const matches = matchesUniversidad && matchesCurso && matchesComercial;
    console.log(`📋 Contacto ${contact.nombre}: Colegio(${matchesUniversidad}) + Año(${matchesCurso}) + Comercial(${matchesComercial}) = ${matches}`);
    
    return matches;
    });
    
    console.log('🔍 Contactos filtrados (incluyendo subordinados):', filtered.length, filtered);
    return filtered;
  }, [allUniversidades, allContacts, selectedUniversidad, selectedCurso, selectedComercial, getComercialVisibles]);

  // NUEVO: años de nacimiento presentes en los contactos filtrados (ordenados desc)
  const birthYears = useMemo(() => {
    const years = Array.from(new Set(filteredContacts.map(c => c.año_nacimiento).filter(Boolean))) as number[];
    return years.sort((a, b) => a - b);
  }, [filteredContacts]);

  // NUEVO: estadísticas por colegio y por año de nacimiento
  const colegiosStats = useMemo(() => {
    const stats: Record<string, { colegio: string; total: number; porAnio: Record<number, number>; porComercial: Record<string, number> }> = {};
    
    // Primero, inicializar todos los colegios activos (incluso sin contactos)
    allUniversidades.forEach(universidad => {
      if (universidad.activa !== false) { // Solo colegios activos
        stats[universidad.nombre] = { 
          colegio: universidad.nombre, 
          total: 0, 
          porAnio: {}, 
          porComercial: {} 
        };
      }
    });
    
    // Luego, agregar los datos de contactos filtrados
    filteredContacts.forEach(contact => {
      const colegio = contact.nombre_colegio || 'Sin colegio';
      if (!stats[colegio]) {
        stats[colegio] = { colegio, total: 0, porAnio: {}, porComercial: {} };
      }
      stats[colegio].total += 1;
      if (contact.año_nacimiento) {
        stats[colegio].porAnio[contact.año_nacimiento] = (stats[colegio].porAnio[contact.año_nacimiento] || 0) + 1;
      }
      const comercialNombre = contact.comercial_nombre || contact.comercial || 'Sin asignar';
      stats[colegio].porComercial[comercialNombre] = (stats[colegio].porComercial[comercialNombre] || 0) + 1;
    });
    
    return Object.values(stats).sort((a, b) => a.colegio.localeCompare(b.colegio, 'es', { sensitivity: 'base' }));
  }, [filteredContacts, allUniversidades]);
  

  // Años de nacimiento para el filtro (de todos los contactos)
  const allBirthYears = useMemo(() => {
    const years = Array.from(new Set(allContacts.map(c => c.año_nacimiento).filter(Boolean))) as number[];
    return years.sort((a, b) => a - b);
  }, [allContacts]);
 
  const totalContacts = filteredContacts.length;
  const totalUniversidades = uniqueUniversidades.length;
  const totalTitulaciones = 0;
  console.log('📈 Totales calculados:', { totalContacts, totalUniversidades, totalTitulaciones });

  const handleUniversityClick = (universidad: string) => {
    onNavigateToContacts({
      universidad,
      titulacion: '',
      curso: selectedCurso,
      aportado_por: '',
      consentimiento: '',
      search: '',
      comercial: selectedComercial
    });
  };

  const handleTitulationClick = (universidad: string, titulacion: string) => {
    onNavigateToContacts({
      universidad,
      titulacion,
      curso: selectedCurso,
      aportado_por: '',
      consentimiento: '',
      search: '',
      comercial: selectedComercial
    });
  };

  // Funciones para manejar el autocompletado de colegios
  const handleColegioInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setColegioInput(value);
    setSelectedUniversidad(value); // Actualizar el filtro en tiempo real
  };

  const handleColegioSelect = (cole: string) => {
    setColegioInput(cole);
    setSelectedUniversidad(cole);
    setShowColegioDropdown(false);
  };

  const handleColegioInputFocus = () => {
    if (colegioInput.trim()) {
      setShowColegioDropdown(true);
    }
  };

  const handleColegioInputBlur = () => {
    // Delay para permitir que se ejecute el click en el dropdown
    setTimeout(() => {
      setShowColegioDropdown(false);
    }, 200);
  };

  const scrollToUniversitySection = (universidad: string) => {
    // Usar el mismo formato de ID que se usa en la sección de titulaciones
    const universidadId = universidad.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
    const targetElement = document.getElementById(`universidad-${universidadId}`);
    
    if (targetElement) {
      targetElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
        inline: 'nearest'
      });
      
      setTimeout(() => {
        const yOffset = -20;
        const y = targetElement.getBoundingClientRect().top + window.pageYOffset + yOffset;
        window.scrollTo({ top: y, behavior: 'smooth' });
      }, 100);
    } else {
      console.log('No se encontró el elemento con ID:', `universidad-${universidadId}`);
    }
  };

  const handleUniversityCardClick = (universidad: string) => {
    scrollToUniversitySection(universidad);
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Conteo y Estadísticas</h1>
          <p className="text-gray-600">Resumen de contactos por universidad y titulación</p>
        </div>
      </div>

      {/* Filtros de contexto */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center mb-4">
          <Filter className="w-5 h-5 mr-2 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">Filtros de Contexto</h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="relative">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Colegio
            </label>
            <input
              type="text"
              value={colegioInput}
              onChange={handleColegioInputChange}
              onFocus={handleColegioInputFocus}
              onBlur={handleColegioInputBlur}
              placeholder={loadingUniversidades ? 'Cargando colegios...' : 'Escribir nombre del colegio...'}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              disabled={loadingUniversidades}
            />
            
            {/* Dropdown de autocompletado */}
            {showColegioDropdown && filteredColegios.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredColegios.map((cole, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 hover:bg-blue-50 cursor-pointer text-sm"
                    onMouseDown={() => handleColegioSelect(cole)}
                  >
                    {cole}
                  </div>
                ))}
              </div>
            )}
            
            {/* Botón para limpiar filtro */}
            {colegioInput && (
              <button
                type="button"
                onClick={() => {
                  setColegioInput('');
                  setSelectedUniversidad('');
                  setShowColegioDropdown(false);
                }}
                className="absolute right-2 top-7 text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Año de nacimiento
            </label>
            <select
              value={selectedCurso}
              onChange={(e) => setSelectedCurso(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los años</option>
              {allBirthYears.map(year => (
                <option key={year} value={year.toString()}>{year}</option>
              ))}
            </select>
          </div>

          {/* Filtro de comerciales - Solo visible para admin */}
          {currentUser?.role?.toLowerCase() === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comercial
              </label>
              <select
                value={selectedComercial}
                onChange={(e) => setSelectedComercial(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={loadingComerciales}
              >
                <option value="">{loadingComerciales ? 'Cargando comerciales...' : 'Todos los comerciales'}</option>
                {!loadingComerciales && comerciales.map(comercial => (
                  <option key={comercial.id} value={comercial.id}>{comercial.nombre}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>

      {/* Resumen general */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white mb-6">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">Total de Contactos</h3>
              <p className="text-2xl font-bold">{filteredContacts.length}</p>
            </div>
            <Users className="w-8 h-8 opacity-75" />
          </div>
          
          <div>
            <h3 className="text-sm font-medium opacity-90">Colegios</h3>
            <p className="text-2xl font-bold">{uniqueUniversidades.length}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium opacity-90">Años de nacimiento</h3>
            <p className="text-2xl font-bold">{allBirthYears.length}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium opacity-90">Total Alumnos</h3>
            <p className="text-2xl font-bold">{filteredContacts.length}</p>
          </div>
        </div>
      </div>

      {/* Contactos por Colegio */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Contactos por Colegio</h2>
        {colegiosStats.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
            No hay datos para mostrar
          </div>
        )}
        <div className="space-y-6">
          {colegiosStats.map(row => (
            <div key={row.colegio} className="rounded-lg overflow-hidden border border-gray-200">
              {/* Encabezado azul del colegio */}
              <div className="bg-gradient-to-r from-blue-700 to-blue-800 px-6 py-4 flex items-center justify-between">
                <div>
                  <h3 className="text-white text-lg font-bold">{row.colegio}</h3>
                  <p className="text-blue-100 text-sm">Total contactos: {row.total}</p>
                </div>
                <button
                  onClick={() => onNavigateToContacts({ nombre_colegio: row.colegio })}
                  className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors"
                >
                  Ver contactos
                </button>
              </div>
              {/* Contenido con columnas por año de nacimiento y comerciales */}
              <div className="bg-white relative overflow-x-auto">
                <div className="px-6 py-3 border-b border-gray-200 relative">
                  <div className="grid gap-4" style={{ gridTemplateColumns: `1fr ${birthYears.map(() => 'minmax(60px, 1fr)').join(' ')} 1fr` }}>
                    <div className="text-sm font-medium text-gray-700">Año de nacimiento</div>
                    {birthYears.map(year => (
                      <div key={year} className="text-sm font-medium text-gray-700 text-center">{year}</div>
                    ))}
                    <div className="text-sm font-medium text-gray-700 text-right sticky right-0 bg-white z-20 pl-0 pr-0 border-l border-gray-200">Comerciales</div>
                  </div>
                </div>
                <div className="px-6 py-4 relative">
                  <div className="grid gap-4 items-center" style={{ gridTemplateColumns: `1fr ${birthYears.map(() => 'minmax(60px, 1fr)').join(' ')} 1fr` }}>
                    <div className="text-sm font-medium text-gray-900">{row.total} contactos</div>
                    {birthYears.map(year => (
                      <div key={year} className="text-center">
                        {row.porAnio[year] ? (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">{row.porAnio[year]}</span>
                        ) : (
                          <span className="text-gray-300">0</span>
                        )}
                      </div>
                    ))}
                    <div className="text-sm text-right sticky right-0 bg-white z-20 pl-0 pr-0 border-l border-gray-200">
                      <div className="flex flex-col gap-1 items-end">
                        {Object.entries(row.porComercial)
                          .filter(([, cantidad]) => cantidad > 0)
                          .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es', { sensitivity: 'base' }))
                          .map(([nombre, cantidad]) => (
                            <span key={nombre} className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {nombre} ({cantidad})
                            </span>
                          ))}
                      </div>
                      {Object.entries(row.porComercial).filter(([, cantidad]) => cantidad > 0).length === 0 && (
                        <span className="text-gray-400 text-sm">Sin asignar</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sección por titulación eliminada */}
    </div>
  );
}
