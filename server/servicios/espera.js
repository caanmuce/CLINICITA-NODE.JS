/**
 * Motor de lista de espera.
 * Una oferta NO crea una cita. La cita se crea únicamente cuando el paciente acepta.
/** */
const { promisify } = require("node:util");

const TTL_OFERTA_MINUTOS = Math.max(5, Number(process.env.LISTA_ESPERA_TTL_MINUTOS) || 30);
const CLINIC_TIMEZONE = process.env.CLINIC_TIMEZONE || "America/Bogota";

function consultar(db, sql, params = []) {
    return new Promise((resolve, reject) => {
        db.query(sql, params, (error, rows) => (error ? reject(error) : resolve(rows)));
    });
}

async function conTransaccion(db, ejecutar) {
    const conexion = await new Promise((resolve, reject) => {
        db.getConnection((error, connection) => (error ? reject(error) : resolve(connection)));
    });
    const query = promisify(conexion.query).bind(conexion);
    try {
        await promisify(conexion.beginTransaction).bind(conexion)();
        const resultado = await ejecutar(query);
        await promisify(conexion.commit).bind(conexion)();
        return resultado;
    } catch (error) {
        await promisify(conexion.rollback).bind(conexion)().catch(() => {});
        throw error;
    } finally {
        conexion.release();
    }
}

function fechaSQL(valor) {
    if (valor instanceof Date) return valor.toISOString().slice(0, 10);
    return String(valor || "").slice(0, 10);
}

function horaSQL(valor) {
    if (valor instanceof Date) return valor.toISOString().slice(11, 19);
    const texto = String(valor || "");
    return texto.length === 5 ? `${texto}:00` : texto.slice(0, 8);
}

function limpiarTelefono(valor) {
    let numero = String(valor || "").replace(/\D/g, "");
    if (numero.startsWith("00")) numero = numero.slice(2);
    const codigoPais = String(process.env.WHATSAPP_COUNTRY_CODE || "57").replace(/\D/g, "");
    if (numero.length === 10 && codigoPais) numero = `${codigoPais}${numero}`;
    return numero;
}

function formatoFechaHora(fecha, hora) {
    const fechaTexto = fechaSQL(fecha);
    const horaTexto = horaSQL(hora);
    const instante = new Date(`${fechaTexto}T${horaTexto}${process.env.CLINIC_UTC_OFFSET || "-05:00"}`);
    if (Number.isNaN(instante.getTime())) return `${fechaTexto} ${horaTexto.slice(0, 5)}`;
    return instante.toLocaleString("es-CO", {
        timeZone: CLINIC_TIMEZONE,
        dateStyle: "medium",
        timeStyle: "short"
    });
}

async function enviarNotificacionOferta(client, oferta) {
    if (!client || typeof client.sendMessage !== "function" || !oferta.telefono_whatsapp) return false;
    const numero = limpiarTelefono(oferta.telefono_whatsapp);
    if (!numero) return false;
    try {
        const contacto = typeof client.getNumberId === "function" ? await client.getNumberId(numero) : null;
        const destino = contacto?._serialized || `${numero}@c.us`;
        const fecha = formatoFechaHora(oferta.fecha_cita, oferta.hora_cita);
        const mensaje = `Hola ${oferta.nombre_completo}. Se liberó un turno compatible contigo para ${oferta.especialidad} el ${fecha}${oferta.sede_nombre ? ` en ${oferta.sede_nombre}` : ""}. Tienes ${TTL_OFERTA_MINUTOS} minutos para responder. Escribe ACEPTAR ${oferta.oferta_id} para tomarlo o RECHAZAR ${oferta.oferta_id} para mantenerte en lista de espera.`;
        await client.sendMessage(destino, mensaje);
        return true;
    } catch (error) {
        console.warn(`[ListaEspera] No se pudo notificar la oferta ${oferta.oferta_id}: ${error.message}`);
        return false;
    }
}

