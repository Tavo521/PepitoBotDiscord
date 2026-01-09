require("dotenv").config();
const { Client, Collection, GatewayIntentBits, Events, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require("discord.js");
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

// --- CONFIGURACIÓN DE BASE DE DATOS ---
const sequelize = new Sequelize({
    dialect: 'sqlite',
    logging: false,
    storage: 'database.sqlite',
    dialectModule: require('sqlite3'),
});

const Puntos = sequelize.define('Puntos', {
    userId: { type: DataTypes.STRING, primaryKey: true },
    defensa: { type: DataTypes.INTEGER, defaultValue: 0 },
});

// Función para iniciar DB con protección contra corrupción
async function initDB() {
    await Puntos.sync();
    await sequelize.query('PRAGMA journal_mode=WAL;');
}
initDB();

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

// --- EVENTO 1: Solicitud de Puntos con Botones ---
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
        // SOLUCIÓN AL ERROR: Ya no guardamos las IDs en el CustomID
        // Solo guardamos la acción y el valor de puntos (ej: aprobar_5)
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId(`aprobar_${puntosBase}`)
                    .setLabel('Aprobar ✅')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`doble_${puntosBase}`)
                    .setLabel('Puntos Dobles 🔥')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('rechazar_puntos')
                    .setLabel('Rechazar ❌')
                    .setStyle(ButtonStyle.Danger),
            );

        await message.reply({
            content: `📢 **Solicitud de Puntos:**\nValor base: **${puntosBase} pts**\nUsuarios: ${usuariosMencionados.map(u => `<@${u.id}>`).join(', ')}\n*Esperando validación de un Comandante...*`,
            components: [row]
        });
    }
});

// --- EVENTO 2: Manejo de Interacciones (Slash Commands + Botones) ---
client.on(Events.InteractionCreate, async (interaction) => {
    
    if (interaction.isButton()) {
        const nombreRolAdmin = "comandantes"; 
        if (!interaction.member.roles.cache.some(role => role.name.toLowerCase() === nombreRolAdmin)) {
            return interaction.reply({ content: "❌ Solo los **Comandantes** pueden validar puntos.", ephemeral: true });
        }

        // Extraer acción y puntos del ID corto
        const partes = interaction.customId.split('_');
        const accion = partes[0];
        const puntosStr = partes[1];

        if (accion === 'rechazar') {
            return interaction.update({ content: '❌ **Solicitud rechazada.** Los puntos no han sido sumados.', components: [] });
        }

        // LEER IDs DESDE EL MENSAJE ORIGINAL (Solución al error de longitud)
        // Buscamos las menciones en el mensaje que el bot respondió originalmente
        const mensajeOriginal = await interaction.channel.messages.fetch(interaction.message.reference.messageId);
        const usuariosParaSumar = mensajeOriginal.mentions.users;

        if (usuariosParaSumar.size === 0) {
            return interaction.reply({ content: "Error: No se encontraron usuarios mencionados en el mensaje original.", ephemeral: true });
        }

        let puntosFinales = parseInt(puntosStr);
        let mensajeExito = `✅ **Puntos aprobados.**`;

        if (accion === 'doble') {
            puntosFinales = puntosFinales * 2;
            mensajeExito = `🔥 **¡PUNTOS DOBLES APROBADOS!**`;
        }

        try {
            for (const [userId, user] of usuariosParaSumar) {
                const [puntosRegistro] = await Puntos.findOrCreate({
                    where: { userId: userId },
                    defaults: { defensa: 0 }
                });
                await puntosRegistro.increment('defensa', { by: puntosFinales });
            }

            await interaction.update({
                content: `${mensajeExito}\nSe sumaron **${puntosFinales} pts** a: ${usuariosParaSumar.map(u => `<@${u.id}>`).join(', ')}\n*Validado por: ${interaction.user.username}*`,
                components: []
            });
        } catch (error) {
            console.error(error);
            if (!interaction.replied) {
                interaction.reply({ content: "Hubo un error al actualizar la DB.", ephemeral: true });
            }
        }
    }

    if (interaction.isChatInputCommand()) {
        const command = client.commands.get(interaction.commandName);
        if (!command) return;
        try {
            await command.execute(interaction);
        } catch (error) {
            console.error(error);
            await interaction.reply({ content: "Hubo un error al ejecutar este comando!", ephemeral: true });
        }
    }
});

// --- EVENTO 3: Prefijo antiguo ! ---
client.on("messageCreate", (message) => {
    if (!message.content.startsWith("!") || message.author.bot) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName);

    if (!command || command.data) return; 

    try {
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply("Hubo un error al ejecutar ese comando!");
    }
});

client.once("ready", () => {
    console.log(`Bot encendido como ${client.user.tag}`);
    // Opcional: client.user.setUsername('Pepito'); // Solo usar una vez
});

client.login(process.env.DISCORD_TOKEN);

module.exports = { Puntos };