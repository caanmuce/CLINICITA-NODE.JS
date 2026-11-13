const cron = require("node-cron");
const fs = require("node:fs");
const path = require("node:path");
const { mlClient } = require("../services/ml-client");
const { reasignarCupoListaEspera } = require("./espera");
const conversaciones = new Map();
const CONVERSACION_TTL_MS = Number(process.env.WHATSAPP_CONVERSATION_TTL_MS) || 4 * 60 * 60 * 1000;
const CLINIC_TIMEZONE = process.env.CLINIC_TIMEZONE || "America/Bogota";
const CLINIC_UTC_OFFSET = process.env.CLINIC_UTC_OFFSET || "-05:00";
const DEBUG = process.env.DEBUG === "true";
const ONLY_REMINDER_RECIPIENTS = process.env.WHATSAPP_ONLY_REMINDER_RECIPIENTS !== "false";
let limpiezaProgramada = false;

// --- Validación de autorización para recordatorios WhatsApp ---
// Rastrea qué teléfonos recibieron recientemente un recordatorio para
// asegurar que solo ese paciente pueda responder CONFIRMAR/CANCELAR.
const autorizacionesRecordatorio = new Map();
// Los recordatorios tienen ventana de validación de 24h para responder
const VENTANA_VALIDACION_REMINDER_MS = 24 * 60 * 60 * 1000;

function limpiarTelefonoParaValidacion(telefono) {
    if (!telefono) return "";
    return String(telefono).replace(/[^0-9]/g, "");
}

function yaExpiroValidacion(telefono) {
    const timestamp = autorizacionesRecordatorio.get(telefono);
    if (!timestamp) return true; // Sin registro = expirado
    return Date.now() - timestamp > VENTANA_VALIDACION_REMINDER_MS;
}
// -----------------------------------------------------

function debugLog(mensaje) {
    if (DEBUG) console.log(mensaje);
}

function guardarConversacion(chatKey, contexto) {
    conversaciones.set(chatKey, { ...contexto, ultimaActividad: Date.now() });
}

function obtenerConversacion(chatKey) {
    const contexto = conversaciones.get(chatKey);
    if (!contexto) return null;
    if (Date.now() - contexto.ultimaActividad > CONVERSACION_TTL_MS) {
        conversaciones.delete(chatKey);
        return null;
    }
    contexto.ultimaActividad = Date.now();
    return contexto;
}

function programarLimpiezaConversaciones() {
    if (limpiezaProgramada) return;
    limpiezaProgramada = true;
    const intervalo = setInterval(() => {
        const limite = Date.now() - CONVERSACION_TTL_MS;
        for (const [chatKey, contexto] of conversaciones) {
            if (contexto.ultimaActividad < limite) conversaciones.delete(chatKey);
        }
    }, Math.min(CONVERSACION_TTL_MS, 15 * 60 * 1000));
    intervalo.unref();
}

function limpiarTelefono(telefono) {
    let numero = String(telefono || "").replace(/[^0-9]/g, "");
    if (numero.startsWith("00")) numero = numero.slice(2);
    const codigoPais = String(process.env.WHATSAPP_COUNTRY_CODE || "57").replace(/[^0-9]/g, "");
    if (numero.length === 10 && codigoPais) numero = `${codigoPais}${numero}`;
    return numero;
}

async function enviarWhatsApp(client, query, { pacienteId, citaId, telefono, mensaje }) {
    const numero = limpiarTelefono(telefono);
    if (!numero || !pacienteId || !citaId) return false;

    try {
        const autorizados = await query(`
            SELECT p.telefono_whatsapp
            FROM pacientes p
            JOIN citas c ON c.paciente_id = p.paciente_id
            WHERE p.paciente_id = ?
              AND c.cita_id = ?
              AND c.estado IN ('Pendiente', 'Confirmada')
        `, [pacienteId, citaId]);
        const autorizado = autorizados[0]
            && limpiarTelefono(autorizados[0].telefono_whatsapp) === numero;
        if (!autorizado) {
            console.warn(`Mensaje omitido: el número no pertenece al paciente autorizado para la cita ${citaId}`);
            return false;
        }

        const contacto = await client.getNumberId(numero);
        if (!contacto) {
            console.warn(`WhatsApp no tiene un usuario registrado para el número ${numero}`);
            return false;
        }

        await client.sendMessage(contacto._serialized, mensaje);
        return true;
    } catch (error) {
        console.warn(`No se pudo enviar WhatsApp a ${numero}: ${error.message}`);
        return false;
    }
}

async function obtenerTelefonoEntrante(client, msg) {
    const contacto = await msg.getContact().catch(() => null);
    const telefonoFormateado = contacto?.getFormattedNumber
        ? await contacto.getFormattedNumber().catch(() => "")
        : "";
    const candidato = contacto?.number || telefonoFormateado;
    if (candidato && !String(msg.from).endsWith("@lid")) return candidato;

    if (!String(msg.from).endsWith("@lid") || !client.pupPage) return candidato || "";

    const telefonoMapeado = await client.pupPage.evaluate(async (lid) => {
        const wid = window.Store?.WidFactory?.createWid(lid);
        const resolvers = [
            window.Store?.LidUtils?.getPhoneNumber,
            window.Store?.LidPnMappingUtils?.getPhoneNumber,
            window.Store?.LidPnMappingUtils?.getPnForLid,
            window.Store?.LidMapping?.getPhoneNumber
        ].filter(Boolean);

        for (const resolver of resolvers) {
            try {
                const resultado = await resolver(wid);
                const numero = resultado?.user || resultado?.number || resultado?._serialized;
                if (numero && !String(numero).includes("@lid")) return numero;
            } catch (error) {
                // WhatsApp cambia estos módulos internos con frecuencia.
            }
        }
        return "";
    }, msg.from).catch(() => "");

    return telefonoMapeado || "";
}

