require("dotenv").config();
const { Client, Collection, GatewayIntentBits, Events } = require("discord.js");
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

// --- PUNTO 2: Configuración de la Base de Datos (SQLite) ---
const sequelize = new Sequelize({
    dialect: 'sqlite',
    logging: false,
    storage: 'database.sqlite',
    dialectModule: require('sqlite3'), // Cambiado de @vscode/sqlite3 a sqlite3
});

const Puntos = sequelize.define('Puntos', {
    userId: {
        type: DataTypes.STRING,
        primaryKey: true,
    },
    defensa: {
        type: DataTypes.INTEGER,
        defaultValue: 0,
    },
});

// Sincronizar Base de Datos al iniciar
Puntos.sync();

// --- Carga de Comandos ---
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

// --- EVENTO 1: PUNTO 3 - Actualización de la lógica de guardado con SQLite ---
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    // Validación del canal "evidencias"
    if (message.channel.name.toLowerCase() !== "evidencias") return;

    const puntosKeywords = {
        'atkperco': 5, 'atkprisma': 2,
        'ava': 5,
        'def1': 2, 'def2': 4, 'def3': 6, 'def4': 8, 'def5': 10,
        'time5': 1, 'time10': 2, 'time20': 3, 'time30': 4, 'time40': 5
    };

    let puntosASumar = 0;
    const contenido = message.content.toLowerCase();

    for (const key in puntosKeywords) {
        if (contenido.includes(key)) {
            puntosASumar = puntosKeywords[key];
            break; 
        }
    }

    const usuariosMencionados = message.mentions.users;

    if (usuariosMencionados.size > 0 && puntosASumar > 0) {
        try {
            for (const [id, usuario] of usuariosMencionados) {
                // Buscar al usuario o crearlo si no existe en la DB
                const [puntosRegistro] = await Puntos.findOrCreate({
                    where: { userId: usuario.id },
                    defaults: { defensa: 0 }
                });

                // Incrementar puntos en la base de datos
                await puntosRegistro.increment('defensa', { by: puntosASumar });
            }

            message.channel.send(`✅ **DB Actualizada:** Se han añadido **${puntosASumar}** puntos a ${usuariosMencionados.size} usuario(s).`);
        } catch (error) {
            console.error("Error al guardar en SQLite:", error);
            message.reply("Hubo un error al guardar los puntos en la base de datos.");
        }
    }
});

// --- EVENTO 2: Slash Commands ---
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const command = client.commands.get(interaction.commandName);
    if (!command) return;
    try {
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: "Hubo un error al ejecutar este comando!", ephemeral: true });
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
});

client.login(process.env.DISCORD_TOKEN);

module.exports = { Puntos };