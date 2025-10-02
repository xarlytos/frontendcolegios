import { Response } from 'express';
import { ConfiguracionSistema } from '../models/ConfiguracionSistema';
import { Permiso } from '../models/Permiso';
import { RolUsuario } from '../models/Usuario';
import { AuthRequest } from '../types';

export class ConfiguracionController {
  // GET /configuracion/:clave - Obtener configuración por clave
  static async obtenerConfiguracion(req: AuthRequest, res: Response) {
    try {
      const { clave } = req.params;
      
      const configuracion = await ConfiguracionSistema.findOne({ clave });
      
      if (!configuracion) {
        return res.status(404).json({
          success: false,
          message: 'Configuración no encontrada'
        });
      }

      res.json({
        success: true,
        configuracion: {
          clave: configuracion.clave,
          valor: configuracion.valor,
          descripcion: configuracion.descripcion,
          actualizadoEn: configuracion.actualizadoEn
        }
      });
    } catch (error) {
      console.error('Error obteniendo configuración:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // PUT /configuracion/:clave - Actualizar configuración
  static async actualizarConfiguracion(req: AuthRequest, res: Response) {
    try {
      const { clave } = req.params;
      const { valor, descripcion } = req.body;
      const actualizadoPor = req.user!.userId;

      if (valor === undefined) {
        return res.status(400).json({
          success: false,
          message: 'El valor es requerido'
        });
      }

      const configuracion = await ConfiguracionSistema.findOneAndUpdate(
        { clave },
        {
          valor,
          descripcion: descripcion || 'Configuración actualizada',
          actualizadoPor,
          actualizadoEn: new Date()
        },
        { 
          upsert: true, 
          new: true,
          runValidators: true
        }
      );

      console.log(`🔧 Configuración actualizada: ${clave} = ${valor} por ${actualizadoPor}`);

      res.json({
        success: true,
        message: 'Configuración actualizada correctamente',
        configuracion: {
          clave: configuracion.clave,
          valor: configuracion.valor,
          descripcion: configuracion.descripcion,
          actualizadoEn: configuracion.actualizadoEn
        }
      });
    } catch (error) {
      console.error('Error actualizando configuración:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // GET /configuracion - Obtener todas las configuraciones
  static async obtenerTodasLasConfiguraciones(req: AuthRequest, res: Response) {
    try {
      const configuraciones = await ConfiguracionSistema.find({})
        .sort({ actualizadoEn: -1 });

      res.json({
        success: true,
        configuraciones: configuraciones.map(config => ({
          clave: config.clave,
          valor: config.valor,
          descripcion: config.descripcion,
          actualizadoEn: config.actualizadoEn
        }))
      });
    } catch (error) {
      console.error('Error obteniendo configuraciones:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // POST /configuracion/init-permissions - Inicializar permisos faltantes
  static async inicializarPermisos(req: AuthRequest, res: Response) {
    try {
      console.log('🔧 Inicializando permisos...');
      console.log('👤 Usuario:', req.user);
      console.log('🔑 Rol:', req.user?.rol);
      console.log('🔍 RolUsuario.ADMIN:', RolUsuario.ADMIN);
      console.log('🔍 Comparación rol:', req.user?.rol === RolUsuario.ADMIN);
      
      // Solo administradores pueden ejecutar esta acción
      if (req.user!.rol !== RolUsuario.ADMIN) {
        console.log('❌ Usuario no es admin');
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden ejecutar esta acción'
        });
      }

      const permisosRequeridos = [
        { clave: 'VER_GRADUACIONES', descripcion: 'Permite ver la página de graduaciones' },
        { clave: 'VER_CONTACTOS_GRADUACIONES', descripcion: 'Permite ver los contactos filtrados en graduaciones' }
      ];

      // También inicializar configuraciones del sistema
      const configuracionesRequeridas = [
        { clave: 'graduaciones_mostrar_contactos', valor: 'false', descripcion: 'Controla si los comerciales pueden ver contactos en graduaciones' },
        { clave: 'graduaciones_anio_seleccionado', valor: '2024', descripcion: 'Año seleccionado por el admin para filtrar graduaciones' }
      ];

      for (const configData of configuracionesRequeridas) {
        const configExistente = await ConfiguracionSistema.findOne({ clave: configData.clave });
        
        if (!configExistente) {
          const nuevaConfig = new ConfiguracionSistema({
            ...configData,
            actualizadoPor: req.user!.userId || req.user!._id || 'system',
            actualizadoEn: new Date()
          });
          await nuevaConfig.save();
          console.log(`✅ Configuración ${configData.clave} creada`);
        } else {
          console.log(`⚠️ Configuración ${configData.clave} ya existe`);
        }
      }

      const permisosCreados = [];
      const permisosExistentes = [];

      console.log('🔧 Procesando permisos requeridos:', permisosRequeridos);

      for (const permisoData of permisosRequeridos) {
        try {
          console.log(`🔍 Verificando permiso: ${permisoData.clave}`);
          const permisoExistente = await Permiso.findOne({ clave: permisoData.clave });
          
          if (permisoExistente) {
            permisosExistentes.push(permisoExistente);
            console.log(`⚠️ Permiso ${permisoData.clave} ya existe: ${permisoExistente._id}`);
          } else {
            console.log(`➕ Creando nuevo permiso: ${permisoData.clave}`);
            const nuevoPermiso = new Permiso(permisoData);
            const permisoGuardado = await nuevoPermiso.save();
            permisosCreados.push(permisoGuardado);
            console.log(`✅ Permiso ${permisoData.clave} creado: ${permisoGuardado._id}`);
          }
        } catch (error) {
          console.error(`❌ Error procesando permiso ${permisoData.clave}:`, error);
          throw error;
        }
      }

      res.json({
        success: true,
        message: 'Inicialización de permisos completada',
        permisosCreados: permisosCreados.length,
        permisosExistentes: permisosExistentes.length,
        detalles: {
          creados: permisosCreados.map(p => ({ clave: p.clave, id: p._id })),
          existentes: permisosExistentes.map(p => ({ clave: p.clave, id: p._id }))
        }
      });
    } catch (error) {
      console.error('❌ Error inicializando permisos:', error);
      console.error('❌ Stack trace:', error instanceof Error ? error.stack : 'No stack trace available');
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor',
        error: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.message : String(error)) : undefined
      });
    }
  }

  // PUT /configuracion/graduaciones_anio_seleccionado - Actualizar año seleccionado
  static async actualizarAnioSeleccionado(req: AuthRequest, res: Response) {
    try {
      console.log('🔧 actualizarAnioSeleccionado - Request body:', req.body);
      console.log('🔧 actualizarAnioSeleccionado - User:', req.user);
      
      const { anio } = req.body;
      console.log('🔧 actualizarAnioSeleccionado - Año extraído:', anio);

      // Validar que el año sea válido
      if (anio === undefined || anio === null) {
        console.log('❌ Error: Año no proporcionado');
        return res.status(400).json({
          success: false,
          message: 'El año es requerido'
        });
      }

      if (typeof anio !== 'number' || anio < 1900 || anio > 2100) {
        console.log('❌ Error: Año inválido:', anio);
        return res.status(400).json({
          success: false,
          message: 'El año debe ser un número válido entre 1900 y 2100'
        });
      }

      // Solo administradores pueden actualizar el año
      if (req.user!.rol !== RolUsuario.ADMIN) {
        return res.status(403).json({
          success: false,
          message: 'Solo los administradores pueden actualizar el año seleccionado'
        });
      }

      let config = await ConfiguracionSistema.findOne({ clave: 'graduaciones_anio_seleccionado' });

      if (!config) {
        // Si no existe, crearla
        config = new ConfiguracionSistema({
          clave: 'graduaciones_anio_seleccionado',
          valor: String(anio), // Convertir a string
          descripcion: 'Año seleccionado por el admin para filtrar graduaciones',
          actualizadoPor: req.user!.userId || req.user!._id || 'system',
          actualizadoEn: new Date(),
        });
        await config.save();
        console.log(`✅ Nueva configuración creada: graduaciones_anio_seleccionado = ${anio}`);
      } else {
        // Si existe, actualizarla
        config.valor = String(anio); // Convertir a string
        config.actualizadoPor = req.user!.userId || req.user!._id || 'system';
        config.actualizadoEn = new Date();
        await config.save();
        console.log(`✅ Configuración actualizada: graduaciones_anio_seleccionado = ${anio}`);
      }

      res.json({
        success: true,
        message: 'Año seleccionado actualizado correctamente',
        configuracion: {
          clave: config.clave,
          valor: config.valor,
        }
      });
    } catch (error) {
      console.error('Error actualizando año seleccionado:', error);
      res.status(500).json({ success: false, message: 'Error interno del servidor' });
    }
  }
}
