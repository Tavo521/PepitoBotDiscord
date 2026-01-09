const { AttachmentBuilder, PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'resultados',
    async execute(message, args) {
        // 1. Verificación de permisos (Solo Administradores)
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ No tienes permisos para generar reportes.');
        }

        // CORRECCIÓN: Nombre de archivo en minúscula para el hosting
        const { Puntos } = require('../Pepito.js');

        try {
            // 2. Obtener todos los usuarios de la DB ordenados por puntos
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

            // 4. CORRECCIÓN: Obtener nombres de forma asíncrona para el reporte
            const lineasReporte = await Promise.all(listaCompleta.map(async (u, index) => {
                let nombre = "Desconocido";
                try {
                    // Buscamos al miembro en el servidor por su ID
                    const miembro = await message.guild.members.fetch(u.userId);
                    nombre = miembro.displayName;
                } catch (e) {
                    nombre = `ID:${u.userId} (Salió del gremio)`;
                }
                
                // Buscar la franja correspondiente
                const rangoAlcanzado = franjas.find(f => u.defensa >= f.min)?.nombre || 'Sin Rango';
                const pos = (index + 1).toString().padStart(2, '0');

                // Retornamos la línea formateada
                return `${pos.padEnd(5)} ${rangoAlcanzado.padEnd(15)} ${nombre.padEnd(25)} | ${u.defensa} pts`;
            }));

            // 5. Construcción del texto final del reporte
            let reporte = `📋 REPORTE FINAL DE TEMPORADA - CLUB ASESINOS\n`;
            reporte += `Generado el: ${new Date().toLocaleString()}\n`;
            reporte += `Total Participantes: ${listaCompleta.length}\n`;
            reporte += `----------------------------------------------------------\n`;
            reporte += `${'POS'.padEnd(5)} ${'RANGO'.padEnd(15)} ${'USUARIO'.padEnd(25)} | PUNTOS\n`;
            reporte += `----------------------------------------------------------\n`;
            
            reporte += lineasReporte.join('\n');

            reporte += `\n----------------------------------------------------------\n`;
            reporte += `Fin del reporte.`;

            // 6. Crear archivo y enviar
            const buffer = Buffer.from(reporte, 'utf-8');
            const attachment = new AttachmentBuilder(buffer, { name: 'resultados_finales_asesinos.txt' });

            await message.channel.send({
                content: '📊 **Reporte completo de la temporada generado.** Los nombres han sido sincronizados correctamente.',
                files: [attachment]
            });

        } catch (error) {
            console.error('Error al generar reporte:', error);
            message.reply('Hubo un error al procesar el reporte de resultados.');
        }
    },
};