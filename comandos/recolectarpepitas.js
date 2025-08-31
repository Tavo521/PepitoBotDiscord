// /events/messageCreate.js
const sesionPepitas = require('../sesionPepitas');

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        // Ignora los mensajes de bots para evitar bucles.
        if (message.author.bot) return;

        // Verifica si el mensaje fue enviado en el canal "reciclaje-de-pepitas"
        if (message.channel.name !== 'reciclaje-de-pepitas') {
            return;
        }

        // Expresión regular para buscar los números
        const regex = /Has conseguido (\d+)\s+\[Pepita\],\s+y\s+(\d+)\s+se han redistribuido/;
        const coincidencias = message.content.match(regex);

        // Si el mensaje no coincide con el formato, lo ignora
        if (!coincidencias) {
            return;
        }

        const personaje = message.author.username;
        const inventarioReciclado = parseInt(coincidencias[1]);
        const prismaReciclado = parseInt(coincidencias[2]);

        // Obtiene los datos existentes del jugador
        const datosJugador = sesionPepitas.get(message.author.id);

        let inventarioTotal = inventarioReciclado;
        let prismaTotal = prismaReciclado;
        
        // Suma los nuevos valores a los anteriores si ya existen
        if (datosJugador) {
            inventarioTotal += datosJugador.inventario;
            prismaTotal += datosJugador.prisma;
        }

        // Realiza los cálculos con los valores totales
        const sumaTotal = inventarioTotal + prismaTotal;
        const gastos = Math.ceil(sumaTotal * 0.2);
        const subtotal = sumaTotal - gastos;
        const totalAPagar = prismaTotal - gastos;

        // Guarda la información
        sesionPepitas.set(message.author.id, {
            personaje,
            inventario: inventarioTotal,
            prisma: prismaTotal,
            gastos,
            subtotal,
            totalAPagar
        });

        message.reply(`¡Pepitas de **${personaje}** registradas y sumadas!`);
    },
};