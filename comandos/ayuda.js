const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ayuda')
        .setDescription('Muestra la guía de uso del sistema de puntos y rangos.'),
    async execute(interaction) {
        // Preparar la imagen local
        const imagePath = path.join(__dirname, '..', 'imagenes', 'Club_asesinos.png');
        const file = new AttachmentBuilder(imagePath);

        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('🛡️ Manual del Sistema de Evidencias')
            .setThumbnail('attachment://Club_asesinos.png')
            .setDescription('Bienvenido al sistema de gestión de actividad. Aquí tienes todo lo que necesitas saber para subir de rango.')
            .addFields(
                { 
                    name: '📥 Cómo sumar puntos', 
                    value: 'Sube tu captura en <#evidencias> mencionando a los participantes y usando una **palabra clave**:\n' +
                           '• `atkperco` (5 pts) **Los ataques de percos contaran cuando sea OKUMO o NOCTALYS** | `atkprisma` (2 pts) | `ava` (5 pts)\n' +
                           '• `def1` a `def5` (2-10 pts) | `time5` a `time40` (1-5 pts)'
                },
                { 
                    name: '🔘 Validación', 
                    value: 'Un **Comandante** debe aprobar tu mensaje con ✅ o 🔥 (Puntos Dobles) para que los puntos se registren.'
                },
                { 
                    name: '👤 Consultar tu Estado', 
                    value: 'Usa **/perfil** para ver tus puntos, tu rango actual y cuánto te falta para el siguiente nivel.'
                },
                { 
                    name: '🏆 Ver el Ranking', 
                    value: 'Puedes ver el ranking de la alianza en el canal 🏆-ranking. se actualiza de manera automatica cada vez.'
                },
                { 
                    name: '🐴 Niveles de Percos', 
                    value: '• **T1 (1 Perco - Zona 1 a 120 🐴): ** 0-80 pts\n' +
                           '• **T2 (2 Percos - Zona 1 a 160 🐴):** 40-79 pts\n' +
                           '• **T3 (6 Percos - Zona 1 a 200 🐴):** 160+ pts'
                }
            )
            .setFooter({ text: 'Sistema de Gestión - Club Asesinos', iconURL: 'attachment://Club_asesinos.png' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], files: [file] });
    },
};