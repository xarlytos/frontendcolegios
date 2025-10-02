const mongoose = require('mongoose');

// Conectar a MongoDB
mongoose.connect('mongodb://localhost:27017/colegios', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Definir esquemas
const graduacionSchema = new mongoose.Schema({
  nombreColegio: { type: String, required: true },
  anioNacimiento: { type: Number, required: true },
  responsable: String,
  tipoProducto: String,
  prevision: String,
  estado: String,
  observaciones: String,
  contactos: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Contacto' }],
  creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
  actualizadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' }
}, { timestamps: true });

const Graduacion = mongoose.model('Graduacion', graduacionSchema);

async function testActualizacion() {
  try {
    console.log('🔍 Probando actualización de graduación...');
    
    const nombreColegio = 'Colegio San José';
    const datosActualizacion = {
      responsable: 'Juan Pérez',
      tipoProducto: 'Grado en Ingeniería',
      prevision: '2024-2025',
      estado: 'En proceso',
      observaciones: 'Estudiantes muy motivados'
    };

    // Buscar o crear graduación
    let graduacion = await Graduacion.findOne({ nombreColegio });
    
    if (!graduacion) {
      console.log('🆕 Creando nueva graduación para:', nombreColegio);
      graduacion = new Graduacion({
        nombreColegio,
        anioNacimiento: 2007,
        responsable: datosActualizacion.responsable,
        tipoProducto: datosActualizacion.tipoProducto,
        prevision: datosActualizacion.prevision,
        estado: datosActualizacion.estado,
        observaciones: datosActualizacion.observaciones,
        contactos: [],
        creadoPor: new mongoose.Types.ObjectId()
      });
    } else {
      console.log('🔄 Actualizando graduación existente para:', nombreColegio);
      graduacion.responsable = datosActualizacion.responsable;
      graduacion.tipoProducto = datosActualizacion.tipoProducto;
      graduacion.prevision = datosActualizacion.prevision;
      graduacion.estado = datosActualizacion.estado;
      graduacion.observaciones = datosActualizacion.observaciones;
      graduacion.actualizadoPor = new mongoose.Types.ObjectId();
    }

    await graduacion.save();
    console.log('✅ Graduación guardada correctamente');

    // Verificar que se guardó
    const graduacionGuardada = await Graduacion.findOne({ nombreColegio });
    console.log('📋 Datos guardados:', {
      nombreColegio: graduacionGuardada.nombreColegio,
      responsable: graduacionGuardada.responsable,
      tipoProducto: graduacionGuardada.tipoProducto,
      prevision: graduacionGuardada.prevision,
      estado: graduacionGuardada.estado,
      observaciones: graduacionGuardada.observaciones
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

testActualizacion();

