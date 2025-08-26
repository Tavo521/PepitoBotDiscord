// /comandos/resetpuntos.js
const { PermissionsBitField } = require('discord.js');

module.exports = {
    name: 'resetpuntos',
    description: 'Reinicia todos los puntos de defensa. (Solo para administradores)',
    async execute(message, args) {
        // Verifica si el usuario que ejecuta el comando tiene permisos de administrador
        if (!message.member.permissions.has(PermissionsBitField.Flags.Administrator)) {
            return message.reply('¡No tienes permisos para usar este comando!');
        }

        const puntosUsuarios = message.client.puntosUsuarios;

        // Limpia la colección en la memoria del bot
        puntosUsuarios.clear();

        // Guarda el estado vacío en el archivo JSON
        try {
            message.client.guardarPuntos();
            await message.channel.send('✅ Todos los puntos de defensa han sido reiniciados correctamente.');
        } catch (error) {
            console.error('Error al guardar los puntos:', error);
            await message.channel.send('❌ Hubo un error al intentar reiniciar los puntos.');
        }
    },
};