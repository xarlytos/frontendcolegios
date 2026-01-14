import { Request, Response } from 'express';
import { Colegio } from '../models/Colegio';
import { AuthRequest } from '../types';

export class ColegiosController {
  // GET /colegios - Obtener todos los colegios
  static async obtenerColegios(req: AuthRequest, res: Response) {
    try {
      const { 
        page = 1, 
        limit = 50, // Aumentar el límite por defecto
        search, 
        activo = 'true'
      } = req.query;

      const skip = (Number(page) - 1) * Number(limit);
      const filter: any = {};

      // Aplicar filtros
      if (search) {
        filter.$or = [
          { nombre: { $regex: search, $options: 'i' } },
          { direccion: { $regex: search, $options: 'i' } }
        ];
      }

      // Filtrar por activo
      filter.activo = activo === 'true';

      const colegios = await Colegio.find(filter)
        .sort({ nombre: 1 })
        .skip(skip)
        .limit(Number(limit));

      const total = await Colegio.countDocuments(filter);

      res.json({
        success: true,
        data: colegios,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit))
        }
      });
    } catch (error) {
      console.error('Error obteniendo colegios:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // GET /colegios/todos - Obtener todos los colegios sin paginación
  static async obtenerTodosLosColegios(req: AuthRequest, res: Response) {
    try {
      const { search, activo = 'true' } = req.query;
      const filter: any = {};

      // Aplicar filtros
      if (search) {
        filter.$or = [
          { nombre: { $regex: search, $options: 'i' } },
          { direccion: { $regex: search, $options: 'i' } }
        ];
      }

      // Filtrar por activo
      filter.activo = activo === 'true';

      const colegios = await Colegio.find(filter)
        .sort({ nombre: 1 })
        .select('nombre direccion telefono email activo');

      res.json({
        success: true,
        data: colegios
      });
    } catch (error) {
      console.error('Error obteniendo todos los colegios:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // GET /colegios/nombres - Obtener solo los nombres de los colegios (para compatibilidad)
  static async obtenerNombresColegios(req: AuthRequest, res: Response) {
    try {
      const { search, activo = 'true' } = req.query;
      const filter: any = {};

      // Aplicar filtros
      if (search) {
        filter.nombre = { $regex: search, $options: 'i' };
      }

      // Filtrar por activo
      filter.activo = activo === 'true';

      const colegios = await Colegio.find(filter)
        .select('nombre')
        .sort({ nombre: 1 });

      const nombres = colegios.map(colegio => colegio.nombre);

      res.json({
        success: true,
        data: {
          colegios: nombres
        }
      });
    } catch (error) {
      console.error('Error obteniendo nombres de colegios:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}
