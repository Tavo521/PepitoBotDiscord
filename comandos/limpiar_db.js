const { PermissionFlagsBits } = require('discord.js');

module.exports = {
    name: 'limpiar_db',
    async execute(message, args) {
        // 1. Verificación de seguridad: Solo administradores
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) {
            return message.reply('❌ No tienes permisos de administrador para usar este comando.');
        }

        // 2. Importar el modelo desde pepito.js
        const { Puntos } = require('../Pepito.js');

        try {
            // Confirmación rápida (opcional: podrías pedir un "si" para confirmar)
            await Puntos.destroy({ where: {}, truncate: false });

            message.channel.send('🗑️ **Base de datos limpiada.** Se han reiniciado todos los puntos a 0.');
        } catch (error) {
            console.error('Error al limpiar la DB:', error);
            message.reply('Hubo un error al intentar vaciar la base de datos.');
        }
    },
};