const cron = require("node-cron");
const conversaciones = new Map();

function limpiarTelefono(telefono) {
    let numero = String(telefono || "").replace(/[^0-9]/g, "");
    if (numero.startsWith("00")) numero = numero.slice(2);
    const codigoPais = String(process.env.WHATSAPP_COUNTRY_CODE || "57").replace(/[^0-9]/g, "");
    if (numero.length === 10 && codigoPais) numero = `${codigoPais}${numero}`;
    return numero;
}

async function enviarWhatsApp(client, telefono, mensaje) {
    const numero = limpiarTelefono(telefono);
    if (!numero) return false;

    try {
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
    const resultado = new Date(`${fecha}T${hora}`);
    return Number.isNaN(resultado.getTime()) ? null : resultado;
}

function clasificarLocal(consulta) {
    const texto = consulta.toLowerCase();
    if (/\b(cancelar|cancelo|cancela|anular)\b/.test(texto)) return { intencion: "CANCELAR", sintomas_detalles: "" };
    if (/\b(confirmar|confirmo|asistiré|asistire|asistencia)\b/.test(texto)) return { intencion: "CONFIRMAR", sintomas_detalles: "" };
    if (/\b(dolor|fiebre|tos|síntoma|sintoma|mareo|náusea|nausea|malestar)\b/.test(texto)) {
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
        console.log(`[Gemini] Habilitada con modelo ${modelo}`);
        const clasificar = async (consulta) => {
            try {
                console.log(`[Gemini] Clasificando: "${consulta}"`);
                const response = await ai.models.generateContent({
                    model: modelo,
                    contents: `Clasifica este mensaje de un paciente. Responde solo JSON válido con las claves intencion y sintomas_detalles. intencion debe ser CONFIRMAR, CANCELAR, SINTOMAS u OTRO. Mensaje: "${consulta}"`,
                    config: {
                        systemInstruction: "Eres un clasificador estricto. No diagnostiques, no recomiendes medicamentos y no escribas markdown."
                    }
                });
                const texto = typeof response.text === "function" ? response.text() : response.text;
                const resultado = JSON.parse(String(texto).replace(/```json|```/g, "").trim());
                console.log(`[Gemini] Clasificación: ${resultado.intencion}`);
                return resultado;
            } catch (error) {
                console.error(`[Gemini] Error clasificando: ${error.message}`);
                throw error;
            }
        };
        const responder = async (consulta) => {
            try {
                console.log(`[Gemini] Generando respuesta: "${consulta}"`);
                const response = await ai.models.generateContent({
                    model: modelo,
                    contents: consulta,
                    config: {
                        systemInstruction: "Eres un asistente virtual de una clínica. Responde con amabilidad y máximo dos párrafos. Informa sobre horarios de lunes a viernes de 8:00 a 17:00 y el uso del portal. Nunca des diagnósticos, interpretes exámenes ni recetes medicamentos."
                    }
                });
                const texto = typeof response.text === "function" ? response.text() : response.text;
                console.log("[Gemini] Respuesta generada correctamente");
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
    const client = new Client({ authStrategy: new LocalAuth({ clientId: "clinicita" }) });

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

async function obtenerCitaActiva(query, telefono) {
    const numero = limpiarTelefono(telefono.telefono);
    const lid = telefono.lid;
    if (!numero && !lid) return null;

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
        const citaPorLid = filas.find((fila) => fila.whatsapp_lid === lid);
        if (citaPorLid) return citaPorLid;
    }
    if (!numero) return null;
    const ultimosDigitos = numero.slice(-10);
    return filas.find((fila) => limpiarTelefono(fila.telefono_whatsapp).slice(-10) === ultimosDigitos) || null;
}

async function vincularLid(query, lid, consulta) {
    const coincidencia = consulta.match(/^vincular\s+(\d{5,20})\s+(\d{4})$/i);
    if (!coincidencia) return false;

    const [, documento, ultimosCuatro] = coincidencia;
    const pacientes = await query(
        "SELECT paciente_id, nombre_completo, telefono_whatsapp FROM pacientes WHERE documento_id = ? LIMIT 1",
        [documento]
    );
    const paciente = pacientes[0];
    if (!paciente || limpiarTelefono(paciente.telefono_whatsapp).slice(-4) !== ultimosCuatro) return "invalido";

    await query("UPDATE pacientes SET whatsapp_lid = ? WHERE paciente_id = ?", [lid, paciente.paciente_id]);
    console.log(`[WhatsApp] LID ${lid} vinculado al paciente ${paciente.paciente_id}`);
    return paciente.nombre_completo;
}

async function procesarMensaje({ client, msg, consulta, query, clasificar, responder }) {
    const lid = String(msg.from).endsWith("@lid") ? msg.from : null;
    const chatKey = lid || msg.from;
    if (lid && /^vincular\b/i.test(consulta)) {
        const vinculacion = await vincularLid(query, lid, consulta);
        if (vinculacion === "invalido") {
            await msg.reply("No pudimos validar los datos. Escribe: VINCULAR espacio número de documento espacio últimos 4 dígitos del teléfono. Ejemplo: VINCULAR 1001234567 4567");
        } else if (vinculacion) {
            await msg.reply(`Número vinculado correctamente a ${vinculacion}. Ya puedes escribir CONFIRMAR o CANCELAR.`);
        } else {
            await msg.reply("Para vincular este WhatsApp escribe: VINCULAR espacio número de documento espacio últimos 4 dígitos del teléfono. Ejemplo: VINCULAR 1001234567 4567");
        }
        return;
    }

    const telefono = await obtenerTelefonoEntrante(client, msg);
    console.log(`Mensaje WhatsApp recibido: from=${msg.from}, telefono=${telefono || "no disponible"}`);
    let cita = await obtenerCitaActiva(query, { telefono, lid });
    if (!cita && conversaciones.has(chatKey)) {
        const contexto = conversaciones.get(chatKey);
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
        console.log(`[WhatsApp] Cita recuperada desde contexto: ${cita?.cita_id || "ninguna"}`);
    }
    if (cita && lid && cita.whatsapp_lid !== lid) {
        await query("UPDATE pacientes SET whatsapp_lid = ? WHERE paciente_id = ?", [lid, cita.paciente_id]);
    }
    if (!cita) {
        await msg.reply(lid
            ? "No encontramos una cita asociada. Si es la primera vez, escribe exactamente: VINCULAR seguido de tu número de documento, un espacio y los últimos 4 dígitos de tu teléfono. Ejemplo: VINCULAR 1001234567 4567"
            : "No encontramos una cita próxima asociada a este número. Puedes consultar o agendar desde el portal web de CliniCita.");
        return;
    }

    const contexto = conversaciones.get(chatKey) || {};
    if (contexto.estado === "silencioso") return;

    if (contexto.esperandoConfirmacionSintomas) {
        if (esRespuestaNegativa(consulta)) {
            conversaciones.set(chatKey, { ...contexto, estado: "silencioso", esperandoConfirmacionSintomas: false });
            return;
        }
        if (esRespuestaAfirmativa(consulta)) {
            conversaciones.set(chatKey, { ...contexto, esperandoConfirmacionSintomas: false });
            await msg.reply("Claro. Escribe los síntomas o el motivo de consulta que deseas agregar o corregir.");
            return;
        }
    }

    conversaciones.set(chatKey, { ...contexto, citaId: cita.cita_id, pacienteId: cita.paciente_id });
    const clasificacion = clasificar ? await clasificar(consulta).catch(() => clasificarLocal(consulta)) : clasificarLocal(consulta);
    if (!clasificar) console.log(`[Gemini] Se usará clasificación local para: "${consulta}"`);
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
            await query(
                "INSERT INTO citas (paciente_id, medico_id, fecha_cita, hora_cita, estado) VALUES (?, ?, ?, ?, 'Pendiente')",
                [siguiente.paciente_id, cita.medico_id, cita.fecha_cita, cita.hora_cita]
            );
            await query("UPDATE lista_espera SET estado_espera = 'Asignado' WHERE espera_id = ?", [siguiente.espera_id]);
            const fechaReasignada = fechaCita(cita);
            if (fechaReasignada) {
                await enviarWhatsApp(client, siguiente.telefono_whatsapp, `Hola ${siguiente.nombre_completo}. Se liberó un turno de ${cita.especialidad} para el ${fechaReasignada.toLocaleString("es-CO")}. Responde CONFIRMAR para confirmar tu asistencia.`);
            }
        }
        await msg.reply(`Hola ${cita.paciente}, tu cita fue cancelada correctamente.`);
        return;
    }

    if (intencion === "CONFIRMAR") {
        console.log(`[WhatsApp] Confirmando cita ${cita.cita_id} para ${cita.paciente}`);
        const resultado = await query("UPDATE citas SET estado = 'Confirmada' WHERE cita_id = ?", [cita.cita_id]);
        console.log(`[WhatsApp] UPDATE confirmación: filas afectadas=${resultado.affectedRows}`);
        const estadoActualizado = await query("SELECT estado FROM citas WHERE cita_id = ?", [cita.cita_id]);
        console.log(`[WhatsApp] Estado guardado para cita ${cita.cita_id}: ${estadoActualizado[0]?.estado || "no encontrado"}`);
        conversaciones.set(chatKey, { citaId: cita.cita_id, pacienteId: cita.paciente_id, esperandoPreconsulta: true });
        await msg.reply(`Gracias por confirmar, ${cita.paciente}. Describe brevemente tus síntomas o motivo de consulta para registrar tu preconsulta.`);
        return;
    }

    if (intencion === "SINTOMAS" || (cita.estado === "Confirmada" && consulta.length > 5)) {
        await query(
            "INSERT INTO fichas_preconsulta (cita_id, paciente_id, sintomas) VALUES (?, ?, ?)",
            [cita.cita_id, cita.paciente_id, clasificacion.sintomas_detalles || consulta]
        );
        conversaciones.set(chatKey, {
            citaId: cita.cita_id,
            pacienteId: cita.paciente_id,
            esperandoConfirmacionSintomas: true
        });
        console.log(`[WhatsApp] Preconsulta guardada para cita ${cita.cita_id}`);
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

async function enviarRecordatorios({ client, query }) {
    const citas = await query(`
        SELECT c.cita_id,
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
        const fecha = fechaCitaActual.toLocaleString("es-CO", { dateStyle: "medium", timeStyle: "short" });
        const enviado = await enviarWhatsApp(client, telefono, `Hola ${cita.paciente}. Te recordamos tu cita médica el ${fecha}. Responde CONFIRMAR o CANCELAR.`);
        if (!enviado) continue;
        await query("UPDATE citas SET recordatorio_enviado = 1 WHERE cita_id = ?", [cita.cita_id]);
        await query("UPDATE recordatorios SET fecha_envio = NOW(), estado_entrega = 'Enviado' WHERE cita_id = ?", [cita.cita_id]);
    }
}

module.exports = { iniciarWhatsApp };
