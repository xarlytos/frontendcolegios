import { useState, useEffect } from 'react';
import { X, Plus, Trash2, Edit3, Save, X as XIcon } from 'lucide-react';
import productosService, { Producto } from '../services/productosService';

interface ProductosModalProps {
  isOpen: boolean;
  onClose: () => void;
  onProductoSeleccionado?: (producto: Producto) => void;
}

export default function ProductosModal({ isOpen, onClose, onProductoSeleccionado }: ProductosModalProps) {
  const [productos, setProductos] = useState<Producto[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nuevoProducto, setNuevoProducto] = useState('');
  const [editandoId, setEditandoId] = useState<string | null>(null);
  const [editandoNombre, setEditandoNombre] = useState('');
  const [guardando, setGuardando] = useState(false);

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
      if (response.success) {
        setProductos(response.productos);
      } else {
        setError('Error al cargar los productos');
      }
    } catch (err) {
      console.error('Error cargando productos:', err);
      setError('Error al cargar los productos');
    } finally {
      setLoading(false);
    }
  };

  const handleCrearProducto = async () => {
    if (!nuevoProducto.trim()) {
      alert('Por favor ingresa un nombre para el producto');
      return;
    }

    try {
      setGuardando(true);
      const response = await productosService.crearProducto({
        nombre: nuevoProducto.trim()
      });

      if (response.success) {
        setNuevoProducto('');
        await cargarProductos();
        alert('Producto creado correctamente');
      } else {
        alert(response.message || 'Error al crear el producto');
      }
    } catch (err: any) {
      console.error('Error creando producto:', err);
      const errorMessage = err.response?.data?.message || 'Error al crear el producto';
      alert(errorMessage);
    } finally {
      setGuardando(false);
    }
  };

  const handleEditarProducto = (producto: Producto) => {
    setEditandoId(producto._id);
    setEditandoNombre(producto.nombre);
  };

  const handleGuardarEdicion = async () => {
    if (!editandoNombre.trim()) {
      alert('Por favor ingresa un nombre para el producto');
      return;
    }

    try {
      setGuardando(true);
      const response = await productosService.actualizarProducto(editandoId!, {
        nombre: editandoNombre.trim()
      });

      if (response.success) {
        setEditandoId(null);
        setEditandoNombre('');
        await cargarProductos();
        alert('Producto actualizado correctamente');
      } else {
        alert(response.message || 'Error al actualizar el producto');
      }
    } catch (err: any) {
      console.error('Error actualizando producto:', err);
      const errorMessage = err.response?.data?.message || 'Error al actualizar el producto';
      alert(errorMessage);
    } finally {
      setGuardando(false);
    }
  };

  const handleEliminarProducto = async (producto: Producto) => {
    if (!confirm(`¿Estás seguro de que quieres eliminar el producto "${producto.nombre}"?`)) {
      return;
    }

    try {
      setGuardando(true);
      const response = await productosService.eliminarProducto(producto._id);

      if (response.success) {
        await cargarProductos();
        alert('Producto eliminado correctamente');
      } else {
        alert(response.message || 'Error al eliminar el producto');
      }
    } catch (err: any) {
      console.error('Error eliminando producto:', err);
      const errorMessage = err.response?.data?.message || 'Error al eliminar el producto';
      alert(errorMessage);
    } finally {
      setGuardando(false);
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
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[80vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Gestión de Productos</h2>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh]">
          {/* Añadir nuevo producto */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Añadir Producto</h3>
            <div className="flex gap-2">
              <input
                type="text"
                value={nuevoProducto}
                onChange={(e) => setNuevoProducto(e.target.value)}
                placeholder="Nombre del producto"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={guardando}
              />
              <button
                onClick={handleCrearProducto}
                disabled={guardando || !nuevoProducto.trim()}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
              >
                {guardando ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                ) : (
                  <>
                    <Plus className="w-4 h-4 mr-2" />
                    Añadir
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Lista de productos */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Productos Existentes</h3>
            
            {loading ? (
              <div className="flex justify-center items-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-gray-600">Cargando productos...</span>
              </div>
            ) : error ? (
              <div className="text-center py-8">
                <div className="text-red-500 text-xl mb-2">⚠️</div>
                <p className="text-red-600">{error}</p>
                <button
                  onClick={cargarProductos}
                  className="mt-2 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  Reintentar
                </button>
              </div>
            ) : productos.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <p>No hay productos creados</p>
              </div>
            ) : (
              <div className="space-y-2">
                {productos.map((producto) => (
                  <div
                    key={producto._id}
                    className="flex items-center justify-between p-3 border border-gray-200 rounded-md hover:bg-gray-50"
                  >
                    {editandoId === producto._id ? (
                      <div className="flex items-center gap-2 flex-1">
                        <input
                          type="text"
                          value={editandoNombre}
                          onChange={(e) => setEditandoNombre(e.target.value)}
                          className="flex-1 px-2 py-1 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          disabled={guardando}
                        />
                        <button
                          onClick={handleGuardarEdicion}
                          disabled={guardando || !editandoNombre.trim()}
                          className="p-1 text-green-600 hover:text-green-700 disabled:text-gray-400"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => {
                            setEditandoId(null);
                            setEditandoNombre('');
                          }}
                          className="p-1 text-gray-600 hover:text-gray-700"
                        >
                          <XIcon className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex-1">
                          <span className="text-gray-900 font-medium">{producto.nombre}</span>
                          {producto.descripcion && (
                            <p className="text-sm text-gray-500">{producto.descripcion}</p>
                          )}
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
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleEliminarProducto(producto)}
                            className="p-1 text-red-600 hover:text-red-700 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
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

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
