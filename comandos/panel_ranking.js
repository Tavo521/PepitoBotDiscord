const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panel_ranking')
        .setDescription('Establece el mensaje de ranking fijo para un servidor específico.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
        .addStringOption(option =>
            option.setName('servidor')
                .setDescription('El servidor de Dofus para este ranking')
                .setRequired(true)
                .addChoices(
                    { name: 'Dakal (Principal)', value: 'PRINCIPAL' },
                    { name: 'Mikhal (Server 2)', value: 'SERVER2' }
                )),

    async execute(interaction) {
        console.log(">>> [DEBUG 1] Ejecutando comando /panel_ranking...");
        await interaction.deferReply({ ephemeral: true });

        try {
            console.log(">>> [DEBUG 2] Cargando modelo Puntos desde Pepito.js...");
            const { Puntos } = require('../Pepito.js'); 
            
            const serverDofus = interaction.options.getString('servidor');
            const nombreDisplay = serverDofus === 'PRINCIPAL' ? 'Dakal' : 'Mikhal';
            console.log(`>>> [DEBUG 3] Servidor seleccionado: ${serverDofus} (${nombreDisplay})`);

            // Punto crítico: Consulta a la DB
            console.log(">>> [DEBUG 4] Consultando base de datos SQL...");
            const listaCompleta = await Puntos.findAll({
                where: { gameServer: serverDofus },
                order: [['defensa', 'DESC']],
                limit: 30 
            });
            console.log(`>>> [DEBUG 5] DB respondió. Registros encontrados: ${listaCompleta.length}`);

            const listaPromesas = listaCompleta.map(async (u, index) => {
                let nombre = "Desconocido";
                try {
                    const miembro = await interaction.guild.members.fetch(u.userId);
                    nombre = miembro.displayName;
                } catch (e) {
                    nombre = `Ex-miembro (${u.userId})`;
                }

                const puesto = index + 1;
                let derechos = (puesto <= 10) ? "🔹 **4 :horse: - T2**" : 
                               (puesto <= 20) ? "🔸 **3 :horse: - T2**" : 
                               (puesto <= 30) ? "🔸 **2 :horse:  T2**" : "▫️ **T1**";

                let medalla = (puesto === 1) ? "🥇 " : (puesto === 2) ? "🥈 " : (puesto === 3) ? "🥉 " : `${puesto}. `;
                return `${medalla}**${nombre}** — ${u.defensa} pts | ${derechos}`;
            });

            console.log(">>> [DEBUG 6] Procesando nombres de usuarios...");
            const listaFinal = await Promise.all(listaPromesas);
            const rankingTexto = listaFinal.join('\n') || "No hay datos registrados todavía.";

            console.log(">>> [DEBUG 7] Preparando Embed y Archivos...");
            const imagePath = path.join(__dirname, '..', 'imagenes', 'Club_asesinos.png');
            const file = new AttachmentBuilder(imagePath);

            const embed = new EmbedBuilder()
                .setColor(serverDofus === 'PRINCIPAL' ? 0xf1c40f : 0x3498db)
                .setTitle(`🏆 Top 30 Guerreros - ${nombreDisplay}`)
                .setThumbnail('attachment://Club_asesinos.png')
                .setDescription(rankingTexto)
                .addFields({
                    name: '📌 Información de Rangos',
                    value: '✅ **T2:** Todos los niveles.\n⚠️ **T1:** Solo niveles 140 o menos.',
                    inline: false
                })
                .setFooter({ text: `Ranking oficial de ${nombreDisplay}` })
                .setTimestamp();

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`ver_mi_puesto_${serverDofus}`)
                    .setLabel('Ver mi posición 👤')
                    .setStyle(ButtonStyle.Primary)
            );

            console.log(">>> [DEBUG 8] Intentando enviar respuesta final a Discord...");
            const mensajePanel = await interaction.channel.send({ embeds: [embed], files: [file], components: [row] });
            
            await interaction.editReply({ content: `✅ Panel de ${nombreDisplay} generado con éxito en este canal.` });
            console.log(">>> [DEBUG 9] ¡Comando completado!");

        } catch (error) {
            console.log(">>> [DEBUG ERROR] Se encontró un fallo:");
            console.error(error); 
            if (interaction.deferred) {
                await interaction.editReply({ content: 'Hubo un error al generar el ranking. Revisa la consola del host.' });
            }
        }
    },
};