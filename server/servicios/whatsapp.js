const cron = require("node-cron");
const axios = require("axios");
const fs = require("node:fs");
const path = require("node:path");
const { mlClient } = require("../services/ml-client");
const { reasignarCupoListaEspera, procesarRespuestaOfertaWhatsApp } = require("./espera");
const { enviarSMS } = require("./sms");
const conexion = require("../conexion");
const CONVERSACION_TTL_MS = Number(process.env.WHATSAPP_CONVERSATION_TTL_MS) || 4 * 60 * 60 * 1000;
const CLINIC_TIMEZONE = process.env.CLINIC_TIMEZONE || "America/Bogota";
const CLINIC_UTC_OFFSET = process.env.CLINIC_UTC_OFFSET || "-05:00";
const DEBUG = process.env.DEBUG === "true";
const ONLY_REMINDER_RECIPIENTS = process.env.WHATSAPP_ONLY_REMINDER_RECIPIENTS !== "false";

// Las autorizaciones de respuesta a recordatorios duran 24 h.
const VENTANA_VALIDACION_REMINDER_MS = 24 * 60 * 60 * 1000;

function limpiarTelefonoParaValidacion(telefono) {
    if (!telefono) return "";
    return String(telefono).replace(/[^0-9]/g, "");
}

function debugLog(mensaje) {
    if (DEBUG) console.log(mensaje);
}

async function leerSesion(query, chatId, tipo) {
    const filas = await query(
        "SELECT payload FROM whatsapp_sesiones WHERE chat_id = ? AND tipo = ? AND expira_en > NOW() LIMIT 1",
        [chatId, tipo]
    );
    if (!filas.length) return null;
    const payload = filas[0].payload;
    return typeof payload === "string" ? JSON.parse(payload) : payload;
}

async function guardarSesion(query, chatId, tipo, payload, ttlMs) {
    const ttlSegundos = Math.max(1, Math.ceil(ttlMs / 1000));
    await query(`
        INSERT INTO whatsapp_sesiones (chat_id, tipo, payload, expira_en)
        VALUES (?, ?, ?, DATE_ADD(NOW(), INTERVAL ? SECOND))
        ON DUPLICATE KEY UPDATE tipo = VALUES(tipo), payload = VALUES(payload),
            expira_en = VALUES(expira_en), actualizado_en = CURRENT_TIMESTAMP
    `, [chatId, tipo, JSON.stringify(payload), ttlSegundos]);
}

async function guardarConversacion(query, chatKey, contexto) {
    const payload = { ...contexto, ultimaActividad: Date.now() };
    await guardarSesion(query, chatKey, "conversacion", payload, CONVERSACION_TTL_MS);
}

async function obtenerConversacion(query, chatKey) {
    const contexto = await leerSesion(query, chatKey, "conversacion");
    if (!contexto) return null;
    contexto.ultimaActividad = Date.now();
    await guardarSesion(query, chatKey, "conversacion", contexto, CONVERSACION_TTL_MS);
    return contexto;
}

async function limpiarSesionesExpiradas(query) {
    await query("DELETE FROM whatsapp_sesiones WHERE expira_en <= NOW()");
}

async function eliminarSesion(query, chatId, tipo = "conversacion") {
    await query("DELETE FROM whatsapp_sesiones WHERE chat_id = ? AND tipo = ?", [chatId, tipo]);
}

const COOLDOWN_NO_REGISTRADO_MS = Number(process.env.WHATSAPP_UNREGISTERED_COOLDOWN_MS) || 24 * 60 * 60 * 1000;
const MENSAJE_NO_REGISTRADO = "Este es un canal exclusivo para pacientes registrados de CliniCita. Para vincular tu cuenta, envía: Vincular <documento> (desde el teléfono registrado) o Vincular <documento> <últimos 4 dígitos del teléfono>.";

async function buscarPacienteRemitente(query, telefono, lid) {
    if (lid) {
        const porLid = await query(
            "SELECT paciente_id FROM pacientes WHERE whatsapp_lid = ? LIMIT 1",
            [lid]
        );
        if (porLid.length) return porLid[0];
    }
    const numero = limpiarTelefono(telefono);
    if (!numero) return null;
    const pacientes = await query(
        "SELECT paciente_id, telefono_whatsapp FROM pacientes WHERE telefono_whatsapp IS NOT NULL AND telefono_whatsapp <> ''"
    );
    const ultimosDigitos = numero.slice(-10);
    return pacientes.find((paciente) => {
        const registrado = limpiarTelefono(paciente.telefono_whatsapp);
        return registrado === numero || (registrado.length >= 10 && registrado.slice(-10) === ultimosDigitos);
    }) || null;
}

async function informarRemitenteNoRegistrado(query, msg, chatId) {
    const aviso = await leerSesion(query, chatId, "conversacion");
    if (aviso?.estado === "remitente_no_registrado") return;
    await msg.reply(MENSAJE_NO_REGISTRADO);
    await guardarSesion(query, chatId, "conversacion", { estado: "remitente_no_registrado", timestamp: Date.now() }, COOLDOWN_NO_REGISTRADO_MS);
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

    // 1. Validar autorización persistida (24 h) para este remitente.
    if (remitenteKey) {
        const autorizacion = await leerSesion(query, remitenteKey, "autorizacion");
        if (autorizacion && Date.now() - Number(autorizacion.timestamp) <= VENTANA_VALIDACION_REMINDER_MS) {
            return true;
        }
    }

    if (telLimpio && telLimpio.length >= 10) {
        const remitenteUltimosDigitos = telLimpio.slice(-10);
        const autorizaciones = await query(`
            SELECT chat_id, payload FROM whatsapp_sesiones
            WHERE tipo = 'autorizacion' AND expira_en > NOW()
        `);
        for (const fila of autorizaciones) {
            const telefonoAutorizado = String(fila.chat_id);
            if (telefonoAutorizado.slice(-10) === remitenteUltimosDigitos) return true;
        }
    }

    // 2. Validar si existe un recordatorio activo pendiente en la base de datos para este número/LID
    const citaRecordatorio = await obtenerCitaDelUltimoRecordatorio(query, telefono, lid);
    if (citaRecordatorio) {
        if (remitenteKey) {
            await guardarSesion(query, remitenteKey, "autorizacion", { timestamp: Date.now() }, VENTANA_VALIDACION_REMINDER_MS);
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
    const texto = consulta.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (/\b(cancelar|cancelo|cancela|anular|anulo|anula|eliminar\s+cita|no\s+podre\s+asistir|no\s+voy\s+a\s+ir)\b/.test(texto)) return { intencion: "CANCELAR", sintomas_detalles: "" };
    if (/\b(confirmar|confirmo|confirma|asistire|alli\s+estare|asistencia)\b/.test(texto)) return { intencion: "CONFIRMAR", sintomas_detalles: "" };
    if (/\b(reprogramar|reprograma|reprogramo|reagendar|reagendo|cambiar\s+cita|cambiar\s+(?:la\s+)?fecha|cambiar\s+(?:la\s+)?hora|cambio\s+de\s+cita|mover\s+cita|posponer|aplazar|pasar\s+la\s+cita|postergar)\b/.test(texto)) return { intencion: "REPROGRAMAR", sintomas_detalles: "" };
    if (/\b(dolor|duele|fiebre|tos|sintoma|mareo|nausea|malestar|ardor|vomit|diarrea|sangrado|presion|estomago|cabeza|espalda|pecho|garganta)\b/.test(texto)) {
        return { intencion: "SINTOMAS", sintomas_detalles: consulta };
    }
    return { intencion: "OTRO", sintomas_detalles: "" };
}

const INTENCIONES_VALIDAS = new Set(["CONFIRMAR", "CANCELAR", "REPROGRAMAR", "SINTOMAS", "OTRO"]);

function normalizarClasificacion(resultado) {
    let clasificacion = resultado;
    if (typeof clasificacion === "string") {
        const texto = clasificacion.trim();
        try {
            clasificacion = JSON.parse(texto);
        } catch {
            clasificacion = { intencion: texto };
        }
    }

    if (!clasificacion || typeof clasificacion !== "object") return null;
    const intencion = String(clasificacion.intencion || "").trim().toUpperCase();
    if (!INTENCIONES_VALIDAS.has(intencion)) return null;
    return {
        intencion,
        sintomas_detalles: typeof clasificacion.sintomas_detalles === "string"
            ? clasificacion.sintomas_detalles.trim()
            : ""
    };
}

async function clasificarConFallback(consulta, clasificarLLM) {
    if (typeof clasificarLLM !== "function") return clasificarLocal(consulta);

    try {
        const resultado = await Promise.race([
            clasificarLLM(consulta),
            new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 5000))
        ]);
        const clasificacion = normalizarClasificacion(resultado);
        if (clasificacion && clasificacion.intencion !== "OTRO") return clasificacion;
    } catch (error) {
        debugLog(`[OmniRoute] Fallback local: ${error.message}`);
    }
    return clasificarLocal(consulta);
}

