/**
 * server/rutas/admin.js
 * ---------------------------------------------------------------------------
 * Rutas del ADMIN que NO existen en el servidor del equipo. Todas empiezan por /api/admin.
 *
 * Desde la Opción A, usuarios, sedes, horarios y el resumen del panel viven en server.js
 * (/api/usuarios, /api/sedes, /api/horarios/admin, /api/reportes/resumen) para no tener
 * dos implementaciones. Aquí quedan solo:
 *
 *   Especialid.  GET    /api/admin/especialidades
 *                POST   /api/admin/especialidades
 *                PUT    /api/admin/especialidades/:id    (descripción y/o activo)
 *                DELETE /api/admin/especialidades/:id    (solo si no tiene médicos)
 *   Reportes     GET    /api/admin/reportes/ausentismo?desde=&hasta=   (por especialidad)
 *
 * SEGURIDAD: token válido + rol "administrador" + cuenta activa en la BD,
 * comprobado una sola vez con app.use() para todas las rutas de abajo.
 */
const {
    hoyClinica,
    esFechaValida,
    esHoraValida,
    horaAMinutos,
    crearVerificadorActivo,
    conErrores
} = require("./utilidades");

const ROLES = ["paciente", "medico", "recepcionista", "administrador"];
const CORREO_VALIDO = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Convierte a texto sin espacios sobrantes; cualquier otra cosa queda como "". */
function texto(valor) {
    return typeof valor === "string" ? valor.trim() : "";
}

/**
 * Registra las rutas del administrador.
 *
 * @param {object} app  - aplicación Express
 * @param {object} deps - { query, requireAuth, requireRole, hashPassword } de server.js
 *                        (hashPassword es la misma función que usa el registro de pacientes)
 */
