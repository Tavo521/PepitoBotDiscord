// /comandos/verdefensa.js
module.exports = {
    name: 'verdefensa',
    description: 'Muestra la lista de jugadores con sus puntos de defensa.',
    execute(message, args) {
        const puntosUsuarios = message.client.puntosUsuarios;

        if (puntosUsuarios.size === 0) {
            return message.reply('Aún no hay puntos de defensa registrados.');
        }

        const jugadoresConPuntos = Array.from(puntosUsuarios.entries()).map(([userId, puntos]) => {
            return { userId, defensa: puntos.defensa };
        });

        jugadoresConPuntos.sort((a, b) => b.defensa - a.defensa);

        let respuesta = '🏆 **Puntos de Defensa Actuales** 🏆\n\n';

        // Usamos un bucle for...of para usar await en un bucle síncrono
        (async () => {
            for (const jugador of jugadoresConPuntos) {
                try {
                    const user = await message.client.users.fetch(jugador.userId);
                    respuesta += `- **${user.username}**: ${jugador.defensa} puntos de defensa\n`;
                } catch (error) {
                    console.error(`Error al obtener usuario con ID ${jugador.userId}:`, error);
                    respuesta += `- **Usuario desconocido (${jugador.userId})**: ${jugador.defensa} puntos de defensa\n`;
                }
            }
            message.channel.send(respuesta);
        })();
    },
};