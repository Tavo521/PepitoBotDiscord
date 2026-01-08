// 1. Añadimos AttachmentBuilder a la importación y traemos 'path'
const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panel_palabra_clave')
        .setDescription('Muestra el panel de gestión de palabras clave.'),
    async execute(interaction) {
        // 2. Definimos la ruta de forma segura
        const imagePath = path.join(__dirname, '..', 'imagenes', 'Club_asesinos.png');
        const file = new AttachmentBuilder(imagePath);

        const panelEmbed = new EmbedBuilder()
            .setColor(0xED820E)
            .setTitle('🔑 Palabras Clave de Actividad')
            .setDescription('Usa una de estas palabras al inicio de tu mensaje de sumisión junto a una imagen.')
            .setThumbnail('attachment://Club_asesinos.png')
            .addFields(
                { 
                    name: '⚔️ ATK', 
                    value: '`atkperco` ➔ 5 pts\n`atkprisma` ➔ 2 pts', 
                    inline: true 
                },
                { 
                    name: '⚔️ AVA', 
                    value: '`ava` ➔ 5 pts', 
                    inline: true 
                },
                { 
                    name: '⚔️ DEF', 
                    value: '`def1` ➔ 2 pts\n`def2` ➔ 4 pts\n`def3` ➔ 6 pts\n`def4` ➔ 8 pts\n`def5` ➔ 10 pts', 
                    inline: true 
                },
                { 
                    name: '⚔️ TIME', 
                    value: '`time5` ➔ 1 pts\n`time10` ➔ 2 pts\n`time20` ➔ 3 pts\n`time30` ➔ 4 pts\n`time40` ➔ 5 pts', 
                    inline: true 
                }
            );

        // 3. ENVIAR EL ARCHIVO: Es vital incluir 'files: [file]'
        await interaction.reply({ embeds: [panelEmbed], files: [file] });
    },
};