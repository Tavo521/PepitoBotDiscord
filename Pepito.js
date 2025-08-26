// pepito.js

require("dotenv").config();
const { Client, Collection, GatewayIntentBits } = require("discord.js");
const fs = require("fs");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers,
    ],
});

// Colección para almacenar los puntos de los usuarios
client.puntosUsuarios = new Collection();

const dataFilePath = "./puntos.json";

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

// **AGREGAR la función guardarPuntos al cliente para que sea accesible desde otros archivos**
client.guardarPuntos = guardarPuntos;

client.commands = new Collection();
const commandFiles = fs
    .readdirSync("./comandos")
    .filter((file) => file.endsWith(".js"));

for (const file of commandFiles) {
    const command = require(`./comandos/${file}`);
    client.commands.set(command.name, command);
}

// **MODIFICACIÓN DEL CÓDIGO**
client.on("messageCreate", (message) => {
    if (message.author.bot) return;

    const categoriaPadre = message.channel.parent;
    const subcanalNombre = message.channel.name;

    let puntosASumar = 0;

    if (categoriaPadre && categoriaPadre.name === "defensa") {
        const puntosDefensa = {
            "VS 1": 2,
            "VS 2": 4,
            "VS 3": 6,
            "VS 4": 8,
            "VS 5": 10,
        };
        puntosASumar = puntosDefensa[subcanalNombre] || 0;
    } else if (categoriaPadre && categoriaPadre.name === "tiempo") {
        const puntosTiempo = {
            "5 min": 1,
            "10 min": 3,
            "20 min": 5,
            "30 min": 7,
            "40 min": 9,
        };
        puntosASumar = puntosTiempo[subcanalNombre] || 0;
    } else {
        return; // El mensaje no está en una de las categorías válidas
    }

    const usuariosMencionados = message.mentions.users;

    if (usuariosMencionados.size > 0 && puntosASumar > 0) {
        const puntosUsuarios = client.puntosUsuarios;

        usuariosMencionados.forEach((usuarioMencionado) => {
            const userId = usuarioMencionado.id;

            if (!puntosUsuarios.has(userId)) {
                puntosUsuarios.set(userId, { defensa: 0 });
            }

            const puntosActuales = puntosUsuarios.get(userId);
            puntosActuales.defensa += puntosASumar;
            puntosUsuarios.set(userId, puntosActuales);
        });

        guardarPuntos();
        message.channel.send(
            `Se han añadido **${puntosASumar}** puntos de defensa a ${usuariosMencionados.size} usuario(s).`,
        );
    }
});

client.on("messageCreate", (message) => {
    if (!message.content.startsWith("!")) return;

    const args = message.content.slice(1).trim().split(/ +/);
    const commandName = args.shift().toLowerCase();

    if (!client.commands.has(commandName)) return;

    const command = client.commands.get(commandName);

    try {
        command.execute(message, args);
    } catch (error) {
        console.error(error);
        message.reply("Hubo un error al ejecutar ese comando!");
    }
});

client.login(process.env.DISCORD_TOKEN);

// EXPRESS SERVER
const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Bot is running!"));
app.listen(3000, () => console.log("Web server ready"));
