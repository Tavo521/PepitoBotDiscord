// /comandos/sumardefensa.js
module.exports = {
    name: 'sumardefensa',
    description: 'Suma 1 punto de defensa a uno o más jugadores. Uso: !sumardefensa <@usuario1> <@usuario2> ...',
    execute(message, args) {
        const puntosUsuarios = message.client.puntosUsuarios;

        const usuariosMencionados = message.mentions.users;
        const puntosASumar = 1;

        if (usuariosMencionados.size === 0) {
            return message.reply('Debes mencionar a uno o más usuarios para sumarle puntos.');
        }

        let usuariosActualizados = 0;

        usuariosMencionados.forEach(usuarioMencionado => {
            const userId = usuarioMencionado.id;

            if (!puntosUsuarios.has(userId)) {
                puntosUsuarios.set(userId, { defensa: 0 });
            }

            const puntosActuales = puntosUsuarios.get(userId);
            puntosActuales.defensa += puntosASumar;
            puntosUsuarios.set(userId, puntosActuales);
            
            usuariosActualizados++;
        });

        if (usuariosActualizados > 0) {
            message.channel.send(`Se ha añadido **${puntosASumar}** punto de defensa a ${usuariosActualizados} usuario(s) mencionado(s).`);
        } else {
            message.channel.send(`Ninguno de los usuarios mencionados está registrado en la base de datos.`);
        }
    },
};