require("dotenv").config();
const { Client, Collection, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } = require("discord.js");
const fs = require("fs");
const path = require("path");
const { Sequelize, DataTypes } = require('sequelize');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

// --- CONFIGURACIÓN DE BASE DE DATOS (MySQL) ---
const sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
        host: process.env.DB_HOST,
        port: process.env.DB_PORT || 3306,
        dialect: 'mysql',
        logging: false,
    }
);

const Puntos = sequelize.define('Puntos', {
    userId: { type: DataTypes.STRING, primaryKey: true },
    defensa: { type: DataTypes.INTEGER, defaultValue: 0 },
});

sequelize.authenticate()
    .then(() => {
        console.log('✅ Conexión a MySQL establecida.');
        return Puntos.sync();
    })
    .catch(err => console.error('❌ Error conectando a MySQL:', err));

// --- CARGA DE COMANDOS ---
client.commands = new Collection();
const commandsPath = path.join(__dirname, "comandos");
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    const name = command.data ? command.data.name : command.name;
    if (name) {
        client.commands.set(name, command);
        console.log(`Comando cargado: ${name}`);
    }
}

// --- EVENTO 1: Solicitud de Puntos ---
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;
    if (message.channel.name.toLowerCase() !== "⚔️-evidencias") return;

    const puntosKeywords = {
        'atkperco': 5, 'atkprisma': 2, 'ava': 5,
        'def1': 2, 'def2': 4, 'def3': 6, 'def4': 8, 'def5': 10,
        'time5': 1, 'time10': 2, 'time20': 3, 'time30': 4, 'time40': 5
    };

    let puntosBase = 0;
    const contenido = message.content.toLowerCase();

    for (const key in puntosKeywords) {
        if (contenido.includes(key)) {
            puntosBase = puntosKeywords[key];
            break; 
        }
    }

    const usuariosMencionados = message.mentions.users;

    if (usuariosMencionados.size > 0 && puntosBase > 0) {
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder().setCustomId(`aprobar_${puntosBase}`).setLabel('Aprobar ✅').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`doble_${puntosBase}`).setLabel('Puntos Dobles 🔥').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('rechazar_puntos').setLabel('Rechazar ❌').setStyle(ButtonStyle.Danger),
            );

        await message.reply({
            content: `📢 **Solicitud de Puntos:**\nValor base: **${puntosBase} pts**\nUsuarios: ${usuariosMencionados.map(u => `<@${u.id}>`).join(', ')}\n*Esperando validación de un Comandante...*`,
            components: [row]
        });
    }
});

// --- EVENTO 2: Manejo de Interacciones (AQUÍ ESTÁ EL CAMBIO) ---
client.on(Events.InteractionCreate, async (interaction) => {
    
    if (interaction.isButton()) {
        const nombreRolAdmin = "comandantes"; 
        if (!interaction.member.roles.cache.some(role => role.name.toLowerCase() === nombreRolAdmin)) {
            return interaction.reply({ content: "❌ Solo los **Comandantes** pueden validar puntos.", ephemeral: true });
        }

        const partes = interaction.customId.split('_');
        const accion = partes[0];
        const puntosStr = partes[1];

        if (accion === 'rechazar') {
            return interaction.update({ content: '❌ **Solicitud rechazada.**', components: [] });
        }

        const mensajeOriginal = await interaction.channel.messages.fetch(interaction.message.reference.messageId);
        const usuariosParaSumar = mensajeOriginal.mentions.users;

        if (usuariosParaSumar.size === 0) return interaction.reply({ content: "Error: No hay usuarios.", ephemeral: true });

        let puntosFinales = parseInt(puntosStr);
        let mensajeExito = `✅ **Puntos aprobados.**`;

        if (accion === 'doble') {
            puntosFinales *= 2;
            mensajeExito = `🔥 **¡PUNTOS DOBLES APROBADOS!**`;
        }

        try {
            // Guardamos en la Base de Datos
            for (const [userId, user] of usuariosParaSumar) {
                const [puntosRegistro] = await Puntos.findOrCreate({
                    where: { userId: userId },
                    defaults: { defensa: 0 }
                });
                await puntosRegistro.increment('defensa', { by: puntosFinales });
            }

            // Actualizamos el mensaje de la solicitud
            await interaction.update({
                content: `${mensajeExito}\nSe sumaron **${puntosFinales} pts** a: ${usuariosParaSumar.map(u => `<@${u.id}>`).join(', ')}\n*Validado por: ${interaction.user.username}*`,
                components: []
            });

            // --- ESTA ES LA LÍNEA QUE FALTABA ---
            // Llama a la función para que el ranking fijo se actualice solo
            await actualizarRankingFijo(interaction.guild); 

        } catch (error) {
            console.error(error);
        }
    }

    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error("Error ejecutando comando: ",error);
            if (interaction.deferred){
                await interaction.followUp({ content: 'Hubo un error interno.', ephemeral: true });
            }
            
        }
    }
});

// --- FUNCIÓN PARA ACTUALIZAR EL RANKING AUTOMÁTICO ---
async function actualizarRankingFijo(guild) {
    const CANAL_ID = '1460747954762678313'; 
    const MENSAJE_ID = '1460748073855619289'; 

    try {
        const canal = await guild.channels.fetch(CANAL_ID);
        const mensaje = await canal.messages.fetch(MENSAJE_ID);

        const listaCompleta = await Puntos.findAll({
            order: [['defensa', 'DESC']],
        });

        const listaPromesas = listaCompleta.map(async (u, index) => {
            let nombre = "Desconocido";
            try {
                const miembro = await guild.members.fetch(u.userId);
                nombre = miembro.displayName;
            } catch {
                nombre = `Ex-miembro (${u.userId})`;
            }
            
            let medalla = (index === 0) ? "🥇 " : (index === 1) ? "🥈 " : (index === 2) ? "🥉 " : `${index + 1}. `;
            return `${medalla}**${nombre}** — ${u.defensa} pts`;
        });

        const listaFinal = await Promise.all(listaPromesas);
        const rankingTexto = listaFinal.join('\n') || "No hay puntos aún.";

        const embed = new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle('🏆 Ranking General - Gremio Club Asesinos')
            .setDescription(rankingTexto)
            .setFooter({ text: 'Se actualiza automáticamente al aprobar puntos' })
            .setTimestamp();

        await mensaje.edit({ embeds: [embed] });
        console.log("🔄 Ranking actualizado automáticamente.");
    } catch (error) {
        console.error('Error actualizando ranking fijo:', error);
    }
}

client.once("ready", () => {
    console.log(`Bot encendido como ${client.user.tag}`);
});

client.login(process.env.DISCORD_TOKEN);

module.exports = { Puntos };