/** Crea una oferta temporal para el siguiente paciente compatible con el cupo liberado. */
async function reasignarCupoListaEspera(db, cita, client = null) {
    if (!db || !cita?.medico_id || !cita?.fecha_cita || !cita?.hora_cita) {
        return { creada: false, motivo: "Datos del cupo incompletos" };
    }

    try {
        const oferta = await conTransaccion(db, async (query) => {
            const fecha = fechaSQL(cita.fecha_cita);
            const hora = horaSQL(cita.hora_cita);
            const instanteCupo = new Date(`${fecha}T${hora}${process.env.CLINIC_UTC_OFFSET || "-05:00"}`);
            if (Number.isNaN(instanteCupo.getTime()) || instanteCupo <= new Date()) return null;
            let especialidad = cita.especialidad;
            if (!especialidad) {
                const medico = await query("SELECT especialidad FROM medicos WHERE medico_id = ?", [cita.medico_id]);
                especialidad = medico[0]?.especialidad || null;
            }
            if (!especialidad) return null;

            // Un cupo ocupado no puede generar una oferta. Se excluye la cita cancelada que lo liberó.
            const ocupada = await query(`
                SELECT cita_id FROM citas
                WHERE medico_id = ? AND fecha_cita = ? AND hora_cita = ?
                  AND estado NOT IN ('Cancelada', 'No-Asistio')
                LIMIT 1 FOR UPDATE
            `, [cita.medico_id, fecha, hora]);
            if (ocupada.length) return null;

            // Limpia una oferta vencida para este mismo horario antes de elegir al siguiente paciente.
            const vencidas = await query(`
                SELECT oferta_id, espera_id FROM lista_espera_ofertas
                WHERE medico_id = ? AND fecha_cita = ? AND hora_cita = ?
                  AND estado = 'Pendiente' AND vence_en <= NOW()
                FOR UPDATE
            `, [cita.medico_id, fecha, hora]);
            for (const vencida of vencidas) {
                await query("UPDATE lista_espera_ofertas SET estado = 'Expirada', fecha_respuesta = NOW() WHERE oferta_id = ? AND estado = 'Pendiente'", [vencida.oferta_id]);
                await query("UPDATE lista_espera SET estado_espera = 'Activo' WHERE espera_id = ? AND estado_espera = 'Ofertado'", [vencida.espera_id]);
            }

            const ofertaActiva = await query(`
                SELECT oferta_id FROM lista_espera_ofertas
                WHERE medico_id = ? AND fecha_cita = ? AND hora_cita = ?
                  AND estado = 'Pendiente' AND vence_en > NOW()
                LIMIT 1
            `, [cita.medico_id, fecha, hora]);
            if (ofertaActiva.length) return null;

            const candidatos = await query(`
                SELECT le.espera_id, le.paciente_id, p.nombre_completo, p.telefono_whatsapp,
                       s.nombre AS sede_nombre
                FROM lista_espera le
                JOIN pacientes p ON p.paciente_id = le.paciente_id
                LEFT JOIN sedes s ON s.sede_id = ?
                WHERE le.estado_espera = 'Activo'
                  AND (le.especialidad_requerida IS NULL OR le.especialidad_requerida = ?)
                  AND (le.sede_id IS NULL OR le.sede_id = ?)
                  AND (le.medico_preferido_id IS NULL OR le.medico_preferido_id = ?)
                  AND (le.fecha_desde IS NULL OR le.fecha_desde <= ?)
                  AND (le.fecha_hasta IS NULL OR le.fecha_hasta >= ?)
                  AND (le.franja_horaria = 'Cualquiera'
                       OR (le.franja_horaria = 'Manana' AND TIME(?) < '12:00:00')
                       OR (le.franja_horaria = 'Tarde' AND TIME(?) >= '12:00:00'))
                  AND NOT EXISTS (
                      SELECT 1 FROM lista_espera_ofertas o
                      WHERE o.espera_id = le.espera_id
                        AND o.estado = 'Pendiente' AND o.vence_en > NOW()
                  )
                  -- No volver a ofrecer el mismo cupo a quien ya lo rechazó o dejó vencer.
                  AND NOT EXISTS (
                      SELECT 1 FROM lista_espera_ofertas anterior
                      WHERE anterior.espera_id = le.espera_id
                        AND anterior.medico_id = ?
                        AND anterior.fecha_cita = ?
                        AND anterior.hora_cita = ?
                        AND anterior.estado IN ('Rechazada', 'Expirada', 'Cancelada')
                  )
                ORDER BY FIELD(le.prioridad, 'Alta', 'Media', 'Baja'), le.fecha_inscripcion, le.espera_id
                LIMIT 1 FOR UPDATE
            `, [cita.sede_id || null, especialidad, cita.sede_id || null, cita.medico_id, fecha, fecha, hora, hora, cita.medico_id, fecha, hora]);
            if (!candidatos.length) return null;

            const siguiente = candidatos[0];
            const cambio = await query(
                "UPDATE lista_espera SET estado_espera = 'Ofertado' WHERE espera_id = ? AND estado_espera = 'Activo'",
                [siguiente.espera_id]
            );
            if (!cambio.affectedRows) return null;

            const alta = await query(`
                INSERT INTO lista_espera_ofertas
                    (espera_id, paciente_id, medico_id, sede_id, fecha_cita, hora_cita, especialidad, estado, vence_en)
                VALUES (?, ?, ?, ?, ?, ?, ?, 'Pendiente', DATE_ADD(NOW(), INTERVAL ? MINUTE))
            `, [siguiente.espera_id, siguiente.paciente_id, cita.medico_id, cita.sede_id || null, fecha, hora, especialidad, TTL_OFERTA_MINUTOS]);

            return {
                oferta_id: alta.insertId,
                espera_id: siguiente.espera_id,
                paciente_id: siguiente.paciente_id,
                nombre_completo: siguiente.nombre_completo,
                telefono_whatsapp: siguiente.telefono_whatsapp,
                sede_nombre: siguiente.sede_nombre,
                medico_id: cita.medico_id,
                sede_id: cita.sede_id || null,
                fecha_cita: fecha,
                hora_cita: hora,
                especialidad
            };
        });

        if (!oferta) return { creada: false, motivo: "No hay pacientes compatibles o el horario ya tiene una oferta" };
        const notificada = await enviarNotificacionOferta(client, oferta);
        return { creada: true, oferta_id: oferta.oferta_id, notificada };
    } catch (error) {
        console.error("Error creando oferta de lista de espera:", error.message);
        return { creada: false, error: error.message };
    }
}

