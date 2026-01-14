import React, { useState, useMemo, useEffect } from 'react';
import { BarChart3, Users, Filter, ArrowRight } from 'lucide-react';
import { Contact, UniversityStats, TitulationStats } from '../types';
import universidadesService, { UniversidadConEstadisticas } from '../services/universidadesService';
import { schoolsMapping, schoolOrder, getSchoolForTitulation } from '../data/schoolsData';
import { User } from '../types/auth';
import { useContacts } from '../hooks/useContacts';

interface CountPageProps {
  onNavigateToContacts: (filters: any) => void;
  currentUser: User | null;
}

export default function CountPage({ onNavigateToContacts, currentUser }: CountPageProps) {
  const [selectedUniversidad, setSelectedUniversidad] = useState<string>('');
  const [selectedRegimen, setSelectedRegimen] = useState<string>('');
  const [selectedLocalidad, setSelectedLocalidad] = useState<string>('');
  const [favoriteLocalidades, setFavoriteLocalidades] = useState<string[]>(() => {
    // Cargar favoritos desde localStorage al inicializar
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('favoriteLocalidades');
      return saved ? JSON.parse(saved) : [];
    }
    return [];
  });
  const [allUniversidades, setAllUniversidades] = useState<UniversidadConEstadisticas[]>([]);
  const [loadingUniversidades, setLoadingUniversidades] = useState<boolean>(true);
  const [estadisticasGenerales, setEstadisticasGenerales] = useState<any>(null);
  
  // Estados para el autocompletado de colegios
  const [colegioInput, setColegioInput] = useState<string>('');
  const [showColegioDropdown, setShowColegioDropdown] = useState<boolean>(false);
  const [filteredColegios, setFilteredColegios] = useState<string[]>([]);

  const { contacts: allContacts } = useContacts(); // ✅ USAR LOS CONTACTOS DEL HOOK

  // Guardar favoritos en localStorage cuando cambien
  useEffect(() => {
    if (typeof window !== 'undefined') {
      localStorage.setItem('favoriteLocalidades', JSON.stringify(favoriteLocalidades));
    }
  }, [favoriteLocalidades]);

  console.log('🎯 CountPage - Contactos del hook:', allContacts.length, allContacts);

  // Función para normalizar nombres (eliminar acentos y convertir a minúsculas)
  const normalizeName = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
      .trim();
  };

  // Agregar logs para debugging
  console.log('🎯 CountPage - Filtros actuales:', { selectedUniversidad, selectedRegimen, selectedLocalidad });
  console.log('🏫 AllUniversidades cargadas:', allUniversidades.length, allUniversidades);
  console.log('🏫 Primeras 3 universidades:', allUniversidades.slice(0, 3));

  // CORREGIDO: Crear uniqueUniversidades desde allUniversidades (colegios activos de la BD)
  const uniqueUniversidades = useMemo(() => {
    console.log('🔍 Filtrando universidades con:', { selectedRegimen, selectedLocalidad });
    console.log('🔍 Universidades antes del filtro:', allUniversidades.map(u => ({ nombre: u.nombre, tipo: u.tipo, ciudad: u.ciudad, activa: u.activa })));
    
    const filtered = allUniversidades.filter(uni => {
      if (uni.activa === false) {
        console.log(`❌ ${uni.nombre} está inactiva`);
        return false; // Solo colegios activos
      }
      if (selectedRegimen && uni.tipo !== selectedRegimen) {
        console.log(`❌ ${uni.nombre} - tipo: ${uni.tipo} no coincide con filtro: ${selectedRegimen}`);
        return false; // Filtrar por régimen
      }
      if (selectedLocalidad && uni.ciudad !== selectedLocalidad) {
        console.log(`❌ ${uni.nombre} - ciudad: ${uni.ciudad} no coincide con filtro: ${selectedLocalidad}`);
        return false; // Filtrar por localidad
      }
      console.log(`✅ ${uni.nombre} pasa todos los filtros`);
      return true;
    });
    
    console.log('🔍 Universidades después del filtro:', filtered.length, filtered.map(u => u.nombre));
    
    return filtered
      .map(uni => uni.nombre)
      .sort((a: any, b: any) => a.localeCompare(b, 'es', { sensitivity: 'base' }));
  }, [allUniversidades, selectedRegimen, selectedLocalidad]);

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


  const filteredContacts = useMemo(() => {
    console.log('🎯 Iniciando filtrado de contactos...');
    console.log('📊 Total contactos disponibles:', allContacts.length);
    console.log('🔧 Filtros activos:', { selectedUniversidad, selectedRegimen, selectedLocalidad });
    
    // En filteredContacts (línea ~160)
    const filtered = allContacts.filter(contact => {
    const matchesUniversidad = !selectedUniversidad || contact.nombre_colegio === selectedUniversidad;
    
    // Filtro de régimen: buscar la universidad en allUniversidades y verificar su tipo
    let matchesRegimen = true;
    if (selectedRegimen && contact.nombre_colegio) {
      const universidad = allUniversidades.find(uni => uni.nombre === contact.nombre_colegio);
      matchesRegimen = universidad ? universidad.tipo === selectedRegimen : false;
    }
    
    // Filtro de localidad: buscar la universidad en allUniversidades y verificar su ciudad
    let matchesLocalidad = true;
    if (selectedLocalidad && contact.nombre_colegio) {
      const universidad = allUniversidades.find(uni => uni.nombre === contact.nombre_colegio);
      matchesLocalidad = universidad ? universidad.ciudad === selectedLocalidad : false;
    }
    
    const matches = matchesUniversidad && matchesRegimen && matchesLocalidad;
    console.log(`📋 Contacto ${contact.nombre}: Colegio(${matchesUniversidad}) + Régimen(${matchesRegimen}) + Localidad(${matchesLocalidad}) = ${matches}`);
    
    return matches;
    });
    
    console.log('🔍 Contactos filtrados:', filtered.length, filtered);
    return filtered;
  }, [allUniversidades, allContacts, selectedUniversidad, selectedRegimen, selectedLocalidad]);

  // NUEVO: años de nacimiento presentes en los contactos filtrados (ordenados desc)
  const birthYears = useMemo(() => {
    const years = Array.from(new Set(filteredContacts.map(c => c.año_nacimiento).filter(Boolean))) as number[];
    return years.sort((a, b) => a - b);
  }, [filteredContacts]);

  // NUEVO: estadísticas agrupadas por localidad
  const localidadesStats = useMemo(() => {
    const localidades: Record<string, { 
      localidad: string; 
      totalContactos: number; 
      totalColegios: number; 
      colegios: Record<string, { 
        colegio: string; 
        tipo: string; 
        total: number; 
        porAnio: Record<number, number>; 
        porComercial: Record<string, number> 
      }> 
    }> = {};
    
    // Mapa para normalizar nombres de localidades y mantener el nombre original
    const localidadMap: Record<string, string> = {};
    
    // Filtrar universidades por régimen, localidad y universidad si están seleccionados
    const universidadesFiltradas = allUniversidades.filter(universidad => {
      if (universidad.activa === false) return false; // Solo colegios activos
      if (selectedRegimen && universidad.tipo !== selectedRegimen) return false; // Filtrar por régimen
      if (selectedLocalidad && universidad.ciudad !== selectedLocalidad) return false; // Filtrar por localidad
      if (selectedUniversidad && universidad.nombre !== selectedUniversidad) return false; // Filtrar por universidad
      return true;
    });
    
    // Inicializar localidades y colegios
    universidadesFiltradas.forEach(universidad => {
      const localidadOriginal = universidad.ciudad || 'Sin localidad';
      const localidadNormalizada = normalizeName(localidadOriginal);
      
      // Si ya existe una localidad normalizada, usar el nombre original más común
      if (!localidadMap[localidadNormalizada]) {
        localidadMap[localidadNormalizada] = localidadOriginal;
      }
      
      const localidadKey = localidadNormalizada;
      
      if (!localidades[localidadKey]) {
        localidades[localidadKey] = {
          localidad: localidadMap[localidadNormalizada],
          totalContactos: 0,
          totalColegios: 0,
          colegios: {}
        };
      }
      
      localidades[localidadKey].colegios[universidad.nombre] = { 
        colegio: universidad.nombre, 
        tipo: universidad.tipo || 'publica',
        total: 0, 
        porAnio: {}, 
        porComercial: {} 
      };
      localidades[localidadKey].totalColegios += 1;
    });
    
    // Agregar datos de contactos filtrados
    console.log('🔍 Debugging contactos y universidades:');
    console.log('📊 Total contactos filtrados:', filteredContacts.length);
    console.log('📊 Total universidades:', allUniversidades.length);
    
    filteredContacts.forEach(contact => {
      const colegio = contact.nombre_colegio || 'Sin colegio';
      const colegioNormalizado = normalizeName(colegio);
      
      // Buscar universidad usando comparación normalizada
      const universidad = allUniversidades.find(uni => 
        normalizeName(uni.nombre) === colegioNormalizado
      );
      
      const localidadOriginal = universidad?.ciudad || 'Sin localidad';
      const localidadNormalizada = normalizeName(localidadOriginal);
      
      console.log(`👤 Contacto: ${contact.nombre}, Colegio: "${colegio}" (normalizado: "${colegioNormalizado}"), Universidad encontrada: ${universidad ? 'Sí' : 'No'}, Localidad: "${localidadOriginal}"`);
      
      // Si ya existe una localidad normalizada, usar el nombre original más común
      if (!localidadMap[localidadNormalizada]) {
        localidadMap[localidadNormalizada] = localidadOriginal;
      }
      
      const localidadKey = localidadNormalizada;
      
      if (!localidades[localidadKey]) {
        localidades[localidadKey] = {
          localidad: localidadMap[localidadNormalizada],
          totalContactos: 0,
          totalColegios: 0,
          colegios: {}
        };
      }
      
      if (!localidades[localidadKey].colegios[colegio]) {
        localidades[localidadKey].colegios[colegio] = { 
          colegio, 
          tipo: universidad?.tipo || 'publica',
          total: 0, 
          porAnio: {}, 
          porComercial: {} 
        };
      }
      
      localidades[localidadKey].colegios[colegio].total += 1;
      localidades[localidadKey].totalContactos += 1;
      
      if (contact.año_nacimiento) {
        localidades[localidadKey].colegios[colegio].porAnio[contact.año_nacimiento] = 
          (localidades[localidadKey].colegios[colegio].porAnio[contact.año_nacimiento] || 0) + 1;
      }
      
      const comercialNombre = contact.comercial_nombre || contact.comercial || 'Sin asignar';
      localidades[localidadKey].colegios[colegio].porComercial[comercialNombre] = 
        (localidades[localidadKey].colegios[colegio].porComercial[comercialNombre] || 0) + 1;
    });
    
    // Convertir a array y ordenar: favoritos primero, luego alfabéticamente
    const localidadesArray = Object.values(localidades);
    
    return localidadesArray.sort((a, b) => {
      const aIsFavorite = favoriteLocalidades.includes(a.localidad);
      const bIsFavorite = favoriteLocalidades.includes(b.localidad);
      
      // Si una es favorita y la otra no, la favorita va primero
      if (aIsFavorite && !bIsFavorite) return -1;
      if (!aIsFavorite && bIsFavorite) return 1;
      
      // Si ambas son favoritas o ninguna es favorita, ordenar alfabéticamente
      return a.localidad.localeCompare(b.localidad, 'es', { sensitivity: 'base' });
    });
  }, [filteredContacts, allUniversidades, selectedRegimen, selectedLocalidad, selectedUniversidad, favoriteLocalidades]);
  

 
  const totalContacts = filteredContacts.length;
  const totalUniversidades = uniqueUniversidades.length;
  const totalLocalidades = localidadesStats.length;
  console.log('📈 Totales calculados:', { totalContacts, totalUniversidades, totalLocalidades });

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
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
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
              className="w-full border border-gray-300 bg-white rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-400 focus:border-blue-400 text-gray-900 placeholder-gray-400"
              disabled={loadingUniversidades}
            />
            
            {/* Dropdown de autocompletado */}
            {showColegioDropdown && filteredColegios.length > 0 && (
              <div className="absolute z-10 w-full mt-1 bg-white border border-blue-300 rounded-md shadow-lg max-h-60 overflow-auto">
                {filteredColegios.map((cole, index) => (
                  <div
                    key={index}
                    className="px-3 py-2 hover:bg-blue-100 cursor-pointer text-sm text-gray-900"
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
                className="absolute right-2 top-7 text-blue-400 hover:text-blue-600"
              >
                ✕
              </button>
            )}
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Régimen
            </label>
            <select
              value={selectedRegimen}
              onChange={(e) => setSelectedRegimen(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos los regímenes</option>
              <option value="publica">Público</option>
              <option value="privada">Privado</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Localidad
            </label>
            <select
              value={selectedLocalidad}
              onChange={(e) => setSelectedLocalidad(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todas las localidades</option>
              {(() => {
                const ciudades = Array.from(new Set(allUniversidades
                  .filter(uni => uni.activa !== false)
                  .map(uni => uni.ciudad)
                  .filter(Boolean)
                )).sort();
                console.log('🏙️ Ciudades disponibles para filtro:', ciudades);
                return ciudades.map(ciudad => (
                  <option key={ciudad} value={ciudad}>{ciudad}</option>
                ));
              })()}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Favoritos
            </label>
            <select
              value=""
              onChange={(e) => {
                const localidad = e.target.value;
                if (localidad && !favoriteLocalidades.includes(localidad)) {
                  setFavoriteLocalidades([...favoriteLocalidades, localidad]);
                }
              }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Añadir localidad a favoritos</option>
              {(() => {
                const ciudades = Array.from(new Set(allUniversidades
                  .filter(uni => uni.activa !== false)
                  .map(uni => uni.ciudad)
                  .filter(Boolean)
                )).sort();
                return ciudades
                  .filter(ciudad => ciudad && !favoriteLocalidades.includes(ciudad))
                  .map(ciudad => (
                    <option key={ciudad} value={ciudad}>{ciudad}</option>
                  ));
              })()}
            </select>
            
            {/* Mostrar favoritos actuales */}
            {favoriteLocalidades.length > 0 && (
              <div className="mt-2">
                <div className="text-xs text-gray-600 mb-1">Favoritos actuales:</div>
                <div className="flex flex-wrap gap-1">
                  {favoriteLocalidades.map((localidad, index) => (
                    <span
                      key={localidad}
                      className="inline-flex items-center px-2 py-1 rounded-full text-xs bg-blue-100 text-blue-800"
                    >
                      {localidad}
                      <button
                        onClick={() => {
                          setFavoriteLocalidades(favoriteLocalidades.filter((_, i) => i !== index));
                        }}
                        className="ml-1 text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </button>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Resumen general */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 rounded-lg p-6 text-white mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium opacity-90">Total de Contactos</h3>
              <p className="text-2xl font-bold">{filteredContacts.length}</p>
            </div>
            <Users className="w-8 h-8 opacity-75" />
          </div>
          
          <div>
            <h3 className="text-sm font-medium opacity-90">Localidades</h3>
            <p className="text-2xl font-bold">{totalLocalidades}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium opacity-90">Colegios</h3>
            <p className="text-2xl font-bold">{totalUniversidades}</p>
          </div>
        </div>
      </div>

      {/* Contactos por Localidad */}
      <div className="mb-8">
        <h2 className="text-xl font-bold text-gray-900 mb-4">Contactos por Localidad</h2>
        {localidadesStats.length === 0 && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-8 text-center text-gray-500">
            No hay datos para mostrar
          </div>
        )}
        <div className="space-y-8">
          {localidadesStats.map(localidadData => (
            <div key={localidadData.localidad} className="rounded-lg overflow-hidden border border-gray-200">
              {/* Encabezado principal de la localidad */}
              <div className="bg-gradient-to-r from-blue-800 to-blue-900 px-6 py-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-white text-xl font-bold">{localidadData.localidad}</h3>
                    <p className="text-blue-100 text-sm">
                      {localidadData.totalContactos} contactos disponibles en {localidadData.totalColegios} colegios
                    </p>
                  </div>
                </div>
              </div>
              
              {/* Colegios de la localidad */}
              <div className="space-y-4 p-6 bg-gray-50">
                {Object.values(localidadData.colegios).map(colegioData => (
                  <div key={colegioData.colegio} className="bg-white rounded-lg overflow-hidden border border-gray-200">
                    {/* Encabezado del colegio */}
                    <div className="bg-gradient-to-r from-blue-400 to-blue-500 px-4 py-3 flex items-center justify-between">
                      <div>
                        <h4 className="text-white text-lg font-semibold">
                          {colegioData.colegio}
                          <span className="ml-2 text-sm font-normal text-blue-100">
                            ({colegioData.tipo === 'publica' ? 'Público' : 'Privado'})
                          </span>
                        </h4>
                        <p className="text-blue-50 text-sm">Total contactos: {colegioData.total}</p>
                      </div>
                      <button
                        onClick={() => onNavigateToContacts({ nombre_colegio: colegioData.colegio })}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-white bg-blue-500 hover:bg-blue-600 rounded-md transition-colors"
                      >
                        Ver contactos
                      </button>
                    </div>
                    
                    {/* Tabla de datos del colegio */}
                    {colegioData.total > 0 && (
                      <div className="bg-white relative overflow-x-auto">
                        <div className="px-4 py-3 border-b border-gray-200 relative">
                          <div className="grid gap-4" style={{ gridTemplateColumns: `1fr ${birthYears.map(() => 'minmax(60px, 1fr)').join(' ')} 1fr` }}>
                            <div className="text-sm font-medium text-gray-700">Año de nacimiento</div>
                            {birthYears.map(year => (
                              <div key={year} className="text-sm font-medium text-gray-700 text-center">{year}</div>
                            ))}
                            <div className="text-sm font-medium text-gray-700 text-right sticky right-0 bg-white z-20 pl-0 pr-0 border-l border-gray-200">Comerciales</div>
                          </div>
                        </div>
                        <div className="px-4 py-3 relative">
                          <div className="grid gap-4 items-center" style={{ gridTemplateColumns: `1fr ${birthYears.map(() => 'minmax(60px, 1fr)').join(' ')} 1fr` }}>
                            <div className="text-sm font-medium text-gray-900">{colegioData.total} contactos</div>
                            {birthYears.map(year => (
                              <div key={year} className="text-center">
                                {colegioData.porAnio[year] ? (
                                  <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">{colegioData.porAnio[year]}</span>
                                ) : (
                                  <span className="text-gray-300">0</span>
                                )}
                              </div>
                            ))}
                            <div className="text-sm text-right sticky right-0 bg-white z-20 pl-0 pr-0 border-l border-gray-200">
                              <div className="flex flex-col gap-1 items-end">
                                {Object.entries(colegioData.porComercial)
                                  .filter(([, cantidad]) => cantidad > 0)
                                  .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es', { sensitivity: 'base' }))
                                  .map(([nombre, cantidad]) => (
                                    <span key={nombre} className="inline-flex w-fit items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                      {nombre} ({cantidad})
                                    </span>
                                  ))}
                              </div>
                              {Object.entries(colegioData.porComercial).filter(([, cantidad]) => cantidad > 0).length === 0 && (
                                <span className="text-gray-400 text-sm">Sin asignar</span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Sección por titulación eliminada */}
    </div>
  );
}
