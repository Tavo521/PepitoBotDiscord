// /commands/reiniciarpepitas.js
const sesionPepitas = require('../sesionPepitas');

module.exports = {
    name: 'reiniciarpepitas',
    description: 'Borra todos los datos de pepitas de la sesión actual.',
    execute(message, args) {
        sesionPepitas.clear();
        message.channel.send('✅ Se han borrado todos los datos de pepitas de la sesión. ¡Lista para empezar un nuevo día!');
    },
};