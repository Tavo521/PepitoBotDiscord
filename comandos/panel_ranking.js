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
        await interaction.deferReply({ ephemeral: true });

        const { Puntos } = require('../Pepito.js'); // Solo importamos el modelo aquí
        const serverDofus = interaction.options.getString('servidor');
        
        // CORRECCIÓN: Alineamos el nombre con el valor del Choice
        const nombreDisplay = serverDofus === 'PRINCIPAL' ? 'Dakal' : 'Mikhal';

        try {
            const listaCompleta = await Puntos.findAll({
                where: { gameServer: serverDofus },
                order: [['defensa', 'DESC']],
                limit: 30 
            });

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

            const listaFinal = await Promise.all(listaPromesas);
            const rankingTexto = listaFinal.join('\n') || "No hay datos registrados todavía.";

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
                    // IMPORTANTE: ver_mi_puesto_ (3 partes) + serverDofus (la 4ta parte)
                    .setCustomId(`ver_mi_puesto_${serverDofus}`)
                    .setLabel('Ver mi posición 👤')
                    .setStyle(ButtonStyle.Primary)
            );

        } catch (error) {
            console.error('Error en ranking:', error);
            await interaction.editReply({ content: 'Hubo un error al generar el ranking.' });
        }
    },
};