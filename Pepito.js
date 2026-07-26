require("dotenv").config();
const {
    Client, Collection, GatewayIntentBits, Events, ActionRowBuilder,
    ButtonBuilder, ButtonStyle, EmbedBuilder, ModalBuilder,
    TextInputBuilder, TextInputStyle, MessageFlags
} = require("discord.js");
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
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    userId: { type: DataTypes.STRING, allowNull: false },
    gameServer: { type: DataTypes.STRING, defaultValue: 'PRINCIPAL' }, // <--- NUEVO: Para diferenciar el server de Dofus
    defensa: { type: DataTypes.INTEGER, defaultValue: 0 },
});

const GlobalConfig = sequelize.define('GlobalConfig', {
    key: { type: DataTypes.STRING, primaryKey: true },
    value: { type: DataTypes.STRING }
});

const Keyword = sequelize.define('Keyword', {
    word: { type: DataTypes.STRING, primaryKey: true },
    points: { type: DataTypes.INTEGER, allowNull: false },
    category: { type: DataTypes.STRING, defaultValue: 'GENERAL' }
});

// Función para poblar palabras clave por primera vez
async function inicializarKeywords() {
    const palabrasIniciales = [
        { word: 'atkperco', points: 5, category: 'ATAQUE' },
        { word: 'atk', points: 2, category: 'ATAQUE' },
        { word: 'ava', points: 5, category: 'ATAQUE' },
        { word: 'atkd', points: 5, category: 'ATAQUE' },
        { word: 'def1', points: 2, category: 'DEFENSA' },
        { word: 'def2', points: 4, category: 'DEFENSA' },
        { word: 'def3', points: 6, category: 'DEFENSA' },
        { word: 'def4', points: 8, category: 'DEFENSA' },
        { word: 'def5', points: 10, category: 'DEFENSA' },
        { word: 'time5', points: 1, category: 'TIEMPO' },
        { word: 'time10', points: 2, category: 'TIEMPO' },
        { word: 'time20', points: 3, category: 'TIEMPO' },
        { word: 'time30', points: 4, category: 'TIEMPO' },
        { word: 'time40', points: 5, category: 'TIEMPO' }
    ];
    try {
        const count = await Keyword.count();
        if (count === 0) {
            await Keyword.bulkCreate(palabrasIniciales);
            console.log('✅ Palabras clave iniciales cargadas.');
        }
    } catch (error) { console.error('❌ Error inicializando keywords:', error); }
}

async function conectarDB() {
    try {
        await sequelize.authenticate();
        console.log('✅ Conexión a MySQL establecida.');
        await Puntos.sync();
        await GlobalConfig.sync();
        await Keyword.sync();
        await inicializarKeywords();
        console.log('✅ Tablas sincronizadas e inicializadas.');
    } catch (err) {
        console.error('❌ Error conectando o sincronizando la DB:', err);
    }
}
conectarDB();

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

// --- REGISTRO AUTOMÁTICO DE COMANDOS ---
const { REST, Routes } = require('discord.js');
async function desplegarComandos() {
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
    const commandsJson = Array.from(client.commands.values()).map(c => c.data.toJSON());
    try {
        await rest.put(Routes.applicationCommands(process.env.CLIENT_ID), { body: commandsJson });
        console.log('✅ Comandos de barra registrados globalmente.');
    } catch (error) { console.error('❌ Error al registrar comandos REST:', error); }
}
desplegarComandos();

