import React, { useState, useMemo, useEffect } from 'react';
import { Search, Plus, Edit, Trash2, Eye, X, Upload, FileText } from 'lucide-react';
import { Contact, ContactFilters } from '../types';
import ContactForm from './ContactForm';
import ContactDetail from './ContactDetail';
import { contactsService } from '../services/contactsService';
import { User } from '../types/auth';
import ExcelImportModal from './ExcelImportModal';
// import { useContacts } from '../hooks/useContacts'; // Removido - usar solo los props del padre
import * as XLSX from 'xlsx';
import universidadesService, { Universidad } from '../services/universidadesService';


interface ContactsPageProps {
  contacts: Contact[];
  onAddContact: (contact: Omit<Contact, 'id' | 'fecha_alta'>) => void;
  onUpdateContact: (id: string, contact: Omit<Contact, 'id' | 'fecha_alta'>) => void;
  onDeleteContact: (id: string) => Promise<void> | void;
  onDeleteMultipleContacts: (ids: string[]) => void;
  onRefreshContacts: () => Promise<void>;
  initialFilters?: Partial<ContactFilters>;
  currentUser: User | null;
  hasPermission: (action: 'view' | 'edit' | 'delete', contactOwnerId?: string) => Promise<boolean> | boolean;
}

export default function ContactsPage({
  contacts: propContacts,
  onAddContact,
  onUpdateContact,
  onDeleteContact,
  onDeleteMultipleContacts,
  onRefreshContacts,
  initialFilters = {},
  currentUser,
  hasPermission
}: ContactsPageProps) {
  // Removido el hook useContacts para evitar duplicación de estado
  // Ahora usamos solo los contacts que vienen por props desde App.tsx
  
  const [filters, setFilters] = useState<ContactFilters>({
    nombre_colegio: initialFilters.nombre_colegio || '',
    search: initialFilters.search || '',
    aportado_por: '',
    consentimiento: ''
  });
  
  // Removido el estado local de contactos ya que ahora usamos solo propContacts
  
  // Efecto para detectar cambios en propContacts
  useEffect(() => {
    console.log('🔄 propContacts changed! New length:', propContacts.length);
    console.log('📋 First 3 contacts after change:', propContacts.slice(0, 3).map(c => c.nombre));
  }, [propContacts]);
  
  
  const [showForm, setShowForm] = useState(false);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [viewingContact, setViewingContact] = useState<Contact | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedContacts, setSelectedContacts] = useState<Set<string>>(new Set());
  const [showImportModal, setShowImportModal] = useState(false);
  const contactsPerPage = 10;
  const [colegios, setColegios] = useState<Universidad[]>([]);
  
  // Hook de permisos
  // Estado para manejar permisos de eliminación
  const [canDelete, setCanDelete] = useState(false);
  
  // Verificar permisos de eliminación cuando cambie el usuario
  useEffect(() => {
    const checkDeletePermission = async () => {
      console.log('🔍 ContactsPage: Verificando permisos de eliminación...');
      console.log('👤 ContactsPage: currentUser:', currentUser);
      console.log('🎭 ContactsPage: currentUser role:', currentUser?.role);
      
      if (currentUser?.role?.toLowerCase() === 'admin') {
        console.log('✅ ContactsPage: Usuario es admin, estableciendo canDelete = true');
        setCanDelete(true);
      } else {
        console.log('🔄 ContactsPage: Llamando hasPermission("delete")...');
        const result = await hasPermission('delete');
        console.log('📋 ContactsPage: Resultado de hasPermission("delete"):', result);
        setCanDelete(result);
        console.log('🎯 ContactsPage: Estado canDelete actualizado a:', result);
      }
    };
    
    checkDeletePermission();
  }, [currentUser, hasPermission]);

  // Cargar colegios desde backend para filtros
  useEffect(() => {
    const loadColegios = async () => {
      try {
        const data = await universidadesService.getUniversidades();
        // Filtrar solo colegios activos
        const activeColegios = (data || []).filter(uni => uni.activa !== false);
        const sorted = activeColegios.slice().sort((a, b) => (a.nombre || '').localeCompare(b.nombre || '', 'es', { sensitivity: 'base' }));
        setColegios(sorted);
      } catch (error) {
        console.error('Error cargando colegios para filtros:', error);
      }
    };
    loadColegios();
  }, []);
  
  // Usar directamente los contactos que vienen por props
  const contacts = propContacts;
  console.log('📊 Using contacts from props:', contacts.length);
      
  console.log('📊 ContactsPage - Final contacts to display:', contacts.length, contacts);

  // Removido el efecto de carga automática de contactos comerciales
  // ya que ahora todos los contactos vienen filtrados desde App.tsx


  const filteredContacts = useMemo(() => {
    console.log('🔍 ContactsPage - Current filters:', filters);
    console.log('📊 ContactsPage - Total contacts before filtering:', contacts.length);
    
    const filtered = contacts.filter(contact => {
      const matchesSearch = filters.search === '' || 
        contact.nombre.toLowerCase().includes(filters.search.toLowerCase()) ||
        (contact.telefono && contact.telefono.includes(filters.search));
      
      const matchesColegio = filters.nombre_colegio === '' || contact.nombre_colegio === filters.nombre_colegio;
      
      return matchesSearch && matchesColegio;
    });
    
    console.log('✅ ContactsPage - Contacts after filtering:', filtered.length);
    return filtered;
  }, [contacts, filters]);

  const paginatedContacts = useMemo(() => {
    const startIndex = (currentPage - 1) * contactsPerPage;
    const paginated = filteredContacts.slice(startIndex, startIndex + contactsPerPage);
    
    console.log('📊 ContactsPage - Contacts received as props:', contacts.length, contacts);
    console.log('🔍 ContactsPage - Filtered contacts:', filteredContacts.length, filteredContacts);
    console.log('📄 ContactsPage - Paginated contacts for rendering:', paginated.length, paginated);
    
    return paginated;
  }, [filteredContacts, currentPage, contacts]);

  const totalPages = Math.ceil(filteredContacts.length / contactsPerPage);

  const handleFilterChange = (key: keyof ContactFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setCurrentPage(1);
  };

  const clearFilters = () => {
    setFilters({
      nombre_colegio: '',
      search: '',
      aportado_por: '',
      consentimiento: ''
    });
    setCurrentPage(1);
  };

  const handleEdit = (contact: Contact) => {
    setEditingContact(contact);
    setShowForm(true);
  };

  const handleFormSubmit = async (contactData: Omit<Contact, 'id' | 'fecha_alta'>) => {
    console.log('📋 ContactsPage: Handling form submit', contactData);
    try {
      if (editingContact) {
        console.log('✏️ Updating existing contact:', editingContact.id);
        await onUpdateContact(editingContact.id, contactData);
      } else {
        console.log('➕ Adding new contact', contactData);
        console.log('🔍 onAddContact function:', onAddContact);
        console.log('👤 currentUser:', currentUser);
        const result = await onAddContact(contactData);
        console.log('📤 onAddContact result:', result);
      }
      
      // Refrescar la lista de contactos después de crear/editar
      console.log('🔄 Refrescando lista de contactos...');
      await onRefreshContacts();
      
      setShowForm(false);
      setEditingContact(null);
      console.log('✅ Form submission completed and list refreshed');
    } catch (error) {
      console.error('❌ Error in form submission:', error);
    }
  };

  // Nuevas funciones para manejar selección
  const handleSelectContact = (contactId: string) => {
    const newSelected = new Set(selectedContacts);
    if (newSelected.has(contactId)) {
      newSelected.delete(contactId);
    } else {
      newSelected.add(contactId);
    }
    setSelectedContacts(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedContacts.size === paginatedContacts.length) {
      setSelectedContacts(new Set());
    } else {
      setSelectedContacts(new Set(paginatedContacts.map(contact => contact.id)));
    }
  };

  const handleImportContacts = async () => {
    // La importación se maneja directamente en el modal
    // Este callback se ejecuta después de una importación exitosa
    console.log('Importación completada, refrescando lista de contactos...');
    try {
      await onRefreshContacts();
      console.log('✅ Lista de contactos actualizada exitosamente');
    } catch (error) {
      console.error('❌ Error al actualizar la lista de contactos:', error);
    }
  };

  const handleExportExcel = () => {
    const selectedContactsData = contacts.filter(contact => selectedContacts.has(contact.id));
    if (selectedContactsData.length === 0) {
      alert('Por favor, selecciona al menos un contacto para exportar');
      return;
    }
  
    try {
      // Preparar los datos para el Excel - incluyendo el nuevo campo
      const excelData = selectedContactsData.map(contact => ({
        'Nombre': contact.nombre || '',
        'Colegio': contact.nombre_colegio || '',
        'Teléfono': contact.telefono || '',
        'Instagram': contact.instagram || '',
        'Año de Nacimiento': contact.año_nacimiento || '',
        'Comercial': contact.comercial_nombre || ''
      }));
  
      // Crear el libro de trabajo
      const worksheet = XLSX.utils.json_to_sheet(excelData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, 'Contactos');
  
      // Ajustar el ancho de las columnas para los 6 campos
      const columnWidths = [
        { wch: 20 }, // Nombre
        { wch: 25 }, // Colegio
        { wch: 15 }, // Teléfono
        { wch: 15 }, // Instagram
        { wch: 15 }, // Año de Nacimiento
        { wch: 20 }  // Comercial
      ];
      worksheet['!cols'] = columnWidths;
  
      // Generar el nombre del archivo con fecha y hora
      const now = new Date();
      const timestamp = now.toISOString().slice(0, 19).replace(/[T:]/g, '-');
      const fileName = `contactos-exportados-${timestamp}.xlsx`;
  
      // Descargar el archivo
      XLSX.writeFile(workbook, fileName);
      
      console.log(`✅ Exportados ${selectedContactsData.length} contactos a Excel`);
    } catch (error) {
      console.error('❌ Error al exportar contactos:', error);
      alert('Error al exportar los contactos. Por favor, inténtalo de nuevo.');
    }
  };

  // Nueva función para manejar eliminación múltiple
  const handleDeleteSelected = async () => {
    try {
      const selectedIds = Array.from(selectedContacts);
      await onDeleteMultipleContacts(selectedIds);
      setSelectedContacts(new Set()); // Limpiar selección después de eliminar
      
      // Refrescar la lista de contactos después de eliminar
      console.log('🔄 Refrescando lista después de eliminación múltiple...');
      await onRefreshContacts();
    } catch (error) {
      console.error('❌ Error al eliminar contactos:', error);
    }
  };

  // Removida la función handleLoadComercialContacts ya que los contactos
  // ahora vienen filtrados desde App.tsx

  // Debug: Mostrar estado actual antes del render
  console.log('🎨 ContactsPage RENDER: canDelete =', canDelete);
  console.log('📋 ContactsPage RENDER: selectedContacts.size =', selectedContacts.size);
  console.log('🔍 ContactsPage RENDER: Condición para mostrar botón eliminar:', selectedContacts.size > 0 && canDelete);

  return (
    <div className="p-6">
      {/* Header con botones principales */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contactos</h1>
        </div>
        <div className="flex flex-wrap gap-3">
          {selectedContacts.size > 0 && canDelete && (
            <>
              <button
                onClick={handleDeleteSelected}
                className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Eliminar ({selectedContacts.size})
              </button>
              {currentUser?.role?.toLowerCase() === 'admin' && (
                <button
                  onClick={handleExportExcel}
                  className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                >
                  <FileText className="w-4 h-4 mr-2" />
                  Exportar Excel ({selectedContacts.size})
                </button>
              )}
            </>
          )}
          {currentUser?.role?.toLowerCase() === 'admin' && (
            <button
              onClick={() => setShowImportModal(true)}
              className="bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 transition-colors flex items-center"
            >
              <Upload className="w-4 h-4 mr-2" />
              Importar Excel
            </button>
          )}

          <button
            onClick={() => setShowForm(true)}
            className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors flex items-center"
          >
            <Plus className="w-4 h-4 mr-2" />
            Nuevo Contacto
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 mb-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-medium text-gray-900">Filtros</h3>
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
          >
            <X className="w-4 h-4 mr-1" />
            Limpiar filtros
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Colegio
            </label>
            <select
              value={filters.nombre_colegio}
              onChange={(e) => handleFilterChange('nombre_colegio', e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Todos</option>
              {colegios.map(colegio => (
                <option key={(colegio as any)._id || colegio.id} value={colegio.nombre}>{colegio.nombre}</option>
              ))}
            </select>
          </div>
        </div>
        
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre o teléfono..."
            value={filters.search}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Tabla de contactos */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <input
                    type="checkbox"
                    checked={selectedContacts.size === paginatedContacts.length && paginatedContacts.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nombre
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Colegio
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Teléfono
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Instagram
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Año Nacimiento
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Comercial
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha Alta
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {paginatedContacts.map((contact, index) => (
                <tr 
                  key={contact.id} 
                  className={`${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${selectedContacts.has(contact.id) ? 'bg-blue-50' : ''}`}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <input
                      type="checkbox"
                      checked={selectedContacts.has(contact.id)}
                      onChange={() => handleSelectContact(contact.id)}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {contact.nombre}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contact.nombre_colegio || (contact as any).universidad || (contact as any).nombreColegio || 'N/D'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contact.telefono || 'N/D'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contact.instagram ? (
                      <a 
                        href={`https://instagram.com/${contact.instagram.replace('@', '')}`} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800"
                      >
                        @{contact.instagram.replace('@', '')}
                      </a>
                    ) : 'N/D'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contact.año_nacimiento || 'N/D'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {contact.comercial_nombre || 'Sin asignar'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {new Date(contact.fecha_alta).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setViewingContact(contact)}
                        className="text-blue-600 hover:text-blue-700"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleEdit(contact)}
                        className="text-green-600 hover:text-green-700"
                        disabled={!hasPermission('edit', contact.comercial_id)}
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      {canDelete && (
                        <button
                          onClick={async () => {
                            try {
                              console.log('🗑️ Eliminando contacto:', contact.id);
                              const result = await onDeleteContact(contact.id);
                              console.log('📥 Delete result:', result);
                              
                              // Dar tiempo para que el estado se actualice
                              setTimeout(() => {
                                console.log('✅ Contacto eliminado y lista actualizada');
                              }, 100);
                            } catch (error) {
                              console.error('❌ Error al eliminar contacto:', error);
                            }
                          }}
                          className="text-red-600 hover:text-red-700"
                          disabled={!hasPermission('edit', contact.comercial_id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="bg-white px-4 py-3 border-t border-gray-200 sm:px-6">
            <div className="flex items-center justify-between">
              <div className="flex-1 flex justify-between sm:hidden">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Siguiente
                </button>
              </div>
              <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                <div className="flex items-center space-x-4">
                  <p className="text-sm text-gray-700">
                    Mostrando{' '}
                    <span className="font-medium">{(currentPage - 1) * contactsPerPage + 1}</span>{' '}
                    a{' '}
                    <span className="font-medium">
                      {Math.min(currentPage * contactsPerPage, filteredContacts.length)}
                    </span>{' '}
                    de{' '}
                    <span className="font-medium">{filteredContacts.length}</span> resultados
                  </p>
                  
                  {/* Input para saltar a página específica */}
                  {totalPages > 10 && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-700">Ir a página:</span>
                      <input
                        type="number"
                        min="1"
                        max={totalPages}
                        value={currentPage}
                        onChange={(e) => {
                          const page = parseInt(e.target.value);
                          if (page >= 1 && page <= totalPages) {
                            setCurrentPage(page);
                          }
                        }}
                        className="w-16 px-2 py-1 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                      <span className="text-sm text-gray-500">de {totalPages}</span>
                    </div>
                  )}
                </div>
                <div>
                  <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                      <button
                        onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                        disabled={currentPage === 1}
                        className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Anterior
                      </button>
                      {/* Paginación inteligente */}
                      {(() => {
                        const maxVisiblePages = 7; // Máximo de páginas visibles
                        const halfVisible = Math.floor(maxVisiblePages / 2);
                        let startPage = Math.max(1, currentPage - halfVisible);
                        let endPage = Math.min(totalPages, startPage + maxVisiblePages - 1);
                        
                        // Ajustar si estamos cerca del final
                        if (endPage - startPage < maxVisiblePages - 1) {
                          startPage = Math.max(1, endPage - maxVisiblePages + 1);
                        }
                        
                        const pages = [];
                        
                        // Botón "Primera página" si no estamos cerca del inicio
                        if (startPage > 1) {
                          pages.push(
                            <button
                              key="first"
                              onClick={() => setCurrentPage(1)}
                              className="relative inline-flex items-center px-4 py-2 border text-sm font-medium bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                            >
                              1
                            </button>
                          );
                          if (startPage > 2) {
                            pages.push(
                              <span key="ellipsis1" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                ...
                              </span>
                            );
                          }
                        }
                        
                        // Páginas visibles
                        for (let page = startPage; page <= endPage; page++) {
                          pages.push(
                            <button
                              key={page}
                              onClick={() => setCurrentPage(page)}
                              className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                                page === currentPage
                                  ? 'z-10 bg-blue-500 border-blue-500 text-white'
                                  : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                              }`}
                            >
                              {page}
                            </button>
                          );
                        }
                        
                        // Botón "Última página" si no estamos cerca del final
                        if (endPage < totalPages) {
                          if (endPage < totalPages - 1) {
                            pages.push(
                              <span key="ellipsis2" className="relative inline-flex items-center px-4 py-2 border border-gray-300 bg-white text-sm font-medium text-gray-700">
                                ...
                              </span>
                            );
                          }
                          pages.push(
                            <button
                              key="last"
                              onClick={() => setCurrentPage(totalPages)}
                              className="relative inline-flex items-center px-4 py-2 border text-sm font-medium bg-white border-gray-300 text-gray-500 hover:bg-gray-50"
                            >
                              {totalPages}
                            </button>
                          );
                        }
                        
                        return pages;
                      })()}
                      <button
                        onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                        disabled={currentPage === totalPages}
                        className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        Siguiente
                      </button>
                    </nav>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modals */}
        {showForm && (
          <ContactForm
            contact={editingContact}
            onSubmit={handleFormSubmit}
            onCancel={() => {
              setShowForm(false);
              setEditingContact(null);
            }}
          />
        )}

        {viewingContact && (
          <ContactDetail
            contact={viewingContact}
            onClose={() => setViewingContact(null)}
            onEdit={() => {
              setEditingContact(viewingContact);
              setShowForm(true);
              setViewingContact(null);
            }}
          />
        )}

        {showImportModal && (
          <ExcelImportModal
            isOpen={showImportModal}
            onClose={() => setShowImportModal(false)}
            onImport={handleImportContacts}
            existingContacts={contacts}
          />
        )}
      </div>
    );
}