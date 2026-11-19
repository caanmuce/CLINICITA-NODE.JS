/**
 * server/rutas/horarios.js
 * ---------------------------------------------------------------------------
 * Lógica COMPARTIDA entre el módulo del ADMIN (que configura horarios) y el
 * módulo del PACIENTE (que agenda citas): calcular qué horas están libres.
 *
 * Antes, server.js tenía una lista fija ["08:00","09:00",...]. Ahora el
 * cálculo sale de la tabla `horarios` (la de bd.sql, con sede y duración de
 * cada cita), que administra el admin desde la pantalla de Horarios.
 *
 * La usan dos sitios de server.js:
 *   - GET  /api/horarios -> muestra las horas libres al paciente.
 *   - POST /api/citas    -> verifica que la hora pedida sea una hora válida.
 */
const { diaSemana, horaAMinutos, minutosAHora } = require("./utilidades");

/**
 * Devuelve la lista de horas libres ("HH:MM") de un médico en una fecha.
 *
 * Pasos:
 *   1. Busca los bloques de atención ACTIVOS del médico para ese día de la
 *      semana, en sedes que también estén activas. Si se indica una sede,
 *      solo los de esa sede.
 *   2. Corta cada bloque en citas según su duración (duracion_slot).
 *      Ej.: 08:00-12:00 con duración 30 -> 08:00, 08:30, ... 11:30.
 *      La última cita debe TERMINAR antes (o justo al) fin del bloque.
 *   3. Quita las horas que ya tienen cita (menos Cancelada / No-Asistio,
 *      mismo criterio que ya usaba server.js).
 *   4. Si la fecha es hoy, quita las horas que ya pasaron.
 *
 * @param {Function} query    - query(sql, params) -> Promise
 * @param {number|string} medicoId
 * @param {string} fecha      - "AAAA-MM-DD"
 * @param {number|string} [sedeId] - opcional: limitar a una sede
 * @returns {Promise<string[]>} horas libres ordenadas, p. ej. ["09:00", "09:30"]
 */
async function calcularHorariosLibres(query, medicoId, fecha, sedeId) {
    // 1) Bloques del médico para ese día de la semana (0 = domingo ... 6 = sábado).
    //    El filtro de sede solo se agrega cuando llega un valor válido.
    const filtroSede = sedeId && /^\d+$/.test(String(sedeId)) ? " AND h.sede_id = ?" : "";
    const parametros = [medicoId, diaSemana(fecha)];
    if (filtroSede) parametros.push(sedeId);

    const bloques = await query(
        `SELECT TIME_FORMAT(h.hora_inicio, '%H:%i') AS inicio,
                TIME_FORMAT(h.hora_fin, '%H:%i') AS fin,
                h.duracion_slot
         FROM horarios h
         JOIN sedes s ON s.sede_id = h.sede_id AND s.activa = 1
         WHERE h.medico_id = ? AND h.dia_semana = ? AND h.activo = 1${filtroSede}
         ORDER BY h.hora_inicio`,
        parametros
    );
    if (!bloques.length) return [];

    // 2) Generar todas las horas posibles. Usamos un Set para no repetir
    //    una hora si dos bloques se traslaparan por error.
    const posibles = new Set();
    for (const bloque of bloques) {
        const fin = horaAMinutos(bloque.fin);
        for (let t = horaAMinutos(bloque.inicio); t + bloque.duracion_slot <= fin; t += bloque.duracion_slot) {
            posibles.add(minutosAHora(t));
        }
    }

    // 3) Horas ya ocupadas por otras citas.
    const ocupadas = await query(
        `SELECT TIME_FORMAT(hora_cita, '%H:%i') AS hora
         FROM citas
         WHERE medico_id = ? AND fecha_cita = ? AND estado NOT IN ('Cancelada', 'No-Asistio')`,
        [medicoId, fecha]
    );
    const ocupadasSet = new Set(ocupadas.map((fila) => fila.hora));

    // 4) Descartar horas pasadas. Se compara con la misma regla que usa
    //    POST /api/citas (fecha y hora con el desfase UTC de la clínica).
    const desfase = process.env.CLINIC_UTC_OFFSET || "-05:00";
    const ahora = new Date();

    return [...posibles]
        .filter((hora) => !ocupadasSet.has(hora))
        .filter((hora) => new Date(`${fecha}T${hora}:00${desfase}`) > ahora)
        .sort();
}

module.exports = { calcularHorariosLibres };
