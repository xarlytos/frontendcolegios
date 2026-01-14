const mongoose = require('mongoose');
async function run() {
    await mongoose.connect('mongodb://localhost:27017/colegios_db');
    const count = await mongoose.connection.db.collection('graduacions').countDocuments();
    console.log('Total graduaciones:', count);

    const contactsAnios = await mongoose.connection.db.collection('contactos').aggregate([
        { $group: { _id: '$anioNacimiento', count: { $sum: 1 } } }
    ]).toArray();
    console.log('Contactos por año:', JSON.stringify(contactsAnios));

    const config = await mongoose.connection.db.collection('configuracionsistemas').find({ clave: 'graduaciones_anio_seleccionado' }).toArray();
    console.log('Config anio:', JSON.stringify(config));

    const sample = await mongoose.connection.db.collection('graduacions').findOne();
    if (sample) {
        console.log('One Grad Sample:', JSON.stringify({
            colegio: sample.nombreColegio,
            anio: sample.anioNacimiento,
            responsable: sample.responsable,
            estado: sample.estado
        }));
    }

    process.exit();
}
run();
