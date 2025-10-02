const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/colegios_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Schema temporal para acceder a los datos existentes
const contactoSchema = new mongoose.Schema({}, { strict: false });
const Contacto = mongoose.model('Contacto', contactoSchema);

async function migrateToColegios() {
  try {
    console.log('🚀 Iniciando migración de contactos a estructura de colegios...');
    
    // Obtener todos los contactos existentes
    const contactos = await Contacto.find({});
    console.log(`📊 Total de contactos encontrados: ${contactos.length}`);
    
    if (contactos.length === 0) {
      console.log('✅ No hay contactos para migrar');
      return;
    }
    
    let migrados = 0;
    let errores = 0;
    
    for (const contacto of contactos) {
      try {
        // Crear el nuevo documento con la estructura actualizada
        const nuevoContacto = {
          nombreCompleto: contacto.nombreCompleto,
          telefono: contacto.telefono,
          instagram: contacto.instagram,
          nombreColegio: contacto.universidadId?.nombre || 'Colegio por definir', // Usar nombre de universidad como colegio temporal
          anioNacimiento: contacto.anioNacimiento || new Date().getFullYear() - 18, // Si no tiene año, asumir 18 años
          comercialId: contacto.comercialId,
          fechaAlta: contacto.fechaAlta,
          createdBy: contacto.createdBy,
          diaLibre: contacto.diaLibre,
          createdAt: contacto.createdAt,
          updatedAt: new Date()
        };
        
        // Eliminar el documento antiguo
        await Contacto.findByIdAndDelete(contacto._id);
        
        // Crear el nuevo documento
        await Contacto.create(nuevoContacto);
        
        migrados++;
        console.log(`✅ Contacto migrado: ${contacto.nombreCompleto} -> ${nuevoContacto.nombreColegio}`);
        
      } catch (error) {
        errores++;
        console.error(`❌ Error migrando contacto ${contacto.nombreCompleto}:`, error.message);
      }
    }
    
    console.log('\n📊 Resumen de migración:');
    console.log(`✅ Contactos migrados exitosamente: ${migrados}`);
    console.log(`❌ Errores: ${errores}`);
    console.log(`📊 Total procesados: ${migrados + errores}`);
    
  } catch (error) {
    console.error('💥 Error durante la migración:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de la base de datos');
  }
}

// Ejecutar la migración
migrateToColegios();


