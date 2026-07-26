const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panel_ranking_percos')
        .setDescription('Muestra la tabla de los miembros más activos de la alianza.'),
    async execute(interaction) {
        // Obtenemos el modelo Puntos definido en pepito.js (o lo importamos aquí)
        // Nota: Como definimos el modelo en pepito.js, lo ideal es que esté accesible.
        // Si no, puedes importarlo o usar la referencia que Sequelize crea globalmente.
        
        // Para este ejemplo, asumiremos que estamos consultando la tabla 'Puntos'
        const { Puntos } = require('../Pepito.js'); 

        try {
            // Consultar todos los usuarios y ordenarlos por puntos 'defensa' descendente
            const listaUsuarios = await Puntos.findAll({
                order: [['defensa', 'DESC']],
                limit: 10 // Top 10 para no saturar el mensaje
            });

            if (listaUsuarios.length === 0) {
                return interaction.reply('Aún no hay registros de puntos en la base de datos.');
            }

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🏆 Tabla de franja de percos')
                .setDescription(`¡Un total de **${listaUsuarios.length}** miembros registrados!`)
                .setThumbnail('attachment://Club_asesinos.png'); // Usa el logo de tu gremio

            // 3. Definición de Franjas por Ranking
            const franjas = [
                { nombre: '🥇 Top 1-5 (8 Percos)', minPos: 1, maxPos: 5 },
                { nombre: '🥈 Top 6-10 (5 Percos)', minPos: 6, maxPos: 10 },
                { nombre: '🥉 Top 11-20 (4 Percos)', minPos: 11, maxPos: 20 }
            ];

            // Consultar Top 20
            const todosLosUsuarios = await Puntos.findAll({
                order: [['defensa', 'DESC']],
                limit: 20
            });

            franjas.forEach(franja => {
                const usuariosEnFranja = todosLosUsuarios.slice(franja.minPos - 1, franja.maxPos);

                let listaTexto = usuariosEnFranja.length > 0 
                    ? usuariosEnFranja.map((u, i) => `\`#${franja.minPos + i}\` <@${u.userId}> ➔ **${u.defensa}** pts`).join('\n')
                    : '*Sin miembros en este puesto.*';

                embed.addFields({ name: franja.nombre, value: listaTexto });
            });

            // Si tienes la imagen local, la adjuntamos
            const path = require('path');
            const { AttachmentBuilder } = require('discord.js');
            const imagePath = path.join(__dirname, '..', 'imagenes', 'Club_asesinos.png');
            const file = new AttachmentBuilder(imagePath);

            await interaction.reply({ embeds: [embed], files: [file] });

        } catch (error) {
            console.error('Error al generar el ranking:', error);
            await interaction.reply({ content: 'Hubo un error al consultar el ranking.', ephemeral: true });
        }
    },
};