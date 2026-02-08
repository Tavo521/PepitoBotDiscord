const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panel_palabra_clave')
        .setDescription('Gestiona las palabras clave de actividad.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const { Keyword } = require('../Pepito.js');
        const imagePath = path.join(__dirname, '..', 'imagenes', 'Club_asesinos.png');
        const file = new AttachmentBuilder(imagePath);

        // 1. Consultamos todas las palabras de la base de datos
        const keywords = await Keyword.findAll();

        const panelEmbed = new EmbedBuilder()
            .setColor(0xED820E)
            .setTitle('🔑 Configuración de Palabras Clave')
            .setDescription('Este panel permite ver las palabras clave actuales (Los comandantes podran añadir o editar y eliminar palabras)')
            .setThumbnail('attachment://Club_asesinos.png')
            .setTimestamp();

        if (keywords.length === 0) {
            panelEmbed.setDescription('⚠️ No hay palabras clave configuradas en la base de datos.');
        } else {
            // 2. Lógica para agrupar dinámicamente por categorías
            // Obtenemos una lista de categorías únicas (ATAQUE, DEFENSA, etc.)
            const categorias = [...new Set(keywords.map(k => k.category))];

            categorias.forEach(cat => {
                // Filtramos las palabras que pertenecen a esta categoría
                const lista = keywords
                    .filter(k => k.category === cat)
                    .map(k => `\`${k.word}\` ➔ ${k.points} pts`)
                    .join('\n');

                // Añadimos una sección (field) por cada categoría
                panelEmbed.addFields({
                    name: `⚔️ ${cat.toUpperCase()}`,
                    value: lista,
                    inline: true
                });
            });
        }

        // 3. Botones para los Comandantes
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('kw_add')
                .setLabel('Añadir/Editar')
                .setStyle(ButtonStyle.Success),
            new ButtonBuilder()
                .setCustomId('kw_del')
                .setLabel('Eliminar')
                .setStyle(ButtonStyle.Danger)
        );

        await interaction.reply({
            embeds: [panelEmbed],
            files: [file],
            components: [row]
        });
    },
};