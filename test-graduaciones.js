const mongoose = require('mongoose');

// Conectar a MongoDB
mongoose.connect('mongodb://localhost:27017/colegios', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Definir esquemas
const graduacionSchema = new mongoose.Schema({}, { strict: false });
const Graduacion = mongoose.model('Graduacion', graduacionSchema);

async function testGraduaciones() {
  try {
    console.log('🔍 Probando consulta de graduaciones...');
    
    // Buscar graduaciones para el año 2007
    const graduaciones = await Graduacion.find({ anioNacimiento: 2007 });
    console.log(`📊 Graduaciones encontradas: ${graduaciones.length}`);
    
    graduaciones.forEach(g => {
      console.log(`- ${g.nombreColegio} (Año ${g.anioNacimiento})`);
    });

    // Probar con populate
    console.log('\n🔍 Probando con populate...');
    const graduacionesConContactos = await Graduacion.find({ anioNacimiento: 2007 })
      .populate('contactos');
    
    console.log(`📊 Graduaciones con contactos: ${graduacionesConContactos.length}`);
    
    graduacionesConContactos.forEach(g => {
      console.log(`- ${g.nombreColegio}: ${g.contactos ? g.contactos.length : 0} contactos`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

testGraduaciones();

