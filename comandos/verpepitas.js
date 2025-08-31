// /commands/verpepitas.js
const sesionPepitas = require('../sesionPepitas');

module.exports = {
    name: 'verpepitas',
    description: 'Muestra la tabla de pepitas recicladas de la sesión actual.',
    execute(message, args) {
        if (sesionPepitas.size === 0) {
            return message.channel.send('Aún no hay datos de pepitas registrados en esta sesión.');
        }

        let mensajeTabla = `\`\`\`
--------------------------------------------------------------------------------------------------------------------------------
| Personaje       | Inventario  | Prisma      | Gastos (-20%) | SubTotal    | Total a Pagar |
--------------------------------------------------------------------------------------------------------------------------------\n`;

        let totalFinalAPagar = 0;

        // Itera sobre todos los registros en la colección
        sesionPepitas.forEach(data => {
            mensajeTabla += `| ${data.personaje.padEnd(15)} | ${String(data.inventario).padEnd(11)} | ${String(data.prisma).padEnd(11)} | ${String(data.gastos).padEnd(13)} | ${String(data.subtotal).padEnd(11)} | ${String(data.totalAPagar).padEnd(13)} |\n`;
            totalFinalAPagar += data.totalAPagar;
        });

        mensajeTabla += `--------------------------------------------------------------------------------------------------------------------------------
| TOTAL:  |                                                                                | ${String(totalFinalAPagar).padEnd(13)} |
--------------------------------------------------------------------------------------------------------------------------------\n`;
        mensajeTabla += '```';

        message.channel.send(mensajeTabla);
    },
};