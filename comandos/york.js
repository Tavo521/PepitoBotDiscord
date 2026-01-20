const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');

// Mapa para gestionar el tiempo de espera (Cooldown)
const cooldowns = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('york')
        .setDescription('Intenta igualar el golpe legendario de York (3000 de daño).'),

    async execute(interaction) {
        const { Puntos, GlobalConfig } = require('../Pepito.js'); // Usamos tu DB
        const userId = interaction.user.id;
        const cooldownAmount = 1 * 60 * 1000; // 1 minuto
        const now = Date.now();

        // --- LÓGICA DE COOLDOWN ---
        if (cooldowns.has(userId)) {
            const expirationTime = cooldowns.get(userId) + cooldownAmount;
            if (now < expirationTime) {
                const timeLeft = Math.ceil((expirationTime - now) / 1000);
                return interaction.reply({ 
                    content: `⏳ Estás cansado... espera **${timeLeft} segundos** para volver a golpear.`, 
                    ephemeral: true 
                });
            }
        }
        cooldowns.set(userId, now);

        // --- LÓGICA DEL JUEGO ---
        const dano = Math.floor(Math.random() * 3000) + 1;
        let mensajeRespuesta = "";
        let colorEmbed = 0x3498DB; // Azul por defecto

        if (dano === 3000) {
            mensajeRespuesta = `¡@everyone! 🚨 ¡¡INCREÍBLE!! **${interaction.user.username}** ha alcanzado la perfección. ¡3000 de daño! York está llorando de la emoción 🥳🎉`;
            colorEmbed = 0xFFD700; // Dorado
        } else if (dano >= 2500) {
            mensajeRespuesta = `¡Ufff! Casi lo logras. Daño: **${dano}**. York te mira con respeto.`;
            colorEmbed = 0xE67E22; // Naranja
        } else if (dano >= 1500) {
            mensajeRespuesta = `Golpe decente: **${dano}**. Si York pudo, tú también puedes... supongo.`;
        } else if (dano >= 500) {
            mensajeRespuesta = `Daño: **${dano}**. Tienes que mejorar esa técnica si quieres ser un Asesino.`;
        } else {
            mensajeRespuesta = `¿Eso fue un golpe o una caricia? Daño: **${dano}**. Mejorate el set, manco. Atentamente: York.`;
            colorEmbed = 0xE74C3C; // Rojo
        }

        // --- LÓGICA DE RÉCORD (DINÁMICO) ---
        // Buscamos si hay un récord guardado
        const recordActual = await GlobalConfig.findByPk('record_york');
        const recordValor = recordActual ? parseInt(recordActual.value) : 0;
        let esNuevoRecord = false;

        if (dano > recordValor) {
            await GlobalConfig.upsert({ key: 'record_york', value: dano.toString() });
            await GlobalConfig.upsert({ key: 'record_york_user', value: interaction.user.username });
            esNuevoRecord = true;
        }

        // --- RESPUESTA EN EMBED ---
        const embed = new EmbedBuilder()
            .setColor(colorEmbed)
            .setTitle('🥊 Entrenamiento con el Punch')
            .setDescription(mensajeRespuesta)
            .addFields(
                { name: '💥 Tu Daño', value: `\`${dano}\``, inline: true },
                { name: '🏆 Récord Actual', value: `${recordActual ? recordActual.value : '0'} (por ${recordActual ? (await GlobalConfig.findByPk('record_york_user')).value : 'Nadie'})`, inline: true }
            )
            .setTimestamp();

        if (esNuevoRecord && dano < 3000) {
            embed.setFooter({ text: '✨ ¡Acabas de establecer un nuevo récord personal/global!' });
        }

        return interaction.reply({ embeds: [embed] });
    },
};