/** Acepta, rechaza o expira una oferta. Solo acepta si pertenece al paciente autenticado. */
async function responderOfertaListaEspera(db, { ofertaId, pacienteId = null, decision, client = null }) {
    const accion = String(decision || "").toUpperCase();
    if (!Number.isInteger(Number(ofertaId)) || !["ACEPTAR", "RECHAZAR", "CANCELAR", "EXPIRAR"].includes(accion)) {
        return { ok: false, status: 400, mensaje: "Respuesta de oferta no válida" };
    }

    let cupoParaSiguiente = null;
    let resultado;
    try {
        resultado = await conTransaccion(db, async (query) => {
            const filas = await query(`
                SELECT o.*, (o.vence_en <= NOW()) AS vencida, p.nombre_completo, p.telefono_whatsapp, m.especialidad, s.nombre AS sede_nombre
                FROM lista_espera_ofertas o
                JOIN pacientes p ON p.paciente_id = o.paciente_id
                JOIN medicos m ON m.medico_id = o.medico_id
                LEFT JOIN sedes s ON s.sede_id = o.sede_id
                WHERE o.oferta_id = ? ${pacienteId ? "AND o.paciente_id = ?" : ""}
                LIMIT 1 FOR UPDATE
            `, pacienteId ? [Number(ofertaId), pacienteId] : [Number(ofertaId)]);
            if (!filas.length) return { ok: false, status: 404, mensaje: "Oferta no encontrada" };
            const oferta = filas[0];
            const cupo = {
                medico_id: oferta.medico_id,
                sede_id: oferta.sede_id,
                fecha_cita: oferta.fecha_cita,
                hora_cita: oferta.hora_cita,
                especialidad: oferta.especialidad
            };

            if (oferta.estado !== "Pendiente") {
                return { ok: false, status: 409, mensaje: "Esta oferta ya no está disponible" };
            }

            const estaVencida = Number(oferta.vencida) === 1;
            if (estaVencida || accion === "EXPIRAR") {
                await query("UPDATE lista_espera_ofertas SET estado = 'Expirada', fecha_respuesta = NOW() WHERE oferta_id = ? AND estado = 'Pendiente'", [oferta.oferta_id]);
                await query("UPDATE lista_espera SET estado_espera = 'Activo' WHERE espera_id = ? AND estado_espera = 'Ofertado'", [oferta.espera_id]);
                cupoParaSiguiente = cupo;
                return { ok: false, status: 410, mensaje: "La oferta venció. El turno se ofrecerá al siguiente paciente compatible." };
            }

            if (accion === "RECHAZAR" || accion === "CANCELAR") {
                const estadoOferta = accion === "CANCELAR" ? "Cancelada" : "Rechazada";
                await query("UPDATE lista_espera_ofertas SET estado = ?, fecha_respuesta = NOW() WHERE oferta_id = ? AND estado = 'Pendiente'", [estadoOferta, oferta.oferta_id]);
                await query("UPDATE lista_espera SET estado_espera = 'Activo' WHERE espera_id = ? AND estado_espera = 'Ofertado'", [oferta.espera_id]);
                cupoParaSiguiente = cupo;
                return {
                    ok: true,
                    status: 200,
                    mensaje: accion === "CANCELAR"
                        ? "Oferta cancelada por recepción. El turno se ofrecerá al siguiente paciente compatible."
                        : "Oferta rechazada. Sigues activo en la lista de espera."
                };
            }

            const conflicto = await query(`
                SELECT cita_id FROM citas
                WHERE medico_id = ? AND fecha_cita = ? AND hora_cita = ?
                  AND estado NOT IN ('Cancelada', 'No-Asistio')
                LIMIT 1 FOR UPDATE
            `, [oferta.medico_id, fechaSQL(oferta.fecha_cita), horaSQL(oferta.hora_cita)]);
            const fechaCita = new Date(`${fechaSQL(oferta.fecha_cita)}T${horaSQL(oferta.hora_cita)}${process.env.CLINIC_UTC_OFFSET || "-05:00"}`);
            if (conflicto.length || Number.isNaN(fechaCita.getTime()) || fechaCita <= new Date()) {
                await query("UPDATE lista_espera_ofertas SET estado = 'Expirada', fecha_respuesta = NOW() WHERE oferta_id = ? AND estado = 'Pendiente'", [oferta.oferta_id]);
                await query("UPDATE lista_espera SET estado_espera = 'Activo' WHERE espera_id = ? AND estado_espera = 'Ofertado'", [oferta.espera_id]);
                return { ok: false, status: 409, mensaje: "El horario ya no está disponible. Sigues en la lista de espera." };
            }

            // Se desactiva la oferta antes del INSERT para liberar el bloqueo lógico del cupo.
            // Si el INSERT falla, la transacción revierte también este cambio.
            await query("UPDATE lista_espera_ofertas SET estado = 'Aceptada', fecha_respuesta = NOW() WHERE oferta_id = ? AND estado = 'Pendiente'", [oferta.oferta_id]);
            const cita = await query(`
                INSERT INTO citas (paciente_id, medico_id, sede_id, fecha_cita, hora_cita, estado)
                VALUES (?, ?, ?, ?, ?, 'Confirmada')
            `, [oferta.paciente_id, oferta.medico_id, oferta.sede_id, fechaSQL(oferta.fecha_cita), horaSQL(oferta.hora_cita)]);
            await query("UPDATE lista_espera_ofertas SET cita_id = ? WHERE oferta_id = ?", [cita.insertId, oferta.oferta_id]);
            await query("UPDATE lista_espera SET estado_espera = 'Asignado' WHERE espera_id = ? AND estado_espera = 'Ofertado'", [oferta.espera_id]);
            // El trigger habitual crea el recordatorio; esto cubre instalaciones que no tengan el trigger.
            await query(`
                INSERT INTO recordatorios (cita_id, canal_envio, estado_entrega)
                SELECT ?, 'WhatsApp', 'Pendiente'
                WHERE NOT EXISTS (SELECT 1 FROM recordatorios WHERE cita_id = ?)
            `, [cita.insertId, cita.insertId]);
            return { ok: true, status: 200, mensaje: "Oferta aceptada. Tu cita quedó confirmada.", cita_id: cita.insertId };
        });
    } catch (error) {
        console.error("Error respondiendo oferta de lista de espera:", error.message);
        return { ok: false, status: 500, mensaje: "No fue posible procesar la respuesta de la oferta" };
    }

    if (cupoParaSiguiente) await reasignarCupoListaEspera(db, cupoParaSiguiente, client);
    return resultado;
}

