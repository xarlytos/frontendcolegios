import { Response } from 'express';
import { Producto } from '../models/Producto';
import { RolUsuario } from '../models/Usuario';
import { AuthRequest } from '../types';

export class ProductosController {
  // GET /productos - Obtener todos los productos
  static async getProductos(req: AuthRequest, res: Response) {
    try {
      const productos = await Producto.find({ activo: true })
        .sort({ nombre: 1 });

      res.json({
        success: true,
        productos
      });
    } catch (error) {
      console.error('Error obteniendo productos:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // POST /productos - Crear nuevo producto
  static async crearProducto(req: AuthRequest, res: Response) {
    try {
      const { nombre, descripcion } = req.body;

      if (!nombre || nombre.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'El nombre del producto es requerido'
        });
      }

      // Verificar si ya existe un producto con ese nombre
      const productoExistente = await Producto.findOne({ 
        nombre: nombre.trim(),
        activo: true 
      });

      if (productoExistente) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe un producto con ese nombre'
        });
      }

      const producto = new Producto({
        nombre: nombre.trim(),
        descripcion: descripcion?.trim() || '',
        creadoPor: req.user!.userId
      });

      await producto.save();

      res.status(201).json({
        success: true,
        message: 'Producto creado correctamente',
        producto
      });
    } catch (error) {
      console.error('Error creando producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // PUT /productos/:id - Actualizar producto
  static async actualizarProducto(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;
      const { nombre, descripcion } = req.body;

      if (!nombre || nombre.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'El nombre del producto es requerido'
        });
      }

      const producto = await Producto.findById(id);

      if (!producto) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      // Verificar si ya existe otro producto con ese nombre
      const productoExistente = await Producto.findOne({ 
        nombre: nombre.trim(),
        activo: true,
        _id: { $ne: id }
      });

      if (productoExistente) {
        return res.status(400).json({
          success: false,
          message: 'Ya existe otro producto con ese nombre'
        });
      }

      producto.nombre = nombre.trim();
      producto.descripcion = descripcion?.trim() || '';
      producto.actualizadoPor = req.user!.userId;

      await producto.save();

      res.json({
        success: true,
        message: 'Producto actualizado correctamente',
        producto
      });
    } catch (error) {
      console.error('Error actualizando producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }

  // DELETE /productos/:id - Eliminar producto (soft delete)
  static async eliminarProducto(req: AuthRequest, res: Response) {
    try {
      const { id } = req.params;

      const producto = await Producto.findById(id);

      if (!producto) {
        return res.status(404).json({
          success: false,
          message: 'Producto no encontrado'
        });
      }

      // Soft delete - marcar como inactivo
      producto.activo = false;
      producto.actualizadoPor = req.user!.userId;
      await producto.save();

      res.json({
        success: true,
        message: 'Producto eliminado correctamente'
      });
    } catch (error) {
      console.error('Error eliminando producto:', error);
      res.status(500).json({
        success: false,
        message: 'Error interno del servidor'
      });
    }
  }
}
