const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/colegios', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Definir esquemas directamente
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

// Crear modelos
const Contacto = mongoose.model('Contacto', contactoSchema);
const Graduacion = mongoose.model('Graduacion', graduacionSchema);

async function sincronizarGraduaciones() {
  try {
    console.log('🔄 Iniciando sincronización de graduaciones...');

    // Obtener contactos agrupados por colegio y año
    const contactosPorColegio = await Contacto.aggregate([
      {
        $group: {
          _id: {
            nombreColegio: '$nombreColegio',
            anioNacimiento: '$anioNacimiento'
          },
          contactos: { $push: '$_id' }
        }
      }
    ]);

    console.log(`📊 Encontrados ${contactosPorColegio.length} grupos de contactos`);

    let graduacionesCreadas = 0;
    let graduacionesActualizadas = 0;

    for (const grupo of contactosPorColegio) {
      const { nombreColegio, anioNacimiento } = grupo._id;
      const contactosIds = grupo.contactos;

      console.log(`🏫 Procesando: ${nombreColegio} - Año ${anioNacimiento} (${contactosIds.length} contactos)`);

      // Verificar si ya existe una graduación para este colegio y año
      let graduacion = await Graduacion.findOne({
        nombreColegio,
        anioNacimiento
      });

      if (graduacion) {
        // Actualizar contactos existentes
        graduacion.contactos = contactosIds;
        await graduacion.save();
        graduacionesActualizadas++;
        console.log(`✅ Actualizada graduación existente: ${nombreColegio}`);
      } else {
        // Crear nueva graduación
        graduacion = new Graduacion({
          nombreColegio,
          anioNacimiento,
          contactos: contactosIds,
          creadoPor: new mongoose.Types.ObjectId() // ID temporal para el script
        });
        await graduacion.save();
        graduacionesCreadas++;
        console.log(`🆕 Creada nueva graduación: ${nombreColegio}`);
      }
    }

    console.log('🎉 Sincronización completada:');
    console.log(`   - Graduaciones creadas: ${graduacionesCreadas}`);
    console.log(`   - Graduaciones actualizadas: ${graduacionesActualizadas}`);
    console.log(`   - Total procesadas: ${graduacionesCreadas + graduacionesActualizadas}`);

  } catch (error) {
    console.error('❌ Error en sincronización:', error);
  } finally {
    mongoose.connection.close();
  }
}

sincronizarGraduaciones();