async function puedeResponderEnPruebas(query, telefono, lid, consulta = "") {
    if (ONLY_REMINDER_RECIPIENTS === false) {
        return true;
    }

    const telLimpio = limpiarTelefonoParaValidacion(telefono);
    const remitenteKey = telLimpio || lid || "";

    // 1. Validar si este remitente recibió un recordatorio previo por parte del bot y está vigente (24h)
    if (remitenteKey && autorizacionesRecordatorio.has(remitenteKey)) {
        if (!yaExpiroValidacion(remitenteKey)) {
            return true;
        } else {
            autorizacionesRecordatorio.delete(remitenteKey);
        }
    }

    if (telLimpio && telLimpio.length >= 10) {
        const ult10 = telLimpio.slice(-10);
        for (const [authTel, timestamp] of autorizacionesRecordatorio) {
            if (authTel.slice(-10) === ult10) {
                if (Date.now() - timestamp <= VENTANA_VALIDACION_REMINDER_MS) {
                    return true;
                } else {
                    autorizacionesRecordatorio.delete(authTel);
                }
            }
        }
    }

    // 2. Validar si existe un recordatorio activo pendiente en la base de datos para este número/LID
    const citaRecordatorio = await obtenerCitaDelUltimoRecordatorio(query, telefono, lid);
    if (citaRecordatorio) {
        if (remitenteKey) {
            autorizacionesRecordatorio.set(remitenteKey, Date.now());
        }
        return true;
    }

    debugLog(`[WhatsApp] Mensaje ignorado estrictamente: el remitente (tel: ${telefono || "n/d"}, lid: ${lid || "n/d"}) no tiene un recordatorio activo pendiente.`);
    return false;
}

async function obtenerCitaDelUltimoRecordatorio(query, telefono, lid) {
    const numero = limpiarTelefono(telefono);
    if (!numero && !lid) return null;

    const citas = await query(`
        SELECT c.cita_id, c.fecha_cita, c.hora_cita, c.estado, c.paciente_id,
               c.medico_id, p.nombre_completo AS paciente, p.telefono_whatsapp,
               p.whatsapp_lid, m.especialidad, r.fecha_envio
        FROM citas c
        JOIN pacientes p ON p.paciente_id = c.paciente_id
        JOIN medicos m ON m.medico_id = c.medico_id
        JOIN recordatorios r ON r.cita_id = c.cita_id
        WHERE c.estado IN ('Pendiente', 'Confirmada')
          AND c.recordatorio_enviado = 1
          AND r.estado_entrega IN ('Enviado', 'Entregado', 'Pendiente')
          AND r.fecha_envio IS NOT NULL
        ORDER BY r.fecha_envio DESC
        LIMIT 50
    `);

    return citas.find((cita) => {
        const mismoTelefono = numero
            && limpiarTelefono(cita.telefono_whatsapp).slice(-10) === numero.slice(-10);
        const mismoLid = lid && cita.whatsapp_lid === lid;
        return mismoTelefono || mismoLid;
    }) || null;
}

function fechaCita(cita) {
    const fecha = cita.fecha_cita instanceof Date
        ? cita.fecha_cita.toISOString().slice(0, 10)
        : String(cita.fecha_cita).slice(0, 10);
    const hora = cita.hora_cita instanceof Date
        ? cita.hora_cita.toISOString().slice(11, 19)
        : String(cita.hora_cita).slice(0, 8);
    const resultado = new Date(`${fecha}T${hora}${CLINIC_UTC_OFFSET}`);
    return Number.isNaN(resultado.getTime()) ? null : resultado;
}

function clasificarLocal(consulta) {
    const texto = consulta.toLowerCase();
    if (/\b(cancelar|cancelo|cancela|anular)\b/.test(texto)) return { intencion: "CANCELAR", sintomas_detalles: "" };
    if (/\b(confirmar|confirmo|asistiré|asistire|asistencia)\b/.test(texto)) return { intencion: "CONFIRMAR", sintomas_detalles: "" };
    if (/\b(dolor|duele|fiebre|tos|síntoma|sintoma|mareo|náusea|nausea|malestar|ardor|vomit|diarrea|sangrado|presión|presion)\b/.test(texto)) {
        return { intencion: "SINTOMAS", sintomas_detalles: consulta };
    }
    return { intencion: "OTRO", sintomas_detalles: "" };
}

function esRespuestaNegativa(texto) {
    return /^(no|nop|no gracias|ninguno|ninguna|esta bien|está bien|correcto|correcta)[.!\s]*$/i.test(texto.trim());
}

function esRespuestaAfirmativa(texto) {
    return /^(si|sí|s[ií] claro|claro|correcto|agregar|cambiar)[.!\s]*$/i.test(texto.trim());
}

