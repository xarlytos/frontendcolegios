const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/colegios', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Definir esquema de contacto
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

async function crearContactosPrueba() {
  try {
    console.log('🔄 Creando contactos de prueba...');

    const contactosPrueba = [
      {
        nombreCompleto: 'Juan Pérez García',
        telefono: '612345678',
        instagram: 'juanperez',
        anioNacimiento: 2007,
        fechaAlta: new Date(),
        nombreColegio: 'Colegio San José',
        comercialId: new mongoose.Types.ObjectId()
      },
      {
        nombreCompleto: 'María López Ruiz',
        telefono: '623456789',
        instagram: 'marialopez',
        anioNacimiento: 2007,
        fechaAlta: new Date(),
        nombreColegio: 'Colegio San José',
        comercialId: new mongoose.Types.ObjectId()
      },
      {
        nombreCompleto: 'Carlos Martínez Díaz',
        telefono: '634567890',
        instagram: 'carlosmartinez',
        anioNacimiento: 2007,
        fechaAlta: new Date(),
        nombreColegio: 'Colegio San José',
        comercialId: new mongoose.Types.ObjectId()
      },
      {
        nombreCompleto: 'Ana García Fernández',
        telefono: '645678901',
        instagram: 'anagarcia',
        anioNacimiento: 2007,
        fechaAlta: new Date(),
        nombreColegio: 'Colegio Santa María',
        comercialId: new mongoose.Types.ObjectId()
      },
      {
        nombreCompleto: 'David Rodríguez López',
        telefono: '656789012',
        instagram: 'davidrodriguez',
        anioNacimiento: 2007,
        fechaAlta: new Date(),
        nombreColegio: 'Colegio Santa María',
        comercialId: new mongoose.Types.ObjectId()
      }
    ];

    const contactosCreados = await Contacto.insertMany(contactosPrueba);
    console.log(`✅ Creados ${contactosCreados.length} contactos de prueba`);

    // Ahora sincronizar graduaciones
    console.log('🔄 Sincronizando graduaciones...');
    
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

    let graduacionesCreadas = 0;

    for (const grupo of contactosPorColegio) {
      const { nombreColegio, anioNacimiento } = grupo._id;
      const contactosIds = grupo.contactos;

      console.log(`🏫 Creando graduación: ${nombreColegio} - Año ${anioNacimiento} (${contactosIds.length} contactos)`);

      const graduacion = new Graduacion({
        nombreColegio,
        anioNacimiento,
        contactos: contactosIds,
        creadoPor: new mongoose.Types.ObjectId()
      });
      
      await graduacion.save();
      graduacionesCreadas++;
    }

    console.log('🎉 Proceso completado:');
    console.log(`   - Contactos creados: ${contactosCreados.length}`);
    console.log(`   - Graduaciones creadas: ${graduacionesCreadas}`);

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    mongoose.connection.close();
  }
}

crearContactosPrueba();

