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

                // --- LÓGICA DE RANGOS ACTUALIZADA ---
                let rango = "Sin Rango"; 
                if (fila.defensa >= 160) {
                    rango = "T3 6 Percos zona 1-200";
                } else if (fila.defensa >= 80) { // De 80 a 159
                    rango = "T2 2 Perco zona 1-160";
                } else if (fila.defensa >= 1) { // De 1 a 79
                    rango = "T1 1 Percos zona 1-120";
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