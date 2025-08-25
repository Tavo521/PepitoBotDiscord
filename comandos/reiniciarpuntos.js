// /commands/reiniciarpuntos.js
module.exports = {
    name: 'reiniciarpuntos',
    description: 'Reinicia todos los puntos de los jugadores.',
    execute(message, args) {
        // Obtenemos la colección de puntos desde el cliente
        const puntosUsuarios = message.client.puntosUsuarios;

        // Limpiamos todos los datos de la colección
        puntosUsuarios.clear();
        
        message.channel.send('✅ Se han reiniciado los puntos de todos los jugadores.');
    },
};