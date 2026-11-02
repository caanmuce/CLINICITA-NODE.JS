/**
 * Servicio compartido para reasignar cupos liberados a pacientes en lista de espera.
 */
async function reasignarCupoListaEspera(query, cita, client = null) {
    try {
        let especialidad = cita.especialidad;
        if (!especialidad && cita.medico_id) {
            const med = await query("SELECT especialidad FROM medicos WHERE medico_id = ?", [cita.medico_id]);
            especialidad = med[0]?.especialidad;
        }

        const espera = await query(`
            SELECT le.espera_id, le.paciente_id, p.nombre_completo, p.telefono_whatsapp
            FROM lista_espera le
            JOIN pacientes p ON p.paciente_id = le.paciente_id
            WHERE le.estado_espera = 'Activo'
              AND (le.especialidad_requerida IS NULL OR le.especialidad_requerida = ?)
            ORDER BY FIELD(le.prioridad, 'Alta', 'Media', 'Baja'), le.fecha_inscripcion
            LIMIT 1
        `, [especialidad || '']);

        if (espera[0]) {
            const siguiente = espera[0];
            const citaReasignada = await query(
                "INSERT INTO citas (paciente_id, medico_id, fecha_cita, hora_cita, estado) VALUES (?, ?, ?, ?, 'Pendiente')",
                [siguiente.paciente_id, cita.medico_id, cita.fecha_cita, cita.hora_cita]
            );
            
            await query(`
                INSERT INTO recordatorios (cita_id, canal_envio, estado_entrega)
                VALUES (?, 'WhatsApp', 'Pendiente')
            `, [citaReasignada.insertId]).catch(() => {});

            await query("UPDATE lista_espera SET estado_espera = 'Asignado' WHERE espera_id = ?", [siguiente.espera_id]);
            
            if (client && siguiente.telefono_whatsapp) {
                const fechaStr = cita.fecha_cita instanceof Date ? cita.fecha_cita.toISOString().slice(0, 10) : String(cita.fecha_cita).slice(0, 10);
                const horaStr = cita.hora_cita instanceof Date ? cita.hora_cita.toISOString().slice(11, 19) : String(cita.hora_cita).slice(0, 8);
                const fechaObj = new Date(`${fechaStr}T${horaStr}-05:00`);
                const fechaFormateada = Number.isNaN(fechaObj.getTime()) ? `${fechaStr} ${horaStr}` : fechaObj.toLocaleString("es-CO", { timeZone: "America/Bogota", dateStyle: "medium", timeStyle: "short" });
                
                const numeroLimpio = String(siguiente.telefono_whatsapp).replace(/\D/g, "");
                if (numeroLimpio && typeof client.sendMessage === "function") {
                    const chatId = `${numeroLimpio}@c.us`;
                    const mensaje = `Hola ${siguiente.nombre_completo}. Se liberó un turno de ${especialidad || 'Medicina'} para el ${fechaFormateada}. Responde CONFIRMAR para confirmar tu asistencia.`;
                    await client.sendMessage(chatId, mensaje).catch(() => {});
                }
            }
            console.log(`[ListaEspera] Turno reasignado al paciente ${siguiente.nombre_completo} (Espera ID: ${siguiente.espera_id})`);
        }
    } catch (error) {
        console.error("Error en reasignarCupoListaEspera:", error.message);
    }
}

module.exports = { reasignarCupoListaEspera };
