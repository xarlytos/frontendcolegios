import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Contact } from '../types';
import { useContacts } from '../hooks/useContacts';
import { useAuth } from '../hooks/useAuth';
import universidadesService, { Universidad } from '../services/universidadesService';

interface ContactFormProps {
  contact?: Contact | null;
  onSubmit: (contact: Omit<Contact, 'id' | 'fecha_alta'>) => void;
  onCancel: () => void;
}

export default function ContactForm({ contact, onSubmit, onCancel }: ContactFormProps) {
  const { checkDuplicates } = useContacts();
  const { users, getAllUsers, user } = useAuth();
  
  const [formData, setFormData] = useState({
    nombre: '',
    nombre_colegio: '',
    telefono: '',
    instagram: '',
    año_nacimiento: null as number | null,
    comercial: ''
  });

  const [colegios, setColegios] = useState<Universidad[]>([]);

  const [errors, setErrors] = useState<Record<string, string>>({});


  // Cargar usuarios comerciales
  useEffect(() => {
    const loadComerciales = async () => {
      try {
        console.log('Cargando usuarios comerciales...');
        await getAllUsers();
        console.log('Usuarios comerciales cargados:', users);
      } catch (error) {
        console.error('Error al cargar usuarios comerciales:', error);
      }
    };

    loadComerciales();
  }, [getAllUsers]);

  // Cargar colegios para el desplegable
  useEffect(() => {
    const loadColegios = async () => {
      try {
        const data = await universidadesService.getUniversidades();
        // Filtrar solo colegios activos
        const activeColegios = (data || []).filter(uni => uni.activa !== false);
        const sorted = activeColegios.slice().sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }));
        setColegios(sorted || []);
      } catch (error) {
        console.error('Error al cargar colegios:', error);
      }
    };
    loadColegios();
  }, []);

  useEffect(() => {
    if (contact) {
      setFormData({
        nombre: contact.nombre,
        nombre_colegio: contact.nombre_colegio,
        telefono: contact.telefono || '',
        instagram: contact.instagram || '',
        año_nacimiento: contact.año_nacimiento || null,
        comercial: contact.comercial_id || ''
      });
    }
  }, [contact]);


  const validatePhone = (phone: string) => {
    if (!phone) return true; // Es opcional
    const phoneRegex = /^[\+]?[0-9\s\-\(\)]{9,15}$/;
    return phoneRegex.test(phone);
  };

  const validateBirthYear = (year: number | null) => {
    if (year === null) return false; // Ahora es obligatorio
    const currentYear = new Date().getFullYear();
    return year >= 1900 && year <= currentYear;
  };

  const validateInstagram = (instagram: string) => {
    if (!instagram) return true; // Es opcional
    // Remover @ si está presente y validar formato
    const cleanInstagram = instagram.replace('@', '');
    const instagramRegex = /^[a-zA-Z0-9._]{1,30}$/;
    return instagramRegex.test(cleanInstagram);
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    // Campos obligatorios
    if (!formData.nombre || !formData.nombre.trim()) {
      newErrors.nombre = 'El nombre es requerido';
    }

    if (!formData.nombre_colegio || !formData.nombre_colegio.trim()) {
      newErrors.nombre_colegio = 'El nombre del colegio es requerido';
    }

    if (formData.año_nacimiento === null || !validateBirthYear(formData.año_nacimiento)) {
      newErrors.año_nacimiento = 'El año de nacimiento es requerido y debe estar entre 1900 y el año actual';
    }

    // Teléfono e Instagram son opcionales

    // Validaciones de formato
    if (formData.telefono && !validatePhone(formData.telefono)) {
      newErrors.telefono = 'El formato del teléfono no es válido';
    }

    if (formData.instagram && !validateInstagram(formData.instagram)) {
      newErrors.instagram = 'El formato del Instagram no es válido (solo letras, números, puntos y guiones bajos, máximo 30 caracteres)';
    }


    // Validación de duplicados
    const duplicates = checkDuplicates(
      formData.telefono || undefined,
      formData.instagram || undefined,
      contact?.id
    );

    if (duplicates.telefono) {
      newErrors.telefono = 'Este número de teléfono ya está registrado';
    }

    if (duplicates.instagram) {
      newErrors.instagram = 'Este Instagram ya está registrado';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      const submitData = {
        nombre: formData.nombre,
        nombre_colegio: formData.nombre_colegio,
        telefono: formData.telefono || undefined,
        instagram: formData.instagram || undefined,
        año_nacimiento: formData.año_nacimiento!,
        comercial: formData.comercial || undefined
      };
      
      console.log('📝 Submitting contact form:', submitData);
      const result = onSubmit(submitData);
      console.log('✅ Contact form submitted successfully:', result);
    }
  };

  const handleChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 w-full max-w-lg max-h-screen overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">
            {contact ? 'Editar Contacto' : 'Nuevo Contacto'}
          </h2>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* 1. Nombre - Obligatorio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre *
            </label>
            <input
              type="text"
              value={formData.nombre}
              onChange={(e) => handleChange('nombre', e.target.value)}
              className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.nombre ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Nombre completo del estudiante"
            />
            {errors.nombre && (
              <p className="text-red-500 text-sm mt-1">{errors.nombre}</p>
            )}
          </div>

          {/* 2. Colegio (desplegable) - Obligatorio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Colegio *
            </label>
            <select
              value={formData.nombre_colegio}
              onChange={(e) => handleChange('nombre_colegio', e.target.value)}
              className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.nombre_colegio ? 'border-red-300' : 'border-gray-300'
              }`}
            >
              <option value="">Selecciona un colegio</option>
              {colegios.map((colegio) => (
                <option key={(colegio as any)._id || colegio.id} value={colegio.nombre}>
                  {colegio.nombre}
                </option>
              ))}
            </select>
            {errors.nombre_colegio && (
              <p className="text-red-500 text-sm mt-1">{errors.nombre_colegio}</p>
            )}
          </div>

          {/* Mensaje de error general para contacto */}
          {errors.contacto && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-4">
              <p className="text-red-600 text-sm">{errors.contacto}</p>
            </div>
          )}

          {/* 4. Número de teléfono - Opcional pero al menos uno requerido */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Número de teléfono <span className="text-gray-500 font-normal">(al menos uno requerido)</span>
            </label>
            <input
              type="tel"
              value={formData.telefono}
              onChange={(e) => handleChange('telefono', e.target.value)}
              className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.telefono ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Ej: 666 123 456"
            />
            {errors.telefono && (
              <p className="text-red-500 text-sm mt-1">{errors.telefono}</p>
            )}
          </div>

          {/* 5. Instagram - Opcional pero al menos uno requerido */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Instagram <span className="text-gray-500 font-normal">(al menos uno requerido)</span>
            </label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-gray-500">@</span>
              <input
                type="text"
                value={formData.instagram}
                onChange={(e) => handleChange('instagram', e.target.value)}
                className={`w-full border rounded-md pl-8 pr-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.instagram ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="usuario_instagram"
                maxLength={30}
              />
            </div>
            {errors.instagram && (
              <p className="text-red-500 text-sm mt-1">{errors.instagram}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Solo letras, números, puntos y guiones bajos. Máximo 30 caracteres.
            </p>
          </div>

          {/* 3. Año de nacimiento - Obligatorio */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Año de nacimiento *
            </label>
            <input
              type="number"
              min="1900"
              max={new Date().getFullYear()}
              value={formData.año_nacimiento || ''}
              onChange={(e) => handleChange('año_nacimiento', e.target.value ? parseInt(e.target.value) : null)}
              className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                errors.año_nacimiento ? 'border-red-300' : 'border-gray-300'
              }`}
              placeholder="Ej: 1995"
            />
            {errors.año_nacimiento && (
              <p className="text-red-500 text-sm mt-1">{errors.año_nacimiento}</p>
            )}
          </div>

          {/* 6. Comercial - Opcional - Solo visible para administradores */}
          {user?.role?.toLowerCase() === 'admin' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Comercial <span className="text-gray-500 font-normal">(opcional)</span>
              </label>
              <select
                value={formData.comercial}
                onChange={(e) => handleChange('comercial', e.target.value)}
                className={`w-full border rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-colors ${
                  errors.comercial ? 'border-red-300' : 'border-gray-300'
                }`}
              >
                <option value="">Selecciona un comercial</option>
                {users.map(user => (
                  <option key={user.id} value={user.id}>
                    {user.nombre} ({user.email})
                  </option>
                ))}
              </select>
              {errors.comercial && (
                <p className="text-red-500 text-sm mt-1">{errors.comercial}</p>
              )}
            </div>
          )}


          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onCancel}
              className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              {contact ? 'Actualizar' : 'Crear'} Contacto
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}