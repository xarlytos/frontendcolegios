#!/usr/bin/env node

/**
 * Script para probar la conexión a MongoDB Atlas
 * 
 * Uso: node test-cloud-connection.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '.env') });

const CLOUD_URI = process.env.MONGODB_URI;

if (!CLOUD_URI) {
  console.error('❌ Error: MONGODB_URI no está configurada en el archivo .env');
  process.exit(1);
}

async function testConnection() {
  try {
    console.log('🔍 Probando conexión a MongoDB Atlas...');
    console.log(`📍 URI: ${CLOUD_URI.replace(/\/\/.*@/, '//***:***@')}`); // Ocultar credenciales
    
    // Conectar con timeout
    await mongoose.connect(CLOUD_URI, {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    console.log('✅ ¡Conexión exitosa a MongoDB Atlas!');
    
    // Obtener información de la base de datos
    const db = mongoose.connection.db;
    const admin = db.admin();
    
    // Información del servidor
    const serverInfo = await admin.serverStatus();
    console.log(`📊 Versión de MongoDB: ${serverInfo.version}`);
    console.log(`🖥️  Host: ${serverInfo.host}`);
    console.log(`⏰ Uptime: ${Math.floor(serverInfo.uptime / 60)} minutos`);
    
    // Listar colecciones
    const collections = await db.listCollections().toArray();
    console.log(`\n📦 Colecciones encontradas (${collections.length}):`);
    
    for (const collection of collections) {
      const count = await db.collection(collection.name).countDocuments();
      console.log(`  - ${collection.name}: ${count} documentos`);
    }
    
    // Probar operación de escritura
    console.log('\n🧪 Probando operación de escritura...');
    const testCollection = db.collection('connection_test');
    const testDoc = {
      test: true,
      timestamp: new Date(),
      message: 'Test de conexión exitoso'
    };
    
    await testCollection.insertOne(testDoc);
    console.log('✅ Operación de escritura exitosa');
    
    // Limpiar documento de prueba
    await testCollection.deleteOne({ test: true });
    console.log('🧹 Documento de prueba eliminado');
    
    console.log('\n🎉 ¡Todas las pruebas pasaron! Tu base de datos en la nube está lista.');
    
  } catch (error) {
    console.error('\n❌ Error de conexión:', error.message);
    
    if (error.message.includes('authentication failed')) {
      console.log('\n💡 Posibles soluciones:');
      console.log('1. Verifica que el usuario y contraseña sean correctos');
      console.log('2. Asegúrate de que el usuario tenga permisos de lectura/escritura');
      console.log('3. Verifica que la IP esté en la whitelist de MongoDB Atlas');
    } else if (error.message.includes('timeout')) {
      console.log('\n💡 Posibles soluciones:');
      console.log('1. Verifica tu conexión a internet');
      console.log('2. Verifica que la URL de conexión sea correcta');
      console.log('3. Verifica que el cluster esté activo en MongoDB Atlas');
    }
    
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Desconectado de MongoDB Atlas');
  }
}

testConnection();


