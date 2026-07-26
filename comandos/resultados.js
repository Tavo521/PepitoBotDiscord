const { SlashCommandBuilder, AttachmentBuilder, PermissionFlagsBits, MessageFlags } = require('discord.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('generar_reporte')
        .setDescription('Genera un archivo .txt con los rangos específicos del gremio.')
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const { Puntos } = require('../Pepito.js'); 

        try {
            await interaction.deferReply({ flags: [MessageFlags.Ephemeral] });

            const listaDB = await Puntos.findAll({
                order: [['defensa', 'DESC']],
            });

            if (listaDB.length === 0) {
                return interaction.editReply("❌ No hay datos registrados en la base de datos.");
            }

            let contenidoReporte = "REPORTE OFICIAL DE RANGOS - CLUB ASESINOS\n";
            contenidoReporte += `Fecha: ${new Date().toLocaleString()}\n`;
            contenidoReporte += "===========================================================================\n";
            contenidoReporte += "POS | USUARIO              | PUNTOS | RANGO\n";
            contenidoReporte += "---------------------------------------------------------------------------\n";

            for (let i = 0; i < listaDB.length; i++) {
                const fila = listaDB[i];
                let nombreDisplay = "Desconocido";

                try {
                    const miembro = await interaction.guild.members.fetch(fila.userId);
                    nombreDisplay = miembro.displayName;
                } catch (e) {
                    nombreDisplay = `ID:${fila.userId}`;
                }

                // --- LÓGICA DE DERECHOS POR RANKING ---
                let rango = "Sin Percos"; 
                const puesto = i + 1;
                if (puesto <= 5) {
                    rango = "8 Percos";
                } else if (puesto <= 10) {
                    rango = "5 Percos";
                } else if (puesto <= 20) {
                    rango = "4 Percos";
                }

                // Formateo de columnas (ajustado para nombres largos de rango)
                const pos = (i + 1).toString().padStart(3, ' ');
                const user = nombreDisplay.padEnd(20).substring(0, 20);
                const pts = fila.defensa.toString().padStart(6, ' ');
                const rng = rango; // Al final de la línea no necesita padEnd fijo

                contenidoReporte += `${pos} | ${user} | ${pts} | ${rng}\n`;
            }

            contenidoReporte += "===========================================================================\n";
            contenidoReporte += "FIN DEL REPORTE.";

            const buffer = Buffer.from(contenidoReporte, 'utf-8');
            const attachment = new AttachmentBuilder(buffer, { name: 'Reporte_Rangos_Asesinos.txt' });

            await interaction.editReply({
                content: "✅ Reporte de rangos generado exitosamente.",
                files: [attachment]
            });

        } catch (error) {
            console.error("Error al generar el reporte:", error);
            await interaction.editReply("❌ Hubo un error al procesar los rangos.");
        }
    },
};