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
    userId: { type: DataTypes.STRING, primaryKey: true },
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
    if (message.author.bot || message.channel.name.toLowerCase() !== "⚔️-evidencias") return;
    try {
        // 1. Obtenemos todas las palabras
        let allKeywords = await Keyword.findAll();

        // 2. LA SOLUCIÓN: Ordenamos de mayor a menor longitud (descendente)
        // Así 'atkperco' (8 letras) se evalúa ANTES que 'atk' (3 letras)
        allKeywords = allKeywords.sort((a, b) => b.word.length - a.word.length);

        let puntosBase = 0;
        const contenido = message.content.toLowerCase();

        // 3. Buscamos la coincidencia
        for (const kw of allKeywords) {
            if (contenido.includes(kw.word.toLowerCase())) {
                puntosBase = kw.points;
                break; // Se detiene en la coincidencia más larga encontrada
            }
        }

        const usuariosMencionados = message.mentions.users;
        if (usuariosMencionados.size > 0 && puntosBase > 0) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`aprobar_${puntosBase}`).setLabel('Aprobar ✅').setStyle(ButtonStyle.Success),
                new ButtonBuilder().setCustomId(`doble_${puntosBase}`).setLabel('Puntos Dobles 🔥').setStyle(ButtonStyle.Primary),
                new ButtonBuilder().setCustomId('rechazar_puntos').setLabel('Rechazar ❌').setStyle(ButtonStyle.Danger),
            );

            await message.reply({
                content: `📢 **Solicitud de Puntos:**\nValor base: **${puntosBase} pts**\nUsuarios: ${usuariosMencionados.map(u => `<@${u.id}>`).join(', ')}`,
                components: [row]
            });
        }
    } catch (error) { console.error("Error al procesar evidencia:", error); }
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

            // 1. VALIDACIÓN GLOBAL DE ROL PARA BOTONES ADMINISTRATIVOS
            // Filtramos: si es un botón de KW o de validación de puntos, exigimos rol.
            const esBotonAdmin = interaction.customId.startsWith('kw_') ||
                ['aprobar', 'doble', 'rechazar', 'editar'].some(op => interaction.customId.startsWith(op));

            if (esBotonAdmin && !esComandante) {
                return await interaction.reply({
                    content: "❌ Solo los **Comandantes** pueden realizar esta acción.",
                    ephemeral: true
                });
            }

            // --- A PARTIR DE AQUÍ, YA SABEMOS QUE ES COMANDANTE ---

            // 2. Lógica de Modals del Panel (Añadir/Eliminar)
            if (interaction.customId === 'kw_add') {
                const modal = new ModalBuilder().setCustomId('modal_kw_add').setTitle('Añadir o Editar Palabra');
                const wordInput = new TextInputBuilder().setCustomId('kw_word').setLabel("Palabra (ej: atkperco)").setStyle(TextInputStyle.Short).setRequired(true);
                const pointsInput = new TextInputBuilder().setCustomId('kw_points').setLabel("Puntaje (ej: 5)").setStyle(TextInputStyle.Short).setRequired(true);
                const categoryInput = new TextInputBuilder().setCustomId('kw_category').setLabel("Categoría (ATAQUE, DEFENSA, TIEMPO)").setStyle(TextInputStyle.Short).setRequired(true);

                modal.addComponents(
                    new ActionRowBuilder().addComponents(wordInput),
                    new ActionRowBuilder().addComponents(pointsInput),
                    new ActionRowBuilder().addComponents(categoryInput)
                );
                return await interaction.showModal(modal);
            }

            if (interaction.customId === 'kw_del') {
                const modal = new ModalBuilder().setCustomId('modal_kw_del').setTitle('Eliminar Palabra Clave');
                const wordInput = new TextInputBuilder().setCustomId('kw_word_del').setLabel("Escribe la palabra exacta a borrar").setStyle(TextInputStyle.Short).setRequired(true);
                modal.addComponents(new ActionRowBuilder().addComponents(wordInput));
                return await interaction.showModal(modal);
            }

            // 3. Lógica de Validación de Puntos de Evidencias
            const botonesEspeciales = ['confirmar_borrado', 'cancelar_borrado', 'record_york'];
            if (botonesEspeciales.includes(interaction.customId)) return;

            if (!interaction.message || !interaction.message.reference) return;

            const partes = interaction.customId.split('_');
            const accion = partes[0];
            const valorPuntos = partes[1];

            // Revertir / Editar Puntos
            if (accion === 'editar') {
                const mensajeOriginal = await interaction.channel.messages.fetch(interaction.message.reference.messageId);
                const usuariosParaRestar = mensajeOriginal.mentions.users;
                const puntosARestar = parseInt(valorPuntos);
                const puntosBaseOriginales = partes[2];

                for (const [userId] of usuariosParaRestar) {
                    const registro = await Puntos.findByPk(userId);
                    if (registro) await registro.decrement('defensa', { by: puntosARestar });
                }

                const rowRestaurada = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId(`aprobar_${puntosBaseOriginales}`).setLabel('Aprobar ✅').setStyle(ButtonStyle.Success),
                    new ButtonBuilder().setCustomId(`doble_${puntosBaseOriginales}`).setLabel('Puntos Dobles 🔥').setStyle(ButtonStyle.Primary),
                    new ButtonBuilder().setCustomId('rechazar_puntos').setLabel('Rechazar ❌').setStyle(ButtonStyle.Danger),
                );

                await interaction.update({
                    content: `🔄 **Puntos revertidos (-${puntosARestar} pts).** Esperando nueva validación...`,
                    components: [rowRestaurada]
                });
                return await actualizarRankingFijo(interaction.guild);
            }

            if (accion === 'rechazar') {
                return await interaction.update({ content: '❌ **Solicitud rechazada.**', components: [] });
            }

            // Aprobar / Doble Puntos
            const mensajeOriginal = await interaction.channel.messages.fetch(interaction.message.reference.messageId);
            const usuariosParaSumar = mensajeOriginal.mentions.users;
            if (usuariosParaSumar.size === 0) return;

            let puntosFinales = parseInt(valorPuntos);
            let mensajeExito = `✅ **Puntos aprobados.**`;

            if (accion === 'doble') {
                puntosFinales *= 2;
                mensajeExito = `🔥 **¡PUNTOS DOBLES APROBADOS!**`;
            }

            for (const [userId] of usuariosParaSumar) {
                const [puntosRegistro] = await Puntos.findOrCreate({ where: { userId }, defaults: { defensa: 0 } });
                await puntosRegistro.increment('defensa', { by: puntosFinales });
            }

            const rowEditar = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`editar_${puntosFinales}_${valorPuntos}`).setLabel('Corregir / Editar ✏️').setStyle(ButtonStyle.Secondary)
            );

            await interaction.update({
                content: `${mensajeExito}\nSe sumaron **${puntosFinales} pts** a: ${usuariosParaSumar.map(u => `<@${u.id}>`).join(', ')}\n*Por: ${interaction.user.username}*`,
                components: [rowEditar]
            });
            await actualizarRankingFijo(interaction.guild);
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

