// /comandos/sumardefensa.js
module.exports = {
    name: 'sumardefensa',
    description: 'Suma puntos de defensa a uno o más jugadores dependiendo del canal.',
    execute(message, args) {
        const puntosUsuarios = message.client.puntosUsuarios;
        const usuariosMencionados = message.mentions.users;
        
        if (usuariosMencionados.size === 0) {
            return message.reply('Debes mencionar a uno o más usuarios para sumarle puntos.');
        }

        const nombreCanal = message.channel.name;
        let puntosASumar = 0;

        switch (nombreCanal) {
            case 'general':
                puntosASumar = 1;
                break;
            case 'prueba':
                puntosASumar = 2;
                break;
            default:
                return message.reply(`Este comando solo puede usarse en los canales 'general' o 'prueba'.`);
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
            message.channel.send(`Se han añadido **${puntosASumar}** puntos de defensa a ${usuariosActualizados} usuario(s) registrado(s).`);
        } else {
            message.channel.send(`Ninguno de los usuarios mencionados está registrado en la base de datos.`);
        }
    },
};