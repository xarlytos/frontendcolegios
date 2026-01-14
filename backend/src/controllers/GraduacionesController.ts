import { Response } from 'express';
import { Types } from 'mongoose';
import { Contacto } from '../models/Contacto';
import { Graduacion } from '../models/Graduacion';
import { RolUsuario } from '../models/Usuario';
import { AuthRequest } from '../types';
import { JerarquiaUsuarios } from '../models/JerarquiaUsuarios';
import { ConfiguracionSistema } from '../models/ConfiguracionSistema';
import { verificarPermisoUsuario } from '../utils/database';
import { Colegio } from '../models/Colegio';


export class GraduacionesController {
  // GET /graduaciones/anios - Obtener años disponibles
  static async getAniosDisponibles(req: AuthRequest, res: Response) {
    try {
      // Solo administradores pueden ver los años disponibles
      if (req.user!.rol !== RolUsuario.ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden acceder a esta información'
        });
      }

      // Obtener años únicos de los contactos
      const anios = await Contacto.distinct('anioNacimiento');
      const aniosOrdenados = anios.sort((a, b) => b - a); // Orden descendente

      // Siempre devolver éxito, incluso si no hay años (array vacío)
      res.json({
        success: true,
        anios: aniosOrdenados
      });
    } catch (error) {
      console.error('Error obteniendo años disponibles:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // GET /graduaciones/colegios/:anio - Obtener colegios con graduaciones de un año específico
  static async getColegiosPorAnio(req: AuthRequest, res: Response) {
    try {
      const { anio } = req.params;
      let anioNum = parseInt(anio);

      // Si no se proporciona año o es 0, obtener el año seleccionado desde la BD
      if (!anio || anio === '0' || isNaN(anioNum)) {
        console.log('🔍 No se proporcionó año válido, obteniendo desde BD...');
        const configAnio = await ConfiguracionSistema.findOne({ clave: 'graduaciones_anio_seleccionado' });
        if (configAnio && configAnio.valor) {
          anioNum = parseInt(configAnio.valor);
          console.log('📅 Año obtenido desde BD:', anioNum);
        } else {
          console.log('❌ No hay año seleccionado en BD');
          return res.json({
            success: true,
            graduaciones: [],
            totalContactos: 0,
            message: 'No hay año seleccionado'
          });
        }
      }

      console.log('🎯 GraduacionesController - getColegiosPorAnio:', {
        anio: anio,
        anioNum: anioNum,
        userId: req.user?.userId,
        rol: req.user?.rol,
        esAdmin: req.user?.rol === RolUsuario.ADMIN
      });

      if (isNaN(anioNum)) {
        return res.status(400).json({
          success: false,
          message: 'El año debe ser un número válido'
        });
      }

      // Construir filtros base
      const filtros: any = {
        anioNacimiento: anioNum
      };

      // Verificar configuración de visibilidad de contactos
      const configuracionVisibilidad = await ConfiguracionSistema.findOne({
        clave: 'graduaciones_mostrar_contactos'
      });

      const mostrarContactos = configuracionVisibilidad?.valor === true;
      console.log('🔧 Configuración de visibilidad desde BD:', mostrarContactos);

      // Aplicar visibilidad según rol
      if (req.user!.rol !== RolUsuario.ADMIN) {
        console.log('👤 Usuario comercial detectado, verificando visibilidad...');

        if (!mostrarContactos) {
          console.log('🔒 Visibilidad desactivada por admin - no mostrar contactos');
          // Si el admin ha desactivado la visibilidad, no mostrar contactos
          filtros._id = { $in: [] };
        } else {
          console.log('✅ Visibilidad activada por admin, mostrando TODOS los contactos (como en ContactosCompleta)');
          // Si la visibilidad está activada, mostrar TODOS los contactos sin filtros de permisos
          // Esto es igual que en ContactosCompleta donde se muestran todos los contactos
        }
      } else {
        console.log('👑 Usuario admin, mostrando todos los contactos');
      }

      console.log('🔍 Filtros aplicados:', JSON.stringify(filtros, null, 2));

      // Verificar si hay contactos que coincidan con los filtros
      const totalContactosFiltrados = await Contacto.countDocuments(filtros);
      console.log('📊 Total contactos que coinciden con filtros:', totalContactosFiltrados);

      // Obtener contactos agrupados por colegio
      const contactosPorColegio = await Contacto.aggregate([
        { $match: filtros },
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
            _id: '$nombreColegio',
            totalContactos: { $sum: 1 },
            contactos: {
              $push: {
                id: '$_id',
                nombreCompleto: '$nombreCompleto',
                telefono: '$telefono',
                instagram: '$instagram',
                anioNacimiento: '$anioNacimiento',
                fechaAlta: '$fechaAlta',
                comercialId: '$comercialId',
                comercialNombre: '$comercialInfo.nombre'
              }
            }
          }
        },
        {
          $sort: { totalContactos: -1, _id: 1 }
        }
      ]);

      // Calcular total de contactos
      const totalContactos = contactosPorColegio.reduce((sum, colegio) => sum + colegio.totalContactos, 0);

      console.log('📊 Resultados de la agregación:', {
        contactosPorColegio: contactosPorColegio.length,
        totalContactos: totalContactos
      });

      // 1. Obtener TODOS los colegios activos de la base de datos
      const todosLosColegios = await Colegio.find({ activo: true }).select('nombre');
      const nombresColegios = new Set(todosLosColegios.map(c => c.nombre));

      // 2. Añadir nombres de colegios que tengan contactos pero no estén en la tabla Colegio
      contactosPorColegio.forEach(c => nombresColegios.add(c._id));

      // 3. Obtener campos editables guardados para cada colegio
      // Recuperamos registros de graduación para estos colegios sin filtrar estrictamente por año
      // para asegurar que se muestre la información previa si existe
      const graduacionesGuardadas = await Graduacion.find({
        nombreColegio: { $in: Array.from(nombresColegios) }
      }).sort({ anioNacimiento: 1 });

      // Crear mapa de graduaciones guardadas por nombre de colegio
      // Priorizamos el registro que coincida con el año seleccionado
      const graduacionesMap = new Map();
      graduacionesGuardadas.forEach(g => {
        const existing = graduacionesMap.get(g.nombreColegio);
        if (!existing || g.anioNacimiento === anioNum) {
          graduacionesMap.set(g.nombreColegio, g);
        }
      });

      // 4. Formatear respuesta combinando TODOS los colegios con sus contactos y campos editables
      const graduaciones = Array.from(nombresColegios).map(nombre => {
        const colegioConContactos = contactosPorColegio.find(c => c._id === nombre);
        const graduacionGuardada = graduacionesMap.get(nombre);

        return {
          id: nombre, // Usar el nombre del colegio como ID temporal
          nombreColegio: nombre,
          anioNacimiento: anioNum,
          responsable: graduacionGuardada?.responsable || '',
          tipoProducto: graduacionGuardada?.tipoProducto || '',
          prevision: graduacionGuardada?.prevision || '',
          estado: graduacionGuardada?.estado || '',
          observaciones: graduacionGuardada?.observaciones || '',
          fechaGraduacion: graduacionGuardada?.fechaGraduacion || '',
          totalContactos: colegioConContactos?.totalContactos || 0,
          contactos: colegioConContactos?.contactos || []
        };
      });

      // 5. Ordenar: colegios con más contactos arriba, luego por nombre
      graduaciones.sort((a, b) => {
        if (b.totalContactos !== a.totalContactos) {
          return b.totalContactos - a.totalContactos;
        }
        return a.nombreColegio.localeCompare(b.nombreColegio);
      });

      console.log('🏫 Graduaciones totales (incluyendo sin contactos):', graduaciones.length);


      res.json({
        success: true,
        graduaciones,
        totalContactos
      });
    } catch (error) {
      console.error('Error obteniendo graduaciones por año:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // PUT /graduaciones/:id - Actualizar campos editables de una graduación
  static async actualizarGraduacion(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params; // Este es el nombre del colegio
      const { responsable, tipoProducto, producto, prevision, estado, observaciones, fechaGraduacion } = req.body;

      console.log('🔄 Actualizando graduación:', {
        colegio: id,
        responsable,
        tipoProducto,
        producto,
        prevision,
        estado,
        observaciones,
        fechaGraduacion
      });

      // Obtener el año seleccionado actualmente desde la configuración
      const configAnio = await ConfiguracionSistema.findOne({ clave: 'graduaciones_anio_seleccionado' });
      const anioSeleccionado = configAnio && configAnio.valor ? parseInt(configAnio.valor) : 2007;

      // Buscar o crear graduación en la colección Graduacion para ese colegio y ese año
      let graduacion = await Graduacion.findOne({
        nombreColegio: id,
        anioNacimiento: anioSeleccionado
      });

      if (!graduacion) {
        // Buscar si existe información del colegio en algún otro año para usarla como base
        // Así evitamos que se "borren" los datos cuando se guarda por primera vez en un año nuevo
        const graduacionPrevia = await Graduacion.findOne({ nombreColegio: id }).sort({ anioNacimiento: -1 });

        console.log(`🆕 Creando nueva graduación para: ${id} (Año: ${anioSeleccionado})`);
        graduacion = new Graduacion({
          nombreColegio: id,
          anioNacimiento: anioSeleccionado,
          responsable: responsable !== undefined ? responsable : (graduacionPrevia?.responsable || ''),
          tipoProducto: tipoProducto !== undefined ? tipoProducto : (graduacionPrevia?.tipoProducto || ''),
          producto: producto ? new Types.ObjectId(producto) : (graduacionPrevia?.producto || undefined),
          prevision: prevision !== undefined ? prevision : (graduacionPrevia?.prevision || ''),
          estado: estado !== undefined ? estado : (graduacionPrevia?.estado || ''),
          observaciones: observaciones !== undefined ? observaciones : (graduacionPrevia?.observaciones || ''),
          fechaGraduacion: fechaGraduacion !== undefined ? fechaGraduacion : (graduacionPrevia?.fechaGraduacion || ''),
          contactos: [], // Se puede poblar después
          creadoPor: new Types.ObjectId(req.user!.userId)
        });
      } else {
        // Actualizar campos existentes solo si vienen en la petición (no son undefined)
        if (responsable !== undefined) graduacion.responsable = responsable;
        if (tipoProducto !== undefined) graduacion.tipoProducto = tipoProducto;
        if (producto !== undefined) graduacion.producto = producto ? new Types.ObjectId(producto) : undefined;
        if (prevision !== undefined) graduacion.prevision = prevision;
        if (estado !== undefined) graduacion.estado = estado;
        if (observaciones !== undefined) graduacion.observaciones = observaciones;
        if (fechaGraduacion !== undefined) graduacion.fechaGraduacion = fechaGraduacion;

        graduacion.actualizadoPor = new Types.ObjectId(req.user!.userId);
      }

      await graduacion.save();

      console.log('✅ Graduación guardada correctamente');

      res.json({
        success: true,
        message: 'Graduación actualizada correctamente',
        graduacion: {
          id: graduacion._id,
          nombreColegio: graduacion.nombreColegio,
          responsable: graduacion.responsable,
          tipoProducto: graduacion.tipoProducto,
          prevision: graduacion.prevision,
          estado: graduacion.estado,
          observaciones: graduacion.observaciones,
          fechaGraduacion: graduacion.fechaGraduacion
        }
      });
    } catch (error) {
      console.error('❌ Error actualizando graduación:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // POST /graduaciones/sync - Sincronizar graduaciones con contactos existentes
  static async sincronizarGraduaciones(req: AuthRequest, res: Response) {
    try {
      // Solo administradores pueden sincronizar
      if (req.user!.rol !== RolUsuario.ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden sincronizar graduaciones'
        });
      }

      // Obtener contactos agrupados por colegio y año
      const contactosPorColegio = await Contacto.aggregate([
        {
          $group: {
            _id: {
              nombreColegio: '$nombreColegio',
              anioNacimiento: '$anioNacimiento'
            },
            contactos: { $push: '$_id' }
          }
        }
      ]);

      let graduacionesCreadas = 0;
      let graduacionesActualizadas = 0;

      for (const grupo of contactosPorColegio) {
        const { nombreColegio, anioNacimiento } = grupo._id;
        const contactosIds = grupo.contactos;

        // Verificar si ya existe una graduación para este colegio y año
        let graduacion = await Graduacion.findOne({
          nombreColegio,
          anioNacimiento
        });

        if (graduacion) {
          // Actualizar contactos existentes
          graduacion.contactos = contactosIds;
          graduacion.actualizadoPor = new Types.ObjectId(req.user!.userId);
          await graduacion.save();
          graduacionesActualizadas++;
        } else {
          // Si no existe para este año, buscar información previa para heredar
          const graduacionPrevia = await Graduacion.findOne({ nombreColegio }).sort({ anioNacimiento: -1 });

          // Crear nueva graduación heredando datos si existen
          graduacion = new Graduacion({
            nombreColegio,
            anioNacimiento,
            responsable: graduacionPrevia?.responsable || '',
            tipoProducto: graduacionPrevia?.tipoProducto || '',
            producto: graduacionPrevia?.producto,
            prevision: graduacionPrevia?.prevision || '',
            estado: graduacionPrevia?.estado || '',
            observaciones: graduacionPrevia?.observaciones || '',
            fechaGraduacion: graduacionPrevia?.fechaGraduacion || '',
            contactos: contactosIds,
            creadoPor: new Types.ObjectId(req.user!.userId)
          });
          await graduacion.save();
          graduacionesCreadas++;
        }
      }

      res.json({
        success: true,
        message: 'Sincronización completada',
        graduacionesCreadas,
        graduacionesActualizadas,
        totalProcesadas: graduacionesCreadas + graduacionesActualizadas
      });
    } catch (error) {
      console.error('Error sincronizando graduaciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // Método auxiliar para obtener contactos visibles según jerarquía
  private static async getContactosVisibles(usuarioId: string, rol: string): Promise<string[]> {
    try {
      console.log('🔍 getContactosVisibles - Usuario:', usuarioId, 'Rol:', rol);

      if (rol === RolUsuario.ADMIN) {
        // Los administradores pueden ver todos los contactos
        const todosLosContactos = await Contacto.find({}, '_id');
        console.log('👑 Admin - Total contactos en BD:', todosLosContactos.length);
        return todosLosContactos.map(contacto => contacto._id.toString());
      }

      // Para comerciales, obtener contactos propios y de subordinados
      const subordinados = await GraduacionesController.getSubordinados(usuarioId);
      console.log('👥 Subordinados encontrados:', subordinados.length);
      const comercialesIncluidos = [usuarioId, ...subordinados];
      console.log('👥 Comerciales incluidos:', comercialesIncluidos);

      const contactos = await Contacto.find({
        $or: [
          { comercialId: { $in: comercialesIncluidos } },
          { createdBy: usuarioId }
        ]
      }, '_id');

      console.log('📋 Contactos encontrados para comercial:', contactos.length);
      const contactosIds = contactos.map(contacto => contacto._id.toString());
      console.log('🆔 IDs de contactos visibles:', contactosIds);

      return contactosIds;
    } catch (error) {
      console.error('Error obteniendo contactos visibles:', error);
      return [];
    }
  }

  // Método auxiliar para obtener subordinados
  private static async getSubordinados(usuarioId: string): Promise<string[]> {
    try {
      const jerarquias = await JerarquiaUsuarios.find({ jefeId: usuarioId });
      const subordinadosDirectos = jerarquias.map(j => j.subordinadoId.toString());

      // Obtener subordinados de subordinados (recursivo)
      const subordinadosIndirectos: string[] = [];
      for (const subordinadoId of subordinadosDirectos) {
        const subordinadosDelSubordinado = await GraduacionesController.getSubordinados(subordinadoId);
        subordinadosIndirectos.push(...subordinadosDelSubordinado);
      }

      return [...subordinadosDirectos, ...subordinadosIndirectos];
    } catch (error) {
      console.error('Error obteniendo subordinados:', error);
      return [];
    }
  }
}
