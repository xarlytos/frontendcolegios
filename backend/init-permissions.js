const mongoose = require('mongoose');
const { Permiso } = require('./src/models/Permiso');

// Conectar a MongoDB
mongoose.connect('mongodb+srv://carlogarcia:1234567890@cluster0.6qjqj.mongodb.net/colegios?retryWrites=true&w=majority&serverSelectionTimeoutMS=5000')
  .then(async () => {
    console.log('✅ Conectado a MongoDB');
    
    const permisosRequeridos = [
      { clave: 'VER_GRADUACIONES', descripcion: 'Permite ver la página de graduaciones' },
      { clave: 'VER_CONTACTOS_GRADUACIONES', descripcion: 'Permite ver los contactos filtrados en graduaciones' }
    ];

    const permisosCreados = [];
    const permisosExistentes = [];

    for (const permisoData of permisosRequeridos) {
      const permisoExistente = await Permiso.findOne({ clave: permisoData.clave });
      
      if (permisoExistente) {
        permisosExistentes.push(permisoExistente);
        console.log(`⚠️ Permiso ${permisoData.clave} ya existe: ${permisoExistente._id}`);
      } else {
        const nuevoPermiso = new Permiso(permisoData);
        const permisoGuardado = await nuevoPermiso.save();
        permisosCreados.push(permisoGuardado);
        console.log(`✅ Permiso ${permisoData.clave} creado: ${permisoGuardado._id}`);
      }
    }

    console.log('\n📋 Resumen:');
    console.log(`- Permisos creados: ${permisosCreados.length}`);
    console.log(`- Permisos existentes: ${permisosExistentes.length}`);
    
    if (permisosCreados.length > 0) {
      console.log('\n✅ Permisos creados:');
      permisosCreados.forEach(p => console.log(`  - ${p.clave} (${p._id})`));
    }
    
    if (permisosExistentes.length > 0) {
      console.log('\n⚠️ Permisos existentes:');
      permisosExistentes.forEach(p => console.log(`  - ${p.clave} (${p._id})`));
    }

    // Listar todos los permisos para verificar
    console.log('\n📋 Todos los permisos en la BD:');
    const todosLosPermisos = await Permiso.find({}).sort({ clave: 1 });
    todosLosPermisos.forEach(permiso => {
      console.log(`- ${permiso.clave}: ${permiso.descripcion} (${permiso._id})`);
    });
    
    process.exit(0);
  })
  .catch(err => {
    console.error('❌ Error:', err);
    process.exit(1);
  });
