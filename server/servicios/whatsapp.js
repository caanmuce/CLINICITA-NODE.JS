const cron = require("node-cron");
const fs = require("node:fs");
const path = require("node:path");
const { mlClient } = require("../services/ml-client");
const conversaciones = new Map();
const CONVERSACION_TTL_MS = Number(process.env.WHATSAPP_CONVERSATION_TTL_MS) || 4 * 60 * 60 * 1000;
const CLINIC_TIMEZONE = process.env.CLINIC_TIMEZONE || "America/Bogota";
const CLINIC_UTC_OFFSET = process.env.CLINIC_UTC_OFFSET || "-05:00";
const DEBUG = process.env.DEBUG === "true";
let limpiezaProgramada = false;

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
    const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH || [
        process.env.PROGRAMFILES && path.join(process.env.PROGRAMFILES, "Google", "Chrome", "Application", "chrome.exe"),
        process.env["PROGRAMFILES(X86)"] && path.join(process.env["PROGRAMFILES(X86)"], "Google", "Chrome", "Application", "chrome.exe"),
        process.env.LOCALAPPDATA && path.join(process.env.LOCALAPPDATA, "Google", "Chrome", "Application", "chrome.exe")
    ].find((candidate) => candidate && fs.existsSync(candidate));
    const client = new Client({
        authStrategy: new LocalAuth({ clientId: "clinicita" }),
        ...(chromePath ? { puppeteer: { executablePath: chromePath } } : {})
    });

    client.on("qr", (qr) => qrcode.generate(qr, { small: true }));
    client.on("ready", () => {
        console.log("Bot de WhatsApp listo");
        cron.schedule("* * * * *", () => enviarRecordatorios({ client, query }).catch((error) => console.error("Error en recordatorios:", error.message)));
    });
    client.on("auth_failure", (mensaje) => console.error("Falló la autenticación de WhatsApp:", mensaje));
    client.on("disconnected", (razon) => console.warn("WhatsApp desconectado:", razon));

    client.on("message", async (msg) => {
        if (msg.from === "status@broadcast") return;
        const consulta = String(msg.body || "").trim();
        if (!consulta) return;
        try {
            await procesarMensaje({ client, msg, consulta, query, clasificar: gemini?.clasificar, responder: gemini?.responder });
        } catch (error) {
            console.error("Error procesando mensaje de WhatsApp:", error.message);
        }
    });

    await client.initialize();
    return client;
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
    return `${fechaTexto} (${cita.especialidad})`;
}

async function asegurarRecordatorio(query, citaId) {
    await query(`
        INSERT INTO recordatorios (cita_id, canal_envio, estado_entrega)
        SELECT ?, 'WhatsApp', 'Pendiente'
        WHERE NOT EXISTS (SELECT 1 FROM recordatorios WHERE cita_id = ?)
    `, [citaId, citaId]);
}

async function vincularLid(query, lid, consulta, telefono) {
    const coincidencia = consulta.match(/^vincular\s+(\d{5,20})\s+(\d{4})$/i);
    if (!coincidencia) return false;

    const [, documento, ultimosCuatro] = coincidencia;
    const pacientes = await query(
        `SELECT p.paciente_id, p.nombre_completo, p.telefono_whatsapp, c.cita_id
         FROM pacientes p
         JOIN citas c ON c.paciente_id = p.paciente_id
         WHERE p.documento_id = ?
           AND c.estado IN ('Pendiente', 'Confirmada')
         ORDER BY c.fecha_cita, c.hora_cita
         LIMIT 1`,
        [documento]
    );
    const paciente = pacientes[0];
    if (!paciente
        || limpiarTelefono(telefono) !== limpiarTelefono(paciente.telefono_whatsapp)
        || limpiarTelefono(paciente.telefono_whatsapp).slice(-4) !== ultimosCuatro) {
        return "invalido";
    }

    await query("UPDATE pacientes SET whatsapp_lid = ? WHERE paciente_id = ?", [lid, paciente.paciente_id]);
    debugLog(`[WhatsApp] LID ${lid} vinculado al paciente ${paciente.paciente_id}`);
    return paciente.nombre_completo;
}

