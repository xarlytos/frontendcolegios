import { useState } from 'react';
import { X, Users, Phone, Instagram, Calendar, User } from 'lucide-react';
import { Contacto } from '../services/graduacionesService';

interface ContactosModalProps {
  isOpen: boolean;
  onClose: () => void;
  contactos: Contacto[];
  nombreColegio: string;
}

export default function ContactosModal({ isOpen, onClose, contactos, nombreColegio }: ContactosModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col">
        {/* Header - Fijo */}
        <div className="bg-gradient-to-r from-blue-700 to-blue-800 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <div className="flex items-center">
            <Users className="w-6 h-6 text-white mr-3" />
            <div>
              <h2 className="text-white text-xl font-bold">Contactos</h2>
              <p className="text-blue-100 text-sm">{nombreColegio}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:text-blue-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content - Scrollable */}
        <div className="flex-1 overflow-hidden flex flex-col">
          {contactos.length === 0 ? (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center py-8">
                <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <p className="text-gray-500">No hay contactos disponibles</p>
              </div>
            </div>
          ) : (
            <div className="flex-1 overflow-hidden">
              {/* Table Header - Fijo */}
              <div className="bg-gray-50 px-4 py-3 border-b border-gray-200 flex-shrink-0">
                <div className="grid grid-cols-12 gap-4 text-sm font-medium text-gray-700">
                  <div className="col-span-3">Nombre Completo</div>
                  <div className="col-span-2">Teléfono</div>
                  <div className="col-span-2">Instagram</div>
                  <div className="col-span-2">Año Nacimiento</div>
                  <div className="col-span-2">Comercial</div>
                  <div className="col-span-1">Fecha Alta</div>
                </div>
              </div>
              
              {/* Table Body - Scrollable */}
              <div className="overflow-y-auto max-h-[calc(90vh-200px)]">
                <div className="divide-y divide-gray-200">
                  {contactos.map((contacto) => (
                    <div key={contacto.id} className="px-4 py-4 hover:bg-gray-50 transition-colors">
                      <div className="grid grid-cols-12 gap-4 items-center text-sm">
                        <div className="col-span-3">
                          <div className="font-medium text-gray-900 flex items-center">
                            <User className="w-4 h-4 mr-2 text-gray-400" />
                            {contacto.nombreCompleto}
                          </div>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600 flex items-center">
                            <Phone className="w-4 h-4 mr-1 text-gray-400" />
                            {contacto.telefono || '-'}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600 flex items-center">
                            <Instagram className="w-4 h-4 mr-1 text-gray-400" />
                            {contacto.instagram ? `@${contacto.instagram}` : '-'}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            <Calendar className="w-3 h-3 mr-1" />
                            {contacto.anioNacimiento}
                          </span>
                        </div>
                        <div className="col-span-2">
                          <span className="text-gray-600">
                            {contacto.comercialNombre || 'Sin asignar'}
                          </span>
                        </div>
                        <div className="col-span-1">
                          <span className="text-gray-500 text-xs">
                            {new Date(contacto.fechaAlta).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer - Fijo */}
        <div className="bg-gray-50 px-6 py-4 border-t border-gray-200 flex justify-between items-center flex-shrink-0">
          <div className="text-sm text-gray-600">
            Total: {contactos.length} contacto{contactos.length !== 1 ? 's' : ''}
          </div>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