// --- EVENTO 1: Detección de Evidencias ---
client.on("messageCreate", async (message) => {
    if (message.author.bot) return;

    // 1. Definimos los nombres de tus canales de evidencias
    const canalServer1 = "⚔️-evidencias-dakal"; // Cambia por el nombre real de tu canal 1
    const canalServer2 = "⚔️-evidencias-mikhal"; // Cambia por el nombre real de tu canal 2
    
    const canalNombre = message.channel.name.toLowerCase();
    let serverDofus = "";

    // 2. Identificamos a qué servidor pertenece la evidencia
    if (canalNombre === canalServer1) {
        serverDofus = "DAKAL";
    } else if (canalNombre === canalServer2) {
        serverDofus = "MIKHAL";
    } else if (canalNombre === "⚔️-evidencias") { 
        serverDofus = "PRINCIPAL"; // Por si mantienes el canal antiguo
    } else {
        return; // Si no es ninguno de estos canales, ignoramos el mensaje
    }

    try {
        // Obtenemos todas las palabras clave
        let allKeywords = await Keyword.findAll();

        // Ordenamos por longitud para evitar conflictos (ej: atkperco vs atk)
        allKeywords = allKeywords.sort((a, b) => b.word.length - a.word.length);

        let puntosBase = 0;
        const contenido = message.content.toLowerCase();

        // Buscamos la coincidencia de la palabra clave
        for (const kw of allKeywords) {
            if (contenido.includes(kw.word.toLowerCase())) {
                puntosBase = kw.points;
                break;
            }
        }

        const usuariosMencionados = message.mentions.users;
        
        if (usuariosMencionados.size > 0 && puntosBase > 0) {
            // --- LA CLAVE: Añadimos el serverDofus al CustomId ---
            // Formato: accion_puntos_servidor
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`aprobar_${puntosBase}_${serverDofus}`)
                    .setLabel(`Aprobar ${serverDofus} ✅`)
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`doble_${puntosBase}_${serverDofus}`)
                    .setLabel('Puntos Dobles 🔥')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('rechazar_puntos')
                    .setLabel('Rechazar ❌')
                    .setStyle(ButtonStyle.Danger),
            );

            await message.reply({
                content: `📢 **Solicitud de Puntos (${serverDofus}):**\nValor base: **${puntosBase} pts**\nUsuarios: ${usuariosMencionados.map(u => `<@${u.id}>`).join(', ')}`,
                components: [row]
            });
        }
    } catch (error) { 
        console.error("Error al procesar evidencia:", error); 
    }
});

