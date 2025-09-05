const mongoose = require('mongoose');
require('dotenv').config();

// URI desde variables de entorno
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/colegios_db';

async function checkDatabase() {
  console.log('=== Verificando base de datos MongoDB Atlas ===');
  console.log('URI:', MONGODB_URI);
  
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Conectado a MongoDB Atlas');
    
    const db = mongoose.connection.db;
    
    // Listar todas las colecciones
    const collections = await db.listCollections().toArray();
    console.log('📊 Colecciones disponibles:', collections.map(c => c.name));
    
    // Verificar permisos si existen
    const PermisoSchema = new mongoose.Schema({
      clave: String,
      descripcion: String
    });
    
    const Permiso = mongoose.model('Permiso', PermisoSchema);
    
    const permisos = await Permiso.find({});
    console.log(`📋 Permisos encontrados: ${permisos.length}`);
    
    if (permisos.length > 0) {
      console.log('Primeros 3 permisos:');
      permisos.slice(0, 3).forEach(p => {
        console.log(`  - ${p._id}: ${p.clave} (${p.descripcion})`);
      });
    }
    
    // Verificar contactos si existen
    const ContactoSchema = new mongoose.Schema({}, { strict: false });
    const Contacto = mongoose.model('Contacto', ContactoSchema);
    
    const contactos = await Contacto.find({});
    console.log(`👥 Contactos encontrados: ${contactos.length}`);
    
    if (contactos.length > 0) {
      console.log('Primeros 3 contactos:');
      contactos.slice(0, 3).forEach(c => {
        console.log(`  - ${c._id}: ${c.nombreCompleto} (${c.nombreColegio || 'Sin colegio'})`);
      });
    }
    
    await mongoose.disconnect();
    console.log('✅ Desconectado de MongoDB Atlas');
    
  } catch (error) {
    console.error('❌ Error conectando a MongoDB Atlas:', error.message);
  }
  
  process.exit(0);
}

checkDatabase();