async function crearClasificador() {
    if (!process.env.GEMINI_API_KEY) {
        console.warn("[Gemini] Deshabilitada: GEMINI_API_KEY está vacía");
        return null;
    }
    try {
        const { GoogleGenAI } = require("@google/genai");
        const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
        const modelo = process.env.GEMINI_MODEL || "gemini-2.5-flash-lite";
        debugLog(`[Gemini] Habilitada con modelo ${modelo}`);
        const normalizarClasificacion = (resultado) => {
            const intenciones = new Set(["CONFIRMAR", "CANCELAR", "SINTOMAS", "OTRO"]);
            if (!resultado || typeof resultado !== "object" || !intenciones.has(resultado.intencion)) {
                throw new Error("Gemini devolvió una clasificación inválida");
            }
            return {
                intencion: resultado.intencion,
                sintomas_detalles: typeof resultado.sintomas_detalles === "string"
                    ? resultado.sintomas_detalles.trim()
                    : ""
            };
        };
        const clasificar = async (consulta) => {
            try {
                debugLog(`[Gemini] Clasificando: "${consulta}"`);
                const response = await ai.models.generateContent({
                    model: modelo,
                    contents: `Clasifica este mensaje de un paciente. Responde solo JSON válido con las claves intencion y sintomas_detalles. intencion debe ser CONFIRMAR, CANCELAR, SINTOMAS u OTRO. Mensaje: "${consulta}"`,
                    config: {
                        systemInstruction: "Eres un clasificador estricto. No diagnostiques, no recomiendes medicamentos y no escribas markdown."
                    }
                });
                const texto = typeof response.text === "function" ? response.text() : response.text;
                const resultado = JSON.parse(String(texto).replace(/```json|```/gi, "").trim());
                const clasificacion = normalizarClasificacion(resultado);
                debugLog(`[Gemini] Clasificación: ${clasificacion.intencion}`);
                return clasificacion;
            } catch (error) {
                console.error(`[Gemini] Error clasificando: ${error.message}`);
                throw error;
            }
        };
        const responder = async (consulta) => {
            try {
                debugLog(`[Gemini] Generando respuesta: "${consulta}"`);
                const response = await ai.models.generateContent({
                    model: modelo,
                    contents: consulta,
                    config: {
                        systemInstruction: "Eres un asistente virtual de una clínica. Responde con amabilidad y máximo dos párrafos. Informa sobre horarios de lunes a viernes de 8:00 a 17:00 y el uso del portal. Nunca des diagnósticos, interpretes exámenes ni recetes medicamentos."
                    }
                });
                const texto = typeof response.text === "function" ? response.text() : response.text;
                debugLog("[Gemini] Respuesta generada correctamente");
                return texto;
            } catch (error) {
                console.error(`[Gemini] Error generando respuesta: ${error.message}`);
                throw error;
            }
        };
        return { clasificar, responder };
    } catch (error) {
        console.error("[Gemini] No disponible; se usará el clasificador local:", error.message);
        return null;
    }
}

function limpiarBloqueosSession(authDir) {
    try {
        if (!fs.existsSync(authDir)) return;
        const singletonLock = path.join(authDir, "SingletonLock");
        if (fs.existsSync(singletonLock)) {
            fs.unlinkSync(singletonLock);
            console.log("[WhatsApp] Bloqueo SingletonLock eliminado de la sesión anterior.");
        }
        const limpiarLocksRecursivo = (dir) => {
            const entries = fs.readdirSync(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                if (entry.isDirectory()) {
                    limpiarLocksRecursivo(fullPath);
                } else if (entry.name === "LOCK" || entry.name.endsWith(".lock")) {
                    try {
                        fs.unlinkSync(fullPath);
                        debugLog(`[WhatsApp] Archivo de bloqueo eliminado: ${fullPath}`);
                    } catch (e) {
                        // Ignorar si está en uso
                    }
                }
            }
        };
        limpiarLocksRecursivo(authDir);
    } catch (error) {
        debugLog(`[WhatsApp] No se pudieron limpiar algunos bloqueos de sesión: ${error.message}`);
    }
}

