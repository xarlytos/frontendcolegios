const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/colegios', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Definir esquemas
const graduacionSchema = new mongoose.Schema({}, { strict: false });
const Graduacion = mongoose.model('Graduacion', graduacionSchema);

async function verificarGraduaciones() {
  try {
    console.log('🔍 Verificando graduaciones...');
    
    const graduaciones = await Graduacion.find();
    console.log(`📊 Total graduaciones: ${graduaciones.length}`);
    
    graduaciones.forEach(g => {
      console.log(`- ${g.nombreColegio} (Año ${g.anioNacimiento}): ${g.contactos ? g.contactos.length : 0} contactos`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

verificarGraduaciones();

