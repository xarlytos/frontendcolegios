const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/colegios', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Definir esquemas exactamente como en el controlador
const contactoSchema = new mongoose.Schema({
  nombreCompleto: String,
  telefono: String,
  instagram: String,
  anioNacimiento: Number,
  fechaAlta: Date,
  comercialId: mongoose.Schema.Types.ObjectId,
  nombreColegio: String
}, { timestamps: true });

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

const Contacto = mongoose.model('Contacto', contactoSchema);
const Graduacion = mongoose.model('Graduacion', graduacionSchema);

async function debugControlador() {
  try {
    console.log('🔍 Debug del controlador - Simulando getColegiosPorAnio...');
    
    const anioNum = 2007;
    console.log('📅 Año:', anioNum);
    
    // Obtener graduaciones con contactos (exactamente como en el controlador)
    console.log('🔍 Buscando graduaciones para año:', anioNum);
    const graduaciones = await Graduacion.find({ anioNacimiento: anioNum })
      .populate({
        path: 'contactos',
        select: 'nombreCompleto telefono instagram anioNacimiento fechaAlta comercialId'
      })
      .sort({ nombreColegio: 1 });
    
    console.log('📊 Graduaciones encontradas:', graduaciones.length);
    console.log('📋 Detalles de graduaciones:', graduaciones.map(g => ({
      id: g._id,
      nombreColegio: g.nombreColegio,
      anioNacimiento: g.anioNacimiento,
      contactosCount: g.contactos ? g.contactos.length : 0
    })));

    // Calcular total de contactos
    const totalContactos = graduaciones.reduce((sum, graduacion) => sum + graduacion.contactos.length, 0);
    console.log('📊 Total contactos:', totalContactos);

    // Formatear respuesta (como en el controlador)
    const graduacionesFormateadas = graduaciones.map(graduacion => ({
      id: graduacion._id,
      nombreColegio: graduacion.nombreColegio,
      anioNacimiento: graduacion.anioNacimiento,
      responsable: graduacion.responsable || '',
      tipoProducto: graduacion.tipoProducto || '',
      prevision: graduacion.prevision || '',
      estado: graduacion.estado || '',
      observaciones: graduacion.observaciones || '',
      totalContactos: graduacion.contactos.length,
      contactos: graduacion.contactos.map((contacto) => ({
        id: contacto._id,
        nombreCompleto: contacto.nombreCompleto,
        telefono: contacto.telefono,
        instagram: contacto.instagram,
        anioNacimiento: contacto.anioNacimiento,
        fechaAlta: contacto.fechaAlta,
        comercialId: contacto.comercialId,
        comercialNombre: 'Sin asignar'
      })),
      creadoPor: graduacion.creadoPor,
      actualizadoPor: graduacion.actualizadoPor,
      createdAt: graduacion.createdAt,
      updatedAt: graduacion.updatedAt
    }));

    console.log('🎉 Respuesta final:');
    console.log('  - Success: true');
    console.log('  - Graduaciones:', graduacionesFormateadas.length);
    console.log('  - Total contactos:', totalContactos);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

debugControlador();
