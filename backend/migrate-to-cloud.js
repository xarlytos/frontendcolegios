#!/usr/bin/env node

/**
 * Script para migrar datos de MongoDB local a MongoDB Atlas
 * 
 * Uso:
 * 1. Configura tu archivo .env con la nueva URI de MongoDB Atlas
 * 2. Ejecuta: node migrate-to-cloud.js
 */

const mongoose = require('mongoose');
const dotenv = require('dotenv');
const path = require('path');

// Cargar variables de entorno
dotenv.config({ path: path.join(__dirname, '.env') });

// Configuración de conexiones
const LOCAL_URI = 'mongodb://localhost:27017/colegios_db';
const CLOUD_URI = process.env.MONGODB_URI;

if (!CLOUD_URI) {
  console.error('❌ Error: MONGODB_URI no está configurada en el archivo .env');
  process.exit(1);
}

// Colecciones a migrar
const COLLECTIONS = [
  'usuarios',
  'contactos', 
  'universidades',
  'titulaciones',
  'graduaciones',
  'configuracion_sistema',
  'permisos',
  'usuario_permisos',
  'jerarquia_usuarios',
  'audit_logs',
  'importaciones',
  'importacion_filas'
];

class DatabaseMigrator {
  constructor() {
    this.localConnection = null;
    this.cloudConnection = null;
  }

  async connectLocal() {
    try {
      this.localConnection = await mongoose.createConnection(LOCAL_URI);
      console.log('✅ Conectado a MongoDB local');
    } catch (error) {
      console.error('❌ Error conectando a MongoDB local:', error.message);
      throw error;
    }
  }

  async connectCloud() {
    try {
      this.cloudConnection = await mongoose.createConnection(CLOUD_URI);
      console.log('✅ Conectado a MongoDB Atlas');
    } catch (error) {
      console.error('❌ Error conectando a MongoDB Atlas:', error.message);
      throw error;
    }
  }

  async migrateCollection(collectionName) {
    try {
      console.log(`\n📦 Migrando colección: ${collectionName}`);
      
      const localCollection = this.localConnection.db.collection(collectionName);
      const cloudCollection = this.cloudConnection.db.collection(collectionName);
      
      // Verificar si la colección existe localmente
      const localExists = await this.collectionExists(localCollection);
      if (!localExists) {
        console.log(`⚠️  La colección ${collectionName} no existe localmente, saltando...`);
        return;
      }

      // Contar documentos locales
      const localCount = await localCollection.countDocuments();
      console.log(`📊 Documentos en local: ${localCount}`);

      if (localCount === 0) {
        console.log(`⚠️  La colección ${collectionName} está vacía, saltando...`);
        return;
      }

      // Limpiar colección en la nube (opcional)
      const cloudCount = await cloudCollection.countDocuments();
      if (cloudCount > 0) {
        console.log(`⚠️  La colección ${collectionName} ya tiene ${cloudCount} documentos en la nube`);
        const shouldClear = process.argv.includes('--force');
        if (!shouldClear) {
          console.log(`⚠️  Usa --force para sobrescribir los datos existentes`);
          return;
        }
        await cloudCollection.deleteMany({});
        console.log(`🗑️  Colección ${collectionName} limpiada en la nube`);
      }

      // Migrar documentos
      const documents = await localCollection.find({}).toArray();
      
      if (documents.length > 0) {
        await cloudCollection.insertMany(documents);
        console.log(`✅ ${documents.length} documentos migrados a la nube`);
      }

    } catch (error) {
      console.error(`❌ Error migrando colección ${collectionName}:`, error.message);
      throw error;
    }
  }

  async collectionExists(collection) {
    try {
      const collections = await collection.db.listCollections({ name: collection.collectionName }).toArray();
      return collections.length > 0;
    } catch (error) {
      return false;
    }
  }

  async migrateAll() {
    try {
      console.log('🚀 Iniciando migración de base de datos...\n');
      
      // Conectar a ambas bases de datos
      await this.connectLocal();
      await this.connectCloud();

      // Migrar cada colección
      for (const collectionName of COLLECTIONS) {
        await this.migrateCollection(collectionName);
      }

      console.log('\n✅ Migración completada exitosamente!');
      
    } catch (error) {
      console.error('\n❌ Error durante la migración:', error.message);
      throw error;
    } finally {
      await this.disconnect();
    }
  }

  async disconnect() {
    try {
      if (this.localConnection) {
        await this.localConnection.close();
        console.log('✅ Desconectado de MongoDB local');
      }
      if (this.cloudConnection) {
        await this.cloudConnection.close();
        console.log('✅ Desconectado de MongoDB Atlas');
      }
    } catch (error) {
      console.error('❌ Error desconectando:', error.message);
    }
  }
}

// Ejecutar migración
async function main() {
  const migrator = new DatabaseMigrator();
  
  try {
    await migrator.migrateAll();
    console.log('\n🎉 ¡Migración completada! Tu base de datos está ahora en la nube.');
    console.log('\n📝 Próximos pasos:');
    console.log('1. Actualiza tu archivo .env con la nueva URI de MongoDB Atlas');
    console.log('2. Reinicia tu aplicación');
    console.log('3. Prueba que todo funcione correctamente');
    
  } catch (error) {
    console.error('\n💥 Error fatal:', error.message);
    process.exit(1);
  }
}

// Verificar argumentos
if (process.argv.includes('--help')) {
  console.log(`
📖 Uso del script de migración:

node migrate-to-cloud.js [opciones]

Opciones:
  --force     Sobrescribir datos existentes en la nube
  --help      Mostrar esta ayuda

Ejemplos:
  node migrate-to-cloud.js
  node migrate-to-cloud.js --force
`);
  process.exit(0);
}

main();


