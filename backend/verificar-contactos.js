const mongoose = require('mongoose');

// Conectar a la base de datos
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/colegios', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Definir esquema de contacto
const contactoSchema = new mongoose.Schema({}, { strict: false });
const Contacto = mongoose.model('Contacto', contactoSchema);

async function verificarContactos() {
  try {
    console.log('🔍 Verificando contactos en la base de datos...');
    
    // Contar total de contactos
    const totalContactos = await Contacto.countDocuments();
    console.log(`📊 Total de contactos: ${totalContactos}`);
    
    // Contactos con nombreColegio
    const contactosConColegio = await Contacto.countDocuments({ 
      nombreColegio: { $exists: true, $ne: null, $ne: '' } 
    });
    console.log(`📊 Contactos con nombreColegio: ${contactosConColegio}`);
    
    // Contactos sin nombreColegio
    const contactosSinColegio = await Contacto.countDocuments({ 
      $or: [
        { nombreColegio: { $exists: false } },
        { nombreColegio: null },
        { nombreColegio: '' }
      ]
    });
    console.log(`📊 Contactos sin nombreColegio: ${contactosSinColegio}`);
    
    // Mostrar algunos ejemplos
    const ejemplos = await Contacto.find({ 
      nombreColegio: { $exists: true, $ne: null, $ne: '' } 
    }).limit(5);
    
    console.log('\n📋 Ejemplos de contactos con nombreColegio:');
    ejemplos.forEach((contacto, index) => {
      console.log(`${index + 1}. ${contacto.nombreCompleto} - Colegio: "${contacto.nombreColegio}"`);
    });
    
    // Verificar si hay contactos con nombres que necesitan normalización
    const contactosConAcentos = await Contacto.find({
      nombreColegio: { $regex: /[áéíóúÁÉÍÓÚñÑ]/, $options: 'i' }
    });
    console.log(`\n📊 Contactos con acentos en nombreColegio: ${contactosConAcentos.length}`);
    
    const contactosConMayusculas = await Contacto.find({
      nombreColegio: { $regex: /[A-Z]/ }
    });
    console.log(`📊 Contactos con mayúsculas en nombreColegio: ${contactosConMayusculas.length}`);
    
  } catch (error) {
    console.error('💥 Error verificando contactos:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Desconectado de la base de datos');
  }
}

// Ejecutar la verificación
verificarContactos();