async function iniciarWhatsApp({ query }) {
    if (process.env.ENABLE_WHATSAPP !== "true") {
        console.log("WhatsApp desactivado. Usa ENABLE_WHATSAPP=true para activarlo.");
        return null;
    }

    let Client;
    let LocalAuth;
    let qrcode;
    try {
        ({ Client, LocalAuth } = require("whatsapp-web.js"));
        qrcode = require("qrcode-terminal");
    } catch (error) {
        console.error("No se pudo cargar WhatsApp. Instala whatsapp-web.js y qrcode-terminal:", error.message);
        return null;
    }

    const gemini = await crearClasificador();
    programarLimpiezaConversaciones();
    let chromePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    if (!chromePath) {
        try {
            chromePath = require("puppeteer").executablePath();
        } catch (error) {
            debugLog(`[WhatsApp] No se pudo obtener Chromium de Puppeteer: ${error.message}`);
        }
    }
    const intentos = Math.max(1, Number(process.env.WHATSAPP_INIT_RETRIES) || 3);
    const tiempoEspera = Math.max(30, Number(process.env.WHATSAPP_INIT_TIMEOUT_SECONDS) || 45) * 1000;
    let cronIniciado = false;

    const sessionDir = path.join(__dirname, "..", ".wwebjs_auth", "session-clinicita");
    limpiarBloqueosSession(sessionDir);

    for (let intentoActual = 1; intentoActual <= intentos; intentoActual += 1) {
        let client;
        try {
            console.log(`[WhatsApp] Inicializando cliente (intento ${intentoActual}/${intentos})...`);
            client = new Client({
                authStrategy: new LocalAuth({ clientId: "clinicita" }),
                puppeteer: {
                    ...(chromePath && fs.existsSync(chromePath) ? { executablePath: chromePath } : {}),
                    headless: true,
                    args: [
                        "--disable-dev-shm-usage",
                        "--no-first-run",
                        "--no-default-browser-check",
                        "--no-sandbox",
                        "--disable-setuid-sandbox",
                        "--disable-gpu",
                        "--disable-accelerated-2d-canvas",
                        "--disable-infobars",
                        "--window-size=1280,800",
                        "--disable-breakpad",
                        "--disable-component-update",
                        "--disable-domain-reliability",
                        "--disable-features=AudioServiceOutOfProcess,Translate,BackForwardCache,AcceptCHFrame,MediaRouter,OptimizationHints",
                        "--disable-ipc-flooding-protection",
                        "--disable-renderer-backgrounding",
                        "--enable-features=NetworkService,NetworkServiceInProcess",
                        "--mute-audio"
                    ],
                    handleSIGINT: false,
                    handleSIGTERM: false,
                    handleSIGHUP: false
                }
            });

            let listo = false;
            let temporizadorListo;
            const listoPromise = new Promise((resolve, reject) => {
                temporizadorListo = setTimeout(() => {
                    reject(new Error(`WhatsApp no llegó a ready después de ${tiempoEspera / 1000} segundos (timeout de conexión)`));
                }, tiempoEspera);
                client.once("ready", () => {
                    listo = true;
                    clearTimeout(temporizadorListo);
                    resolve();
                });
                client.once("auth_failure", (mensaje) => {
                    clearTimeout(temporizadorListo);
                    reject(new Error(`Falló la autenticación de WhatsApp: ${mensaje}`));
                });
                client.once("disconnected", (razon) => {
                    clearTimeout(temporizadorListo);
                    reject(new Error(`WhatsApp se desconectó durante el inicio: ${razon}`));
                });
            });

            client.on("qr", (qr) => {
                console.log("\n=== QR DE WHATSAPP ===");
                console.log("Escanéalo desde WhatsApp > Dispositivos vinculados:");
                qrcode.generate(qr, { small: true }, (codigo) => console.log(codigo));
                console.log("=== FIN QR DE WHATSAPP ===\n");
            });
            client.on("loading_screen", (porcentaje, mensaje) => {
                console.log(`[WhatsApp] Cargando ${porcentaje}%: ${mensaje}`);
            });
            client.on("authenticated", () => {
                console.log("[WhatsApp] Autenticado correctamente; esperando que WhatsApp Web termine de cargar...");
            });
            client.on("ready", () => {
                if (cronIniciado) return;
                cronIniciado = true;
                console.log("[WhatsApp] Bot de WhatsApp listo y operando.");
                cron.schedule("* * * * *", () => enviarRecordatorios({ client, query }).catch((error) => console.error("Error en recordatorios:", error.message)));
            });
            client.on("auth_failure", (mensaje) => console.error("[WhatsApp] Falló la autenticación:", mensaje));
            client.on("change_state", (estado) => console.log(`[WhatsApp] Estado cambiado: ${estado}`));
            client.on("disconnected", (razon) => console.warn("[WhatsApp] Desconectado:", razon));
            client.on("error", (error) => console.error("[WhatsApp] Error interno:", error.message));

            client.on("message", async (msg) => {
                if (msg.from === "status@broadcast") return;
                const consulta = String(msg.body || "").trim();
                if (!consulta) return;
                debugLog(`Mensaje recibido de: ${msg.from} Contenido: ${msg.body}`);
                try {
                    await procesarMensaje({ client, msg, consulta, query, clasificar: gemini?.clasificar, responder: gemini?.responder });
                } catch (error) {
                    console.error("Error procesando mensaje de WhatsApp:", error.message);
                    await msg.reply("Lo siento, ocurrió un error interno procesando tu solicitud. Escribe 0 para volver al menú principal.").catch(() => {});
                }
            });

            const initPromise = client.initialize();
            initPromise.catch((err) => {
                debugLog(`[WhatsApp] client.initialize() error: ${err.message}`);
            });

            await Promise.race([
                initPromise,
                listoPromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout de inicialización")), tiempoEspera))
            ]);
            await listoPromise;

            if (listo) return client;
        } catch (error) {
            console.error(`[WhatsApp] Intento ${intentoActual}/${intentos} fallido: ${error.message}`);
            if (client) {
                try {
                    await client.destroy();
                } catch (destroyErr) {
                    debugLog(`[WhatsApp] Error destruyendo cliente: ${destroyErr.message}`);
                }
            }

            if (intentoActual < intentos) {
                console.log("[WhatsApp] Reintentando inicialización en 4 segundos...");
                await new Promise((resolve) => setTimeout(resolve, 4000));
            } else {
                console.warn("[WhatsApp] Se agotaron los reintentos. Limpiando sesión corrupta automáticamente...");
                try {
                    if (fs.existsSync(sessionDir)) {
                        fs.rmSync(sessionDir, { recursive: true, force: true });
                        console.log("[WhatsApp] Carpeta .wwebjs_auth/session-clinicita eliminada por corrupción/timeout persistente.");
                    }
                } catch (rmErr) {
                    console.error(`[WhatsApp] No se pudo limpiar la sesión automáticamente: ${rmErr.message}`);
                }
            }
        }
    }

    console.error("[WhatsApp] Quedó desactivado después de agotar los reintentos y la limpieza automática.");
    return null;
}

async function obtenerCitasActivas(query, telefono) {
    const numero = limpiarTelefono(telefono.telefono);
    const lid = telefono.lid;
    if (!numero && !lid) return [];

    const filas = await query(`
        SELECT c.cita_id, c.fecha_cita, c.hora_cita, c.estado, c.paciente_id,
               c.medico_id, p.nombre_completo AS paciente, p.telefono_whatsapp,
               p.whatsapp_lid, m.especialidad
        FROM citas c
        JOIN pacientes p ON p.paciente_id = c.paciente_id
        JOIN medicos m ON m.medico_id = c.medico_id
        WHERE c.estado IN ('Pendiente', 'Confirmada')
        AND (TIMESTAMP(c.fecha_cita, c.hora_cita) >= DATE_SUB(NOW(), INTERVAL 24 HOUR)
            OR c.estado = 'Confirmada')
        ORDER BY c.fecha_cita, c.hora_cita
    `);

    if (lid) {
        const citasPorLid = filas.filter((fila) => fila.whatsapp_lid === lid);
        if (citasPorLid.length) return citasPorLid;
    }
    if (!numero) return [];
    const ultimosDigitos = numero.slice(-10);
    return filas.filter((fila) => limpiarTelefono(fila.telefono_whatsapp).slice(-10) === ultimosDigitos);
}