// --- EVENTO 2: Manejo de Interacciones (Botones, Comandos, Modals) ---
client.on(Events.InteractionCreate, async (interaction) => {
    try {
        // A. COMANDOS DE BARRA
        if (interaction.isChatInputCommand()) {
            const command = client.commands.get(interaction.commandName);
            if (command) await command.execute(interaction);
            return;
        }

        // B. BOTONES
if (interaction.isButton()) {
    const nombreRolAdmin = "comandantes";
    const esComandante = interaction.member.roles.cache.some(role => role.name.toLowerCase() === nombreRolAdmin);

    // --- NUEVO BLOQUE: Consulta de Puesto (Accesible para TODOS) ---
    // Ahora detecta si el ID empieza por 'ver_mi_puesto'
    if (interaction.customId.startsWith('ver_mi_puesto')) {
        try {
            // Extraemos el servidor del ID (ej: ver_mi_puesto_SERVER2 -> SERVER2)
            const partesPuesto = interaction.customId.split('_');
            const serverConsulta = partesPuesto[3] || 'PRINCIPAL'; 

            // Buscamos solo los puntos de ese servidor específico
            const todos = await Puntos.findAll({ 
                where: { gameServer: serverConsulta }, 
                order: [['defensa', 'DESC']] 
            });
            
            const index = todos.findIndex(u => u.userId === interaction.user.id);

            if (index === -1) {
                return await interaction.reply({
                    content: `❌ No tienes puntos registrados aún en el servidor.`,
                    flags: [MessageFlags.Ephemeral]
                });
            }

            const puesto = index + 1;
            const pts = todos[index].defensa;
            let derechos = "";

            // Lógica de derechos por ranking
            if (puesto <= 5) derechos = "🥇 **8 Percos**";
            else if (puesto <= 10) derechos = "🥈 **5 Percos**";
            else if (puesto <= 20) derechos = "🥉 **4 Percos**";
            else derechos = "❌ **Sin Percos**";

            return await interaction.reply({
                content: `👤 **Consulta de Rango:**\n\n📌 Posición: **#${puesto}**\n📌 Puntos: **${pts} pts**\n📌 Derechos: ${derechos}`,
                flags: [MessageFlags.Ephemeral]
            });
        } catch (e) {
            console.error("Error en botón ver_mi_puesto:", e);
            return await interaction.reply({ content: "Error al consultar puesto.", flags: [MessageFlags.Ephemeral] });
        }
    }

    // 1. VALIDACIÓN GLOBAL DE ROL
    const esBotonAdmin = interaction.customId.startsWith('kw_') ||
        ['aprobar', 'doble', 'rechazar', 'editar'].some(op => interaction.customId.startsWith(op));

    if (esBotonAdmin && !esComandante) {
        return await interaction.reply({
            content: "❌ Solo los **Comandantes** pueden realizar esta acción.",
            flags: [MessageFlags.Ephemeral]
        });
    }

    // --- MANEJO DE IDS DINÁMICOS (Accion_Puntos_Servidor) ---
    const partes = interaction.customId.split('_');
    const accion = partes[0];
    const valorPuntos = partes[1];
    const serverDofus = partes[2] || 'PRINCIPAL'; // Capturamos el servidor del botón

    // 2. Lógica de Modals (Añadir/Eliminar KW)
    if (interaction.customId === 'kw_add') {
        const modal = new ModalBuilder().setCustomId('modal_kw_add').setTitle('Añadir o Editar Palabra');
        const wordInput = new TextInputBuilder().setCustomId('kw_word').setLabel("Palabra").setStyle(TextInputStyle.Short).setRequired(true);
        const pointsInput = new TextInputBuilder().setCustomId('kw_points').setLabel("Puntaje").setStyle(TextInputStyle.Short).setRequired(true);
        const categoryInput = new TextInputBuilder().setCustomId('kw_category').setLabel("Categoría").setStyle(TextInputStyle.Short).setRequired(true);

        modal.addComponents(
            new ActionRowBuilder().addComponents(wordInput),
            new ActionRowBuilder().addComponents(pointsInput),
            new ActionRowBuilder().addComponents(categoryInput)
        );
        return await interaction.showModal(modal);
    }

    if (interaction.customId === 'kw_del') {
        const modal = new ModalBuilder().setCustomId('modal_kw_del').setTitle('Eliminar Palabra Clave');
        const wordInput = new TextInputBuilder().setCustomId('kw_word_del').setLabel("Palabra exacta a borrar").setStyle(TextInputStyle.Short).setRequired(true);
        modal.addComponents(new ActionRowBuilder().addComponents(wordInput));
        return await interaction.showModal(modal);
    }

    // 3. Lógica de Validación de Puntos
    const botonesEspeciales = ['record_york', 'confirmar_borrado', 'cancelar_borrado'];
    if (botonesEspeciales.includes(interaction.customId)) return;

    if (!interaction.message || !interaction.message.reference) return;

    // --- REVERTIR / EDITAR PUNTOS ---
    if (accion === 'editar') {
        const mensajeOriginal = await interaction.channel.messages.fetch(interaction.message.reference.messageId);
        const usuariosParaRestar = mensajeOriginal.mentions.users;
        const puntosARestar = parseInt(valorPuntos);
        const puntosBaseOriginales = partes[2];
        const serverParaRevertir = partes[3] || 'PRINCIPAL'; // En editar, el server es la 4ta parte

        for (const [userId] of usuariosParaRestar) {
            const registro = await Puntos.findOne({ where: { userId, gameServer: serverParaRevertir } });
            if (registro) await registro.decrement('defensa', { by: puntosARestar });
        }

        const rowRestaurada = new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId(`aprobar_${puntosBaseOriginales}_${serverParaRevertir}`).setLabel('Aprobar ✅').setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId(`doble_${puntosBaseOriginales}_${serverParaRevertir}`).setLabel('Puntos Dobles 🔥').setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId('rechazar_puntos').setLabel('Rechazar ❌').setStyle(ButtonStyle.Danger),
        );

        await interaction.update({
            content: `🔄 **Puntos revertidos en ${serverParaRevertir} (-${puntosARestar} pts).** Esperando nueva validación...`,
            components: [rowRestaurada]
        });
        return await actualizarRankingFijo(interaction.guild, serverParaRevertir);
    }

    if (accion === 'rechazar') {
        return await interaction.update({ content: '❌ **Solicitud rechazada.**', components: [] });
    }

    // --- APROBAR / DOBLE PUNTOS ---
    if (accion === 'aprobar' || accion === 'doble') {
        const mensajeOriginal = await interaction.channel.messages.fetch(interaction.message.reference.messageId);
        const usuariosParaSumar = mensajeOriginal.mentions.users;
        if (usuariosParaSumar.size === 0) return;

        let puntosFinales = parseInt(valorPuntos);
        let mensajeExito = `✅ **Puntos aprobados (${serverDofus})**`;

        if (accion === 'doble') {
            puntosFinales *= 2;
            mensajeExito = `🔥 **¡PUNTOS DOBLES APROBADOS! (${serverDofus})**`;
        }

        for (const [userId] of usuariosParaSumar) {
            // Buscamos o creamos el registro para ese usuario en ese servidor específico
            const [puntosRegistro] = await Puntos.findOrCreate({ 
                where: { userId, gameServer: serverDofus }, 
                defaults: { defensa: 0, gameServer: serverDofus } 
            });
            await puntosRegistro.increment('defensa', { by: puntosFinales });
        }

        // El botón de editar ahora también debe llevar el servidor para saber de dónde restar
        const rowEditar = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`editar_${puntosFinales}_${valorPuntos}_${serverDofus}`)
                .setLabel('Corregir / Editar ✏️')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.update({
            content: `${mensajeExito}\nSe sumaron **${puntosFinales} pts** a: ${usuariosParaSumar.map(u => `<@${u.id}>`).join(', ')}\n*Por: ${interaction.user.username}*`,
            components: [rowEditar]
        });

        // Actualizamos el ranking pasando el servidor
        await actualizarRankingFijo(interaction.guild, serverDofus);
    }
}

        // C. SUBMIT DE MODALS
        if (interaction.isModalSubmit()) {
            if (interaction.customId === 'modal_kw_add') {
                const word = interaction.fields.getTextInputValue('kw_word').toLowerCase().trim();
                const points = parseInt(interaction.fields.getTextInputValue('kw_points'));
                const category = interaction.fields.getTextInputValue('kw_category').toUpperCase().trim();

                if (isNaN(points)) return await interaction.reply({ content: '❌ El puntaje debe ser un número.', ephemeral: true });

                await Keyword.upsert({ word, points, category });
                await actualizarPanelAutomatico(interaction);
                // ENVIAR LOG
                await enviarLogAuditoria(
                    interaction.guild,
                    interaction.user,
                    'AÑADIR / EDITAR',
                    `Palabra: \`${word}\` | Puntos: **${points}** | Categoría: **${category}**`,
                    0x2ecc71 // Verde
                );
                return await interaction.reply({ content: `✅ Palabra \`${word}\` guardada.`, ephemeral: true });
            }

            if (interaction.customId === 'modal_kw_del') {
                try {
                    const word = interaction.fields.getTextInputValue('kw_word_del').toLowerCase().trim();

                    // Buscamos la palabra antes de borrarla para saber qué categoría tenía (opcional para el log)
                    const palabraData = await Keyword.findByPk(word);
                    const deleted = await Keyword.destroy({ where: { word } });

                    if (deleted) {
                        await actualizarPanelAutomatico(interaction);

                        // LOG DE AUDITORÍA CORREGIDO (Sin la variable points)
                        await enviarLogAuditoria(
                            interaction.guild,
                            interaction.user,
                            'ELIMINAR',
                            `La palabra \`${word}\` (Categoría: ${palabraData?.category || 'Desconocida'}) fue removida del sistema.`,
                            0xe74c3c // Rojo
                        );

                        return await interaction.reply({
                            content: `🗑️ \`${word}\` eliminada correctamente.`,
                            flags: [MessageFlags.Ephemeral] // Nueva forma de enviar mensajes privados
                        });
                    } else {
                        return await interaction.reply({
                            content: `❌ No se encontró la palabra \`${word}\`.`,
                            flags: [MessageFlags.Ephemeral]
                        });
                    }
                } catch (err) { console.error(err); }
            }
        }

    } catch (error) {
        console.error("============== ERROR DETECTADO ==============");
        console.error(`Componente: ${interaction.customId || 'Comando'}`);
        console.error(error);
        console.error("=============================================");

        const msgError = { content: '❌ Hubo un error al procesar esta acción.', ephemeral: true };
        if (interaction.replied || interaction.deferred) await interaction.followUp(msgError).catch(() => { });
        else await interaction.reply(msgError).catch(() => { });
    }
});

