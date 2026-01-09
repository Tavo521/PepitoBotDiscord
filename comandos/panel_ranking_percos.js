const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('panel_ranking_percos')
        .setDescription('Muestra la tabla de los miembros más activos de la alianza.'),
    async execute(interaction) {
        // Obtenemos el modelo Puntos definido en pepito.js (o lo importamos aquí)
        // Nota: Como definimos el modelo en pepito.js, lo ideal es que esté accesible.
        // Si no, puedes importarlo o usar la referencia que Sequelize crea globalmente.
        
        // Para este ejemplo, asumiremos que estamos consultando la tabla 'Puntos'
        const { Puntos } = require('../Pepito.js'); 

        try {
            // Consultar todos los usuarios y ordenarlos por puntos 'defensa' descendente
            const listaUsuarios = await Puntos.findAll({
                order: [['defensa', 'DESC']],
                limit: 10 // Top 10 para no saturar el mensaje
            });

            if (listaUsuarios.length === 0) {
                return interaction.reply('Aún no hay registros de puntos en la base de datos.');
            }

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🏆 Tabla de franja de percos')
                .setDescription(`¡Un total de **${listaUsuarios.length}** miembros registrados!`)
                .setThumbnail('attachment://Club_asesinos.png'); // Usa el logo de tu gremio

            // 3. Definición de Franjas
            const franjas = [
                { nombre: 'PvP T1 Perco (Zona 1 a 100 🐴)', min: 0, cant: '1 Perco' },
                { nombre: 'PvP T2 Percos (Zonas 1 a 160 🐴)', min: 40, cant: '3 Percos' },
                { nombre: 'PvP T3 Percos (Zonas 1 a 180 🐴)', min: 80, cant: '5 Percos' },
                { nombre: 'PvP T4 Percos (Zonas 1 a 200 🐴)', min: 100, cant: '7 Percos' }
            ];

            franjas.forEach(franja => {
                const usuariosEnFranja = listaUsuarios.filter(u => 
                    u.defensa >= franja.min && 
                    (franjas.find(f => f.min > franja.min) ? u.defensa < franjas.find(f => f.min > franja.min).min : true)
                );

                let listaTexto = usuariosEnFranja.length > 0 
                    ? usuariosEnFranja.map((u, i) => `\`0${i + 1}\` <@${u.userId}> ➔ **${u.defensa}** pts`).join('\n')
                    : '*Aún no hay participantes en esta franja.*';

                embed.addFields({ name: franja.nombre, value: listaTexto });
            });

            // Si tienes la imagen local, la adjuntamos
            const path = require('path');
            const { AttachmentBuilder } = require('discord.js');
            const imagePath = path.join(__dirname, '..', 'imagenes', 'Club_asesinos.png');
            const file = new AttachmentBuilder(imagePath);

            await interaction.reply({ embeds: [embed], files: [file] });

        } catch (error) {
            console.error('Error al generar el ranking:', error);
            await interaction.reply({ content: 'Hubo un error al consultar el ranking.', ephemeral: true });
        }
    },
};