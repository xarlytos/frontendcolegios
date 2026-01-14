const mongoose = require('mongoose');
require('dotenv').config();

// Conectar a MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/colegios_db', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// Definir el esquema de ConfiguracionSistema
const configuracionSchema = new mongoose.Schema({
  clave: { type: String, required: true, unique: true },
  valor: { type: mongoose.Schema.Types.Mixed, required: true },
  descripcion: { type: String, required: true },
  actualizadoPor: { type: String },
  actualizadoEn: { type: Date, default: Date.now }
});

const ConfiguracionSistema = mongoose.model('ConfiguracionSistema', configuracionSchema);

async function inicializarConfiguraciones() {
  try {
    console.log('🔧 Inicializando configuraciones del sistema...');

    const configuracionesRequeridas = [
      { 
        clave: 'graduaciones_mostrar_contactos', 
        valor: false, 
        descripcion: 'Controla si los comerciales pueden ver contactos en graduaciones' 
      },
      { 
        clave: 'graduaciones_anio_seleccionado', 
        valor: 2024, 
        descripcion: 'Año seleccionado por el admin para filtrar graduaciones' 
      }
    ];

    for (const configData of configuracionesRequeridas) {
      const configExistente = await ConfiguracionSistema.findOne({ clave: configData.clave });
      
      if (!configExistente) {
        const nuevaConfig = new ConfiguracionSistema(configData);
        await nuevaConfig.save();
        console.log(`✅ Configuración ${configData.clave} creada`);
      } else {
        console.log(`⚠️ Configuración ${configData.clave} ya existe`);
      }
    }

    console.log('🎉 Configuraciones inicializadas correctamente');
    
    // Verificar que se crearon
    const configs = await ConfiguracionSistema.find({});
    console.log('📋 Configuraciones en BD:', configs.map(c => ({ clave: c.clave, valor: c.valor })));
    
  } catch (error) {
    console.error('❌ Error inicializando configuraciones:', error);
  } finally {
    mongoose.connection.close();
  }
}

inicializarConfiguraciones();
