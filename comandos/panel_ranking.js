const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ranking')
        .setDescription('Muestra el Top 10 de miembros más activos.'),
    async execute(interaction) {
        // Importamos el modelo Puntos desde pepito.js
        const { Puntos } = require('../Pepito.js');

        try {
            // 1. Obtener los 10 mejores puntajes
            const listaCompleta = await Puntos.findAll({
                limit: 10,
                order: [['defensa', 'DESC']],
            });

            if (listaCompleta.length === 0) {
                return interaction.reply('Aún no hay puntos registrados en el ranking.');
            }

            // 2. CORRECCIÓN: Buscamos los nombres de forma asíncrona (Fetch)
            const listaPromesas = listaCompleta.map(async (u, index) => {
                let nombre = "Desconocido";
                try {
                    // Forzamos la búsqueda del miembro en el servidor
                    const miembro = await interaction.guild.members.fetch(u.userId);
                    nombre = miembro.displayName;
                } catch (e) {
                    // Si el usuario ya no está en el servidor
                    nombre = `Ex-miembro (${u.userId})`;
                }
                
                // Formateo de medallas para el top 3
                let medalla = "";
                if (index === 0) medalla = "🥇 ";
                else if (index === 1) medalla = "🥈 ";
                else if (index === 2) medalla = "🥉 ";
                else medalla = `${index + 1}. `;

                return `${medalla}**${nombre}** — ${u.defensa} pts`;
            });

            // Esperamos a que todos los nombres sean encontrados
            const listaFinal = await Promise.all(listaPromesas);
            const rankingTexto = listaFinal.join('\n');

            // 3. Preparar el Embed y la imagen
            const imagePath = path.join(__dirname, '..', 'imagenes', 'Club_asesinos.png');
            const file = new AttachmentBuilder(imagePath);

            const embed = new EmbedBuilder()
                .setColor(0xf1c40f) // Color Oro
                .setTitle('🏆 Top 10 - Gremio Club Asesinos')
                .setThumbnail('attachment://Club_asesinos.png')
                .setDescription(rankingTexto)
                .setFooter({ text: 'Sigue sumando evidencias para subir en el ranking' })
                .setTimestamp();

            await interaction.reply({ embeds: [embed], files: [file] });

        } catch (error) {
            console.error('Error en ranking:', error);
            await interaction.reply({ content: 'Hubo un error al generar el ranking.', ephemeral: true });
        }
    },
};