/** Procesa respuestas inequívocas de WhatsApp para ofertas pendientes. */
async function procesarRespuestaOfertaWhatsApp(db, telefono, texto, client = null) {
    const coincidencia = String(texto || "").trim().match(/^(ACEPTAR|RECHAZAR)(?:\s+(\d+))?$/i);
    if (!coincidencia) return { handled: false };
    const decision = coincidencia[1].toUpperCase() === "ACEPTAR" ? "ACEPTAR" : "RECHAZAR";
    const numero = limpiarTelefono(telefono);
    if (!numero) return { handled: true, mensaje: "No pude validar tu número de WhatsApp." };
    try {
        const pacientes = await consultar(db, `
            SELECT paciente_id FROM pacientes
            WHERE RIGHT(REPLACE(REPLACE(REPLACE(telefono_whatsapp, '+', ''), ' ', ''), '-', ''), 10) = RIGHT(?, 10)
            LIMIT 2
        `, [numero]);
        if (pacientes.length !== 1) return { handled: true, mensaje: "No pude identificar de forma única tu cuenta de paciente. Responde desde el número registrado." };
        const pacienteId = pacientes[0].paciente_id;
        let ofertaId = coincidencia[2] ? Number(coincidencia[2]) : null;
        if (!ofertaId) {
            const pendientes = await consultar(db, `
                SELECT oferta_id FROM lista_espera_ofertas
                WHERE paciente_id = ? AND estado = 'Pendiente' AND vence_en > NOW()
                ORDER BY fecha_oferta DESC LIMIT 2
            `, [pacienteId]);
            if (pendientes.length > 1) {
                return { handled: true, mensaje: "Tienes varias ofertas pendientes. Usa ACEPTAR <id> o RECHAZAR <id> con el identificador que aparece en cada notificación." };
            }
            ofertaId = pendientes[0]?.oferta_id;
        }
        if (!ofertaId) return { handled: true, mensaje: "No tienes ofertas pendientes de lista de espera." };
        const respuesta = await responderOfertaListaEspera(db, { ofertaId, pacienteId, decision, client });
        return { handled: true, mensaje: respuesta.mensaje };
    } catch (error) {
        console.error("Error procesando respuesta de oferta por WhatsApp:", error.message);
        return { handled: true, mensaje: "No fue posible procesar tu respuesta. Inténtalo desde el portal de CliniCita." };
    }
}

/** Expira ofertas vencidas y vuelve a ofrecer el mismo cupo al siguiente paciente compatible. */
async function expirarOfertasListaEspera(db, client = null) {
    try {
        const vencidas = await consultar(db, `
            SELECT oferta_id, paciente_id FROM lista_espera_ofertas
            WHERE estado = 'Pendiente' AND vence_en <= NOW()
            ORDER BY vence_en ASC LIMIT 100
        `);
        for (const oferta of vencidas) {
            await responderOfertaListaEspera(db, {
                ofertaId: oferta.oferta_id,
                pacienteId: oferta.paciente_id,
                decision: "EXPIRAR",
                client
            });
        }
    } catch (error) {
        console.error("Error expirando ofertas de lista de espera:", error.message);
    }
}

module.exports = {
    reasignarCupoListaEspera,
    responderOfertaListaEspera,
    procesarRespuestaOfertaWhatsApp,
    expirarOfertasListaEspera
};
