const mongoose = require('mongoose');
require('dotenv').config();

async function testAtlasConnection() {
  try {
    console.log('🔍 Probando conexión a MongoDB Atlas...');
    console.log('URI:', process.env.MONGODB_URI || 'No configurada');
    
    if (!process.env.MONGODB_URI) {
      console.error('❌ MONGODB_URI no está configurada en las variables de entorno');
      console.log('💡 Asegúrate de tener un archivo .env en el directorio backend/ con:');
      console.log('   MONGODB_URI=mongodb+srv://usuario:password@cluster.mongodb.net/database');
      process.exit(1);
    }
    
    await mongoose.connect(process.env.MONGODB_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });
    
    console.log('✅ Conectado exitosamente a MongoDB Atlas');
    
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log('📊 Colecciones disponibles:', collections.map(c => c.name));
    
    // Verificar si hay datos
    if (collections.length > 0) {
      for (const collection of collections.slice(0, 3)) {
        const count = await db.collection(collection.name).countDocuments();
        console.log(`   - ${collection.name}: ${count} documentos`);
      }
    }
    
    await mongoose.disconnect();
    console.log('✅ Desconectado de MongoDB Atlas');
    console.log('🎉 ¡Conexión exitosa! Tu aplicación ahora usará MongoDB Atlas');
    
  } catch (error) {
    console.error('❌ Error conectando a MongoDB Atlas:', error.message);
    console.log('\n🔧 Posibles soluciones:');
    console.log('1. Verifica que el archivo .env esté en el directorio backend/');
    console.log('2. Verifica que la URI de MongoDB Atlas sea correcta');
    console.log('3. Verifica que tu IP esté en la whitelist de MongoDB Atlas');
    console.log('4. Verifica que el usuario y contraseña sean correctos');
    process.exit(1);
  }
}

testAtlasConnection();
