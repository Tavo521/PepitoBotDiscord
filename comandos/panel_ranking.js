const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panel_ranking')
        .setDescription('Muestra el Top 10 de los miembros con más puntos.'),
    async execute(interaction) {
        // Importamos el modelo Puntos desde pepito.js
        const { Puntos } = require('../Pepito.js');

        try {
            // Consulta: Traer los 10 mejores ordenados por puntos de defensa
            const listaUsuarios = await Puntos.findAll({
                order: [['defensa', 'DESC']],
                limit: 10
            });

            if (listaUsuarios.length === 0) {
                return interaction.reply({ content: 'Aún no hay registros de puntos en la base de datos.', ephemeral: true });
            }

            // Preparar la imagen local para el logo
            const imagePath = path.join(__dirname, '..', 'imagenes', 'Club_asesinos.png');
            const file = new AttachmentBuilder(imagePath);

            // Construir la lista de texto
            const leaderboard = listaUsuarios.map((u, index) => {
                const puesto = index + 1;
                const medalla = puesto === 1 ? '🥇' : puesto === 2 ? '🥈' : puesto === 3 ? '🥉' : `\`#${puesto}\``;
                const nombre = interaction.guild.members.cache.get(u.userId)?.displayName || 'Miembro';
                return `${medalla} **${nombre}** — ${u.defensa} pts`;
            }).join('\n');

            const embed = new EmbedBuilder()
                .setColor(0xFFA500) // Color naranja/oro
                .setTitle('🏆 Top 10 - Líderes de Actividad')
                .setDescription(leaderboard)
                .setThumbnail('attachment://Club_asesinos.png')
                .setFooter({ text: 'Sigue participando en #evidencias para subir en el ranking' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], files: [file] });

        } catch (error) {
            console.error('Error al generar el ranking:', error);
            await interaction.reply({ content: 'Hubo un error al consultar la base de datos.', ephemeral: true });
        }
    },
};