const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ayuda')
        .setDescription('Muestra la guía actualizada del sistema de puntos, ranking y percos.'),
    async execute(interaction) {
        // Preparar la imagen local
        const imagePath = path.join(__dirname, '..', 'imagenes', 'Club_asesinos.png');
        const file = new AttachmentBuilder(imagePath);

        const embed = new EmbedBuilder()
            .setColor(0x0099ff)
            .setTitle('🛡️ Manual del Guerrero - Club Asesinos')
            .setThumbnail('attachment://Club_asesinos.png')
            .setDescription('Bienvenido al nuevo sistema de gestión. Ahora tus derechos de recaudador dependen de tu esfuerzo y posición en el ranking.')
            .addFields(
                { 
                    name: '📥 Cómo sumar puntos', 
                    value: 'Sube tu captura en <#1459050628209704990> (evidencias) mencionando a los participantes y usando una **palabra clave**:\n' +
                           '• `atkperco` (5 pts) | `ava` (5 pts) | `atk` (2 pts)\n' +
                           '• `def1` a `def5` (2-10 pts) | `time5` a `time40` (1-5 pts)\n' +
                           '*Nota: Los ataques solo cuentan en objetivos válidos (Okumo/Noctalys).* '
                },
                { 
                    name: '🔘 Validación y Dobles', 
                    value: 'Un **Comandante** validará tu mensaje:\n' +
                           '✅ **Aprobar:** Suma los puntos base.\n' +
                           '🔥 **Puntos Dobles:** ¡Doble recompensa por esfuerzo extra!'
                },
                { 
                    name: '🏆 Distribución de Percos (Por Ranking)', 
                    value: 'Tu capacidad de poner percos se basa en tu puesto actual:\n' +
                           '🥇 **Top 1-10:** 4 Percos T2\n' +
                           '🥈 **Top 11-20:** 3 Percos T2\n' +
                           '🥉 **Top 21-30:** 2 Percos T2\n' +
                           '▫️ **Top 31-40:** 2 Percos T1 (Nivel ≤140)\n' +
                           '▫️ **41 en adelante:** 1 Perco T1 (Nivel ≤140)'
                },
                { 
                    name: '👤 Consulta Rápida', 
                    value: 'En el canal de ranking, usa el botón **"Ver mi posición"** para recibir un mensaje privado con tus puntos exactos y tus derechos actuales.'
                },
                { 
                    name: '⚠️ Definiciones T1/T2', 
                    value: '• **T2:** Todas las franjas de nivel.\n' +
                           '• **T1:** Exclusivo para niveles 140 o menores.'
                }
            )
            .setFooter({ text: 'Club Asesinos - La constancia es nuestra fuerza', iconURL: 'attachment://Club_asesinos.png' })
            .setTimestamp();

        await interaction.reply({ embeds: [embed], files: [file] });
    },
};