// --- FUNCIÓN RANKING ACTUALIZADA ---
async function actualizarRankingFijo(guild, serverDofus = 'PRINCIPAL') {
    // 1. Mapeo de IDs por servidor (Configura estos IDs en tu .env)
    const configRankings = {
        'DAKAL': {
            canal: process.env.RANKING_CHANNEL_ID_DAKAL,
            mensaje: process.env.RANKING_MESSAGE_ID_DAKAL,
            color: 0xf1c40f, // Dorado
            titulo: '🏆 Top 30 - Dakal'
        },
        'MIKHAL': {
            canal: process.env.RANKING_CHANNEL_ID_MIKHAL,
            mensaje: process.env.RANKING_MESSAGE_ID_MIKHAL,
            color: 0x3498db, // Azul
            titulo: '🏆 Top 30 - Mikhal'
        }
    };

    const config = configRankings[serverDofus];
    if (!config || !config.canal || !config.mensaje) {
        console.warn(`Configuración de ranking no encontrada para: ${serverDofus}`);
        return;
    }

    try {
        const canal = await guild.channels.fetch(config.canal);
        const mensaje = await canal.messages.fetch(config.mensaje);

        // 2. FILTRAMOS POR EL SERVIDOR DE JUEGO CORRESPONDIENTE
        const listaCompleta = await Puntos.findAll({
            where: { gameServer: serverDofus }, // <--- CLAVE: Solo puntos de este servidor
            order: [['defensa', 'DESC']],
            limit: 30
        });

        const listaPromesas = listaCompleta.map(async (u, index) => {
            let nombre = "Desconocido";
            try {
                const miembro = await guild.members.fetch(u.userId);
                nombre = miembro.displayName;
            } catch { nombre = "Ex-miembro"; }

            const puesto = index + 1;
            let derechos = "";

            if (puesto <= 5) derechos = "🔹 **8 Percos**";
            else if (puesto <= 10) derechos = "🔸 **5 Percos**";
            else if (puesto <= 20) derechos = "▫️ **4 Percos**";
            else derechos = "❌ **Sin Percos**";

            let medalla = (puesto === 1) ? "🥇 " : (puesto === 2) ? "🥈 " : (puesto === 3) ? "🥉 " : `${puesto}. `;

            return `${medalla}**${nombre}** — ${u.defensa} pts | ${derechos}`;
        });

        const listaFinal = await Promise.all(listaPromesas);

        const embed = new EmbedBuilder()
            .setColor(config.color)
            .setTitle(config.titulo)
            .setThumbnail('attachment://Club_asesinos.png')
            .setDescription(listaFinal.join('\n') || "No hay datos en esta temporada.")
            .addFields({
                name: '📌 Distribución de Percos',
                value: '🥇 **Top 1-5:** 8 Percos\n🥈 **Top 6-10:** 5 Percos\n🥉 **Top 11-20:** 4 Percos\n\n*Pulsa el botón de abajo para ver tu posición personal.*',
                inline: false
            })
            .setTimestamp();

        // El botón mágico ahora debe llevar el servidor en el customId
        // para que la consulta sepa de qué server buscar los datos.
        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId(`ver_mi_puesto_${serverDofus}`) // <--- ID dinámico
                .setLabel('Ver mi posición 👤')
                .setStyle(ButtonStyle.Primary)
        );

        await mensaje.edit({ embeds: [embed], components: [row] });

    } catch (error) { 
        console.error(`Error actualizando ranking de ${serverDofus}:`, error); 
    }
}

