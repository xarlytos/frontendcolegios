import React, { useState, useRef, useCallback, useEffect } from 'react';
import { X, Upload, FileSpreadsheet, AlertTriangle, Check, Trash2 } from 'lucide-react';
import { Contact } from '../types';
import { User } from '../types/auth';
import { usersService } from '../services/usersService';
import { contactsService } from '../services/contactsService';
import * as XLSX from 'xlsx';

interface ExcelImportModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: () => void;
  existingContacts: Contact[];
}

interface ExcelRow {
  [key: string]: string | number | boolean | null | undefined;
}

interface MappedContact {
  rowIndex: number;
  data: Partial<Contact>;
  errors: string[];
  isValid: boolean;
  isDuplicate: boolean;
  duplicateFields: string[];
}

interface ColumnMapping {
  [excelColumn: string]: keyof Contact | '';
}

const CONTACT_FIELDS = {
  nombre: 'Nombre Completo',
  telefono: 'Teléfono',
  instagram: 'Instagram',
  nombre_colegio: 'Nombre del Colegio',
  año_nacimiento: 'Año de Nacimiento',
  comercial: 'Comercial'
};

export default function ExcelImportModal({ isOpen, onClose, onImport, existingContacts }: ExcelImportModalProps) {
  const [step, setStep] = useState<'upload' | 'preview' | 'mapping' | 'validation'>('upload');
  const [excelData, setExcelData] = useState<ExcelRow[]>([]);
  const [excelColumns, setExcelColumns] = useState<string[]>([]);
  const [columnMapping, setColumnMapping] = useState<ColumnMapping>({});
  const [mappedContacts, setMappedContacts] = useState<MappedContact[]>([]);
  const [fileName, setFileName] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [comerciales, setComercialesUsuarios] = useState<User[]>([]);
  const [colegios, setColegios] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Cargar usuarios comerciales cuando el modal se abra
  useEffect(() => {
    if (isOpen) {
      const loadData = async () => {
        try {
          // Cargar usuarios comerciales
          const usersResponse = await usersService.getUsers({ rol: 'COMERCIAL' });
          console.log('Datos de usuarios cargados:', usersResponse);
          console.log('Usuarios obtenidos:', usersResponse.data?.usuarios);
          
          // Filtrar solo comerciales activos
          const comercialesActivos = usersResponse.data?.usuarios?.filter((user: any) => 
            user.rol === 'COMERCIAL' && user.estado === 'ACTIVO'
          ) || [];
          setComercialesUsuarios(comercialesActivos);
          console.log('Comerciales activos:', comercialesActivos);

          // Cargar colegios únicos de los contactos existentes
          const colegiosUnicos = [...new Set(existingContacts.map(contact => contact.nombre_colegio))].sort();
          setColegios(colegiosUnicos);
          console.log('Colegios disponibles:', colegiosUnicos);
        } catch (error) {
          console.error('Error al cargar datos:', error);
        }
      };
      loadData();
    }
  }, [isOpen]);

  const resetModal = () => {
    setStep('upload');
    setExcelData([]);
    setExcelColumns([]);
    setColumnMapping({});
    setMappedContacts([]);
    setFileName('');
    setIsProcessing(false);
  };

  const handleFileUpload = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    setIsProcessing(true);

    const reader = new FileReader();
    // En la función handleFileUpload, reemplaza la simulación con:
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet) as ExcelRow[];
        
        console.log('Datos del Excel cargados:', jsonData);
        console.log('Número de filas:', jsonData.length);
        
        const columns = Object.keys(jsonData[0] || {});
        setExcelData(jsonData);
        setExcelColumns(columns);
        setStep('preview');
      } catch {
        alert('Error al leer el archivo Excel. Asegúrate de que sea un archivo válido.');
      } finally {
        setIsProcessing(false);
      }
    };
    reader.readAsArrayBuffer(file);
  }, []);

  const handleColumnMapping = (excelColumn: string, contactField: keyof Contact | '') => {
    setColumnMapping(prev => ({
      ...prev,
      [excelColumn]: contactField
    }));
  };

  const validateAndMapContacts = () => {
    const mapped: MappedContact[] = [];
    
    excelData.forEach((row, index) => {
      const contactData: Partial<Contact> = {};
      const errors: string[] = [];
      let isDuplicate = false;
      const duplicateFields: string[] = [];

      // Mapear los datos del Excel a los campos de contacto
      Object.entries(columnMapping).forEach(([excelCol, contactField]) => {
        if (contactField && row[excelCol] !== undefined) {
          const value = row[excelCol];
          
          switch (contactField) {
            case 'año_nacimiento': {
              const numValue = parseInt(value as string);
              if (!isNaN(numValue)) {
                contactData[contactField] = numValue;
              }
              break;
            }
            case 'telefono':
              contactData[contactField] = value?.toString().trim();
              break;
            case 'instagram': {
              let instagram = value?.toString().trim();
              if (instagram && !instagram.startsWith('@')) {
                instagram = instagram.replace(/^@/, '');
              }
              contactData[contactField] = instagram;
              break;
            }
            case 'nombre_colegio': {
              const colegioValue = value?.toString().trim();
              // Buscar colegio por nombre exacto
              const colegioEncontrado = colegios.find(c => 
                c.toLowerCase() === colegioValue?.toLowerCase()
              );
              // Solo asignar si encuentra coincidencia, sino dejar vacío para forzar selección
              contactData[contactField] = colegioEncontrado || '';
              break;
            }
            case 'comercial': {
              const comercialValue = value?.toString().trim();
              // Buscar comercial por nombre exacto
              const comercialEncontrado = comerciales.find(c => 
                c.nombre.toLowerCase() === comercialValue?.toLowerCase()
              );
              // Solo asignar si encuentra coincidencia, sino dejar vacío para selección manual
              contactData[contactField] = comercialEncontrado ? comercialEncontrado.nombre : '';
              // Guardar también el ID del comercial
              if (comercialEncontrado) {
                (contactData as any).comercialId = comercialEncontrado.id;
              }
              break;
            }
            default:
              contactData[contactField] = value?.toString().trim();
          }
        }
      });

      // Validaciones obligatorias
      if (!contactData.nombre) {
        errors.push('El nombre es obligatorio');
      }
      if (!contactData.nombre_colegio) {
        errors.push('El nombre del colegio es obligatorio');
      }
      if (!contactData.telefono && !contactData.instagram) {
        errors.push('Se requiere al menos teléfono o Instagram');
      }

      // Verificar duplicados
      if (contactData.telefono) {
        const phoneExists = existingContacts.some(c => c.telefono === contactData.telefono) ||
                           mapped.some(m => m.data.telefono === contactData.telefono);
        if (phoneExists) {
          isDuplicate = true;
          duplicateFields.push('telefono');
          errors.push('El teléfono ya está registrado');
        }
      }

      if (contactData.instagram) {
        const instagramExists = existingContacts.some(c => c.instagram === contactData.instagram) ||
                               mapped.some(m => m.data.instagram === contactData.instagram);
        if (instagramExists) {
          isDuplicate = true;
          duplicateFields.push('instagram');
          errors.push('El Instagram ya está registrado');
        }
      }

      mapped.push({
        rowIndex: index,
        data: contactData,
        errors,
        isValid: errors.length === 0,
        isDuplicate,
        duplicateFields
      });
    });

    setMappedContacts(mapped);
    setStep('validation');
  };

  const handleEditContact = (index: number, field: keyof Contact, value: string | number) => {
    setMappedContacts(prev => {
      const updated = [...prev];
      updated[index] = {
        ...updated[index],
        data: {
          ...updated[index].data,
          [field]: value
        }
      };
      
      // Re-validar la fila editada
      const contact = updated[index];
      const errors: string[] = [];
      let isDuplicate = false;
      const duplicateFields: string[] = [];

      // Validaciones básicas para colegios
      if (!contact.data.nombre) errors.push('El nombre es obligatorio');
      if (!contact.data.nombre_colegio) errors.push('El nombre del colegio es obligatorio');
      if (!contact.data.telefono && !contact.data.instagram) {
        errors.push('Se requiere al menos teléfono o Instagram');
      }

      // Verificar duplicados
      if (contact.data.telefono) {
        const phoneExists = existingContacts.some(c => c.telefono === contact.data.telefono) ||
                           updated.some((m, i) => i !== index && m.data.telefono === contact.data.telefono);
        if (phoneExists) {
          isDuplicate = true;
          duplicateFields.push('telefono');
          errors.push('El teléfono ya está registrado');
        }
      }

      if (contact.data.instagram) {
        const instagramExists = existingContacts.some(c => c.instagram === contact.data.instagram) ||
                               updated.some((m, i) => i !== index && m.data.instagram === contact.data.instagram);
        if (instagramExists) {
          isDuplicate = true;
          duplicateFields.push('instagram');
          errors.push('El Instagram ya está registrado');
        }
      }

      updated[index] = {
        ...updated[index],
        errors,
        isValid: errors.length === 0,
        isDuplicate,
        duplicateFields
      };

      return updated;
    });
  };

  const handleRemoveContact = (index: number) => {
    setMappedContacts(prev => prev.filter((_, i) => i !== index));
  };

  const handleConfirmImport = async () => {
    // Agregar logs para contactos inválidos ANTES de filtrar
    console.log('🔍 ANÁLISIS DE CONTACTOS ANTES DE IMPORTAR:');
    console.log('📊 Total de contactos mapeados:', mappedContacts.length);
    
    const invalidContacts = mappedContacts.filter(contact => !contact.isValid);
    const validContacts = mappedContacts.filter(contact => contact.isValid);
    
    // Guardar el número de contactos válidos para usar en el mensaje de éxito
    const numeroContactosValidos = validContacts.length;
    
    console.log('✅ Contactos válidos:', numeroContactosValidos);
    console.log('❌ Contactos inválidos:', invalidContacts.length);
    
    // Mostrar detalles de contactos inválidos
    if (invalidContacts.length > 0) {
      console.log('🚨 DETALLES DE CONTACTOS INVÁLIDOS:');
      invalidContacts.forEach((contact, index) => {
        console.log(`❌ Contacto inválido ${index + 1} (Fila ${contact.rowIndex + 1}):`, {
          datos: contact.data,
          errores: contact.errors,
          esDuplicado: contact.isDuplicate,
          camposDuplicados: contact.duplicateFields
        });
      });
    }
    
    const mappedValidContacts = validContacts.map(contact => {
      const contactData = contact.data as any;
      
      // Log de depuración para ver los datos originales
      console.log('📋 Datos originales del contacto:', {
        nombre: contactData.nombre,
        universidad: contactData.universidad,
        universidadId: contactData.universidadId,
        titulacion: contactData.titulacion,
        titulacionId: contactData.titulacionId,
        comercial: contactData.comercial,
        comercialId: contactData.comercialId
      });
      
      // Mapear los datos del frontend al formato esperado por el backend para colegios
      const mappedContact = {
        nombreCompleto: contactData.nombre,
        telefono: contactData.telefono,
        instagram: contactData.instagram,
        nombreColegio: contactData.nombre_colegio,
        anioNacimiento: contactData.año_nacimiento,
        comercialId: contactData.comercialId || null
      };
      
      // Log de depuración para ver los datos mapeados
      console.log('🔄 Datos mapeados para envío:', mappedContact);
      
      return mappedContact;
    });
    
    // Log de depuración para ver todos los contactos que se van a enviar
    console.log('📤 Enviando contactos al backend:', mappedValidContacts);
    
    try {
      setIsProcessing(true);
      const response = await contactsService.importarContactos(mappedValidContacts);
      console.log('✅ Importación exitosa:', response);
      
      // Mostrar detalles de la respuesta del backend
      console.log('📋 RESPUESTA COMPLETA DEL BACKEND:', response);
      
      // Mostrar mensaje de éxito
      // Usar el número de contactos válidos que se enviaron
      alert(`Se importaron ${numeroContactosValidos} contactos exitosamente.`);
      
      // Llamar al callback para refrescar la lista
      onImport();
      resetModal();
      onClose();
    } catch (error: any) {
      console.error('💥 Error al importar contactos:', error);
      console.error('💥 Detalles del error:', {
        message: error?.message,
        stack: error?.stack,
        response: error?.response?.data
      });
      alert('Error al importar contactos. Por favor, inténtalo de nuevo.');
    } finally {
      setIsProcessing(false);
    }
  };

  const hasErrors = mappedContacts.some(contact => !contact.isValid);
  const validContactsCount = mappedContacts.filter(contact => contact.isValid).length;

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-6xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex justify-between items-center p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">
            Importar Contactos desde Excel
          </h2>
          <button
            onClick={() => {
              resetModal();
              onClose();
            }}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Step 1: Upload */}
          {step === 'upload' && (
            <div className="text-center">
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-12">
                <FileSpreadsheet className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Selecciona un archivo Excel
                </h3>
                <p className="text-gray-500 mb-6">
                  Sube un archivo .xlsx o .xls con los datos de contactos
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx,.xls"
                  onChange={handleFileUpload}
                  className="hidden"
                />
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessing}
                  className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
                >
                  {isProcessing ? (
                    <div className="flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Procesando...
                    </div>
                  ) : (
                    <div className="flex items-center">
                      <Upload className="w-4 h-4 mr-2" />
                      Seleccionar Archivo
                    </div>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Preview */}
          {step === 'preview' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Vista previa del archivo: {fileName}
                </h3>
                <p className="text-gray-500">
                  Se encontraron {excelData.length} filas de datos
                </p>
              </div>
              
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-6">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        {excelColumns.map((column) => (
                          <th key={column} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {column}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {excelData.slice(0, 5).map((row, index) => (
                        <tr key={index}>
                          {excelColumns.map((column) => (
                            <td key={column} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {row[column]}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {excelData.length > 5 && (
                  <div className="bg-gray-50 px-6 py-3 text-sm text-gray-500">
                    ... y {excelData.length - 5} filas más
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setStep('upload')}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Cambiar Archivo
                </button>
                <button
                  onClick={() => setStep('mapping')}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Continuar
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Column Mapping */}
          {step === 'mapping' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Asignación de Columnas
                </h3>
                <p className="text-gray-500">
                  Mapea las columnas del Excel a los campos de contacto
                </p>
              </div>

              <div className="space-y-4 mb-6">
                {excelColumns.map((column) => (
                  <div key={column} className="flex items-center space-x-4">
                    <div className="w-1/3">
                      <label className="block text-sm font-medium text-gray-700">
                        {column}
                      </label>
                      <div className="text-xs text-gray-500">
                        Ejemplo: {excelData[0]?.[column]}
                      </div>
                    </div>
                    <div className="w-8 text-center text-gray-400">→</div>
                    <div className="w-1/3">
                      <select
                        value={columnMapping[column] || ''}
                        onChange={(e) => handleColumnMapping(column, e.target.value as keyof Contact)}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">-- No mapear --</option>
                        {Object.entries(CONTACT_FIELDS).map(([field, label]) => (
                          <option key={field} value={field}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setStep('preview')}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Atrás
                </button>
                <button
                  onClick={validateAndMapContacts}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Validar Datos
                </button>
              </div>
            </div>
          )}

          {/* Step 4: Validation */}
          {step === 'validation' && (
            <div>
              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  Validación de Datos
                </h3>
                <div className="flex items-center space-x-4 text-sm">
                  <span className="text-green-600">
                    <Check className="w-4 h-4 inline mr-1" />
                    {validContactsCount} válidos
                  </span>
                  {hasErrors && (
                    <span className="text-red-600">
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      {mappedContacts.length - validContactsCount} con errores
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                {mappedContacts.map((contact, index) => (
                  <div
                    key={index}
                    className={`border rounded-lg p-4 ${
                      contact.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
                    }`}
                  >
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center space-x-2">
                        <span className="text-sm font-medium text-gray-700">
                          Fila {contact.rowIndex + 1}
                        </span>
                        {contact.isValid ? (
                          <Check className="w-4 h-4 text-green-600" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-red-600" />
                        )}
                      </div>
                      <button
                        onClick={() => handleRemoveContact(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4 mb-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Nombre *
                        </label>
                        <input
                          type="text"
                          value={contact.data.nombre || ''}
                          onChange={(e) => handleEditContact(index, 'nombre', e.target.value)}
                          className={`w-full text-sm border rounded px-2 py-1 ${
                            contact.duplicateFields.includes('nombre') ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Teléfono
                        </label>
                        <input
                          type="text"
                          value={contact.data.telefono || ''}
                          onChange={(e) => handleEditContact(index, 'telefono', e.target.value)}
                          className={`w-full text-sm border rounded px-2 py-1 ${
                            contact.duplicateFields.includes('telefono') ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Instagram
                        </label>
                        <input
                          type="text"
                          value={contact.data.instagram || ''}
                          onChange={(e) => handleEditContact(index, 'instagram', e.target.value)}
                          className={`w-full text-sm border rounded px-2 py-1 ${
                            contact.duplicateFields.includes('instagram') ? 'border-red-300' : 'border-gray-300'
                          }`}
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Nombre del Colegio *
                        </label>
                        {(() => {
                          const colegioValue = contact.data.nombre_colegio?.toString().trim();
                          const colegioEncontrado = colegios.find(c => 
                            c.toLowerCase() === colegioValue?.toLowerCase()
                          );
                          
                          if (colegioEncontrado) {
                            // Auto-rellenado cuando hay coincidencia
                            return (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={colegioEncontrado}
                                  readOnly
                                  className="flex-1 text-sm border border-green-300 bg-green-50 rounded px-2 py-1"
                                />
                                <Check className="w-4 h-4 text-green-600" />
                              </div>
                            );
                          } else {
                            // Desplegable cuando no hay coincidencia
                            return (
                              <select
                                value={contact.data.nombre_colegio || ''}
                                onChange={(e) => handleEditContact(index, 'nombre_colegio', e.target.value)}
                                className={`w-full text-sm border rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                                  contact.duplicateFields.includes('nombre_colegio') ? 'border-red-300' : 'border-gray-300'
                                }`}
                              >
                                <option value="">-- Seleccionar Colegio --</option>
                                {colegios.map((colegio, colegioIndex) => (
                                  <option key={colegioIndex} value={colegio}>
                                    {colegio}
                                  </option>
                                ))}
                              </select>
                            );
                          }
                        })()} 
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Año de Nacimiento
                        </label>
                        <input
                          type="number"
                          value={contact.data.año_nacimiento || ''}
                          onChange={(e) => handleEditContact(index, 'año_nacimiento', parseInt(e.target.value) || '')}
                          className="w-full text-sm border border-gray-300 rounded px-2 py-1"
                          min="1950"
                          max="2010"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Comercial
                        </label>
                        {(() => {
                          const comercialValue = contact.data.comercial?.toString().trim();
                          const comercialEncontrado = comerciales.find(c => 
                            c.nombre.toLowerCase() === comercialValue?.toLowerCase()
                          );
                          
                          if (comercialEncontrado) {
                            // Auto-rellenado cuando hay coincidencia
                            return (
                              <div className="flex items-center space-x-2">
                                <input
                                  type="text"
                                  value={comercialEncontrado.nombre}
                                  readOnly
                                  className="flex-1 text-sm border border-green-300 bg-green-50 rounded px-2 py-1"
                                />
                                <Check className="w-4 h-4 text-green-600" />
                              </div>
                            );
                          } else {
                            // Desplegable cuando no hay coincidencia
                            return (
                              <select
                                value={contact.data.comercial || ''}
                                onChange={(e) => handleEditContact(index, 'comercial', e.target.value)}
                                className="w-full text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                              >
                                <option value="">-- Seleccionar Comercial --</option>
                                {comerciales.map((comercial, comercialIndex) => (
                                  <option key={comercialIndex} value={comercial.nombre}>
                                    {comercial.nombre}
                                  </option>
                                ))}
                              </select>
                            );
                          }
                        })()} 
                      </div>
                    </div>

                    {contact.errors.length > 0 && (
                      <div className="text-xs text-red-600">
                        <ul className="list-disc list-inside">
                          {contact.errors.map((error, errorIndex) => (
                            <li key={errorIndex}>{error}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center">
                <button
                  onClick={() => setStep('mapping')}
                  className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                >
                  Atrás
                </button>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      resetModal();
                      onClose();
                    }}
                    className="px-4 py-2 text-gray-700 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    onClick={handleConfirmImport}
                    disabled={hasErrors || validContactsCount === 0}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Importar {validContactsCount} Contactos
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
