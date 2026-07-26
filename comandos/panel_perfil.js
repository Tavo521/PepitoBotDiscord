const { SlashCommandBuilder, EmbedBuilder, AttachmentBuilder } = require('discord.js');
const path = require('path');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panel_perfil')
        .setDescription('Consulta tu participación personal y rango PvP.'),
    async execute(interaction) {
        // CORRECCIÓN: Importación en minúscula para evitar errores en hosting Linux
        const { Puntos } = require('../Pepito.js');

        try {
            // 1. Obtener datos del usuario en la DB
            const datosUsuario = await Puntos.findOne({ where: { userId: interaction.user.id } });
            const puntosActuales = datosUsuario ? datosUsuario.defensa : 0;

            // 2. Calcular posición en el ranking
            const todosLosUsuarios = await Puntos.findAll({ order: [['defensa', 'DESC']] });
            const posicion = todosLosUsuarios.findIndex(u => u.userId === interaction.user.id) + 1;

            // 3. Forzar obtención del nombre actualizado (Fetch)
            // Esto evita que salga "Miembro" si el bot acaba de reiniciar
            const miembro = await interaction.guild.members.fetch(interaction.user.id);
            const nombreAMostrar = miembro.displayName;

            // 4. Determinar derechos por Ranking
            let derechos = "Sin Percos";
            if (posicion >= 1 && posicion <= 5) derechos = "8 Percos";
            else if (posicion <= 10) derechos = "5 Percos";
            else if (posicion <= 20) derechos = "4 Percos";

            // 5. Preparar el Embed
            const imagePath = path.join(__dirname, '..', 'imagenes', 'Club_asesinos.png');
            const file = new AttachmentBuilder(imagePath);

            const embed = new EmbedBuilder()
                .setColor(0x00AE86) // Color turquesa
                .setTitle(`👤 Perfil de Participación: ${nombreAMostrar}`)
                .setThumbnail('attachment://Club_asesinos.png')
                .addFields(
                    { name: '⭐ Puntos Totales', value: `**${puntosActuales}** pts`, inline: true },
                    { name: '🏆 Ranking', value: `#${posicion > 0 ? posicion : 'N/A'}`, inline: true },
                    { name: '🛡️ Beneficio Actual', value: `**${derechos}**`, inline: true }
                );

            embed.setFooter({ text: 'Consulta tus puntos con /panel_perfil' })
                 .setTimestamp();

            await interaction.reply({ embeds: [embed], files: [file] });

        } catch (error) {
            console.error('Error en /panel_perfil:', error);
            await interaction.reply({ content: 'Hubo un error al consultar tu perfil.', ephemeral: true });
        }
    },
};