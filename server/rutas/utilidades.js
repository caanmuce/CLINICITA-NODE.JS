/**
 * server/rutas/utilidades.js
 * ---------------------------------------------------------------------------
 * Funciones pequeñas que comparten las rutas del MÉDICO y del ADMIN.
 * (Archivo nuevo — módulos médico y admin.)
 *
 * Aquí viven tres tipos de cosas:
 *   1. Fechas y horas (validar formato, "hoy" en la zona horaria de la clínica).
 *   2. Un "verificador de cuenta activa" (middleware).
 *   3. Un envoltorio para que los errores inesperados devuelvan JSON y no HTML.
 */

/**
 * Devuelve la fecha de HOY en la zona horaria de la clínica, con formato
 * "AAAA-MM-DD".
 *
 * ¿Por qué no usar simplemente new Date().toISOString()? Porque toISOString()
 * usa la hora UTC: a las 8:00 p.m. en Colombia (UTC-5) ya es "mañana" en UTC,
 * y la agenda del médico mostraría el día equivocado.
 *
 * La zona se toma de CLINIC_TIMEZONE en el .env (por defecto America/Bogota).
 * El locale "en-CA" se usa porque formatea la fecha justo como AAAA-MM-DD.
 */
function hoyClinica() {
    const zona = process.env.CLINIC_TIMEZONE || "America/Bogota";
    return new Intl.DateTimeFormat("en-CA", {
        timeZone: zona,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    }).format(new Date());
}

/**
 * Comprueba que un texto sea una fecha REAL con formato AAAA-MM-DD.
 * La expresión regular valida la forma ("2026-13-45" pasaría); el segundo
 * paso convierte a fecha y compara, así rechazamos días que no existen
 * (por ejemplo 2026-02-31).
 */
function esFechaValida(texto) {
    if (typeof texto !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(texto)) return false;
    const fecha = new Date(`${texto}T00:00:00Z`);
    return !Number.isNaN(fecha.getTime()) && fecha.toISOString().slice(0, 10) === texto;
}

/** Comprueba el formato de hora "HH:MM" en 24 horas (00:00 a 23:59). */
function esHoraValida(texto) {
    return typeof texto === "string" && /^([01]\d|2[0-3]):[0-5]\d$/.test(texto);
}

/**
 * Día de la semana de una fecha "AAAA-MM-DD": 0 = domingo ... 6 = sábado.
 * Es el mismo criterio que usa el formulario de horarios del admin.
 * Se calcula en UTC a propósito, para que la zona horaria del servidor
 * no mueva la fecha un día.
 */
function diaSemana(fecha) {
    return new Date(`${fecha}T00:00:00Z`).getUTCDay();
}

/** "08:30" -> 510 (minutos desde la medianoche). Facilita sumar y comparar. */
function horaAMinutos(hora) {
    const [h, m] = hora.split(":").map(Number);
    return h * 60 + m;
}

/** 510 -> "08:30". Operación inversa de horaAMinutos. */
function minutosAHora(minutos) {
    const h = String(Math.floor(minutos / 60)).padStart(2, "0");
    const m = String(minutos % 60).padStart(2, "0");
    return `${h}:${m}`;
}

/**
 * Crea un middleware que comprueba, EN LA BASE DE DATOS y en cada petición,
 * que la cuenta del token siga existiendo, esté ACTIVA y conserve el rol.
 *
 * ¿Por qué hace falta si ya existe requireAuth? Porque requireAuth solo
 * verifica la firma del token (que dura 8 horas). Si el admin desactiva a un
 * usuario, su token seguiría funcionando hasta vencer. Con este middleware, la
 * desactivación surte efecto en la siguiente petición.
 *
 * Deja la fila del usuario en req.cuenta (usuario_id, nombre_completo, medico_id).
 *
 * @param {Function} query - función query(sql, params) -> Promise (la de server.js)
 * @param {string} rol     - rol exigido: "medico" o "administrador"
 */
function crearVerificadorActivo(query, rol) {
    return async (req, res, next) => {
        try {
            const filas = await query(
                "SELECT usuario_id, nombre_completo, medico_id FROM usuarios WHERE usuario_id = ? AND rol = ? AND activo = 1",
                [req.user.id, rol]
            );
            if (!filas.length) {
                // 401 hace que app.js borre el token y mande al login.
                return res.status(401).json({ mensaje: "Tu cuenta está desactivada o ya no existe" });
            }
            req.cuenta = filas[0];
            next();
        } catch (error) {
            console.error("Error verificando la cuenta:", error.message);
            res.status(500).json({ mensaje: "No fue posible verificar tu cuenta" });
        }
    };
}

/**
 * Envuelve un manejador de ruta async para que, si algo inesperado falla
 * (por ejemplo se cae MySQL), la respuesta sea JSON {mensaje} con código 500.
 * Así el frontend (api() en app.js) siempre puede leer data.mensaje.
 */
function conErrores(manejador) {
    return async (req, res) => {
        try {
            await manejador(req, res);
        } catch (error) {
            console.error(`Error en ${req.method} ${req.originalUrl}:`, error.message);
            if (!res.headersSent) res.status(500).json({ mensaje: "Ocurrió un error en el servidor" });
        }
    };
}

module.exports = {
    hoyClinica,
    esFechaValida,
    esHoraValida,
    diaSemana,
    horaAMinutos,
    minutosAHora,
    crearVerificadorActivo,
    conErrores
};