function seleccionarCita(citas, consulta) {
    const indice = Number.parseInt(consulta.match(/^(?:cita\s*)?(\d+)$/i)?.[1] || "", 10);
    return Number.isInteger(indice) && indice > 0 && indice <= citas.length ? citas[indice - 1] : null;
}

function formatoOpcionesCitas(citas) {
    return citas.map((cita, indice) => {
        return `${indice + 1}. ${formatoCita(cita)}`;
    }).join("\n");
}

function formatoCita(cita) {
    const fecha = fechaCita(cita);
    const fechaTexto = fecha
        ? fecha.toLocaleString("es-CO", { timeZone: CLINIC_TIMEZONE, dateStyle: "medium", timeStyle: "short" })
        : `${cita.fecha_cita} ${cita.hora_cita}`;
    return `${fechaTexto} - ${cita.especialidad}`;
}

async function asegurarRecordatorio(query, citaId) {
    await query(`
        INSERT INTO recordatorios (cita_id, canal_envio, estado_entrega)
        SELECT ?, 'WhatsApp', 'Pendiente'
        WHERE NOT EXISTS (SELECT 1 FROM recordatorios WHERE cita_id = ?)
    `, [citaId, citaId]);
}

async function vincularLid(query, lid, consulta, telefono) {
    const coincidenciaConPin = consulta.match(/^vincular\s+(\d{5,20})\s+(\d{4})$/i);
    const coincidenciaGenerica = consulta.match(/^vincular\s+(\d{4,20})$/i);

    const valor = coincidenciaConPin?.[1] || coincidenciaGenerica?.[1];
    const ultimosCuatroPin = coincidenciaConPin?.[2];

    if (!valor) return false;

    let pacientes = [];
    if (valor.length === 4) {
        pacientes = await query(
            `SELECT paciente_id, nombre_completo, telefono_whatsapp
             FROM pacientes
             WHERE RIGHT(REPLACE(REPLACE(telefono_whatsapp, '+', ''), ' ', ''), 4) = ?
             LIMIT 1`,
            [valor]
        );
    } else {
        pacientes = await query(
            `SELECT paciente_id, nombre_completo, telefono_whatsapp
             FROM pacientes
             WHERE documento_id = ?
             LIMIT 1`,
            [valor]
        );
    }

    let paciente = pacientes[0];

    if (paciente && ultimosCuatroPin) {
        const telPaciente = limpiarTelefono(paciente.telefono_whatsapp);
        if (telPaciente.slice(-4) !== ultimosCuatroPin) {
            return "invalido";
        }
    }

    if (!paciente) {
        return "invalido";
    }

    await query("UPDATE pacientes SET whatsapp_lid = ? WHERE paciente_id = ?", [lid, paciente.paciente_id]);
    debugLog(`[WhatsApp] LID ${lid} vinculado al paciente ${paciente.paciente_id} (${paciente.nombre_completo})`);
    return paciente.nombre_completo;
}

async function mostrarMenuPrincipal(msg) {
    await msg.reply(`Hola, bienvenido al asistente de CliniCita. Por favor, responde con el número de la opción que deseas realizar:

1. Ver mis citas / Confirmar / Cancelar
2. Registrar síntomas para mi cita
3. Hablar con nuestro Asistente de IA (consultas generales)
4. Salir`);
}

