// /commands/recolectarpepitas.js
const sesionPepitas = require('../sesionPepitas');

module.exports = {
    name: 'recolectarpepitas',
    description: 'Registra las pepitas recicladas. Pega el mensaje del juego después del comando.',
    execute(message, args) {
        // Obtiene el primer usuario mencionado en el mensaje
        const usuarioEtiquetado = message.mentions.users.first();

        // Si no se menciona a nadie, el comando no se ejecuta
        if (!usuarioEtiquetado) {
            return message.reply('Debes etiquetar a la persona a la que quieres registrar las pepitas.');
        }

        // La expresión regular busca los dos números en el mensaje del juego
        const regex = /Has conseguido (\d+)\s+\[Pepita\],\s+y\s+(\d+)\s+se han redistribuido/;
        const mensajeUsuario = args.join(' ');
        const coincidencias = mensajeUsuario.match(regex);

        if (!coincidencias) {
            return message.reply('El formato del mensaje no es válido. Asegúrate de copiar todo el texto del juego.');
        }

        // A partir de aquí, el código utiliza los datos del usuario etiquetado
        const personaje = usuarioEtiquetado.username;
        const inventarioReciclado = parseInt(coincidencias[1]);
        const prismaReciclado = parseInt(coincidencias[2]);

        // Verificamos si el jugador ya ha registrado pepitas hoy
        // Se usa el ID del usuario etiquetado
        const datosJugador = sesionPepitas.get(usuarioEtiquetado.id);

        let inventarioTotal = inventarioReciclado;
        let prismaTotal = prismaReciclado;

        // Si el jugador ya existe, sumamos los nuevos valores a los anteriores
        if (datosJugador) {
            inventarioTotal += datosJugador.inventario;
            prismaTotal += datosJugador.prisma;
        }

        // Realiza los cálculos con los valores totales
        const sumaTotal = inventarioTotal + prismaTotal;
        const gastos = Math.ceil(sumaTotal * 0.2);
        const subtotal = sumaTotal - gastos;
        const totalAPagar = prismaTotal - gastos;

        // Guarda la información en la sesión (o la actualiza) con el ID del usuario etiquetado
        sesionPepitas.set(usuarioEtiquetado.id, {
            personaje,
            inventario: inventarioTotal,
            prisma: prismaTotal,
            gastos,
            subtotal,
            totalAPagar
        });

        message.reply(`¡Datos de pepitas de **${personaje}** registrados y sumados!`);
    },
};