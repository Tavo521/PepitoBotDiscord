// index.js
const fs = require('node:fs');
const path = require('node:path');
const { Client, Collection, GatewayIntentBits, Events } = require('discord.js');
const dotenv = require('dotenv');

dotenv.config();

const token = process.env.DISCORD_TOKEN;
const prefix = '!'; // Define el prefijo que usas para tus comandos

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
    ],
});

// Colección para los puntos de los usuarios
const puntosUsuarios = new Map();
client.puntosUsuarios = puntosUsuarios;

// Colección para los comandos
client.commands = new Collection();
const commandsPath = path.join(__dirname, 'comandos');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    // Agrega el comando a la colección
    if ('name' in command && 'execute' in command) {
        client.commands.set(command.name, command);
    } else {
        console.log(`[WARNING] El archivo de comando en ${filePath} no tiene las propiedades "name" o "execute" requeridas.`);
    }
}

client.on(Events.ClientReady, readyClient => {
    console.log(`¡Listo! Iniciado como ${readyClient.user.tag}`);
});

// Manejo de mensajes para comandos de prefijo
client.on(Events.MessageCreate, message => {
    if (!message.content.startsWith(prefix) || message.author.bot) return;

    const args = message.content.slice(prefix.length).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    const command = client.commands.get(commandName);

    if (!command) return;

    try {
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply('Hubo un error al ejecutar este comando.');
    }
});

client.login(token);