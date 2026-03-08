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

                const puesto = index + 1;
                let derechos = "";

                // Lógica de la nueva distribución
                if (puesto <= 10) derechos = "🔹 **4 Percos T2**";
                else if (puesto <= 20) derechos = "🔸 **3 Percos T2**";
                else if (puesto <= 30) derechos = "🔸 **2 Percos T2**";
                else if (puesto <= 40) derechos = "▫️ **2 Percos T1**";
                else derechos = "▫️ **1 Perco T1**";

                let medalla = (puesto === 1) ? "🥇 " : (puesto === 2) ? "🥈 " : (puesto === 3) ? "🥉 " : `${puesto}. `;

                return `${medalla}**${nombre}** — ${u.defensa} pts\n└> ${derechos}`;
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
                .addFields({
                    name: '📌 Información de Rangos',
                    value: '✅ **T2:** Todos los niveles.\n⚠️ **T1:** Solo niveles 140 o menos.',
                    inline: false
                })
                .setFooter({ text: 'La cantidad de percos se actualiza con tu posición en el ranking.' })
                .setTimestamp();

            // 5. Enviar el mensaje fijo al canal
            const mensajeEnviado = await interaction.channel.send({
                embeds: [embed],
                files: [file]
            });

        } catch (error) {
            console.error('Error en ranking:', error);
            await interaction.editReply({ content: 'Hubo un error al generar el ranking.' });
        }
    },
};