async function procesarMensaje({ client, msg, consulta, query, clasificar, responder }) {
    const lid = String(msg.from).endsWith("@lid") ? msg.from : null;
    const chatKey = lid || msg.from;
    const telefono = await obtenerTelefonoEntrante(client, msg);
    const contexto = obtenerConversacion(chatKey) || { paso: "menu_principal" };

    if (!(await puedeResponderEnPruebas(query, telefono, lid, consulta))) {
        debugLog(`[WhatsApp] Mensaje ignorado silenciosamente: el remitente ${chatKey} no recibió notificación previa de recordatorio.`);
        return; // Ignorar el mensaje completamente y NO responder (sin msg.reply)
    }

    if (/^vincular\b/i.test(consulta)) {
        const vinculacion = await vincularLid(query, lid || msg.from, consulta, telefono);
        if (vinculacion && vinculacion !== "invalido") {
            await msg.reply(`¡Cuenta vinculada exitosamente a ${vinculacion}! Ya puedes gestionar tus citas.`);
            guardarConversacion(chatKey, { paso: "menu_principal" });
            await mostrarMenuPrincipal(msg);
        } else if (vinculacion === "invalido") {
            await msg.reply("El documento o los últimos 4 dígitos no se encuentran registrados en nuestro sistema. Por favor verifica e intenta nuevamente (ejemplo: Vincular 11111111111111 o Vincular 6996).");
        } else {
            await msg.reply("Formato de vinculación inválido. Usa: Vincular <documento> o Vincular <ultimos_4_dígitos>");
        }
        return;
    }

    if (contexto?.estado === "silencioso" && !/^(0|menu|salir|1|2|3|4)$/i.test(consulta)) return;

    // Mantener compatibilidad con los recordatorios: el paciente puede
    // responder directamente CONFIRMAR o CANCELAR sin navegar el menú.
    if (!contexto.paso || contexto.paso === "menu_principal") {
        const intencionDirecta = clasificarLocal(consulta).intencion;
        if (intencionDirecta === "CONFIRMAR" || intencionDirecta === "CANCELAR") {
            // Validar que el remitente sea exclusivamente el usuario al que se le envió el recordatorio
            const telRemitenteLimpio = limpiarTelefonoParaValidacion(telefono);
            if (!telRemitenteLimpio || yaExpiroValidacion(telRemitenteLimpio) || !autorizacionesRecordatorio.has(telRemitenteLimpio)) {
                debugLog(`[WhatsApp] Mensaje de recordatorio ignorado: el remitente ${telefono} no recibió la notificación previa o expiró.`);
                return; // Ignorar el mensaje completamente y no responder
            }

            const citaRecordatorio = await obtenerCitaDelUltimoRecordatorio(query, telefono, lid);
            if (citaRecordatorio) {
                const cita = citaRecordatorio;
                if (intencionDirecta === "CONFIRMAR") {
                    await query("UPDATE citas SET estado = 'Confirmada' WHERE cita_id = ?", [cita.cita_id]);
                    await msg.reply("¡Cita confirmada exitosamente! Gracias por usar CliniCita.");
                } else {
                    await query("UPDATE citas SET estado = 'Cancelada' WHERE cita_id = ?", [cita.cita_id]);
                    await reasignarCupoListaEspera(query, cita, client);
                    await msg.reply(`Hola ${cita.paciente}, tu cita fue cancelada correctamente.`);
                }
                guardarConversacion(chatKey, { paso: "menu_principal" });
                await mostrarMenuPrincipal(msg);
                return;
            }

            const citasActivas = await obtenerCitasActivas(query, { telefono, lid });
            if (citasActivas.length > 1) {
                guardarConversacion(chatKey, { paso: "menu_cita_seleccion", citasActivas, telefono, lid });
                const textoCitas = citasActivas.map((c, i) => `${i + 1}. ${formatoCita(c)}`).join("\n");
                await msg.reply(`Tienes varias citas activas. Responde con el número de la cita:\n${textoCitas}`);
                return;
            }
        }
    }

    if (lid && /^vincular\b/i.test(consulta)) {
        const vinculacion = await vincularLid(query, lid, consulta, telefono);
        if (vinculacion && vinculacion !== "invalido") {
            await msg.reply(`Número vinculado correctamente a ${vinculacion}.`);
            guardarConversacion(chatKey, { paso: "menu_principal" });
            await mostrarMenuPrincipal(msg);
        } else {
            await msg.reply("Datos de vinculación inválidos o número no coincide.");
        }
        return;
    }

    // Global reset / return to main menu on '0', 'menu', 'salir'
    if (/^(0|menu|salir)$/i.test(consulta.trim())) {
        guardarConversacion(chatKey, { paso: "menu_principal" });
        await mostrarMenuPrincipal(msg);
        return;
    }

    // If user is in AI Agent mode
    if (contexto.paso === "ia_activo" || contexto.MODO_IA_ACTIVO) {
        if (responder) {
            const respuesta = await responder(consulta).catch(() => null);
            if (respuesta) await msg.reply(respuesta);
            else await msg.reply("Lo siento, en este momento no puedo procesar tu consulta. Escribe 0 para volver al menú principal.");
        } else {
            await msg.reply("El Asistente de IA no está disponible en este momento. Escribe 0 para volver al menú principal.");
        }
        return;
    }

    // Main Menu State
    if (!contexto.paso || contexto.paso === "menu_principal") {
        if (consulta === "1") {
            const citasActivas = await obtenerCitasActivas(query, { telefono, lid });
            if (!citasActivas.length) {
                await msg.reply("No tienes citas activas pendientes o confirmadas.");
                await mostrarMenuPrincipal(msg);
                return;
            }
            guardarConversacion(chatKey, { paso: "menu_cita_seleccion", citasActivas, telefono, lid });
            const textoCitas = citasActivas.map((c, i) => `${i + 1}. ${formatoCita(c)}`).join("\n");
            await msg.reply(`Tus citas activas:\n${textoCitas}\n\nResponde con el número de la cita para gestionar, o 0 para regresar al menú principal.`);
            return;
        }

        if (consulta === "2") {
            const citasActivas = await obtenerCitasActivas(query, { telefono, lid });
            if (!citasActivas.length) {
                await msg.reply("No tienes citas activas para registrar síntomas.");
                await mostrarMenuPrincipal(msg);
                return;
            }
            guardarConversacion(chatKey, { paso: "menu_sintomas_seleccion", citasActivas, telefono, lid });
            const textoCitas = citasActivas.map((c, i) => `${i + 1}. ${formatoCita(c)}`).join("\n");
            await msg.reply(`Tus citas activas para preconsulta:\n${textoCitas}\n\nResponde con el número de la cita para registrar síntomas, o 0 para regresar al menú principal.`);
            return;
        }

        if (consulta === "3") {
            guardarConversacion(chatKey, { paso: "ia_activo", MODO_IA_ACTIVO: true });
            await msg.reply("Has ingresado al modo de consulta con nuestro Asistente de IA. Puedes hacer tus preguntas en lenguaje natural sobre CliniCita, preparación para exámenes o consultas generales. (Escribe '0' o 'MENU' en cualquier momento para volver al menú principal).");
            return;
        }

        if (consulta === "4" || /^salir$/i.test(consulta)) {
            guardarConversacion(chatKey, { paso: "menu_principal", estado: "silencioso" });
            await msg.reply("Gracias por usar CliniCita. ¡Hasta pronto!");
            return;
        }

        // Invalid option in main menu
        await msg.reply("Opción no válida. Por favor responde únicamente con el número de la opción deseada (o escribe 3 para hablar con el Asistente de IA).");
        await mostrarMenuPrincipal(msg);
        return;
    }

    // Flow 1: Selecting appointment for management (Option 1)
    if (contexto.paso === "menu_cita_seleccion") {
        const indice = Number.parseInt(consulta, 10);
        if (indice === 0) {
            guardarConversacion(chatKey, { paso: "menu_principal" });
            await mostrarMenuPrincipal(msg);
            return;
        }
        const citas = contexto.citasActivas || [];
        if (!Number.isInteger(indice) || indice < 1 || indice > citas.length) {
            await msg.reply("Número de cita no válido. Responde con el número de la cita o 0 para regresar.");
            return;
        }
        const cita = citas[indice - 1];
        if (lid && cita.whatsapp_lid !== lid) {
            await query("UPDATE pacientes SET whatsapp_lid = ? WHERE paciente_id = ?", [lid, cita.paciente_id]);
        }
        guardarConversacion(chatKey, {
            paso: "menu_accion_cita",
            citaId: cita.cita_id,
            pacienteId: cita.paciente_id,
            citaData: cita,
            telefono,
            lid
        });
        await msg.reply(`Has seleccionado la cita del ${formatoCita(cita)}.\n¿Qué deseas hacer?\n1. Confirmar cita\n2. Cancelar cita\n0. Volver`);
        return;
    }

    // Flow 1 actions: Confirm or Cancel (Option 1)
    if (contexto.paso === "menu_accion_cita") {
        if (consulta === "0") {
            const citasActivas = await obtenerCitasActivas(query, { telefono: contexto.telefono, lid: contexto.lid });
            if (citasActivas.length) {
                guardarConversacion(chatKey, { paso: "menu_cita_seleccion", citasActivas, telefono: contexto.telefono, lid: contexto.lid });
                const textoCitas = citasActivas.map((c, i) => `${i + 1}. ${formatoCita(c)}`).join("\n");
                await msg.reply(`Tus citas activas:\n${textoCitas}\n\nResponde con el número de la cita para gestionar, o 0 para regresar al menú principal.`);
            } else {
                guardarConversacion(chatKey, { paso: "menu_principal" });
                await mostrarMenuPrincipal(msg);
            }
            return;
        }

        if (consulta === "1") {
            await query("UPDATE citas SET estado = 'Confirmada' WHERE cita_id = ?", [contexto.citaId]);
            guardarConversacion(chatKey, { paso: "menu_principal" });
            await msg.reply("¡Cita confirmada exitosamente! Gracias por usar CliniCita.");
            await mostrarMenuPrincipal(msg);
            return;
        }

        if (consulta === "2") {
            await query("UPDATE citas SET estado = 'Cancelada' WHERE cita_id = ?", [contexto.citaId]);
            await reasignarCupoListaEspera(query, contexto.citaData, client);
            guardarConversacion(chatKey, { paso: "menu_principal" });
            await msg.reply(`Hola ${contexto.citaData.paciente}, tu cita fue cancelada correctamente.`);
            await mostrarMenuPrincipal(msg);
            return;
        }

        await msg.reply("Opción no válida. Responde 1 para Confirmar, 2 para Cancelar o 0 para Volver.");
        return;
    }

    // Flow 2: Selecting appointment for symptoms (Option 2)
    if (contexto.paso === "menu_sintomas_seleccion") {
        const indice = Number.parseInt(consulta, 10);
        if (indice === 0) {
            guardarConversacion(chatKey, { paso: "menu_principal" });
            await mostrarMenuPrincipal(msg);
            return;
        }
        const citas = contexto.citasActivas || [];
        if (!Number.isInteger(indice) || indice < 1 || indice > citas.length) {
            await msg.reply("Número de cita no válido. Responde con el número de la cita o 0 para regresar.");
            return;
        }
        const cita = citas[indice - 1];
        if (lid && cita.whatsapp_lid !== lid) {
            await query("UPDATE pacientes SET whatsapp_lid = ? WHERE paciente_id = ?", [lid, cita.paciente_id]);
        }
        guardarConversacion(chatKey, {
            paso: "esperando_sintomas_texto",
            citaId: cita.cita_id,
            pacienteId: cita.paciente_id,
            citaData: cita,
            telefono,
            lid
        });
        await msg.reply(`Has seleccionado la cita del ${formatoCita(cita)}. Por favor, escribe brevemente tus síntomas o motivo de consulta:`);
        return;
    }

    // Flow 2: Waiting for symptoms text input
    if (contexto.paso === "esperando_sintomas_texto") {
        const sintomasTexto = consulta;
        guardarConversacion(chatKey, {
            ...contexto,
            paso: "confirmando_sintomas",
            sintomasTemp: sintomasTexto
        });
        await msg.reply(`Has escrito:\n"${sintomasTexto}"\n\n¿Deseas confirmar este registro de síntomas?\n1. Sí\n2. No`);
        return;
    }

    // Flow 2: Confirming symptoms registration
    if (contexto.paso === "confirmando_sintomas") {
        if (consulta === "1" || /^si|sí$/i.test(consulta)) {
            await query(
                "INSERT INTO fichas_preconsulta (cita_id, paciente_id, sintomas) VALUES (?, ?, ?)",
                [contexto.citaId, contexto.pacienteId, contexto.sintomasTemp]
            );
            guardarConversacion(chatKey, { paso: "menu_principal" });
            await msg.reply("¡Información de preconsulta registrada correctamente! Gracias.");
            await mostrarMenuPrincipal(msg);
            return;
        }
        if (consulta === "2" || /^no$/i.test(consulta)) {
            guardarConversacion(chatKey, { paso: "menu_principal" });
            await msg.reply("Registro de síntomas cancelado.");
            await mostrarMenuPrincipal(msg);
            return;
        }
        await msg.reply("Por favor responde 1 para Sí o 2 para No.");
        return;
    }

    // Default fallback
    guardarConversacion(chatKey, { paso: "menu_principal" });
    await mostrarMenuPrincipal(msg);
}

