const axios = require('axios');

async function testColegiosEndpoint() {
  try {
    console.log('🔍 Probando endpoint de colegios...');
    
    // Primero necesitamos hacer login para obtener el token
    const loginResponse = await axios.post('http://localhost:3001/api/auth/login', {
      email: 'admin@colegios.com', // Cambia por un usuario válido
      password: 'admin123' // Cambia por la contraseña correcta
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Token obtenido:', token ? 'Sí' : 'No');
    
    // Ahora probar el endpoint de colegios
    const colegiosResponse = await axios.get('http://localhost:3001/api/contactos/colegios', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    console.log('📋 Respuesta de colegios:', colegiosResponse.data);
    
  } catch (error) {
    console.error('💥 Error:', error.response?.data || error.message);
  }
}

testColegiosEndpoint();
