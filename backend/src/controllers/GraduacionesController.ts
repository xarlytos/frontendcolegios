import { Response } from 'express';
import { Contacto } from '../models/Contacto';
import { RolUsuario } from '../models/Usuario';
import { AuthRequest } from '../types';
import { JerarquiaUsuarios } from '../models/JerarquiaUsuarios';
import { ConfiguracionSistema } from '../models/ConfiguracionSistema';
import { verificarPermisoUsuario } from '../utils/database';

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

  // GET /graduaciones/colegios/:anio - Obtener colegios con contactos de un año específico
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
            colegios: [],
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

      // Formatear respuesta
      const colegios = contactosPorColegio.map(colegio => ({
        nombreColegio: colegio._id,
        totalContactos: colegio.totalContactos,
        contactos: colegio.contactos
      }));

      console.log('🏫 Colegios formateados:', colegios.length);

      res.json({
        success: true,
        colegios,
        totalContactos
      });
    } catch (error) {
      console.error('Error obteniendo colegios por año:', error);
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
