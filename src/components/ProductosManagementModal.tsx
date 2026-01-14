import React, { useState, useEffect } from 'react';
import { X, Plus, Edit3, Trash2, Save, Loader } from 'lucide-react';
import productosService, { Producto } from '../services/productosService';

interface ProductosManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductoSeleccionado?: (producto: Producto) => void;
  onProductoCreado?: (producto: Producto) => void;
}

export default function ProductosManagementModal({ 
  isOpen, 
  onClose, 
  onProductoSeleccionado,
  onProductoCreado
}: ProductosManagementModalProps) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  // Estados para el formulario
  const [nombre, setNombre] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoNombre, setEditandoNombre] = useState('');

  // Cargar productos al abrir el modal
  useEffect(() => {
    if (isOpen) {
      cargarProductos();
    }
  }, [isOpen]);

  const cargarProductos = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await productosService.getProductos();
      setProductos(response.productos);
    } catch (error) {
      console.error('Error cargando productos:', error);
      setError('Error al cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  const handleCrearProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!nombre.trim()) {
      setError('El nombre del producto es requerido');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const response = await productosService.crearProducto({
        nombre: nombre.trim()
      });

      setProductos(prev => [...prev, response.producto]);
      setNombre('');
      
      // Notificar al componente padre que se creó un producto
      if (onProductoCreado) {
        onProductoCreado(response.producto);
      }
    } catch (error: any) {
      console.error('Error creando producto:', error);
      setError(error.response?.data?.message || 'Error al crear el producto');
    } finally {
      setSaving(false);
    }
  };

  const handleEditarProducto = (producto: Producto) => {
    setEditandoId(producto._id);
    setEditandoNombre(producto.nombre);
  };

  const handleGuardarEdicion = async (id: string) => {
    if (!editandoNombre.trim()) {
      setError('El nombre del producto es requerido');
      return;
    }

    try {
      setSaving(true);
      setError(null);
      
      const response = await productosService.actualizarProducto(id, {
        nombre: editandoNombre.trim()
      });

      setProductos(prev => prev.map(p => 
        p._id === id ? response.producto : p
      ));
      
      setEditandoId(null);
      setEditandoNombre('');
    } catch (error: any) {
      console.error('Error actualizando producto:', error);
      setError(error.response?.data?.message || 'Error al actualizar el producto');
    } finally {
      setSaving(false);
    }
  };

  const handleCancelarEdicion = () => {
    setEditandoId(null);
    setEditandoNombre('');
    setError(null);
  };

  const handleEliminarProducto = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este producto?')) {
      return;
    }

    try {
      setDeleting(id);
      setError(null);
      
      await productosService.eliminarProducto(id);
      setProductos(prev => prev.filter(p => p._id !== id));
    } catch (error: any) {
      console.error('Error eliminando producto:', error);
      setError(error.response?.data?.message || 'Error al eliminar el producto');
    } finally {
      setDeleting(null);
    }
  };

  const handleSeleccionarProducto = (producto: Producto) => {
    if (onProductoSeleccionado) {
      onProductoSeleccionado(producto);
    }
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">
            Gestión de Productos
          </h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {/* Formulario para crear producto */}
          <div className="p-6 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Añadir Producto
            </h3>
            <form onSubmit={handleCrearProducto} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre del Producto *
                </label>
                <input
                  type="text"
                  value={nombre}
                  onChange={(e) => setNombre(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Ej: Curso de Verano, Taller de Matemáticas"
                  disabled={saving}
                />
              </div>
              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={saving || !nombre.trim()}
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {saving ? (
                    <>
                      <Loader className="w-4 h-4 mr-2 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-2" />
                      Añadir Producto
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>

          {/* Lista de productos */}
          <div className="flex-1 overflow-hidden flex flex-col">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">
                Productos Existentes ({productos.length})
              </h3>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-600">{error}</p>
                </div>
              )}

              {loading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader className="w-6 h-6 animate-spin text-blue-600" />
                  <span className="ml-2 text-gray-600">Cargando productos...</span>
                </div>
              ) : productos.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-500">No hay productos creados</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {productos.map((producto) => (
                    <div
                      key={producto._id}
                      className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50"
                    >
                      {editandoId === producto._id ? (
                        <div className="flex-1 space-y-3">
                          <input
                            type="text"
                            value={editandoNombre}
                            onChange={(e) => setEditandoNombre(e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            disabled={saving}
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleGuardarEdicion(producto._id)}
                              disabled={saving || !editandoNombre.trim()}
                              className="flex items-center px-3 py-1 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            >
                              {saving ? (
                                <Loader className="w-3 h-3 mr-1 animate-spin" />
                              ) : (
                                <Save className="w-3 h-3 mr-1" />
                              )}
                              Guardar
                            </button>
                            <button
                              onClick={handleCancelarEdicion}
                              disabled={saving}
                              className="px-3 py-1 bg-gray-500 text-white text-sm rounded-md hover:bg-gray-600 disabled:opacity-50 transition-colors"
                            >
                              Cancelar
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex-1">
                            <h4 className="font-medium text-gray-900">{producto.nombre}</h4>
                          </div>
                          <div className="flex items-center gap-2">
                            {onProductoSeleccionado && (
                              <button
                                onClick={() => handleSeleccionarProducto(producto)}
                                className="px-3 py-1 bg-blue-100 text-blue-700 text-sm rounded-md hover:bg-blue-200 transition-colors"
                              >
                                Seleccionar
                              </button>
                            )}
                            <button
                              onClick={() => handleEditarProducto(producto)}
                              className="p-1 text-gray-600 hover:text-gray-700 transition-colors"
                              title="Editar producto"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleEliminarProducto(producto._id)}
                              disabled={deleting === producto._id}
                              className="p-1 text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
                              title="Eliminar producto"
                            >
                              {deleting === producto._id ? (
                                <Loader className="w-4 h-4 animate-spin" />
                              ) : (
                                <Trash2 className="w-4 h-4" />
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
