// Necesitas una forma de almacenar el tiempo de espera.
// Usamos un objeto simple para guardar el timestamp de cada usuario.
const cooldowns = new Map();

module.exports = {
    name: 'york',
    description: 'Golpea al punch con un ataque aleatorio y muestra un mensaje según el daño.',
    execute(message, args) {
        // Define el tiempo de espera en milisegundos (1 minuto)
        const cooldownAmount = 1 * 60 * 1000; // 1 minuto en milisegundos

        // Obtiene el ID del usuario
        const userId = message.author.id;

        // Revisa si el usuario está en el mapa de tiempos de espera
        if (cooldowns.has(userId)) {
            // Si el usuario ya usó el comando, calcula cuánto tiempo queda
            const expirationTime = cooldowns.get(userId) + cooldownAmount;
            const now = Date.now();

            if (now < expirationTime) {
                // Si el tiempo de espera no ha terminado, informa al usuario
                const timeLeft = (expirationTime - now) / 1000; // Tiempo restante en segundos
                const minutes = Math.floor(timeLeft / 60);
                const seconds = Math.floor(timeLeft % 60);
                
                return message.reply(`¡Espera! ⏳ Tienes que esperar ${minutes} minutos y ${seconds} segundos antes de volver a usar el comando !york.`);
            }
        }

        // Si el usuario no está en el mapa o el tiempo de espera ya pasó,
        // lo agrega o actualiza con el timestamp actual.
        cooldowns.set(userId, Date.now());

        // Lógica para determinar el mensaje extra según el daño
        const dano = Math.floor(Math.random() * 3000) + 1;
        let mensajeRespuesta;
        
        if (dano === 3000) {
            mensajeRespuesta = `¡@everyone! ¡¡FELICITACIONES ${message.author}!! Por fin le has hecho 3000 de daño al punch como York 🥳🎉🎊`;
        } else if (dano >= 2500) {
            mensajeRespuesta = `Le has hecho al punch un daño de ${dano}. Estuviste a punto de pegarle 3000 de daño como York`;
        } else if (dano >= 2000) {
            mensajeRespuesta = `Le has hecho al punch un daño de ${dano}. ¡Buen golpe! Sigue así para llegar a los 3000. York casi esta orgulloso`;
        } else if (dano >= 1500) {
            mensajeRespuesta = `Le has hecho al punch un daño de ${dano}. Un golpe decente. ¡Puedes hacerlo mejor! si York pudo tu tambien`;
        } else if (dano >= 1000) {
            mensajeRespuesta = `Le has hecho al punch un daño de ${dano}. Tienes que mejorar para pegar como York.`;
        } else {
            mensajeRespuesta = `Le has hecho al punch un daño de ${dano}. Debes mejorar tu técnica para alcanzar un buen daño. mejorate el set manco att: York`;
        }
        
        // Envía el mensaje completo al canal
        message.channel.send(mensajeRespuesta);
    },
};