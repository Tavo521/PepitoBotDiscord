// pepito.js
require("dotenv").config();
const { Client, Collection, GatewayIntentBits, Events } = require("discord.js");
const fs = require("fs");
const path = require("path"); // Importante para manejar rutas

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

// --- Lógica de Puntos ---
client.puntosUsuarios = new Collection();
const dataFilePath = "./puntos.json";4

if (fs.existsSync(dataFilePath)) {
    const data = fs.readFileSync(dataFilePath, "utf8");
    const puntos = JSON.parse(data);
    for (const userId in puntos) {
        client.puntosUsuarios.set(userId, puntos[userId]);
    }
    console.log("Puntos cargados desde puntos.json");
}

function guardarPuntos() {
    const puntos = Object.fromEntries(client.puntosUsuarios);
    const data = JSON.stringify(puntos, null, 2);
    fs.writeFileSync(dataFilePath, data, "utf8");
    console.log("Puntos guardados en puntos.json");
}
client.guardarPuntos = guardarPuntos;

// --- Carga de Comandos ---
client.commands = new Collection();
const commandsPath = path.join(__dirname, "comandos");
const commandFiles = fs.readdirSync(commandsPath).filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    
    // Ajuste para Slash Commands: Usamos command.data.name si existe, si no, command.name
    const name = command.data ? command.data.name : command.name;
    
    if (name) {
        client.commands.set(name, command);
        console.log(`Comando cargado: ${name}`);
    }
}

// --- EVENTO 1: Lógica de Puntos por Categoría (Tu código original) ---
client.on("messageCreate", (message) => {
    if (message.author.bot) return;

    const categoriaPadre = message.channel.parent;
    const subcanalNombre = message.channel.name;

    let puntosASumar = 0;

    if (categoriaPadre && categoriaPadre.name === "defensa-ganadas") {
        const puntosDefensa = { "VS 1": 2, "VS 2": 4, "VS 3": 6, "VS 4": 8, "VS 5": 10 };
        puntosASumar = puntosDefensa[subcanalNombre] || 0;
    } else if (categoriaPadre && categoriaPadre.name === "tiempo-perdidas") {
        const puntosTiempo = { "5 min": 1, "10 min": 3, "20 min": 5, "30 min": 7, "40 min": 9 };
        puntosASumar = puntosTiempo[subcanalNombre] || 0;
    } else {
        return;
    }

    const usuariosMencionados = message.mentions.users;

    if (usuariosMencionados.size > 0 && puntosASumar > 0) {
        usuariosMencionados.forEach((usuarioMencionado) => {
            const userId = usuarioMencionado.id;
            if (!client.puntosUsuarios.has(userId)) {
                client.puntosUsuarios.set(userId, { defensa: 0 });
            }
            const puntosActuales = client.puntosUsuarios.get(userId);
            puntosActuales.defensa += puntosASumar;
            client.puntosUsuarios.set(userId, puntosActuales);
        });
        guardarPuntos();
        message.channel.send(`Se han añadido **${puntosASumar}** puntos de defensa a ${usuariosMencionados.size} usuario(s).`);
    }
});

// --- EVENTO 2: Slash Commands (NUEVO) ---
client.on(Events.InteractionCreate, async (interaction) => {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        console.log(`Ejecutando slash command: ${interaction.commandName}`);
        await command.execute(interaction);
    } catch (error) {
        console.error(error);
        await interaction.reply({ content: "Hubo un error al ejecutar este comando!", ephemeral: true });
    }
});

// --- EVENTO 3: Prefijo antiguo ! (Por si aún usas alguno) ---
client.on("messageCreate", (message) => {
    if (!message.content.startsWith("!") || message.author.bot) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();
    const command = client.commands.get(commandName);

    if (!command || command.data) return; // Si tiene .data, es un Slash Command y se ignora aquí

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