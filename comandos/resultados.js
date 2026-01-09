const { AttachmentBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'resultados',
    async execute(message, args) {
        // 1. Verificación de permisos (Solo Administradores)
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ No tienes permisos para generar reportes.');
        }

        const { Puntos } = require('../Pepito.js');

        try {
            // 2. Obtener usuarios ordenados
            const listaCompleta = await Puntos.findAll({
                order: [['defensa', 'DESC']]
            });

            if (listaCompleta.length === 0) {
                return message.reply('No hay datos registrados en la base de datos.');
            }

            // 3. Definición de las 4 franjas
            const franjas = [
                { nombre: 'T4 (7 Percos)', min: 100 },
                { nombre: 'T3 (5 Percos)', min: 80 },
                { nombre: 'T2 (3 Percos)', min: 40 },
                { nombre: 'T1 (1 Perco) ', min: 0 }
            ];

            // 4. Construcción del texto del reporte
            let reporte = `📋 REPORTE FINAL DE TEMPORADA - CLUB ASESINOS\n`;
            reporte += `Generado el: ${new Date().toLocaleString()}\n`;
            reporte += `Total Participantes: ${listaCompleta.length}\n`;
            reporte += `----------------------------------------------------------\n`;
            reporte += `${'POS'.padEnd(5)} ${'RANGO'.padEnd(15)} ${'USUARIO'.padEnd(25)} | PUNTOS\n`;
            reporte += `----------------------------------------------------------\n`;

            listaCompleta.forEach((u, index) => {
                const miembro = message.guild.members.cache.get(u.userId);
                const nombre = miembro ? miembro.displayName : `ID: ${u.userId}`;
                
                // Buscar la franja correspondiente
                const rangoAlcanzado = franjas.find(f => u.defensa >= f.min)?.nombre || 'Sin Rango';

                const pos = (index + 1).toString().padStart(2, '0');
                reporte += `${pos.padEnd(5)} ${rangoAlcanzado.padEnd(15)} ${nombre.padEnd(25)} | ${u.defensa} pts\n`;
            });

            reporte += `----------------------------------------------------------\n`;
            reporte += `Fin del reporte.`;

            // 5. Crear archivo y enviar
            const buffer = Buffer.from(reporte, 'utf-8');
            const attachment = new AttachmentBuilder(buffer, { name: 'resultados_finales.txt' });

            await message.channel.send({
                content: '📊 **Reporte completo de la temporada generado (T1 a T4).**',
                files: [attachment]
            });

        } catch (error) {
            console.error('Error al generar reporte:', error);
            message.reply('Hubo un error al procesar el reporte de resultados.');
        }
    },
};