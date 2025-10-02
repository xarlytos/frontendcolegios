const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/colegios_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function checkDatabaseStructure() {
  try {
    console.log('🔍 Verificando estructura de la base de datos...');
    
    const db = mongoose.connection.db;
    
    // Listar todas las colecciones
    const collections = await db.listCollections().toArray();
    console.log('📊 Colecciones disponibles:', collections.map(c => c.name));
    
    // Verificar estructura de contactos
    const Contacto = mongoose.model('Contacto', new mongoose.Schema({}, {strict: false}));
    const sample = await Contacto.findOne();
    
    if (sample) {
      console.log('📋 Estructura de un contacto existente:');
      console.log('Campos disponibles:', Object.keys(sample.toObject()));
      console.log('Datos del contacto:', {
        nombreCompleto: sample.nombreCompleto,
        nombreColegio: sample.nombreColegio,
        anioNacimiento: sample.anioNacimiento,
        telefono: sample.telefono,
        instagram: sample.instagram
      });
    } else {
      console.log('❌ No hay contactos en la base de datos');
    }
    
    // Verificar si existe el campo nombreColegio
    const contactosConColegio = await Contacto.countDocuments({ nombreColegio: { $exists: true } });
    const contactosSinColegio = await Contacto.countDocuments({ nombreColegio: { $exists: false } });
    
    console.log(`📊 Contactos con campo nombreColegio: ${contactosConColegio}`);
    console.log(`📊 Contactos sin campo nombreColegio: ${contactosSinColegio}`);
    
  } catch (error) {
    console.error('💥 Error verificando la base de datos:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de la base de datos');
  }
}

// Ejecutar la verificación
checkDatabaseStructure();


