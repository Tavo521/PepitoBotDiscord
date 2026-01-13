const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panel_ranking')
        .setDescription('Establece el mensaje de ranking fijo en este canal.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),
    async execute(interaction) {
        // 1. PRIMERO: Avisamos a Discord que tardaremos (esto evita el error 10062)
        await interaction.deferReply({ ephemeral: true });

        const { Puntos } = require('../Pepito.js');

        try {
            // 2. Obtener los puntajes
            const listaCompleta = await Puntos.findAll({
                order: [['defensa', 'DESC']],
            });

            if (listaCompleta.length === 0) {
                return interaction.editReply('Aún no hay puntos registrados en el ranking.');
            }

            // 3. Obtener nombres de forma asíncrona
            const listaPromesas = listaCompleta.map(async (u, index) => {
                let nombre = "Desconocido";
                try {
                    const miembro = await interaction.guild.members.fetch(u.userId);
                    nombre = miembro.displayName;
                } catch (e) {
                    nombre = `Ex-miembro (${u.userId})`;
                }
                
                let medalla = (index === 0) ? "🥇 " : (index === 1) ? "🥈 " : (index === 2) ? "🥉 " : `${index + 1}. `;
                return `${medalla}**${nombre}** — ${u.defensa} pts`;
            });

            const listaFinal = await Promise.all(listaPromesas);
            const rankingTexto = listaFinal.join('\n');

            // 4. Preparar imagen y embed
            const imagePath = path.join(__dirname, '..', 'imagenes', 'Club_asesinos.png');
            const file = new AttachmentBuilder(imagePath);

            const embed = new EmbedBuilder()
                .setColor(0xf1c40f)
                .setTitle('🏆 Ranking General - Gremio Club Asesinos')
                .setThumbnail('attachment://Club_asesinos.png')
                .setDescription(rankingTexto)
                .setFooter({ text: 'Sistema de actualización automática activado' })
                .setTimestamp();

            // 5. Enviar el mensaje fijo al canal
            const mensajeEnviado = await interaction.channel.send({ 
                embeds: [embed], 
                files: [file] 
            });

            // 6. Confirmar al usuario usando editReply
            await interaction.editReply({ 
                content: `✅ Ranking establecido con éxito.\n**ID del Mensaje:** \`${mensajeEnviado.id}\`\n**ID del Canal:** \`${interaction.channelId}\`\n\nCopia estos IDs en tu archivo Pepito.js para que la actualización automática funcione.`
            });

        } catch (error) {
            console.error('Error en ranking:', error);
            await interaction.editReply({ content: 'Hubo un error al generar el ranking.' });
        }
    },
};