async function procesarMensaje({ client, msg, consulta, query, clasificar, responder }) {
    const lid = String(msg.from).endsWith("@lid") ? msg.from : null;
    const chatKey = lid || msg.from;
    const telefono = await obtenerTelefonoEntrante(client, msg);
    const contextoInicial = obtenerConversacion(chatKey);
    if (contextoInicial?.estado === "silencioso") return;

    if (lid && /^vincular\b/i.test(consulta)) {
        const vinculacion = await vincularLid(query, lid, consulta, telefono);
        if (vinculacion && vinculacion !== "invalido") {
            await msg.reply(`Número vinculado correctamente a ${vinculacion}. Ya puedes escribir CONFIRMAR o CANCELAR.`);
        }
        return;
    }
    debugLog(`Mensaje WhatsApp recibido: from=${msg.from}, telefono=${telefono || "no disponible"}`);
    const citasActivas = await obtenerCitasActivas(query, { telefono, lid });
    let cita = contextoInicial?.citaId
        ? citasActivas.find((citaActiva) => citaActiva.cita_id === contextoInicial.citaId)
        : seleccionarCita(citasActivas, consulta);
    if (!cita && contextoInicial?.citaId) {
        const contexto = contextoInicial;
        const citas = await query(`
            SELECT c.cita_id, c.fecha_cita, c.hora_cita, c.estado, c.paciente_id,
                   c.medico_id, p.nombre_completo AS paciente, p.telefono_whatsapp,
                   p.whatsapp_lid, m.especialidad
            FROM citas c
            JOIN pacientes p ON p.paciente_id = c.paciente_id
            JOIN medicos m ON m.medico_id = c.medico_id
            WHERE c.cita_id = ?
        `, [contexto.citaId]);
        cita = citas[0] || null;
        debugLog(`[WhatsApp] Cita recuperada desde contexto: ${cita?.cita_id || "ninguna"}`);
    }
    if (!cita && citasActivas.length > 1) {
        guardarConversacion(chatKey, { ...(contextoInicial || {}), seleccionandoCita: true });
        await msg.reply(`Tienes varias citas activas. Responde con el número de la cita que deseas gestionar:\n${formatoOpcionesCitas(citasActivas)}`);
        return;
    }
    if (!cita) cita = citasActivas[0] || null;
    if (cita && !contextoInicial?.citaId && contextoInicial?.seleccionandoCita && /^\s*(?:cita\s*)?\d+\s*$/i.test(consulta)) {
        guardarConversacion(chatKey, { ...contextoInicial, citaId: cita.cita_id, pacienteId: cita.paciente_id, seleccionandoCita: false });
        await msg.reply(`Seleccionaste la cita del ${formatoCita(cita)}. Ahora responde CONFIRMAR o CANCELAR.`);
        return;
    }
    if (cita && lid && cita.whatsapp_lid !== lid) {
        await query("UPDATE pacientes SET whatsapp_lid = ? WHERE paciente_id = ?", [lid, cita.paciente_id]);
    }
    if (!cita) {
        return;
    }

    const contexto = obtenerConversacion(chatKey) || {};

    if (contexto.esperandoConfirmacionSintomas) {
        if (esRespuestaNegativa(consulta)) {
            guardarConversacion(chatKey, { ...contexto, estado: "silencioso", esperandoConfirmacionSintomas: false });
            return;
        }
        if (esRespuestaAfirmativa(consulta)) {
            guardarConversacion(chatKey, { ...contexto, esperandoConfirmacionSintomas: false });
            await msg.reply("Claro. Escribe los síntomas o el motivo de consulta que deseas agregar o corregir.");
            return;
        }
    }

    guardarConversacion(chatKey, { ...contexto, citaId: cita.cita_id, pacienteId: cita.paciente_id, seleccionandoCita: false });
    let clasificacion;
    if (contexto.esperandoPreconsulta) {
        if (/\b(confirmar|cancelar)\b/i.test(consulta)) {
            await msg.reply("Por favor, describe brevemente tus síntomas o motivo de consulta para registrar tu preconsulta.");
            return;
        }
        clasificacion = { intencion: "SINTOMAS", sintomas_detalles: consulta };
    } else {
        clasificacion = clasificar ? await clasificar(consulta).catch(() => clasificarLocal(consulta)) : clasificarLocal(consulta);
    }
    if (!clasificar) debugLog(`[Gemini] Se usará clasificación local para: "${consulta}"`);
    const intencion = clasificacion.intencion;

    if (intencion === "CANCELAR") {
        await query("UPDATE citas SET estado = 'Cancelada' WHERE cita_id = ?", [cita.cita_id]);
        const espera = await query(`
            SELECT le.espera_id, le.paciente_id, p.nombre_completo, p.telefono_whatsapp
            FROM lista_espera le
            JOIN pacientes p ON p.paciente_id = le.paciente_id
            WHERE le.estado_espera = 'Activo'
              AND (le.especialidad_requerida IS NULL OR le.especialidad_requerida = ?)
            ORDER BY FIELD(le.prioridad, 'Alta', 'Media', 'Baja'), le.fecha_inscripcion
            LIMIT 1
        `, [cita.especialidad]);

        if (espera[0]) {
            const siguiente = espera[0];
            const citaReasignada = await query(
                "INSERT INTO citas (paciente_id, medico_id, fecha_cita, hora_cita, estado) VALUES (?, ?, ?, ?, 'Pendiente')",
                [siguiente.paciente_id, cita.medico_id, cita.fecha_cita, cita.hora_cita]
            );
            await asegurarRecordatorio(query, citaReasignada.insertId);
            await query("UPDATE lista_espera SET estado_espera = 'Asignado' WHERE espera_id = ?", [siguiente.espera_id]);
            const fechaReasignada = fechaCita(cita);
            if (fechaReasignada) {
                await enviarWhatsApp(client, query, {
                    pacienteId: siguiente.paciente_id,
                    citaId: citaReasignada.insertId,
                    telefono: siguiente.telefono_whatsapp,
                    mensaje: `Hola ${siguiente.nombre_completo}. Se liberó un turno de ${cita.especialidad} para el ${fechaReasignada.toLocaleString("es-CO", { timeZone: CLINIC_TIMEZONE, dateStyle: "medium", timeStyle: "short" })}. Responde CONFIRMAR para confirmar tu asistencia.`
                });
            }
        }
        await msg.reply(`Hola ${cita.paciente}, tu cita fue cancelada correctamente.`);
        return;
    }

    if (intencion === "CONFIRMAR") {
        debugLog(`[WhatsApp] Confirmando cita ${cita.cita_id} para ${cita.paciente}`);
        const resultado = await query("UPDATE citas SET estado = 'Confirmada' WHERE cita_id = ?", [cita.cita_id]);
        debugLog(`[WhatsApp] UPDATE confirmación: filas afectadas=${resultado.affectedRows}`);
        const estadoActualizado = await query("SELECT estado FROM citas WHERE cita_id = ?", [cita.cita_id]);
        debugLog(`[WhatsApp] Estado guardado para cita ${cita.cita_id}: ${estadoActualizado[0]?.estado || "no encontrado"}`);
        guardarConversacion(chatKey, { citaId: cita.cita_id, pacienteId: cita.paciente_id, esperandoPreconsulta: true });
        await msg.reply(`Gracias por confirmar, ${cita.paciente}. Describe brevemente tus síntomas o motivo de consulta para registrar tu preconsulta.`);
        return;
    }

    if (intencion === "SINTOMAS") {
        await query(
            "INSERT INTO fichas_preconsulta (cita_id, paciente_id, sintomas) VALUES (?, ?, ?)",
            [cita.cita_id, cita.paciente_id, clasificacion.sintomas_detalles || consulta]
        );
        guardarConversacion(chatKey, {
            citaId: cita.cita_id,
            pacienteId: cita.paciente_id,
            estado: "activo",
            esperandoConfirmacionSintomas: true
        });
        debugLog(`[WhatsApp] Preconsulta guardada para cita ${cita.cita_id}`);
        await msg.reply("Registramos tu información de preconsulta. ¿Deseas cambiar o agregar algún síntoma? Responde SI o NO.");
        return;
    }

    if (responder) {
        const respuesta = await responder(consulta).catch(() => null);
        if (respuesta) await msg.reply(respuesta);
        else await msg.reply("Puedo ayudarte a confirmar o cancelar tu cita. También puedes usar el portal web de CliniCita.");
    } else {
        await msg.reply("Puedo ayudarte a confirmar o cancelar tu cita. También puedes usar el portal web de CliniCita.");
    }
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
    }
}

module.exports = { iniciarWhatsApp };
