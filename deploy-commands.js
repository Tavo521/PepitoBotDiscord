const { REST, Routes } = require('discord.js');
const fs = require('node:fs');
const path = require('node:path');
require('dotenv').config();

const commands = [];
// Asegúrate de que tu carpeta se llame 'comandos'
const commandsPath = path.join(__dirname, 'comandos');
const commandFiles = fs.readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ('data' in command && 'execute' in command) {
        commands.push(command.data.toJSON());
    } else {
        console.log(`[ADVERTENCIA] El comando en ${filePath} no tiene las propiedades "data" o "execute".`);
    }
}

// Preparamos la instancia de REST
const rest = new REST().setToken(process.env.DISCORD_TOKEN);

(async () => {
    try {
        console.log(`Iniciando actualización de ${commands.length} comandos de barra (/).`);

        // Usamos Routes.applicationGuildCommands para que la actualización sea INSTANTÁNEA en tu servidor
        const data = await rest.put(
            Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
            { body: commands },
        );

        console.log(`¡Éxito! Se cargaron ${data.length} comandos en el servidor.`);
    } catch (error) {
        console.error(error);
    }
})();