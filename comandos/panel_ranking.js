const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, PermissionFlagsBits } = require('discord.js');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panel_ranking')
        .setDescription('Establece el mensaje de ranking fijo en este canal.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator), // Solo admins
    async execute(interaction) {
        const { Puntos } = require('../Pepito.js');

        try {
            // 1. Obtener TODOS los puntajes (sin límite)
            const listaCompleta = await Puntos.findAll({
                order: [['defensa', 'DESC']],
            });

            const listaPromesas = listaCompleta.map(async (u, index) => {
                let nombre = "Desconocido";
                try {
                    const miembro = await interaction.guild.members.fetch(u.userId);
                    nombre = miembro.displayName;
                } catch (e) {
                    nombre = `Ex-miembro (${u.userId})`;
                }
                
                let medalla = (index < 3) ? ["🥇 ", "🥈 ", "🥉 "][index] : `${index + 1}. `;
                return `${medalla}**${nombre}** — ${u.defensa} pts`;
            });

            const listaFinal = await Promise.all(listaPromesas);
            const rankingTexto = listaFinal.join('\n') || "Aún no hay puntos.";

            const imagePath = path.join(__dirname, '..', 'imagenes', 'Club_asesinos.png');
            const file = new AttachmentBuilder(imagePath);

            const embed = new EmbedBuilder()
                .setColor(0xf1c40f)
                .setTitle('🏆 Ranking General - Gremio Club Asesinos')
                .setThumbnail('attachment://Club_asesinos.png')
                .setDescription(rankingTexto)
                .setFooter({ text: 'Sistema de actualización automática activado' })
                .setTimestamp();

            // Enviamos el mensaje al canal
            const mensajeEnviado = await interaction.channel.send({ embeds: [embed], files: [file] });

            // Respondemos al comando indicando la ID
            await interaction.reply({ 
                content: `✅ Ranking enviado. \n**IMPORTANTE:** Copia esta ID de mensaje: \`${mensajeEnviado.id}\` y pégala en tu archivo Pepito.js`, 
                ephemeral: true 
            });

        } catch (error) {
            console.error('Error en ranking:', error);
            await interaction.reply({ content: 'Hubo un error al generar el ranking.', ephemeral: true });
        }
    },
};