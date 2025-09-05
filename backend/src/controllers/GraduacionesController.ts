import { Response } from 'express';
import { Contacto } from '../models/Contacto';
import { RolUsuario } from '../models/Usuario';
import { AuthRequest } from '../types';
import { JerarquiaUsuarios } from '../models/JerarquiaUsuarios';

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
      const anioNum = parseInt(anio);

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

      // Aplicar visibilidad según rol
      if (req.user!.rol !== RolUsuario.ADMIN) {
        // Para comerciales, solo mostrar contactos que pueden ver
        const contactosVisibles = await GraduacionesController.getContactosVisibles(req.user!.userId, req.user!.rol);
        if (contactosVisibles.length > 0) {
          filtros._id = { $in: contactosVisibles };
        } else {
          // Si no hay contactos visibles, no mostrar nada
          filtros._id = { $in: [] };
        }
      }

      // Agregar filtro de año
      filtros.anioNacimiento = anioNum;

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

      // Formatear respuesta
      const colegios = contactosPorColegio.map(colegio => ({
        nombreColegio: colegio._id,
        totalContactos: colegio.totalContactos,
        contactos: colegio.contactos
      }));

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
      if (rol === RolUsuario.ADMIN) {
        // Los administradores pueden ver todos los contactos
        const todosLosContactos = await Contacto.find({}, '_id');
        return todosLosContactos.map(contacto => contacto._id.toString());
      }

      // Para comerciales, obtener contactos propios y de subordinados
      const subordinados = await GraduacionesController.getSubordinados(usuarioId);
      const comercialesIncluidos = [usuarioId, ...subordinados];

      const contactos = await Contacto.find({
        $or: [
          { comercialId: { $in: comercialesIncluidos } },
          { createdBy: usuarioId }
        ]
      }, '_id');

      return contactos.map(contacto => contacto._id.toString());
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
