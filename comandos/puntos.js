// /comandos/puntos.js
module.exports = {
    name: 'puntos',
    description: 'Muestra los puntos de defensa de todos los jugadores.',
    // Hacemos la función 'execute' asincrónica
    async execute(message, args) {
        const puntosUsuarios = message.client.puntosUsuarios;

        if (puntosUsuarios.size === 0) {
            return message.reply(
                'Aún no hay puntos de defensa registrados. ' +
                'Para sumar puntos, **etiqueta a las personas** en un mensaje en los canales de defensa.'
            );
        }

        // Crear un array para ordenar los jugadores por puntos
        const jugadoresOrdenados = await Promise.all(
            Array.from(puntosUsuarios.entries()).map(async ([userId, puntos]) => {
                let nombreJugador = 'Usuario no encontrado';
                try {
                    // Usamos fetch() para obtener la información del usuario de forma asincrónica
                    const user = await message.client.users.fetch(userId);
                    nombreJugador = user.username;
                } catch (error) {
                    console.error(`Error al obtener usuario con ID ${userId}:`, error);
                }

                return {
                    nombre: nombreJugador,
                    defensa: puntos.defensa
                };
            })
        );

        // Ordenar el array de mayor a menor
        jugadoresOrdenados.sort((a, b) => b.defensa - a.defensa);

        let mensajeRespuesta = '**Puntos de Defensa Actuales:**\n\n';

        jugadoresOrdenados.forEach((jugador, index) => {
            mensajeRespuesta += `${index + 1}. **${jugador.nombre}**: ${jugador.defensa} puntos\n`;
        });

        message.channel.send(mensajeRespuesta);
    },
};