function registrarRutasAdmin(app, { query, requireAuth, requireRole, hashPassword }) {
    // Protección común de todo /api/admin: token -> rol -> cuenta activa.
    app.use("/api/admin", requireAuth, requireRole("administrador"), crearVerificadorActivo(query, "administrador"));

    // =======================================================================
    // ESPECIALIDADES
    // =======================================================================

    // `medicos` = cuántos médicos tienen esa especialidad (subconsulta por fila).
    app.get("/api/admin/especialidades", conErrores(async (req, res) => {
        const especialidades = await query(
            `SELECT e.especialidad_id, e.nombre, e.descripcion, e.activo,
                    (SELECT COUNT(*) FROM medicos m WHERE m.especialidad = e.nombre) AS medicos
             FROM especialidades e
             ORDER BY e.nombre`
        );
        res.json({ especialidades });
    }));

    app.post("/api/admin/especialidades", conErrores(async (req, res) => {
        const nombre = texto(req.body?.nombre);
        const descripcion = texto(req.body?.descripcion);
        if (nombre.length < 3 || nombre.length > 50) return res.status(400).json({ mensaje: "El nombre debe tener entre 3 y 50 caracteres" });
        if (descripcion.length > 255) return res.status(400).json({ mensaje: "La descripción no puede superar 255 caracteres" });

        try {
            await query("INSERT INTO especialidades (nombre, descripcion) VALUES (?, ?)", [nombre, descripcion || null]);
        } catch (error) {
            // `nombre` es UNIQUE y no distingue mayúsculas: "pediatría" choca con "Pediatría".
            if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ mensaje: "Esa especialidad ya existe" });
            throw error;
        }
        res.status(201).json({ mensaje: "Especialidad creada correctamente" });
    }));

    // El nombre NO se edita: `medicos.especialidad` y `lista_espera` guardan
    // ese texto, y renombrar dejaría datos desconectados.
    app.put("/api/admin/especialidades/:id", conErrores(async (req, res) => {
        if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ mensaje: "Identificador no válido" });
        const b = req.body || {};
        const cambios = [];
        const valores = [];

        if (b.descripcion !== undefined) {
            const descripcion = texto(b.descripcion);
            if (descripcion.length > 255) return res.status(400).json({ mensaje: "La descripción no puede superar 255 caracteres" });
            cambios.push("descripcion = ?");
            valores.push(descripcion || null);
        }
        if (b.activo !== undefined) {
            if (typeof b.activo !== "boolean") return res.status(400).json({ mensaje: "Indica activo: true o false" });
            cambios.push("activo = ?");
            valores.push(b.activo ? 1 : 0);
        }
        if (!cambios.length) return res.status(400).json({ mensaje: "No hay nada que actualizar" });

        const r = await query(`UPDATE especialidades SET ${cambios.join(", ")} WHERE especialidad_id = ?`, [...valores, req.params.id]);
        if (r.affectedRows === 0) return res.status(404).json({ mensaje: "Especialidad no encontrada" });
        res.json({ mensaje: "Especialidad actualizada correctamente" });
    }));

    app.delete("/api/admin/especialidades/:id", conErrores(async (req, res) => {
        if (!/^\d+$/.test(req.params.id)) return res.status(400).json({ mensaje: "Identificador no válido" });
        const filas = await query(
            `SELECT e.nombre, (SELECT COUNT(*) FROM medicos m WHERE m.especialidad = e.nombre) AS medicos
             FROM especialidades e WHERE e.especialidad_id = ?`,
            [req.params.id]
        );
        if (!filas.length) return res.status(404).json({ mensaje: "Especialidad no encontrada" });
        if (filas[0].medicos > 0) {
            return res.status(409).json({ mensaje: `Tiene ${filas[0].medicos} médico(s) asociado(s). Desactívala en lugar de eliminarla.` });
        }
        await query("DELETE FROM especialidades WHERE especialidad_id = ?", [req.params.id]);
        res.json({ mensaje: "Especialidad eliminada" });
    }));

    // =======================================================================
    // REPORTE DE AUSENTISMO
    // =======================================================================
    app.get("/api/admin/reportes/ausentismo", conErrores(async (req, res) => {
        const mes = rangoDelMes();
        const desde = req.query.desde || mes.desde;
        const hasta = req.query.hasta || mes.hasta;
        if (!esFechaValida(desde) || !esFechaValida(hasta)) return res.status(400).json({ mensaje: "Las fechas no son válidas" });
        if (desde > hasta) return res.status(400).json({ mensaje: "La fecha 'desde' no puede ser posterior a 'hasta'" });

        // SUM(condición) cuenta las filas donde la condición es verdadera
        // (verdadero = 1, falso = 0). Una sola consulta agrupa por especialidad.
        const filas = await query(
            `SELECT m.especialidad,
                    COUNT(*) AS programadas,
                    SUM(c.estado = 'Completada') AS atendidas,
                    SUM(c.estado = 'Cancelada') AS canceladas,
                    SUM(c.estado = 'No-Asistio') AS inasistencias,
                    SUM(c.estado IN ('Pendiente', 'Confirmada')) AS por_atender
             FROM citas c
             JOIN medicos m ON m.medico_id = c.medico_id
             WHERE c.fecha_cita BETWEEN ? AND ?
             GROUP BY m.especialidad
             ORDER BY programadas DESC, m.especialidad`,
            [desde, hasta]
        );

        // MySQL devuelve las SUM como texto: se convierten a número aquí.
        const detalle = filas.map((f) => ({
            especialidad: f.especialidad,
            programadas: Number(f.programadas),
            atendidas: Number(f.atendidas),
            canceladas: Number(f.canceladas),
            inasistencias: Number(f.inasistencias),
            por_atender: Number(f.por_atender),
            tasa: calcularTasa(f.inasistencias, Number(f.atendidas) + Number(f.inasistencias))
        }));

        const total = detalle.reduce(
            (acum, f) => ({
                programadas: acum.programadas + f.programadas,
                atendidas: acum.atendidas + f.atendidas,
                canceladas: acum.canceladas + f.canceladas,
                inasistencias: acum.inasistencias + f.inasistencias,
                por_atender: acum.por_atender + f.por_atender
            }),
            { programadas: 0, atendidas: 0, canceladas: 0, inasistencias: 0, por_atender: 0 }
        );
        total.tasa = calcularTasa(total.inasistencias, total.atendidas + total.inasistencias);

        res.json({ desde, hasta, total, detalle });
    }));
}

/**
 * Tasa de ausentismo en porcentaje (con 1 decimal).
 *
 * DEFINICIÓN: inasistencias / (atendidas + inasistencias) * 100.
 * Solo cuentan las citas YA RESUELTAS. Las pendientes/futuras y las
 * canceladas quedan fuera: si entraran, el porcentaje bajaría de forma
 * artificial por citas que todavía no ocurren.
 *
 * @param {number} inasistencias
 * @param {number} resueltas - atendidas + inasistencias
 */
function calcularTasa(inasistencias, resueltas) {
    if (!Number(resueltas)) return 0;
    return Math.round((Number(inasistencias) / Number(resueltas)) * 1000) / 10;
}

/** Primer y último día del mes actual (zona de la clínica), "AAAA-MM-DD". */
function rangoDelMes() {
    const [anio, mes] = hoyClinica().split("-").map(Number);
    const ultimo = new Date(Date.UTC(anio, mes, 0)).getUTCDate(); // día 0 del mes siguiente = último de este
    const mm = String(mes).padStart(2, "0");
    return { desde: `${anio}-${mm}-01`, hasta: `${anio}-${mm}-${String(ultimo).padStart(2, "0")}` };
}

module.exports = { registrarRutasAdmin };
