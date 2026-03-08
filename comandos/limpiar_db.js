const { SlashCommandBuilder, PermissionFlagsBits, ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('limpiar_db')
        .setDescription('Reinicia todos los puntos para una nueva temporada (BORRADO TOTAL).')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        // Importamos Puntos y la función de actualización desde Pepito.js
        const { Puntos, actualizarRankingFijo } = require('../Pepito.js');

        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId('confirmar_borrado').setLabel('SÍ, BORRAR TODO').setStyle(ButtonStyle.Danger),
                new ButtonBuilder().setCustomId('cancelar_borrado').setLabel('No, cancelar').setStyle(ButtonStyle.Secondary),
            );

        const response = await interaction.reply({
            content: '⚠️ **¿ESTÁS SEGURO?**\nEsta acción borrará todos los puntos y reiniciará el Ranking.',
            components: [row],
            flags: [MessageFlags.Ephemeral]
        });

        const filter = i => i.user.id === interaction.user.id;

        const collector = response.createMessageComponentCollector({ 
            filter,
            componentType: ComponentType.Button, 
            time: 30000 
        });

        collector.on('collect', async (i) => {
            if (i.customId === 'confirmar_borrado') {
                try {
                    // 1. Borrar datos de la DB
                    await Puntos.destroy({ where: {}, truncate: false });
                    
                    // 2. ACTUALIZAR EL PANEL DE RANKING
                    // Pasamos interaction.guild para que la función sepa en qué servidor actuar
                    await actualizarRankingFijo(interaction.guild);

                    await i.update({ 
                        content: '✅ **Temporada Reiniciada.** Los puntos y el panel de ranking han sido puestos a 0.', 
                        components: [] 
                    });

                    await interaction.channel.send('📢 **¡Nueva Temporada!** El ranking ha sido reiniciado por un Comandante. ¡A darlo todo! ⚔️');

                } catch (error) {
                    console.error(error);
                    await i.update({ content: '❌ Error al intentar limpiar la base de datos.', components: [] });
                }
            } else if(i.customId === 'cancelar_borrado'){
                await i.update({ 
                    content: '✅ **Acción cancelada.** No se han realizado cambios.', 
                    components: [] 
                });
            }
        });

        collector.on('end', collected => {
            if (collected.size === 0) {
                interaction.editReply({ content: '⏰ Tiempo agotado. Acción cancelada.', components: [] }).catch(() => {});
            }
        });
    },
};