async function actualizarPanelAutomatico(interaction) {
    try {
        const keywords = await Keyword.findAll();

        // Reconstruimos el Embed desde cero
        const nuevoEmbed = new EmbedBuilder()
            .setTitle('⚙️ Panel de Palabras Clave')
            .setDescription('Configuración de puntajes actualizada automáticamente.')
            .setColor(0x2b2d31)
            .setThumbnail('attachment://Club_asesinos.png')
            .setTimestamp();

        const categorias = [...new Set(keywords.map(k => k.category))];

        if (categorias.length === 0) {
            nuevoEmbed.addFields({ name: 'Estado', value: 'No hay palabras registradas.' });
        } else {
            categorias.forEach(cat => {
                const lista = keywords
                    .filter(k => k.category === cat)
                    .map(k => `\`${k.word}\` ➔ ${k.points} pts`)
                    .join('\n');

                if (lista.trim()) {
                    nuevoEmbed.addFields({ name: `⚔️ ${cat.toUpperCase()}`, value: lista, inline: true });
                }
            });
        }

        // Editamos el mensaje original donde el usuario interactuó
        await interaction.message.edit({ embeds: [nuevoEmbed] });

    } catch (error) {
        console.error("Error al auto-actualizar el panel:", error);
    }
}

async function enviarLogAuditoria(guild, usuario, accion, detalle, color) {
    const CANAL_LOGS_ID = process.env.LOG_CHANNEL_ID;
    if (!CANAL_LOGS_ID) return;

    try {
        const canal = await guild.channels.fetch(CANAL_LOGS_ID);
        const embedLog = new EmbedBuilder()
            .setTitle('📝 Registro de Auditoría - Keywords')
            .setColor(color)
            .addFields(
                { name: '👤 Usuario', value: `${usuario.tag} (${usuario.id})`, inline: true },
                { name: '🛠️ Acción', value: accion, inline: true },
                { name: '📄 Detalle', value: detalle }
            )
            .setTimestamp()
            .setThumbnail(usuario.displayAvatarURL());

        await canal.send({ embeds: [embedLog] });
    } catch (error) {
        console.error("❌ Error al enviar log de auditoría:", error);
    }
}

client.once("ready", () => { console.log(`🚀 Bot listo como ${client.user.tag}`); });
client.login(process.env.DISCORD_TOKEN);

module.exports = { Puntos, GlobalConfig, actualizarRankingFijo, Keyword };