function esRespuestaNegativa(texto) {
    return /^(no|nop|no gracias|ninguno|ninguna|esta bien|está bien|correcto|correcta)[.!\s]*$/i.test(texto.trim());
}

function esRespuestaAfirmativa(texto) {
    return /^(si|sí|s[ií] claro|claro|correcto|agregar|cambiar)[.!\s]*$/i.test(texto.trim());
}

async function crearClasificador() {
    if (!process.env.OMNIROUTE_API_KEY) {
        console.warn("[OmniRoute] Deshabilitada: OMNIROUTE_API_KEY está vacía");
        return null;
    }
    try {
        const baseURL = (process.env.OMNIROUTE_BASE_URL || "http://localhost:20128/v1").replace(/\/+$/, "");
        const modelo = process.env.OMNIROUTE_MODEL || "combo-1";
        const cliente = axios.create({
            baseURL,
            headers: {
                Authorization: `Bearer ${process.env.OMNIROUTE_API_KEY}`,
                "Content-Type": "application/json; charset=utf-8"
            },
            timeout: 60000
        });
        debugLog(`[OmniRoute] Habilitada con modelo ${modelo} y base URL ${baseURL}`);
        const extraerTexto = (response) => {
            const contenido = response?.data?.choices?.[0]?.message?.content;
            if (Array.isArray(contenido)) {
                return contenido.map((parte) => parte?.text || "").join("");
            }
            if (typeof contenido !== "string" || !contenido.trim()) {
                throw new Error("OmniRoute devolvió una respuesta sin contenido");
            }
            return contenido;
        };
        const normalizarResultadoLLM = (resultado) => {
            const clasificacion = normalizarClasificacion(resultado);
            if (!clasificacion) {
                throw new Error("OmniRoute devolvió una clasificación inválida");
            }
            return clasificacion;
        };
        const clasificar = async (consulta) => {
            try {
                debugLog(`[OmniRoute] Clasificando: "${consulta}"`);
                const response = await cliente.post("/chat/completions", {
                    model: modelo,
                    messages: [
                        {
                            role: "system",
                            content: "Eres un clasificador estricto. No diagnostiques, no recomiendes medicamentos y no escribas markdown."
                        },
                        {
                            role: "user",
                            content: `Clasifica este mensaje de un paciente. Responde solo JSON válido con las claves intencion y sintomas_detalles. intencion debe ser CONFIRMAR, CANCELAR, REPROGRAMAR, SINTOMAS u OTRO.
REPROGRAMAR incluye: reprogramar, reagendar, cambiar fecha, cambiar hora, mover cita, posponer, aplazar y pasar la cita.
CANCELAR incluye: cancelar, anular, eliminar cita, no podré asistir y no voy a ir.
CONFIRMAR incluye: confirmar, asistiré, allí estaré y confirmo.
Mensaje: "${consulta}"`
                        }
                    ]
                });
                const resultado = JSON.parse(extraerTexto(response).replace(/```json|```/gi, "").trim());
                const clasificacion = normalizarResultadoLLM(resultado);
                debugLog(`[OmniRoute] Clasificación: ${clasificacion.intencion}`);
                return clasificacion;
            } catch (error) {
                console.error(`[OmniRoute] Error clasificando: ${error.message}`);
                throw error;
            }
        };
        // Función que verifica si la consulta del usuario está dentro del dominio permitido
        const esSolicitudPermitida = (texto) => {
            const lowered = texto.toLowerCase().trim();

            // Filtro de rechazo estricto: prohibiciones explícitas de recetas directas o temas ajenos flagrantes
            const prohibidos = [
                // 1. Recetas o solicitar medicamentos directos
                /receta\s+m[ée]dica|receta|prescripci[óo]n|pastilla|dosis|f[áa]rmaco|recomendar\s+pastillas|recetar|qu[ée]\s+(?:puedo|debo|me)\s+tomo?\b/i,
                // 2. Literatura, libros, reseñas o temas culturales
                /libro|literatura|novela|reseña|cultura|poesía|autor|cuento|obra\s+literaria|historia\s+del\s+arte/i,
                // 3. Cocina, entretenimiento, películas o trivialidades
                /cocina|receta\s+de\s+cocina|cocinar|película|cine|entretenimiento|juego|trivialidad|chiste|música|serie|actor|actriz|famoso/i,
                // 4. Programación, desarrollo de software u otros temas técnicos ajenos a la clínica
                /programación|desarrollo\s+de\s+software|código|javascript|python|sql|html|css|bug|servidor|api|react|node|git|framework|algoritmo/i
            ];

            if (prohibidos.some((p) => p.test(lowered))) {
                return false;
            }

            // Preguntas de seguimiento, dudas de fechas, días, confirmaciones, preguntas cortas (<= 60 chars) o con signos de interrogación
            const esPreguntaSeguimiento = /[\?¿]|^(mañana|hoy|ayer|el|la|es|no|si|sí|seguro|cuando|cuándo|a qué hora|a que hora|en serio)\b/i.test(lowered)
                || /\b(mañana|hoy|lunes|martes|mi[ée]rcoles|jueves|viernes|s[áa]bado|domingo|\d{1,2})\b/i.test(lowered)
                || lowered.length <= 60;

            if (esPreguntaSeguimiento) {
                return true;
            }

            const patrones = [
                /cita/, /agenda/, /horario/, /horarios/, /ubicaci[óo]n/, /admis[ií]on/, /registro/, /consulta/, /recepcionista/, /agendar/, /programar/, /cancelar cita/, /confirmar cita/, /reagendar/, /reprogramar/, /informaci[óo]n de la cl[íi]nica/, /clínica/, /clínicita/, /atención/, /administrativ[oa]/,
                /^(hola|buenas|buenos días|buenas tardes|buenas noches|gracias|ayuda)\b/, /qu[ée] puedes hacer/, /c[óo]mo est[áa]s/, /paciente/, /m[ée]dico/, /doctor/, /s[íi]ntoma/, /preconsulta/,
                /dolor/, /duele/, /fiebre/, /tos/, /mareo/, /n[áa]usea/, /malestar/, /ardor/, /v[óo]mit/, /diarrea/, /sangrado/, /presi[óo]n/, /est[óo]mago/, /cabeza/, /pecho/, /espalda/, /garganta/, /me siento mal/
            ];
            return patrones.some((p) => p.test(lowered));
        };

        const mensajeRechazoEstandar = "Como asistente de CliniCita solo puedo orientarte sobre citas, horarios y servicios de la clínica. Si necesitas ayuda con tus citas, escribe 0 para ver el menú principal.";

        const responder = async (consulta, citasActivas = []) => {
            try {
                // Verificar dominio permitido antes de generar respuesta
                if (!esSolicitudPermitida(consulta)) {
                    return mensajeRechazoEstandar;
                }
                debugLog(`[OmniRoute] Generando respuesta: "${consulta}"`);
                const infoCitas = citasActivas && citasActivas.length > 0
                    ? `\n\n[INFORMACIÓN DE CITAS ACTIVAS DEL PACIENTE]:\n` + citasActivas.map(c => `- Cita ID ${c.cita_id}: ${formatoCita(c)} (Estado: ${c.estado})`).join('\n')
                    : `\n\n[INFORMACIÓN DE CITAS ACTIVAS]: El paciente no tiene citas activas actualmente.`;

                const response = await cliente.post("/chat/completions", {
                    model: modelo,
                    messages: [
                        {
                            role: "system",
                            content: `Eres el asistente operativo y de gestión clínica exclusivo para CliniCita. Tu dominio de respuesta se restringe estrictamente a: agendamiento de citas, horarios de atención, ubicaciones, procesos de admisión y guía administrativa básica de la clínica.

REGLAS ESTRICTAS DE SEGURIDAD Y OPERACIONES:
1. ACCIONES DE CITAS: Tienes TERMINANTEMENTE PROHIBIDO afirmar o simular que has cancelado, confirmado, agendado o reprogramado una cita médica por tu cuenta. Tú eres únicamente un modelo de lenguaje y NO tienes permisos para modificar la base de datos de citas. Si el usuario te pide cancelar, confirmar o reprogramar una cita, debes indicarle claramente que esa acción la ejecuta el sistema operativo o guiarlo para escribir '0' o 'MENU' para gestionarla desde el menú.
2. DIAGNÓSTICO Y MEDICAMENTOS: Tienes PROHIBIDO emitir diagnósticos médicos, prescribir tratamientos o sugerir medicamentos o remedios.
3. MANEJO DE SÍNTOMAS: Si el paciente menciona síntomas físicos (ej. dolor de cabeza, dolor de estómago, fiebre, malestar), NUNCA le des recetas ni diagnósticos. Aclárale con empatía que como asistente virtual no puedes recetar medicamentos ni diagnosticar, y recomiéndale registrar sus síntomas en su ficha de preconsulta (Opción 2 del menú) para que su médico los revise antes de la consulta, o acudir a urgencias si es una emergencia.
4. TEMAS PROHIBIDOS: Literatura, libros, cocina, entretenimiento, películas, chistes, desarrollo de software o temas ajenos a la clínica.
Responde con amabilidad pero con firmeza y concisión (máximo dos párrafos).${infoCitas}`
                        },
                        { role: "user", content: consulta }
                    ]
                });
                const texto = extraerTexto(response);
                debugLog("[OmniRoute] Respuesta generada correctamente");
                return texto;
            } catch (error) {
                console.error(`[OmniRoute] Error generando respuesta: ${error.message}`);
                throw error;
            }
        };
                const extraerFechaHora = async (consulta) => {
            try {
                const ref = obtenerFechaHoraActualBogota();
                debugLog(`[OmniRoute] Extrayendo fecha/hora para: "${consulta}" (ref: ${ref.fecha} ${ref.hora})`);
                const response = await cliente.post("/chat/completions", {
                    model: modelo,
                    messages: [
                        {
                            role: "system",
                            content: `Eres un extractor estricto de fecha y hora para agendamiento de citas médicas en la zona horaria America/Bogota (UTC-05:00).
Fecha y hora de referencia actual en Bogotá (Colombia): ${ref.fecha} ${ref.hora}.
Hoy es ${ref.fecha}. Mañana es ${desplazarDiasBogota(ref.fecha, 1)}.
Extrae o calcula la fecha y hora a la que el usuario quiere reprogramar o agendar su cita médica.
Responde ÚNICAMENTE un JSON válido con las claves "fecha" (formato "AAAA-MM-DD") y "hora" (formato "HH:MM:SS" en 24 horas).
Si la consulta no contiene una fecha y hora identificables, responde: {"fecha": null, "hora": null}.
No agregues explicaciones ni markdown.`
                        },
                        { role: "user", content: consulta }
                    ]
                });
                const raw = extraerTexto(response).replace(/```json|```/gi, "").trim();
                const parseado = JSON.parse(raw);
                if (parseado && parseado.fecha && parseado.hora) {
                    const normHora = normalizarHora(parseado.hora);
                    if (normHora && /^\d{4}-\d{2}-\d{2}$/.test(parseado.fecha)) {
                        return { fecha: parseado.fecha, hora: normHora };
                    }
                }
                return null;
            } catch (error) {
                debugLog(`[OmniRoute] Error en extraerFechaHora: ${error.message}`);
                return null;
            }
        };
        return { clasificar, responder, extraerFechaHora };
    } catch (error) {
        console.error("[OmniRoute] No disponible; se usará el clasificador local:", error.message);
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

async function iniciarWhatsApp({ query, db = conexion }) {
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

    const omniRoute = process.env.ENABLE_WHATSAPP_CHATBOT === "true"
        ? await crearClasificador()
        : null;
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
                if (msg.fromMe || msg.type !== "chat" || !msg.body || !msg.body.trim()) return;
                if (msg.from === "status@broadcast" || String(msg.from || "").endsWith("@g.us")) return;
                const consulta = msg.body.trim();
                debugLog(`Mensaje recibido de: ${msg.from} Contenido: ${msg.body}`);
                try {
                    // La vinculación explícita es el único flujo permitido antes de autenticar al remitente.
                    if (!/^vincular\b/i.test(consulta)) {
                        const lid = String(msg.from).endsWith("@lid") ? msg.from : null;
                        const telefono = await obtenerTelefonoEntrante(client, msg);
                        const paciente = await buscarPacienteRemitente(query, telefono, lid);
                        if (!paciente) {
                            await informarRemitenteNoRegistrado(query, msg, lid || msg.from);
                            return;
                        }
                    }
                    await procesarMensaje({ client, msg, consulta, query, db, clasificar: omniRoute?.clasificar, responder: omniRoute?.responder, extraerFechaHora: omniRoute?.extraerFechaHora });
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

async function obtenerCitasActivas(query, telefonoObj) {
    const telefono = telefonoObj?.telefono || telefonoObj;
    const lid = telefonoObj?.lid;
    const numero = limpiarTelefono(telefono);
    if (!numero && !lid) return [];

    try {
        const filas = await query(`
            SELECT c.cita_id, c.fecha_cita, c.hora_cita, c.estado, c.paciente_id,
                   c.medico_id, p.nombre_completo AS paciente, p.telefono_whatsapp,
                   p.whatsapp_lid, m.especialidad
            FROM citas c
            JOIN pacientes p ON p.paciente_id = c.paciente_id
            JOIN medicos m ON m.medico_id = c.medico_id
            WHERE c.estado IN ('Pendiente', 'Confirmada')
            ORDER BY c.fecha_cita, c.hora_cita
        `);

        if (lid) {
            const citasPorLid = filas.filter((fila) => fila.whatsapp_lid === lid);
            if (citasPorLid.length) return citasPorLid;
        }
        if (!numero) return [];
        const ultimosDigitos = numero.slice(-10);
        return filas.filter((fila) => {
            const telFila = limpiarTelefono(fila.telefono_whatsapp);
            return telFila.slice(-10) === ultimosDigitos || telFila === numero;
        });
    } catch (error) {
        console.error("[WhatsApp] Error obteniendo citas activas:", error.message);
        return [];
    }
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
    // Formato aceptado:
    //   "Vincular <documento>"              → valida documento + teléfono entrante
    //   "Vincular <documento> <ultimos4>"   → valida documento + últimos 4 dígitos
    // El path de solo 4 dígitos fue eliminado por riesgo de suplantación de identidad.
    const coincidenciaConPin = consulta.match(/^vincular\s+(\d{5,20})\s+(\d{4})$/i);
    const coincidenciaGenerica = consulta.match(/^vincular\s+(\d{5,20})$/i);

    if (!coincidenciaConPin && !coincidenciaGenerica) return false;

    const documento = coincidenciaConPin?.[1] || coincidenciaGenerica?.[1];
    const ultimosCuatroPin = coincidenciaConPin?.[2];

    const pacientes = await query(
        `SELECT paciente_id, nombre_completo, telefono_whatsapp
         FROM pacientes
         WHERE documento_id = ?
         LIMIT 1`,
        [documento]
    );

    const paciente = pacientes[0];

    if (!paciente) {
        return "invalido";
    }

    const telPacienteRegistrado = limpiarTelefono(paciente.telefono_whatsapp);

    if (ultimosCuatroPin) {
        // Modo "documento + pin": validar que los últimos 4 dígitos del teléfono registrado coincidan
        if (telPacienteRegistrado.slice(-4) !== ultimosCuatroPin) {
            return "invalido";
        }
    } else {
        // Modo "solo documento": validar que el número entrante coincida con el registrado
        const telEntrante = limpiarTelefono(telefono);
        if (!telEntrante || telPacienteRegistrado !== telEntrante) {
            return "invalido";
        }
    }

    if (String(lid).endsWith("@lid")) {
        await query("UPDATE pacientes SET whatsapp_lid = ? WHERE paciente_id = ?", [lid, paciente.paciente_id]);
        debugLog(`[WhatsApp] LID ${lid} vinculado al paciente ${paciente.paciente_id} (${paciente.nombre_completo})`);
    }
    return paciente.nombre_completo;
}

function identificarCitaEnTexto(citas, texto) {
    if (!Array.isArray(citas) || citas.length === 0) return null;
    if (citas.length === 1) return citas[0];

    const textoLimpio = String(texto || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // 1. Coincidencia por ID de cita explícito (ej: "cita 15", "id 15", "#15")
    const matchId = textoLimpio.match(/(?:cita|id|#)\s*[:#]?\s*(\d+)/i);
    if (matchId) {
        const idBuscado = Number.parseInt(matchId[1], 10);
        const encontradaPorId = citas.find(c => Number(c.cita_id) === idBuscado);
        if (encontradaPorId) return encontradaPorId;
    }

    // 2. Coincidencia por índice numérico u ordinal (ej: "la primera", "opción 1", "cita 1")
    const ordinales = { primera: 1, primero: 1, segunda: 2, segundo: 2, tercera: 3, tercero: 3, cuarta: 4, cuarto: 4 };
    for (const [palabra, idx] of Object.entries(ordinales)) {
        if (new RegExp(`\\b${palabra}\\b`, "i").test(textoLimpio) && citas[idx - 1]) {
            return citas[idx - 1];
        }
    }
    const matchIndice = textoLimpio.match(/^(?:opcion|cita|numero|#)?\s*(\d+)$/i) || textoLimpio.match(/\b(?:opcion|numero)\s*(\d+)\b/i);
    if (matchIndice) {
        const idx = Number.parseInt(matchIndice[1], 10);
        if (idx >= 1 && idx <= citas.length) return citas[idx - 1];
    }

    // 3. Coincidencia por especialidad
    const porEspecialidad = citas.filter((c) => {
        const esp = String(c.especialidad || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
        if (!esp) return false;
        if (textoLimpio.includes(esp)) return true;
        const raices = esp.split(/\s+/).filter(w => w.length > 4);
        return raices.some(r => textoLimpio.includes(r));
    });
    if (porEspecialidad.length === 1) return porEspecialidad[0];

    // 4. Coincidencia por fecha (YYYY-MM-DD)
    const porFecha = citas.filter((c) => {
        const fStr = String(c.fecha_cita || "").slice(0, 10);
        return fStr && textoLimpio.includes(fStr);
    });
    if (porFecha.length === 1) return porFecha[0];

    return null;
}

function obtenerFechaHoraActualBogota() {
    const ahora = new Date();
    const formateador = new Intl.DateTimeFormat("en-CA", {
        timeZone: CLINIC_TIMEZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false
    });
    const partes = formateador.formatToParts(ahora);
    const valores = {};
    for (const p of partes) valores[p.type] = p.value;
    const fecha = `${valores.year}-${valores.month}-${valores.day}`;
    const hora = `${valores.hour}:${valores.minute}:${valores.second}`;
    return { fecha, hora, iso: `${fecha}T${hora}${CLINIC_UTC_OFFSET}` };
}

function desplazarDiasBogota(fechaBogotaStr, dias) {
    const [y, m, d] = fechaBogotaStr.split("-").map(Number);
    const dt = new Date(Date.UTC(y, m - 1, d + dias, 12, 0, 0));
    const yyyy = dt.getUTCFullYear();
    const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
    const dd = String(dt.getUTCDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function normalizarHora(horaRaw, ampmRaw) {
    if (!horaRaw) return null;
    const partes = String(horaRaw).trim().split(":");
    if (partes.length < 2) return null;
    let h = Number.parseInt(partes[0], 10);
    const m = Number.parseInt(partes[1], 10);
    const s = partes[2] ? Number.parseInt(partes[2], 10) : 0;
    if (Number.isNaN(h) || Number.isNaN(m) || Number.isNaN(s)) return null;

    if (ampmRaw) {
        const ampm = String(ampmRaw).toLowerCase().replace(/[\.\s]/g, "");
        if (ampm === "pm" && h < 12) h += 12;
        if (ampm === "am" && h === 12) h = 0;
    }

    if (h < 0 || h > 23 || m < 0 || m > 59 || s < 0 || s > 59) return null;
    return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function extraerHoraLocal(texto) {
    if (typeof texto !== "string" || !texto.trim()) return null;
    const horaRegex = /(?:(?:a\s+las?|las?)\s+)?(\b\d{1,2}:\d{2}(?::\d{2})?)\s*(am|pm|a\.m\.|p\.m\.)?\b/i;
    const matchHora = texto.trim().match(horaRegex);
    return matchHora ? normalizarHora(matchHora[1], matchHora[2]) : null;
}

function extraerFechaLocal(texto) {
    if (typeof texto !== "string" || !texto.trim()) return null;
    const textoLimpio = texto.trim();
    const isoRegex = /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/;
    const matchIso = textoLimpio.match(isoRegex);
    if (matchIso) {
        return `${matchIso[1]}-${matchIso[2].padStart(2, "0")}-${matchIso[3].padStart(2, "0")}`;
    }

    const dmyRegex = /\b(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})\b/;
    const matchDmy = textoLimpio.match(dmyRegex);
    if (matchDmy) {
        return `${matchDmy[3]}-${matchDmy[2].padStart(2, "0")}-${matchDmy[1].padStart(2, "0")}`;
    }

    const ref = obtenerFechaHoraActualBogota();
    if (/\bdentro\s+de\s+24\s+horas\b/i.test(textoLimpio)) return desplazarDiasBogota(ref.fecha, 1);
    if (/\bpasado\s+mañana\b/i.test(textoLimpio)) return desplazarDiasBogota(ref.fecha, 2);
    if (/\bmañana\b/i.test(textoLimpio)) return desplazarDiasBogota(ref.fecha, 1);
    if (/\bhoy\b/i.test(textoLimpio)) return ref.fecha;
    return null;
}

function extraerFechaHoraLocal(texto) {
    const fecha = extraerFechaLocal(texto);
    const hora = extraerHoraLocal(texto);
    if (fecha && hora) {
        return { fecha, hora };
    }
    return null;
}

async function resolverFechaHoraConFallback(consulta, extractorLLM) {
    const local = extraerFechaHoraLocal(consulta);
    if (local && local.fecha && local.hora) return local;

    if (typeof extractorLLM === "function") {
        try {
            const llmRes = await Promise.race([
                extractorLLM(consulta),
                new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), 4000))
            ]);
            if (llmRes && llmRes.fecha && llmRes.hora) {
                const normHora = normalizarHora(llmRes.hora);
                if (normHora) return { fecha: llmRes.fecha, hora: normHora };
            }
        } catch (err) {
            debugLog(`[OmniRoute] Fallback extractor fecha/hora local: ${err.message}`);
        }
    }
    return local;
}

async function ejecutarReprogramacionCita({ query, client, msg, chatKey, cita, fechaStr, horaStr }) {
    const horaNorm = normalizarHora(horaStr) || horaStr;
    const fechaHoraDeseada = new Date(`${fechaStr}T${horaNorm}${CLINIC_UTC_OFFSET}`);

    if (Number.isNaN(fechaHoraDeseada.getTime())) {
        await msg.reply("La fecha u hora ingresada no es válida. Por favor indícala en formato AAAA-MM-DD HH:MM (por ejemplo: 2026-11-17 9:30 o mañana a las 9:30 am) o escribe 0 para volver al menú.");
        return false;
    }

    if (fechaHoraDeseada <= new Date()) {
        await msg.reply("La fecha y hora ingresadas ya pasaron. Por favor indica una fecha y hora futura (por ejemplo: 2026-11-17 09:30) o escribe 0 para volver al menú.");
        return false;
    }

    const medicoId = cita?.medico_id;
    if (medicoId) {
        const solapadas = await query(
            "SELECT cita_id FROM citas WHERE medico_id = ? AND fecha_cita = ? AND hora_cita = ? AND estado IN ('Pendiente', 'Confirmada') AND cita_id != ?",
            [medicoId, fechaStr, horaNorm, cita.cita_id]
        );
        if (solapadas.length > 0) {
            await msg.reply("El especialista ya tiene una cita asignada en ese horario. Por favor indica otra fecha u hora (ejemplo: 2026-11-17 10:30) o escribe 0 para volver.");
            return false;
        }
    }

    const resReprog = await query(
        "UPDATE citas SET fecha_cita = ?, hora_cita = ?, motivo = LEFT(CONCAT(COALESCE(motivo, ''), ' | Reprogramada por WhatsApp'), 255) WHERE cita_id = ? AND estado IN ('Pendiente', 'Confirmada')",
        [fechaStr, horaNorm, cita.cita_id]
    );

    if (resReprog.affectedRows > 0) {
        await reasignarCupoListaEspera(conexion, cita, client).catch(err => console.error("[ListaEspera] Error en reasignación:", err.message));
        await msg.reply(`¡Cita reprogramada exitosamente para el ${fechaStr} a las ${horaNorm}!`);
        await guardarConversacion(query, chatKey, { paso: "menu_principal" });
        await mostrarMenuPrincipal(msg);
        return true;
    } else {
        await msg.reply("No fue posible reprogramar la cita en este momento (la cita ya no se encuentra activa).");
        await guardarConversacion(query, chatKey, { paso: "menu_principal" });
        await mostrarMenuPrincipal(msg);
        return false;
    }
}

async function operarConfirmacion({ query, telefono, lid, chatKey, consulta, msg }) {
    const telRemitenteLimpio = limpiarTelefonoParaValidacion(telefono);
    const autorizacion = telRemitenteLimpio ? await leerSesion(query, telRemitenteLimpio, "autorizacion") : null;
    const autorizadoPorRecordatorio = Boolean(autorizacion && Date.now() - Number(autorizacion.timestamp) <= VENTANA_VALIDACION_REMINDER_MS);

    let cita = autorizadoPorRecordatorio ? await obtenerCitaDelUltimoRecordatorio(query, telefono, lid) : null;
    const citasActivas = await obtenerCitasActivas(query, { telefono, lid });

    if (!cita) {
        if (!citasActivas.length) {
            await msg.reply("No encontramos ninguna cita activa para confirmar. Escribe 0 para ver el menú principal.");
            await guardarConversacion(query, chatKey, { paso: "menu_principal" });
            await mostrarMenuPrincipal(msg);
            return;
        }
        if (citasActivas.length === 1) {
            cita = citasActivas[0];
        } else {
            cita = identificarCitaEnTexto(citasActivas, consulta);
            if (!cita) {
                await guardarConversacion(query, chatKey, { paso: "ia_seleccion_accion", accion: "CONFIRMAR", citasActivas, telefono, lid });
                const textoCitas = citasActivas.map((c, i) => `${i + 1}. ${formatoCita(c)}`).join("\n");
                await msg.reply(`Tienes varias citas activas. ¿Cuál de ellas deseas confirmar?\n${textoCitas}\n\nResponde con el número de la cita (o 0 para regresar al menú principal).`);
                return;
            }
        }
    }

    const res = await query("UPDATE citas SET estado = 'Confirmada' WHERE cita_id = ? AND estado IN ('Pendiente', 'Confirmada')", [cita.cita_id]);
    await query("UPDATE recordatorios SET respuesta_paciente = 1, estado_entrega = 'Entregado' WHERE cita_id = ?", [cita.cita_id]);

    if (res.affectedRows > 0) {
        await msg.reply(`¡Cita del ${formatoCita(cita)} confirmada exitosamente en el sistema! Gracias por usar CliniCita.`);
    } else {
        await msg.reply("La cita no se pudo confirmar o ya no se encuentra en estado pendiente.");
    }
    await guardarConversacion(query, chatKey, { paso: "menu_principal" });
    await mostrarMenuPrincipal(msg);
}

async function operarCancelacion({ query, telefono, lid, chatKey, consulta, msg, client }) {
    const telRemitenteLimpio = limpiarTelefonoParaValidacion(telefono);
    const autorizacion = telRemitenteLimpio ? await leerSesion(query, telRemitenteLimpio, "autorizacion") : null;
    const autorizadoPorRecordatorio = Boolean(autorizacion && Date.now() - Number(autorizacion.timestamp) <= VENTANA_VALIDACION_REMINDER_MS);

    let cita = autorizadoPorRecordatorio ? await obtenerCitaDelUltimoRecordatorio(query, telefono, lid) : null;
    const citasActivas = await obtenerCitasActivas(query, { telefono, lid });

    if (!cita) {
        if (!citasActivas.length) {
            await msg.reply("No encontramos ninguna cita activa para cancelar. Escribe 0 para ver el menú principal.");
            await guardarConversacion(query, chatKey, { paso: "menu_principal" });
            await mostrarMenuPrincipal(msg);
            return;
        }
        if (citasActivas.length === 1) {
            cita = citasActivas[0];
        } else {
            cita = identificarCitaEnTexto(citasActivas, consulta);
            if (!cita) {
                await guardarConversacion(query, chatKey, { paso: "ia_seleccion_accion", accion: "CANCELAR", citasActivas, telefono, lid });
                const textoCitas = citasActivas.map((c, i) => `${i + 1}. ${formatoCita(c)}`).join("\n");
                await msg.reply(`Tienes varias citas activas. ¿Cuál de ellas deseas cancelar?\n${textoCitas}\n\nResponde con el número de la cita (o 0 para regresar al menú principal).`);
                return;
            }
        }
    }

    const res = await query("UPDATE citas SET estado = 'Cancelada' WHERE cita_id = ? AND estado IN ('Pendiente', 'Confirmada')", [cita.cita_id]);
    await query("UPDATE recordatorios SET respuesta_paciente = 0, estado_entrega = 'Entregado' WHERE cita_id = ?", [cita.cita_id]);

    if (res.affectedRows > 0) {
        await reasignarCupoListaEspera(conexion, cita, client).catch(err => console.error("[ListaEspera] Error en reasignación:", err.message));
        await msg.reply(`Hola ${cita.paciente || "paciente"}, tu cita del ${formatoCita(cita)} ha sido cancelada correctamente en el sistema.`);
    } else {
        await msg.reply("La cita no se pudo cancelar o ya se encuentra cancelada.");
    }
    await guardarConversacion(query, chatKey, { paso: "menu_principal" });
    await mostrarMenuPrincipal(msg);
}

async function operarReprogramacion({ query, telefono, lid, chatKey, consulta, msg, client, extraerFechaHora }) {
    const citasActivas = await obtenerCitasActivas(query, { telefono, lid });
    if (!citasActivas.length) {
        await msg.reply("No encontramos ninguna cita activa para reprogramar. Escribe 0 para ver el menú principal.");
        await guardarConversacion(query, chatKey, { paso: "menu_principal" });
        await mostrarMenuPrincipal(msg);
        return;
    }

    let cita = null;
    if (citasActivas.length === 1) {
        cita = citasActivas[0];
    } else {
        cita = identificarCitaEnTexto(citasActivas, consulta);
        if (!cita) {
            const fechaHoraPrevia = await resolverFechaHoraConFallback(consulta, extraerFechaHora);
            await guardarConversacion(query, chatKey, {
                paso: "ia_seleccion_accion",
                accion: "REPROGRAMAR",
                fechaHoraPrevia,
                citasActivas,
                telefono,
                lid
            });
            const textoCitas = citasActivas.map((c, i) => `${i + 1}. ${formatoCita(c)}`).join("\n");
            await msg.reply(`Tienes varias citas activas. ¿Cuál de ellas deseas reprogramar?\n${textoCitas}\n\nResponde con el número de la cita (o 0 para regresar al menú principal).`);
            return;
        }
    }

    // Si ya tenemos la cita identificada, intentar extraer fecha y hora directamente de la consulta
    const fechaHora = await resolverFechaHoraConFallback(consulta, extraerFechaHora);
    if (fechaHora && fechaHora.fecha && fechaHora.hora) {
        const reprogramada = await ejecutarReprogramacionCita({
            query,
            client,
            msg,
            chatKey,
            cita,
            fechaStr: fechaHora.fecha,
            horaStr: fechaHora.hora
        });
        if (reprogramada) return;
    }

    const fechaSolicitada = extraerFechaLocal(consulta);
    if (fechaSolicitada) {
        await guardarConversacion(query, chatKey, {
            paso: "reprogramar_esperando_fecha",
            citaId: cita.cita_id,
            pacienteId: cita.paciente_id,
            citaData: cita,
            fechaReprogramacion: fechaSolicitada,
            telefono,
            lid
        });
        await msg.reply(`Has seleccionado reprogramar tu cita de ${cita.especialidad}. ¿A qué hora exacta deseas agendarla? (Ejemplo: ${fechaSolicitada} 15:00)`);
        return;
    }

    await guardarConversacion(query, chatKey, {
        paso: "reprogramar_esperando_fecha",
        citaId: cita.cita_id,
        pacienteId: cita.paciente_id,
        citaData: cita,
        telefono,
        lid
    });
    await msg.reply(`Has seleccionado reprogramar tu cita del ${formatoCita(cita)}.\n\nPor favor, responde con la nueva fecha y hora deseada (ejemplo: 2026-11-17 9:30 o mañana a las 9:30 am), o escribe 0 para cancelar.`);
}

async function operarSintomas({ query, telefono, lid, chatKey, consulta, msg }) {
    const pideMedicamento = /receta\s+m[ée]dica|receta|prescripci[óo]n|medicamento|pastilla|dosis|f[áa]rmaco|recomendar\s+pastillas|recetar|qu[ée]\s+(?:puedo|debo|me)\s+tomo?\b/i.test(consulta);
    const citasActivas = await obtenerCitasActivas(query, { telefono, lid });

    if (!citasActivas.length) {
        if (pideMedicamento) {
            await msg.reply("Como asistente administrativo de CliniCita tengo estrictamente prohibido formular prescripciones o recomendar medicamentos. Si presentas una urgencia médica, acude de inmediato al centro de atención más cercano. Escribe 0 para volver al menú principal.");
        } else {
            await msg.reply("Entiendo que presentas estas molestias. Como asistente virtual no puedo emitir diagnósticos médicos ni recomendar medicamentos. Actualmente no tienes citas médicas activas en CliniCita. Te sugerimos agendar una cita o acudir a urgencias si se trata de una emergencia. Escribe 0 para ver el menú principal.");
        }
        await guardarConversacion(query, chatKey, { paso: "menu_principal" });
        await mostrarMenuPrincipal(msg);
        return;
    }

    let cita = citasActivas.length === 1 ? citasActivas[0] : identificarCitaEnTexto(citasActivas, consulta);
    if (cita) {
        await guardarConversacion(query, chatKey, {
            paso: "confirmando_sintomas",
            citaId: cita.cita_id,
            pacienteId: cita.paciente_id,
            citaData: cita,
            sintomasTemp: consulta,
            telefono,
            lid
        });
        const prefijo = pideMedicamento
            ? "Como asistente virtual de CliniCita no puedo emitir diagnósticos ni formular recetas médicas.\n\n"
            : "Entiendo que presentas molestias. Como asistente virtual no puedo dar diagnósticos ni sugerir medicamentos.\n\n";
        await msg.reply(`${prefijo}Tienes una cita de ${cita.especialidad} para el ${formatoCita(cita)}.\n\n¿Deseas registrar estos síntomas ('${consulta}') en tu ficha de preconsulta para que tu médico los revise antes de la consulta?\n1. Sí, registrar en preconsulta\n2. No, gracias`);
        return;
    }

    await guardarConversacion(query, chatKey, {
        paso: "ia_seleccion_accion",
        accion: "SINTOMAS",
        sintomasTemp: consulta,
        citasActivas,
        telefono,
        lid
    });
    const textoCitas = citasActivas.map((c, i) => `${i + 1}. ${formatoCita(c)}`).join("\n");
    await msg.reply(`Entiendo que presentas molestias. Como asistente virtual no puedo recetar medicamentos ni diagnosticar.\n\nTienes varias citas activas. ¿Para cuál de ellas deseas registrar estos síntomas en tu ficha de preconsulta?\n${textoCitas}\n\nResponde con el número de la cita (o 0 para regresar).`);
}

async function ejecutarAccionOperativaOIA({
    client,
    msg,
    consulta,
    query,
    clasificar,
    responder,
    extraerFechaHora,
    telefono,
    lid,
    chatKey,
    contexto
}) {
    const clasificacion = await clasificarConFallback(consulta, clasificar);
    const intencion = clasificacion.intencion;

    if (intencion === "CONFIRMAR") {
        await operarConfirmacion({ query, telefono, lid, chatKey, consulta, msg });
        return;
    }

    if (intencion === "CANCELAR") {
        await operarCancelacion({ query, telefono, lid, chatKey, consulta, msg, client });
        return;
    }

    if (intencion === "REPROGRAMAR") {
        await operarReprogramacion({ query, telefono, lid, chatKey, consulta, msg, client, extraerFechaHora });
        return;
    }

    if (intencion === "SINTOMAS") {
        await operarSintomas({ query, telefono, lid, chatKey, consulta, msg });
        return;
    }

    // Intención OTRO: responder consultas generales con OmniRoute
    if (responder) {
        const citasActivas = await obtenerCitasActivas(query, { telefono, lid });
        const respuesta = await responder(consulta, citasActivas).catch((err) => {
            console.error("[WhatsApp] Error en llamada a LLM responder:", err.message);
            return null;
        });
        await msg.reply(respuesta || "Lo siento, en este momento no puedo procesar tu consulta. Escribe 0 para volver al menú principal.");
    } else {
        await msg.reply("El Asistente de IA no está disponible en este momento. Escribe 0 para volver al menú principal.");
    }
}

async function manejarPasoReprogramar({ consulta, contexto, query, client, msg, chatKey, clasificar, responder, extraerFechaHora }) {
    if (consulta === "0" || /^(menu|salir|cancelar|volver)$/i.test(consulta.trim())) {
        await guardarConversacion(query, chatKey, { paso: "menu_principal" });
        await msg.reply("Reprogramación cancelada.");
        await mostrarMenuPrincipal(msg);
        return;
    }

    // Defecto 3: Comprobar si el usuario cambió de opinión con otra intención explícita
    const clasificacion = await clasificarConFallback(consulta, clasificar);
    const intencion = clasificacion?.intencion;

    if (intencion === "CANCELAR") {
        await guardarConversacion(query, chatKey, { paso: "menu_principal" });
        await operarCancelacion({ query, telefono: contexto.telefono, lid: contexto.lid, chatKey, consulta, msg, client });
        return;
    }

    if (intencion === "CONFIRMAR") {
        await guardarConversacion(query, chatKey, { paso: "menu_principal" });
        await operarConfirmacion({ query, telefono: contexto.telefono, lid: contexto.lid, chatKey, consulta, msg });
        return;
    }

    if (intencion === "SINTOMAS") {
        await guardarConversacion(query, chatKey, { paso: "menu_principal" });
        await operarSintomas({ query, telefono: contexto.telefono, lid: contexto.lid, chatKey, consulta, msg });
        return;
    }

    if (intencion === "REPROGRAMAR") {
        const citasActivas = await obtenerCitasActivas(query, { telefono: contexto.telefono, lid: contexto.lid });
        const otraCita = identificarCitaEnTexto(citasActivas, consulta);
        if (otraCita && otraCita.cita_id !== contexto.citaId) {
            contexto.citaId = otraCita.cita_id;
            contexto.citaData = otraCita;
        }
    }

    // Defectos 1 y 2: Extracción flexible y mensajes de error precisos
    const fechaHora = await resolverFechaHoraConFallback(consulta, extraerFechaHora);
    const horaSolicitada = extraerHoraLocal(consulta);
    const fechaHoraFinal = fechaHora || (
        contexto.fechaReprogramacion && horaSolicitada
            ? { fecha: contexto.fechaReprogramacion, hora: horaSolicitada }
            : null
    );
    if (!fechaHoraFinal || !fechaHoraFinal.fecha || !fechaHoraFinal.hora) {
        await msg.reply("No pude identificar la fecha y hora. Por favor indícala en formato AAAA-MM-DD HH:MM (por ejemplo: 2026-11-17 9:30 o mañana a las 9:30 am) o escribe 0 para volver al menú.");
        return;
    }

    await ejecutarReprogramacionCita({
        query,
        client,
        msg,
        chatKey,
        cita: contexto.citaData,
        fechaStr: fechaHoraFinal.fecha,
        horaStr: fechaHoraFinal.hora
    });
}

async function manejarPasoSeleccionAccion({ consulta, contexto, query, client, msg, chatKey, extraerFechaHora }) {
    const indice = Number.parseInt(consulta, 10);
    const citas = contexto.citasActivas || [];
    if (!Number.isInteger(indice) || indice < 1 || indice > citas.length) {
        await msg.reply("Número de cita no válido. Responde con el número de la cita o 0 para regresar al menú principal.");
        return;
    }
    const cita = citas[indice - 1];

    if (contexto.accion === "CONFIRMAR") {
        const res = await query("UPDATE citas SET estado = 'Confirmada' WHERE cita_id = ? AND estado IN ('Pendiente', 'Confirmada')", [cita.cita_id]);
        await query("UPDATE recordatorios SET respuesta_paciente = 1, estado_entrega = 'Entregado' WHERE cita_id = ?", [cita.cita_id]);
        if (res.affectedRows > 0) {
            await msg.reply(`¡Cita del ${formatoCita(cita)} confirmada exitosamente en el sistema! Gracias por usar CliniCita.`);
        } else {
            await msg.reply("La cita no se pudo confirmar o ya no se encuentra en estado pendiente.");
        }
    } else if (contexto.accion === "CANCELAR") {
        const res = await query("UPDATE citas SET estado = 'Cancelada' WHERE cita_id = ? AND estado IN ('Pendiente', 'Confirmada')", [cita.cita_id]);
        await query("UPDATE recordatorios SET respuesta_paciente = 0, estado_entrega = 'Entregado' WHERE cita_id = ?", [cita.cita_id]);
        if (res.affectedRows > 0) {
            await reasignarCupoListaEspera(conexion, cita, client).catch(err => console.error("[ListaEspera] Error en reasignación:", err.message));
            await msg.reply(`Hola ${cita.paciente || "paciente"}, tu cita del ${formatoCita(cita)} ha sido cancelada correctamente en el sistema.`);
        } else {
            await msg.reply("La cita no se pudo cancelar o ya se encuentra cancelada.");
        }
    } else if (contexto.accion === "REPROGRAMAR") {
        if (contexto.fechaHoraPrevia && contexto.fechaHoraPrevia.fecha && contexto.fechaHoraPrevia.hora) {
            const exito = await ejecutarReprogramacionCita({
                query,
                client,
                msg,
                chatKey,
                cita,
                fechaStr: contexto.fechaHoraPrevia.fecha,
                horaStr: contexto.fechaHoraPrevia.hora
            });
            if (exito) return;
        }
        await guardarConversacion(query, chatKey, { paso: "reprogramar_esperando_fecha", citaId: cita.cita_id, pacienteId: cita.paciente_id, citaData: cita, telefono: contexto.telefono, lid: contexto.lid });
        await msg.reply(`Has seleccionado reprogramar tu cita del ${formatoCita(cita)}.\n\nPor favor responde con la nueva fecha y hora deseada (ejemplo: 2026-11-17 9:30 o mañana a las 9:30 am), o escribe 0 para cancelar.`);
        return;
    } else if (contexto.accion === "SINTOMAS") {
        await guardarConversacion(query, chatKey, { paso: "confirmando_sintomas", citaId: cita.cita_id, pacienteId: cita.paciente_id, citaData: cita, sintomasTemp: contexto.sintomasTemp, telefono: contexto.telefono, lid: contexto.lid });
        await msg.reply(`¿Deseas registrar estos síntomas ('${contexto.sintomasTemp}') para tu cita de ${cita.especialidad} del ${formatoCita(cita)}?\n1. Sí, registrar en preconsulta\n2. No, gracias`);
        return;
    }
    await guardarConversacion(query, chatKey, { paso: "menu_principal" });
    await mostrarMenuPrincipal(msg);
}

async function mostrarMenuPrincipal(msg) {
    await msg.reply(`Hola, bienvenido al asistente de CliniCita. Por favor, responde con el número de la opción que deseas realizar:

1. Ver mis citas / Confirmar / Cancelar
2. Registrar síntomas para mi cita
3. Hablar con nuestro Asistente de IA (consultas generales)
4. Salir`);
}

async function procesarMensaje({ client, msg, consulta, query, db = conexion, clasificar, responder, extraerFechaHora }) {
    const lid = String(msg.from).endsWith("@lid") ? msg.from : null;
    const chatKey = lid || msg.from;
    const telefono = await obtenerTelefonoEntrante(client, msg);
    const contexto = await obtenerConversacion(query, chatKey) || { paso: "menu_principal" };

    if (/^(ACEPTAR|RECHAZAR)(?:\s+\d+)?$/i.test(consulta)) {
        const respuestaOferta = await procesarRespuestaOfertaWhatsApp(db, telefono, consulta, client);
        if (respuestaOferta.handled) {
            await msg.reply(respuestaOferta.mensaje);
            await guardarConversacion(query, chatKey, { paso: "menu_principal" });
            return;
        }
    }

    // Allow processing all messages; reminder validation is handled later where needed.

    if (/^vincular\b/i.test(consulta)) {
        const vinculacion = await vincularLid(query, lid || msg.from, consulta, telefono);
        if (vinculacion && vinculacion !== "invalido") {
            await msg.reply(`¡Cuenta vinculada exitosamente a ${vinculacion}! Ya puedes gestionar tus citas.`);
            await guardarConversacion(query, chatKey, { paso: "menu_principal" });
            await mostrarMenuPrincipal(msg);
        } else if (vinculacion === "invalido") {
            await msg.reply("El documento de identidad no se encuentra registrado o el número de teléfono no coincide. Verifica tus datos e intenta nuevamente (ejemplo: Vincular 12345678901 o Vincular 12345678901 3210).");
        } else {
            await msg.reply("Formato de vinculación inválido. Usa: Vincular <documento> o Vincular <documento> <ultimos_4_dígitos_del_teléfono>");
        }
        return;
    }

    // Tarea 2: Salir / finalizar sesión (Opción 4 o salir/adios): elimina sesión en BD y despide cordialmente
    if (/^(4|salir|adios|adiós)$/i.test(consulta.trim())) {
        await eliminarSesion(query, chatKey, "conversacion");
        await msg.reply("Gracias por comunicarte con CliniCita. Tu sesión ha finalizado. ¡Hasta pronto!");
        return;
    }

    // Reset global / retorno al menú principal con '0', 'menu', 'menú'
    if (/^(0|menu|menú)$/i.test(consulta.trim())) {
        await guardarConversacion(query, chatKey, { paso: "menu_principal" });
        await mostrarMenuPrincipal(msg);
        return;
    }

    // Tarea 2: Menú Principal con prioridad absoluta a las opciones numéricas
    if (!contexto.paso || contexto.paso === "menu_principal") {
        if (consulta === "1") {
            const citasActivas = await obtenerCitasActivas(query, { telefono, lid });
            if (!citasActivas.length) {
                await msg.reply("No tienes citas activas pendientes o confirmadas.");
                await mostrarMenuPrincipal(msg);
                return;
            }
            await guardarConversacion(query, chatKey, { paso: "menu_cita_seleccion", citasActivas, telefono, lid });
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
            await guardarConversacion(query, chatKey, { paso: "menu_sintomas_seleccion", citasActivas, telefono, lid });
            const textoCitas = citasActivas.map((c, i) => `${i + 1}. ${formatoCita(c)}`).join("\n");
            await msg.reply(`Tus citas activas para preconsulta:\n${textoCitas}\n\nResponde con el número de la cita para registrar síntomas, o 0 para regresar al menú principal.`);
            return;
        }

        if (consulta === "3") {
            await guardarConversacion(query, chatKey, { paso: "ia_activo" });
            await msg.reply("Has ingresado al modo de consulta con nuestro Asistente de IA. Puedes hacer tus preguntas en lenguaje natural sobre CliniCita, preparación para exámenes o consultas generales. (Escribe '0' o 'MENU' en cualquier momento para volver al menú principal).");
            return;
        }

        // Si es cualquier otro número
        if (/^\d+$/.test(consulta)) {
            await msg.reply("Opción no válida. Por favor responde únicamente con el número de la opción deseada (1, 2, 3 o 4).");
            await mostrarMenuPrincipal(msg);
            return;
        }

        // Consultas en lenguaje natural desde el menú principal
        await guardarConversacion(query, chatKey, { paso: "ia_activo" });
        await ejecutarAccionOperativaOIA({
            client,
            msg,
            consulta,
            query,
            clasificar,
            responder,
            extraerFechaHora,
            telefono,
            lid,
            chatKey,
            contexto: { paso: "ia_activo" }
        });
        return;
    }

    // Flujo Reprogramación: Esperando nueva fecha y hora
    if (contexto.paso === "reprogramar_esperando_fecha") {
        await manejarPasoReprogramar({ consulta, contexto, query, client, msg, chatKey, clasificar, responder, extraerFechaHora });
        return;
    }

    // Flujo Desambiguación IA: Selección de cita para acción operativa
    if (contexto.paso === "ia_seleccion_accion") {
        await manejarPasoSeleccionAccion({ consulta, contexto, query, client, msg, chatKey, extraerFechaHora });
        return;
    }

    // Modo Asistente de IA (Opción 3 activo)
    if (contexto.paso === "ia_activo") {
        await ejecutarAccionOperativaOIA({
            client,
            msg,
            consulta,
            query,
            clasificar,
            responder,
            extraerFechaHora,
            telefono,
            lid,
            chatKey,
            contexto
        });
        return;
    }

    // Flow 1: Selecting appointment for management (Option 1)
    if (contexto.paso === "menu_cita_seleccion") {
        const indice = Number.parseInt(consulta, 10);
        if (indice === 0) {
            await guardarConversacion(query, chatKey, { paso: "menu_principal" });
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
        await guardarConversacion(query, chatKey, {
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
                await guardarConversacion(query, chatKey, { paso: "menu_cita_seleccion", citasActivas, telefono: contexto.telefono, lid: contexto.lid });
                const textoCitas = citasActivas.map((c, i) => `${i + 1}. ${formatoCita(c)}`).join("\n");
                await msg.reply(`Tus citas activas:\n${textoCitas}\n\nResponde con el número de la cita para gestionar, o 0 para regresar al menú principal.`);
            } else {
                await guardarConversacion(query, chatKey, { paso: "menu_principal" });
                await mostrarMenuPrincipal(msg);
            }
            return;
        }

        if (consulta === "1") {
            await query("UPDATE citas SET estado = 'Confirmada' WHERE cita_id = ?", [contexto.citaId]);
            await query("UPDATE recordatorios SET respuesta_paciente = 1, estado_entrega = 'Entregado' WHERE cita_id = ?", [contexto.citaId]);
            await guardarConversacion(query, chatKey, { paso: "menu_principal" });
            await msg.reply("¡Cita confirmada exitosamente! Gracias por usar CliniCita.");
            await mostrarMenuPrincipal(msg);
            return;
        }

        if (consulta === "2") {
            await query("UPDATE citas SET estado = 'Cancelada' WHERE cita_id = ?", [contexto.citaId]);
            await query("UPDATE recordatorios SET respuesta_paciente = 0, estado_entrega = 'Entregado' WHERE cita_id = ?", [contexto.citaId]);
            await reasignarCupoListaEspera(conexion, contexto.citaData, client);
            await guardarConversacion(query, chatKey, { paso: "menu_principal" });
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
            await guardarConversacion(query, chatKey, { paso: "menu_principal" });
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
        await guardarConversacion(query, chatKey, {
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
        await guardarConversacion(query, chatKey, {
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
            await guardarConversacion(query, chatKey, { paso: "menu_principal" });
            await msg.reply("¡Información de preconsulta registrada correctamente! Gracias.");
            await mostrarMenuPrincipal(msg);
            return;
        }
        if (consulta === "2" || /^no$/i.test(consulta)) {
            await guardarConversacion(query, chatKey, { paso: "menu_principal" });
            await msg.reply("Registro de síntomas cancelado.");
            await mostrarMenuPrincipal(msg);
            return;
        }
        await msg.reply("Por favor responde 1 para Sí o 2 para No.");
        return;
    }

    // Default fallback
    await guardarConversacion(query, chatKey, { paso: "menu_principal" });
    await mostrarMenuPrincipal(msg);
}

// ============================================================
// 1.6.1 INTEGRACIÓN RIESGO NO-SHOW EN RECORDATORIOS
// ============================================================

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
    await limpiarSesionesExpiradas(query).catch(err =>
        console.error("[WhatsApp] Error limpiando sesiones expiradas:", err.message)
    );

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
            const resultadoSMS = await enviarSMS({
                pacienteId: cita.paciente_id,
                citaId: cita.cita_id,
                telefono,
                mensaje: mensajeSMS
            });
            enviadoSMS = resultadoSMS.enviado;
            console.log(`[Recordatorio] Paciente ${cita.paciente} (${cita.paciente_id}) - Riesgo: ${nivelRiesgo} - Doble canal: WhatsApp + SMS (${resultadoSMS.proveedor})`);
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
            await guardarSesion(query, telLimpio, "autorizacion", { timestamp: Date.now() }, VENTANA_VALIDACION_REMINDER_MS);
        }
    }
}

module.exports = { iniciarWhatsApp, clasificarConFallback, normalizarClasificacion };