// --- FUNCIÓN RANKING ---
async function actualizarRankingFijo(guild) {
    const CANAL_ID = process.env.RANKING_CHANNEL_ID;
    const MENSAJE_ID = process.env.RANKING_MESSAGE_ID;
    if (!CANAL_ID || !MENSAJE_ID) return;
    try {
        const canal = await guild.channels.fetch(CANAL_ID);
        const mensaje = await canal.messages.fetch(MENSAJE_ID);
        const listaCompleta = await Puntos.findAll({ order: [['defensa', 'DESC']] });

        const listaPromesas = listaCompleta.map(async (u, index) => {
            let nombre = "Desconocido";
            try {
                const miembro = await guild.members.fetch(u.userId);
                nombre = miembro.displayName;
            } catch { nombre = `Ex-miembro (${u.userId})`; }
            let medalla = (index === 0) ? "🥇 " : (index === 1) ? "🥈 " : (index === 2) ? "🥉 " : `${index + 1}. `;
            return `${medalla}**${nombre}** — ${u.defensa} pts`;
        });

        const listaFinal = await Promise.all(listaPromesas);
        const embed = new EmbedBuilder()
            .setColor(0xf1c40f)
            .setTitle('🏆 Ranking General - Club Asesinos')
            .setDescription(listaFinal.join('\n') || "No hay datos.")
            .setThumbnail('attachment://Club_asesinos.png')
            .setTimestamp();

        await mensaje.edit({ embeds: [embed] });
    } catch (error) { console.error('Error Ranking:', error); }
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