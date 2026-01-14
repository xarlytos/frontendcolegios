// Script simple para crear configuraciones manualmente
// Ejecutar desde la consola del navegador en el AdminPanel

console.log('🔧 Creando configuraciones manualmente...');

// Crear graduaciones_mostrar_contactos
fetch('/api/configuracion/graduaciones_mostrar_contactos', {
  method: 'PUT',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${localStorage.getItem('token')}`
  },
  body: JSON.stringify({ valor: false })
})
.then(response => response.json())
.then(data => {
  console.log('✅ graduaciones_mostrar_contactos creada:', data);
  
  // Crear graduaciones_anio_seleccionado
  return fetch('/api/configuracion/graduaciones_anio_seleccionado', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${localStorage.getItem('token')}`
    },
    body: JSON.stringify({ anio: null })
  });
})
.then(response => response.json())
.then(data => {
  console.log('✅ graduaciones_anio_seleccionado creada:', data);
  console.log('🎉 Configuraciones creadas correctamente');
})
.catch(error => {
  console.error('❌ Error creando configuraciones:', error);
});
