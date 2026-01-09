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

            // 4. Definición de Franjas (4 Niveles)
            const franjas = [
                { nombre: 'PvP T1 Perco (Zona 1 a 100 🐴)', min: 0, cant: '1 Perco' },
                { nombre: 'PvP T2 Percos (Zonas 1 a 160 🐴)', min: 40, cant: '3 Percos' },
                { nombre: 'PvP T3 Percos (Zonas 1 a 180 🐴)', min: 80, cant: '5 Percos' },
                { nombre: 'PvP T4 Percos (Zonas 1 a 200 🐴)', min: 100, cant: '7 Percos' }
            ];

            // 5. Lógica para determinar Rango Actual y Próximo Objetivo
            let rangoActual = franjas[0];
            let proximoRango = null;

            for (let i = 0; i < franjas.length; i++) {
                if (puntosActuales >= franjas[i].min) {
                    rangoActual = franjas[i];
                    proximoRango = franjas[i + 1] || null;
                }
            }

            // 6. Preparar el Embed
            const imagePath = path.join(__dirname, '..', 'imagenes', 'Club_asesinos.png');
            const file = new AttachmentBuilder(imagePath);

            const embed = new EmbedBuilder()
                .setColor(0x00AE86) // Color turquesa
                .setTitle(`👤 Perfil de Participación: ${nombreAMostrar}`)
                .setThumbnail('attachment://Club_asesinos.png')
                .addFields(
                    { name: '⭐ Puntos Totales', value: `**${puntosActuales}** pts`, inline: true },
                    { name: '🏆 Ranking', value: `#${posicion > 0 ? posicion : 'N/A'}`, inline: true },
                    { name: '🛡️ Beneficio Actual', value: `**${rangoActual.cant}**`, inline: true },
                    { name: '📍 Rango Actual', value: `${rangoActual.nombre}`, inline: false }
                );

            // Si hay un siguiente nivel, calcular cuánto falta
            if (proximoRango) {
                const falta = proximoRango.min - puntosActuales;
                embed.addFields({ 
                    name: `🚀 Siguiente Objetivo: ${proximoRango.cant}`, 
                    value: `Te faltan **${falta}** puntos para alcanzar: \n*${proximoRango.nombre}*` 
                });
            } else {
                embed.addFields({ name: '🔥 Estatus', value: '¡Has alcanzado el rango máximo de participación!' });
            }

            embed.setFooter({ text: 'Consulta tus puntos con /panel_perfil' })
                 .setTimestamp();

            await interaction.reply({ embeds: [embed], files: [file] });

        } catch (error) {
            console.error('Error en /panel_perfil:', error);
            await interaction.reply({ content: 'Hubo un error al consultar tu perfil.', ephemeral: true });
        }
    },
};