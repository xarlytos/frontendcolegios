const mongoose = require('mongoose');
const { Colegio } = require('../src/models/Colegio');
const { Usuario } = require('../src/models/Usuario');

// Datos iniciales de colegios
const colegiosIniciales = [
  {
    nombre: 'CENTRE PRIVAT SAGRA',
    direccion: 'Carrer de la Sagra, 123, Valencia',
    telefono: '963 123 456',
    email: 'info@sagra.edu',
    activo: true,
    createdBy: 'admin'
  },
  {
    nombre: 'La Salle Paterna',
    direccion: 'Avenida de la Paz, 45, Paterna',
    telefono: '961 234 567',
    email: 'info@lasallepaterna.edu',
    activo: true,
    createdBy: 'admin'
  },
  {
    nombre: 'Colegio San José',
    direccion: 'Calle Mayor, 78, Valencia',
    telefono: '963 345 678',
    email: 'info@colegiosanjose.edu',
    activo: true,
    createdBy: 'admin'
  },
  {
    nombre: 'Instituto Tecnológico',
    direccion: 'Carrer de la Tecnología, 12, Valencia',
    telefono: '963 456 789',
    email: 'info@institutotecnologico.edu',
    activo: true,
    createdBy: 'admin'
  },
  {
    nombre: 'Escuela Primaria Central',
    direccion: 'Plaza Central, 1, Valencia',
    telefono: '963 567 890',
    email: 'info@escuelacentral.edu',
    activo: true,
    createdBy: 'admin'
  }
];

// Datos iniciales de comerciales
const comercialesIniciales = [
  {
    nombre: 'Juan Pérez',
    email: 'juan.perez@colegios.com',
    password: '$2b$10$example.hash.here', // Hash de ejemplo
    role: 'comercial',
    activo: true
  },
  {
    nombre: 'María García',
    email: 'maria.garcia@colegios.com',
    password: '$2b$10$example.hash.here', // Hash de ejemplo
    role: 'comercial',
    activo: true
  },
  {
    nombre: 'Carlos López',
    email: 'carlos.lopez@colegios.com',
    password: '$2b$10$example.hash.here', // Hash de ejemplo
    role: 'comercial',
    activo: true
  }
];

async function populateData() {
  try {
    console.log('🔗 Conectando a la base de datos...');
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/colegios');
    
    console.log('📚 Poblando colegios...');
    for (const colegio of colegiosIniciales) {
      const existingColegio = await Colegio.findOne({ nombre: colegio.nombre });
      if (!existingColegio) {
        await Colegio.create(colegio);
        console.log(`✅ Colegio creado: ${colegio.nombre}`);
      } else {
        console.log(`⚠️ Colegio ya existe: ${colegio.nombre}`);
      }
    }
    
    console.log('👥 Poblando comerciales...');
    for (const comercial of comercialesIniciales) {
      const existingComercial = await Usuario.findOne({ email: comercial.email });
      if (!existingComercial) {
        await Usuario.create(comercial);
        console.log(`✅ Comercial creado: ${comercial.nombre}`);
      } else {
        console.log(`⚠️ Comercial ya existe: ${comercial.nombre}`);
      }
    }
    
    console.log('🎉 Datos iniciales poblados exitosamente!');
    
  } catch (error) {
    console.error('❌ Error poblando datos:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de la base de datos');
  }
}

// Ejecutar si se llama directamente
if (require.main === module) {
  populateData();
}

module.exports = { populateData };