// ============================================================
// 1.6.1 INTEGRACIÓN RIESGO NO-SHOW EN RECORDATORIOS
// ============================================================

/**
 * Envía SMS simulado (para pacientes de alto riesgo)
 * En producción, aquí se integraría un proveedor real de SMS (Twilio, Vonage, etc.)
 */
async function enviarSMS({ pacienteId, citaId, telefono, mensaje }) {
    try {
        // En desarrollo, solo logueamos el SMS simulado
        console.log(`[SMS SIMULADO] Para ${telefono} (paciente ${pacienteId}, cita ${citaId}): ${mensaje}`);

        // Aquí iría la integración real con un proveedor de SMS:
        // const resp = await axios.post('https://api.proveedor-sms.com/send', {
        //     to: telefono,
        //     body: mensaje
        // });

        return true;
    } catch (error) {
        console.warn(`[SMS] Error enviando SMS simulado a ${telefono}: ${error.message}`);
        return false;
    }
}

/**
 * Obtiene el nivel de riesgo del paciente, con fallback heurístico si ML no está disponible
 */
async function obtenerNivelRiesgo(pacienteId) {
    try {
        const riesgo = await mlClient.getRiesgo(pacienteId);
        return riesgo.nivel_riesgo;
    } catch (error) {
        console.warn(`[Riesgo] No se pudo obtener riesgo para paciente ${pacienteId}: ${error.message}`);
        return "Bajo"; // Default conservador
    }
}

