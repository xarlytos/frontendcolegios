const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/colegios_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

async function cleanupUnusedCollections() {
  try {
    console.log('🧹 Iniciando limpieza de colecciones no utilizadas...');
    
    const db = mongoose.connection.db;
    
    // Lista de colecciones a eliminar
    const collectionsToRemove = ['universidades', 'titulaciones'];
    
    for (const collectionName of collectionsToRemove) {
      try {
        // Verificar si la colección existe
        const collections = await db.listCollections({ name: collectionName }).toArray();
        
        if (collections.length > 0) {
          // Contar documentos antes de eliminar
          const count = await db.collection(collectionName).countDocuments();
          console.log(`📊 Colección '${collectionName}' tiene ${count} documentos`);
          
          // Eliminar la colección
          await db.collection(collectionName).drop();
          console.log(`✅ Colección '${collectionName}' eliminada exitosamente`);
        } else {
          console.log(`ℹ️  Colección '${collectionName}' no existe, saltando...`);
        }
      } catch (error) {
        console.error(`❌ Error eliminando colección '${collectionName}':`, error.message);
      }
    }
    
    console.log('\n🎉 Limpieza completada');
    
  } catch (error) {
    console.error('💥 Error durante la limpieza:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de la base de datos');
  }
}

// Ejecutar la limpieza
cleanupUnusedCollections();

