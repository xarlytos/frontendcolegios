const mongoose = require('mongoose');

// Conectar a MongoDB
mongoose.connect('mongodb://localhost:27017/colegios', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Definir esquemas
const contactoSchema = new mongoose.Schema({
  nombreCompleto: String,
  telefono: String,
  instagram: String,
  anioNacimiento: Number,
  fechaAlta: Date,
  comercialId: mongoose.Schema.Types.ObjectId,
  nombreColegio: String
}, { timestamps: true });

const Contacto = mongoose.model('Contacto', contactoSchema);

async function testEndpoint() {
  try {
    console.log('🔍 Probando agregación de contactos...');
    
    const anioNum = 2007;
    const filtros = { anioNacimiento: anioNum };
    
    console.log('📊 Total contactos que coinciden:', await Contacto.countDocuments(filtros));
    
    // Obtener contactos agrupados por colegio (como en el controlador)
    const contactosPorColegio = await Contacto.aggregate([
      { $match: filtros },
      {
        $lookup: {
          from: 'usuarios',
          localField: 'comercialId',
          foreignField: '_id',
          as: 'comercialInfo'
        }
      },
      {
        $unwind: {
          path: '$comercialInfo',
          preserveNullAndEmptyArrays: true
        }
      },
      {
        $group: {
          _id: '$nombreColegio',
          totalContactos: { $sum: 1 },
          contactos: {
            $push: {
              id: '$_id',
              nombreCompleto: '$nombreCompleto',
              telefono: '$telefono',
              instagram: '$instagram',
              anioNacimiento: '$anioNacimiento',
              fechaAlta: '$fechaAlta',
              comercialId: '$comercialId',
              comercialNombre: '$comercialInfo.nombre'
            }
          }
        }
      },
      {
        $sort: { totalContactos: -1, _id: 1 }
      }
    ]);

    console.log('📊 Resultados de la agregación:', {
      contactosPorColegio: contactosPorColegio.length,
      totalContactos: contactosPorColegio.reduce((sum, colegio) => sum + colegio.totalContactos, 0)
    });

    // Formatear respuesta
    const graduaciones = contactosPorColegio.map(colegio => ({
      id: colegio._id,
      nombreColegio: colegio._id,
      anioNacimiento: anioNum,
      responsable: '',
      tipoProducto: '',
      prevision: '',
      estado: '',
      observaciones: '',
      totalContactos: colegio.totalContactos,
      contactos: colegio.contactos
    }));

    console.log('🎉 Respuesta final:');
    console.log('  - Success: true');
    console.log('  - Graduaciones:', graduaciones.length);
    console.log('  - Total contactos:', graduaciones.reduce((sum, g) => sum + g.totalContactos, 0));
    
    graduaciones.forEach(g => {
      console.log(`  - ${g.nombreColegio}: ${g.totalContactos} contactos`);
    });

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

testEndpoint();


