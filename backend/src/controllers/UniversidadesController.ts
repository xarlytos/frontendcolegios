import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Universidad } from '../models/Universidad';
import { Titulacion } from '../models/Titulacion';
import { Contacto } from '../models/Contacto';
import { Usuario } from '../models/Usuario';
import { JerarquiaUsuarios } from '../models/JerarquiaUsuarios'; // RESTAURADO
import { AuditLog, EntidadAudit, AccionAudit } from '../models/AuditLog';
import { AuthRequest, RolUsuario } from '../types'; // Fixed: Import both from '../types'

export class UniversidadesController {
  // Obtener todas las universidades
  static async obtenerUniversidades(req: AuthRequest, res: Response) {
    try {
      const { 
        page = 1, 
        limit = 10, 
        search, 
        activa = 'true' // Por defecto mostrar solo universidades activas
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const filter: any = {};

      // Aplicar filtros
      if (search) {
        filter.$or = [
          { nombre: { $regex: search, $options: 'i' } },
          { codigo: { $regex: search, $options: 'i' } }
        ];
      }

      // Filtrar por activa (por defecto true, pero se puede cambiar)
      filter.activa = activa === 'true';

      const universidades = await Universidad.find(filter)
        .sort({ nombre: 1 })
        .skip(skip)
        .limit(Number(limit));

      // Obtener las titulaciones para cada universidad
      const universidadesConTitulaciones = await Promise.all(
        universidades.map(async (universidad) => {
          const titulaciones = await Titulacion.find({ 
            universidadId: universidad._id,
            estado: 'activa'
          }).select('nombre codigo tipo duracion creditos modalidad');
          
          return {
            ...universidad.toObject(),
            titulaciones
          };
        })
      );

      const total = await Universidad.countDocuments(filter);

      res.json({
        universidades: universidadesConTitulaciones,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error al obtener universidades:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Obtener universidad por ID
  static async obtenerUniversidad(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      console.log('🔍 obtenerUniversidad called with ID:', id);
      console.log('🔍 ID type:', typeof id);
      console.log('🔍 Request params:', req.params);

      if (!mongoose.Types.ObjectId.isValid(id)) {
        console.log('❌ Invalid ObjectId:', id);
        return res.status(400).json({ error: 'ID de universidad inválido' });
      }

      console.log('🔍 Searching for universidad with ID:', id);
      const universidad = await Universidad.findById(id);
      console.log('🏫 Universidad found:', universidad ? universidad.toObject() : 'null');

      if (!universidad) {
        console.log('❌ Universidad not found for ID:', id);
        return res.status(404).json({ error: 'Universidad no encontrada' });
      }

      // Obtener las titulaciones de la universidad
      console.log('🔍 Searching titulaciones for universidadId:', universidad._id);
      const titulaciones = await Titulacion.find({ 
        universidadId: universidad._id,
        estado: 'activa'
      }).select('nombre codigo tipo duracion creditos modalidad descripcion');
      console.log('🎓 Titulaciones found:', titulaciones.length, titulaciones);

      const universidadConTitulaciones = {
        ...universidad.toObject(),
        titulaciones
      };
      console.log('📤 Sending response:', universidadConTitulaciones);

      res.json(universidadConTitulaciones);
    } catch (error: any) {
      console.error('❌ Error al obtener universidad:', error);
      console.error('❌ Error stack:', error.stack);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Crear nueva universidad
  static async crearUniversidad(req: AuthRequest, res: Response) {
    try {
      const { codigo, nombre, tipo, ciudad, activa } = req.body;

      // Solo admins pueden crear universidades
      if (req.user?.rol !== RolUsuario.ADMIN) {
        return res.status(403).json({ 
          error: 'No tienes permisos para crear universidades' 
        });
      }

      // Validaciones
      if (!codigo || !nombre || !tipo || !ciudad) {
        return res.status(400).json({ 
          error: 'Código, nombre, tipo y ciudad son obligatorios' 
        });
      }

      // Verificar que el usuario sea administrador
      console.log('🔍 Verificando rol de usuario:', {
        user: req.user,
        rol: req.user?.rol,
        esAdmin: req.user?.rol === RolUsuario.ADMIN
      });
      
      if (req.user?.rol !== RolUsuario.ADMIN) {
        console.log('❌ Usuario no es administrador:', req.user?.rol);
        return res.status(403).json({ 
          error: 'Solo los administradores pueden crear universidades' 
        });
      }
      
      console.log('✅ Usuario es administrador, continuando...');

      // Verificar que el código no exista
      const universidadExistente = await Universidad.findOne({ codigo });
      if (universidadExistente) {
        return res.status(400).json({ 
          error: 'Ya existe una universidad con este código' 
        });
      }

      // Crear universidad
      const nuevaUniversidad = new Universidad({
        codigo,
        nombre,
        tipo,
        ciudad,
        activa: true, // Siempre activo
        creadoPor: new mongoose.Types.ObjectId(req.user.userId)
      });

      await nuevaUniversidad.save();

      // Registrar en auditoría
      await AuditLog.create({
        usuarioId: new mongoose.Types.ObjectId(req.user!.userId),
        accion: AccionAudit.CREATE,
        entidad: EntidadAudit.UNIVERSIDAD,
        entidadId: nuevaUniversidad._id.toString(),
        despues: {
          codigo: nuevaUniversidad.codigo,
          nombre: nuevaUniversidad.nombre,
          tipo: nuevaUniversidad.tipo,
          ciudad: nuevaUniversidad.ciudad,
          activa: nuevaUniversidad.activa
        }
      });

      res.status(201).json({ 
        message: 'Colegio creado exitosamente',
        universidad: nuevaUniversidad 
      });
    } catch (error) {
      console.error('Error al crear universidad:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Actualizar universidad
  static async actualizarUniversidad(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { nombre, codigo, tipo, ciudad, activa } = req.body;

      // Solo admins pueden actualizar universidades
      if (req.user?.rol !== RolUsuario.ADMIN) {
        return res.status(403).json({ 
          error: 'No tienes permisos para actualizar universidades' 
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID de universidad inválido' });
      }

      const universidad = await Universidad.findById(id);
      if (!universidad) {
        return res.status(404).json({ error: 'Universidad no encontrada' });
      }

      // Verificar código único si se está cambiando
      if (codigo && codigo !== universidad.codigo) {
        const codigoExistente = await Universidad.findOne({ 
          codigo, 
          _id: { $ne: id } 
        });
        if (codigoExistente) {
          return res.status(400).json({ 
            error: 'Ya existe una universidad con este código' 
          });
        }
      }

      // Guardar datos anteriores para auditoría
      const datosAnteriores = {
        nombre: universidad.nombre,
        codigo: universidad.codigo,
        tipo: universidad.tipo,
        ciudad: universidad.ciudad,
        activa: universidad.activa
      };

      // Actualizar campos
      if (nombre) universidad.nombre = nombre;
      if (codigo) universidad.codigo = codigo;
      if (tipo) universidad.tipo = tipo;
      if (ciudad) universidad.ciudad = ciudad;
      universidad.activa = true; // Siempre activo

      await universidad.save();

      // Registrar en auditoría
      await AuditLog.create({
        usuarioId: new mongoose.Types.ObjectId(req.user!.userId), // Cambiar 'usuario' por 'usuarioId'
        accion: AccionAudit.UPDATE, // Usar enum en lugar de string
        entidad: EntidadAudit.UNIVERSIDAD, // Usar enum en lugar de string
        entidadId: universidad._id.toString(),
        antes: datosAnteriores,
        despues: {
          nombre: universidad.nombre,
          codigo: universidad.codigo,
          tipo: universidad.tipo,
          ciudad: universidad.ciudad,
          activa: universidad.activa
        }
      });

      res.json({ 
        message: 'Colegio actualizado exitosamente',
        universidad 
      });
    } catch (error) {
      console.error('Error al actualizar universidad:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Eliminar universidad (soft delete)
  static async eliminarUniversidad(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      // Solo admins pueden eliminar universidades
      if (req.user?.rol !== RolUsuario.ADMIN) {
        return res.status(403).json({ 
          error: 'No tienes permisos para eliminar universidades' 
        });
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).json({ error: 'ID de universidad inválido' });
      }

      const universidad = await Universidad.findById(id);
      if (!universidad) {
        return res.status(404).json({ error: 'Universidad no encontrada' });
      }

      // Hard delete - eliminar físicamente de la base de datos
      const universidadData = {
        nombre: universidad.nombre,
        codigo: universidad.codigo,
        tipo: universidad.tipo,
        ciudad: universidad.ciudad,
        activa: universidad.activa
      };

      // Eliminar también las titulaciones asociadas
      await Titulacion.deleteMany({ universidadId: universidad._id });
      
      // Eliminar la universidad
      await Universidad.findByIdAndDelete(id);

      // Registrar en auditoría
      await AuditLog.create({
        usuarioId: new mongoose.Types.ObjectId(req.user!.userId),
        accion: AccionAudit.DELETE,
        entidad: EntidadAudit.UNIVERSIDAD,
        entidadId: universidad._id.toString(),
        antes: universidadData,
        despues: null // Ya no existe
      });

      res.json({ message: 'Colegio eliminado exitosamente' });
    } catch (error) {
      console.error('Error al eliminar universidad:', error);
      res.status(500).json({ error: 'Error interno del servidor' });
    }
  }

  // Buscar universidad por código
  static async buscarPorCodigo(req: AuthRequest, res: Response) {
    try {
      const { codigo } = req.params;
      console.log('🔍 buscarPorCodigo called with codigo:', codigo);
      console.log('🔍 Codigo type:', typeof codigo);
      console.log('🔍 Codigo after toUpperCase:', codigo.toUpperCase());
      
      const universidad = await Universidad.findOne({ 
        codigo: codigo.toUpperCase(),
        activa: true 
      });
      console.log('🏫 Universidad found by codigo:', universidad ? universidad.toObject() : 'null');
      
      if (!universidad) {
        console.log('❌ Universidad not found for codigo:', codigo);
        return res.status(404).json({ 
          success: false,
          message: 'Universidad no encontrada' 
        });
      }
      
      console.log('📤 Sending universidad response:', {
        _id: universidad._id,
        codigo: universidad.codigo,
        nombre: universidad.nombre
      });
      
      res.json({
        success: true,
        data: {
          _id: universidad._id,
          codigo: universidad.codigo,
          nombre: universidad.nombre
        }
      });
    } catch (error: any) {
      console.error('❌ Error buscando universidad por código:', error);
      console.error('❌ Error stack:', error.stack);
      res.status(500).json({ 
        success: false,
        message: 'Error interno del servidor' 
      });
    }
  }

  // Obtener universidades con titulaciones y estadísticas de alumnos por curso
  // Método auxiliar para obtener subordinados recursivamente
  // COMENTADO: Función que usaba JerarquiaUsuarios (modelo eliminado)
  /*
  static async getSubordinados(jefeId: string): Promise<string[]> {
    const subordinadosDirectos = await JerarquiaUsuarios.find({ jefeId }).select('subordinadoId');
    let todosLosSubordinados = subordinadosDirectos.map(s => s.subordinadoId.toString());
    
    // Recursivamente obtener subordinados de subordinados
    for (const subordinadoId of subordinadosDirectos.map(s => s.subordinadoId.toString())) {
      const subSubordinados = await UniversidadesController.getSubordinados(subordinadoId);
      todosLosSubordinados = [...todosLosSubordinados, ...subSubordinados];
    }
    
    return [...new Set(todosLosSubordinados)];
  }
  */

  static async obtenerUniversidadesConEstadisticas(req: AuthRequest, res: Response) {
    try {
      console.log('🔍 obtenerUniversidadesConEstadisticas called');
      
      const { activa = 'true' } = req.query;
      const userId = req.user?.userId;
      const userRole = req.user?.rol;
      
      let comercialesVisibles: string[];
      
      // Si es administrador, puede ver todos los comerciales
      if (userRole === 'ADMIN') {
        const todosLosUsuarios = await Usuario.find({ 
          rol: { $in: ['COMERCIAL', 'ADMIN'] },
          estado: 'ACTIVO' 
        }).select('_id');
        comercialesVisibles = todosLosUsuarios.map(u => u._id.toString());
        console.log(`👥 ADMIN - Comerciales visibles (todos):`, comercialesVisibles.length);
      } else {
         // COMENTADO: Funcionalidad de jerarquía temporalmente deshabilitada
         // Para comerciales, obtener subordinados del usuario actual
         if (!userId) {
           return res.status(401).json({
             success: false,
             message: 'Usuario no autenticado'
           });
         }
         // const subordinados = await UniversidadesController.getSubordinados(userId);
         // comercialesVisibles = [userId, ...subordinados];
         comercialesVisibles = [userId]; // Solo el usuario actual por ahora
         console.log(`👥 Comerciales visibles para ${userId}:`, comercialesVisibles);
       }
      
      // Obtener información de usuarios para las funciones jerárquicas
      const usuarios = await Usuario.find({ 
        rol: { $in: ['COMERCIAL', 'ADMIN'] },
        estado: 'ACTIVO' 
      }).select('_id nombre email rol');
      
      console.log('👥 Usuarios activos encontrados:');
      usuarios.forEach(u => {
        console.log(`   - ID: ${u._id}, Nombre: ${u.nombre}, Email: ${u.email}, Rol: ${u.rol}`);
      });
      
      // Obtener universidades activas
      const universidades = await Universidad.find({ activa: activa === 'true' })
        .sort({ nombre: 1 });
      
      console.log(`📚 Found ${universidades.length} universidades`);
      
      // Para cada universidad, obtener titulaciones y estadísticas de contactos
      const universidadesConEstadisticas = await Promise.all(
        universidades.map(async (universidad) => {
          console.log(`🏫 Processing universidad: ${universidad.nombre}`);
          
          // Obtener titulaciones de la universidad
          const titulaciones = await Titulacion.find({ 
            universidadId: universidad._id,
            estado: 'activa'
          }).select('nombre codigo tipo duracion creditos modalidad descripcion');
          
          console.log(`🎓 Found ${titulaciones.length} titulaciones for ${universidad.nombre}`);
          
          // Para cada titulación, obtener estadísticas de contactos por curso
          const titulacionesConEstadisticas = await Promise.all(
            titulaciones.map(async (titulacion) => {
              console.log(`📊 Processing titulacion: ${titulacion.nombre}`);
              
              // Obtener contactos de esta titulación agrupados por curso (incluye usuario y subordinados)
              const contactosPorCurso = await Contacto.aggregate([
                {
                  $match: {
                    universidadId: universidad._id,
                    titulacionId: titulacion._id,
                    comercialId: { $in: comercialesVisibles.map(id => new mongoose.Types.ObjectId(id)) }
                  }
                },
                {
                  $lookup: {
                    from: 'usuarios',
                    localField: 'comercialId',
                    foreignField: '_id',
                    as: 'comercialInfo'
                  }
                },
                {
                  $unwind: {
                    path: '$comercialInfo',
                    preserveNullAndEmptyArrays: true
                  }
                },
                {
                  $group: {
                    _id: '$curso',
                    totalAlumnos: { $sum: 1 },
                    alumnos: {
                      $push: {
                        _id: '$_id',
                        nombreCompleto: '$nombreCompleto',
                        telefono: '$telefono',
                        instagram: '$instagram',
                        anioNacimiento: '$anioNacimiento',
                        fechaAlta: '$fechaAlta',
                        comercialId: '$comercialId',
                        comercialNombre: '$comercialInfo.nombre'
                      }
                    },
                    porComercial: {
                      $push: {
                        comercialId: '$comercialId',
                        comercialNombre: '$comercialInfo.nombre'
                      }
                    }
                  }
                },

                {
                  $sort: { _id: 1 } // Ordenar por curso
                }
              ]);
              
              console.log(`👥 Found contacts for ${titulacion.nombre}:`, contactosPorCurso.length, 'courses');

              // Check if titulacion has any contacts
const totalContactosTitulacion = contactosPorCurso.reduce((sum: number, curso: any) => sum + curso.totalAlumnos, 0);

if (totalContactosTitulacion === 0) {
  console.log(`⏭️ Skipping empty titulacion: ${titulacion.nombre}`);
  return {
    ...titulacion.toObject(),
    totalAlumnos: 0,
    cursos: Array.from({length: 6}, (_, i) => ({
      curso: i + 1,
      totalAlumnos: 0,
      alumnos: [],
      estadisticasPorComercial: {},
      comercialesInfo: {}
    })),
    estadisticasPorComercial: {},
    comercialesInfo: {}
  };
}

/*
// Create hierarchy cache once at the beginning
const jerarquiaCache = new Map<string, string>();
const todasLasJerarquias = await JerarquiaUsuarios.find({
  subordinadoId: { $in: comercialesVisibles.map(id => new mongoose.Types.ObjectId(id)) }
});

todasLasJerarquias.forEach(relacion => {
  if (relacion.jefeId) {
    jerarquiaCache.set(relacion.subordinadoId.toString(), relacion.jefeId.toString());
  }
});

console.log('🗺️ Jerarquía cache creado:', jerarquiaCache.size, 'relaciones');
              
              // Crear mapa de jerarquía para agregar contactos de subordinados a sus jefes
              const jerarquiaMap = new Map<string, string>();
              console.log('🔍 Construyendo jerarquiaMap para comerciales visibles:', comercialesVisibles);
              
              for (const comercialId of comercialesVisibles) {
                if (typeof comercialId === 'string') {
                  const relacion = await JerarquiaUsuarios.findOne({ subordinadoId: comercialId });
                  console.log(`🔍 Buscando jerarquía para comercialId ${comercialId}:`, relacion ? 'ENCONTRADA' : 'NO ENCONTRADA');
                  if (relacion && relacion.jefeId) {
                    const jefeIdStr = (relacion.jefeId as any).toString();
                    console.log(`🔍 Jefe encontrado para ${comercialId}: ${jefeIdStr}`);
                    if (comercialesVisibles.includes(jefeIdStr)) {
                      jerarquiaMap.set(comercialId, jefeIdStr);
                      console.log(`✅ Jerarquía agregada: ${comercialId} -> ${jefeIdStr}`);
                    } else {
                      console.log(`❌ Jefe ${jefeIdStr} no está en comerciales visibles`);
                    }
                  }
                }
              }
              
              console.log('🗺️ JerarquiaMap final:', Array.from(jerarquiaMap.entries()));
              
              // Función para agregar estadísticas jerárquicamente
              const agregarEstadisticasJerarquicas = (estadisticas: { [key: string]: number }, comercialesInfo: { [key: string]: string }) => {
                const estadisticasFinales: { [key: string]: number } = {};
                const comercialesInfoFinales: { [key: string]: string } = {};
                
                // Primero, copiar todas las estadísticas directas
                Object.keys(estadisticas).forEach(comercialId => {
                  estadisticasFinales[comercialId] = estadisticas[comercialId];
                  if (comercialesInfo[comercialId]) {
                    comercialesInfoFinales[comercialId] = comercialesInfo[comercialId];
                  }
                });
                
                // Luego, agregar estadísticas de subordinados a sus jefes
                Object.keys(estadisticas).forEach(comercialId => {
                  const jefeId = jerarquiaMap.get(comercialId);
                  if (jefeId && jefeId !== comercialId) {
                    estadisticasFinales[jefeId] = (estadisticasFinales[jefeId] || 0) + estadisticas[comercialId];
                    // Mantener info del jefe si existe
                    if (comercialesInfo[jefeId]) {
                      comercialesInfoFinales[jefeId] = comercialesInfo[jefeId];
                    }
                  }
                });
                
                return { estadisticasFinales, comercialesInfoFinales };
              };
              
              // Función auxiliar para verificar si un usuario es ficticio
              const esUsuarioFicticio = (usuario: any) => {
                if (!usuario) return false;
                return usuario.nombre.toLowerCase().includes('ensalada') || 
                       usuario.nombre.toLowerCase().includes('cesar') ||
                       usuario.email.includes('adaasdasdaministrador');
              };
              
              // Función auxiliar para encontrar el jefe real más cercano en la cadena jerárquica
              const encontrarJefeReal = (comercialId: string, visitados = new Set<string>()): string | null => {
                // Evitar bucles infinitos
                if (visitados.has(comercialId)) return null;
                visitados.add(comercialId);
                
                const usuario = usuarios.find(u => u._id.toString() === comercialId);
                
                // Si el usuario no existe o no es ficticio, es el jefe real
                if (!usuario || !esUsuarioFicticio(usuario)) {
                  return comercialId;
                }
                
                // Si es ficticio, buscar su jefe
                const jefeId = jerarquiaMap.get(comercialId);
                if (jefeId && jefeId !== comercialId) {
                  return encontrarJefeReal(jefeId, visitados);
                }
                
                return null;
              };

              // Función para agregar alumnos jerárquicamente
              const agregarAlumnosJerarquicos = (alumnos: any[]) => {
                const alumnosFinales: any[] = [];
                console.log('🎓 Procesando alumnos para reasignación jerárquica:', alumnos.length);
                
                // Para cada alumno, determinar si debe mostrarse como del comercial original o del jefe real
                alumnos.forEach(alumno => {
                  const comercialId = alumno.comercialId?.toString();
                  
                  console.log(`🎓 Procesando alumno ${alumno.nombreCompleto}:`);
                  console.log(`   - ComercialId original: ${comercialId}`);
                  
                  // Encontrar el jefe real más cercano en la cadena jerárquica
                  const jefeRealId = encontrarJefeReal(comercialId);
                  
                  console.log(`   - Jefe real encontrado: ${jefeRealId}`);
                  
                  if (jefeRealId && jefeRealId !== comercialId) {
                    const jefeUsuario = usuarios.find(u => u._id.toString() === jefeRealId);
                    
                    if (jefeUsuario) {
                      console.log(`   ✅ REASIGNANDO a jefe real: ${jefeUsuario.nombre}`);
                      // Mostrar el alumno asignado al jefe real
                      const alumnoParaJefe = {
                        ...alumno,
                        comercialId: jefeRealId,
                        comercialNombre: jefeUsuario.nombre
                      };
                      alumnosFinales.push(alumnoParaJefe);
                    } else {
                      console.log(`   ❌ Jefe real no encontrado - manteniendo original`);
                      alumnosFinales.push(alumno);
                    }
                  } else {
                    console.log(`   ❌ No hay reasignación necesaria - manteniendo original`);
                    // Mostrar el alumno con su comercial original
                    alumnosFinales.push(alumno);
                  }
                });
                
                console.log('🎓 Alumnos finales después de reasignación:', alumnosFinales.length);
                return alumnosFinales;
              };
*/

              // NUEVO: Crear estructura completa de cursos (1-6) incluso si están vacíos
              const cursosCompletos: any[] = [];
              for (let cursoNum = 1; cursoNum <= 6; cursoNum++) {
                const cursoData = contactosPorCurso.find(c => c._id === cursoNum);
                
                // Calcular estadísticas por comercial para este curso
                const estadisticasPorComercial: { [key: string]: number } = {};
                const comercialesInfo: { [key: string]: string } = {};
                
                if (cursoData && cursoData.porComercial) {
                  cursoData.porComercial.forEach((item: any) => {
                    const comercialId = item.comercialId.toString();
                    estadisticasPorComercial[comercialId] = (estadisticasPorComercial[comercialId] || 0) + 1;
                    if (item.comercialNombre) {
                      comercialesInfo[comercialId] = item.comercialNombre;
                    }
                  });
                }
                
                // Aplicar agregación jerárquica
                // Simplified: Direct assignment instead of hierarchical processing
                const estadisticasFinales = estadisticasPorComercial;
                const comercialesInfoFinales = comercialesInfo;
                
                // Filtrar comerciales a mostrar (solo los que no son subordinados de otros en la lista visible, o el usuario actual)
                const comercialesCursoAMostrar: { [key: string]: number } = {};
                const comercialesInfoCursoAMostrar: { [key: string]: string } = {};
                
                Object.keys(estadisticasFinales).forEach(comercialId => {
                  const esSubordinado = false; // Simplified: no hierarchy system
                  // Para administradores, mostrar todos los comerciales (incluyendo jefes con estadísticas agregadas)
                  // Para comerciales, solo mostrar los que no son subordinados o el usuario actual
                  if (userRole === 'ADMIN' || !esSubordinado || comercialId === userId) {
                    comercialesCursoAMostrar[comercialId] = estadisticasFinales[comercialId];
                    if (comercialesInfoFinales[comercialId]) {
                      comercialesInfoCursoAMostrar[comercialId] = comercialesInfoFinales[comercialId];
                    }
                  }
                });
                
                // Aplicar agregación jerárquica a los alumnos
                // Simplified: No hierarchy processing
                const alumnos = cursoData ? cursoData.alumnos || [] : [];
                const alumnosConJerarquia = alumnos;
                
                cursosCompletos.push({
                  curso: cursoNum,
                  totalAlumnos: cursoData ? cursoData.totalAlumnos : 0,
                  alumnos: alumnosConJerarquia,
                  estadisticasPorComercial: comercialesCursoAMostrar,
                  comercialesInfo: comercialesInfoCursoAMostrar
                });
              }
              
              // Calcular estadísticas generales por comercial para toda la titulación
              const estadisticasGeneralesPorComercial: { [key: string]: number } = {};
              const comercialesInfoGeneral: { [key: string]: string } = {};
              
              cursosCompletos.forEach(curso => {
                Object.keys(curso.estadisticasPorComercial).forEach(comercialId => {
                  estadisticasGeneralesPorComercial[comercialId] = (estadisticasGeneralesPorComercial[comercialId] || 0) + curso.estadisticasPorComercial[comercialId];
                  if (curso.comercialesInfo[comercialId]) {
                    comercialesInfoGeneral[comercialId] = curso.comercialesInfo[comercialId];
                  }
                });
              });
              
              // Aplicar agregación jerárquica
              // Simplified: Direct assignment instead of hierarchical processing
              const estadisticasFinales = estadisticasGeneralesPorComercial;
              const comercialesInfoFinales = comercialesInfoGeneral;
              
              // Filtrar comerciales a mostrar (solo los que no son subordinados de otros en la lista visible, o el usuario actual)
              const comercialesAMostrar: { [key: string]: number } = {};
              const comercialesInfoAMostrar: { [key: string]: string } = {};
              
              Object.keys(estadisticasFinales).forEach(comercialId => {
                const esSubordinado = false; // Simplified: no hierarchy system
                // Para administradores, mostrar todos los comerciales (incluyendo jefes con estadísticas agregadas)
                // Para comerciales, solo mostrar los que no son subordinados o el usuario actual
                if (userRole === 'ADMIN' || !esSubordinado || comercialId === userId) {
                  comercialesAMostrar[comercialId] = estadisticasFinales[comercialId];
                  if (comercialesInfoFinales[comercialId]) {
                    comercialesInfoAMostrar[comercialId] = comercialesInfoFinales[comercialId];
                  }
                }
              });
              
              // Calcular total de alumnos en la titulación
              const totalAlumnosTitulacion = cursosCompletos.reduce(
                (sum, curso) => sum + curso.totalAlumnos, 0
              );
              
              return {
                ...titulacion.toObject(),
                totalAlumnos: totalAlumnosTitulacion,
                cursos: cursosCompletos,
                estadisticasPorComercial: comercialesAMostrar,
                comercialesInfo: comercialesInfoAMostrar
              };
              })
            );
            
            // Calcular total de alumnos en la universidad
            const totalAlumnosUniversidad = titulacionesConEstadisticas.reduce(
              (sum, tit) => sum + tit.totalAlumnos, 0
            );
            
            console.log(`📈 Total alumnos for ${universidad.nombre}: ${totalAlumnosUniversidad}`);
            
            return {
              ...universidad.toObject(),
              totalAlumnos: totalAlumnosUniversidad,
              totalTitulaciones: titulacionesConEstadisticas.length,
              titulaciones: titulacionesConEstadisticas
            };
          })
        );
        
        // Calcular estadísticas generales
        const estadisticasGenerales = {
          totalUniversidades: universidadesConEstadisticas.length,
          totalTitulaciones: universidadesConEstadisticas.reduce(
            (sum, uni) => sum + uni.totalTitulaciones, 0
          ),
          totalAlumnos: universidadesConEstadisticas.reduce(
            (sum, uni) => sum + uni.totalAlumnos, 0
          )
        };
        
        console.log('📊 Estadísticas generales:', estadisticasGenerales);
        
        res.json({
          success: true,
          estadisticasGenerales,
          universidades: universidadesConEstadisticas
        });
        
      } catch (error: any) {
        console.error('❌ Error al obtener universidades con estadísticas:', error);
        console.error('❌ Error stack:', error.stack);
        res.status(500).json({ 
          success: false,
          error: 'Error interno del servidor' 
        });
      }
    }
}