async function enviarRecordatorios({ client, query }) {
    const citas = await query(`
        SELECT c.cita_id,
               c.paciente_id,
               DATE_FORMAT(c.fecha_cita, '%Y-%m-%d') AS fecha_cita,
               TIME_FORMAT(c.hora_cita, '%H:%i:%s') AS hora_cita,
               p.nombre_completo AS paciente, p.telefono_whatsapp
        FROM citas c
        JOIN pacientes p ON p.paciente_id = c.paciente_id
        WHERE TIMESTAMP(c.fecha_cita, c.hora_cita) BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)
          AND c.estado IN ('Pendiente', 'Confirmada')
          AND c.recordatorio_enviado = 0
    `);

    for (const cita of citas) {
        const telefono = limpiarTelefono(cita.telefono_whatsapp);
        if (!telefono) continue;
        const fechaCitaActual = fechaCita(cita);
        if (!fechaCitaActual) {
            console.warn(`Cita ${cita.cita_id} tiene una fecha u hora inválida`);
            continue;
        }
        const fecha = fechaCitaActual.toLocaleString("es-CO", { timeZone: CLINIC_TIMEZONE, dateStyle: "medium", timeStyle: "short" });
        const mensajeBase = `Hola ${cita.paciente}. Te recordamos tu cita médica el ${fecha}. Responde CONFIRMAR o CANCELAR.`;

        // 1.6.1: Consultar nivel de riesgo del paciente
        const nivelRiesgo = await obtenerNivelRiesgo(cita.paciente_id);
        const esAltoRiesgo = nivelRiesgo === "Alto" || nivelRiesgo === "Crítico";

        // Canal 1: WhatsApp (siempre)
        const enviadoWhatsApp = await enviarWhatsApp(client, query, {
            pacienteId: cita.paciente_id,
            citaId: cita.cita_id,
            telefono,
            mensaje: mensajeBase
        });

        // Canal 2: SMS simulado (solo para alto riesgo)
        let enviadoSMS = true;
        if (esAltoRiesgo) {
            const mensajeSMS = `[ALTO RIESGO] ${mensajeBase} Prioridad: ${nivelRiesgo}.`;
            enviadoSMS = await enviarSMS({
                pacienteId: cita.paciente_id,
                citaId: cita.cita_id,
                telefono,
                mensaje: mensajeSMS
            });
            console.log(`[Recordatorio] Paciente ${cita.paciente} (${cita.paciente_id}) - Riesgo: ${nivelRiesgo} - Doble canal: WhatsApp + SMS`);
        } else {
            console.log(`[Recordatorio] Paciente ${cita.paciente} (${cita.paciente_id}) - Riesgo: ${nivelRiesgo} - Canal único: WhatsApp`);
        }

        const exitoGeneral = enviadoWhatsApp && enviadoSMS;

        if (!exitoGeneral) {
            await asegurarRecordatorio(query, cita.cita_id);
            await query("UPDATE recordatorios SET fecha_envio = NOW(), estado_entrega = 'Fallido' WHERE cita_id = ?", [cita.cita_id]);
            continue;
        }

        await query("UPDATE citas SET recordatorio_enviado = 1 WHERE cita_id = ?", [cita.cita_id]);
        await asegurarRecordatorio(query, cita.cita_id);

        // Registrar ambos canales en la tabla recordatorios
        const canalEnvio = esAltoRiesgo ? "WhatsApp+SMS" : "WhatsApp";
        await query("UPDATE recordatorios SET fecha_envio = NOW(), estado_entrega = 'Enviado', canal_envio = ? WHERE cita_id = ?", [canalEnvio, cita.cita_id]);

        // Registrar autorización para respuesta a este recordatorio
        const telLimpio = limpiarTelefonoParaValidacion(telefono);
        if (telLimpio) {
            autorizacionesRecordatorio.set(telLimpio, Date.now());
        }
    }
}

module.exports = { iniciarWhatsApp };
