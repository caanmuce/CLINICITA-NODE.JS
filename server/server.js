console.log("=== SERVER.JS LOADING FROM:", __filename, "===");
const express = require("express");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const conexion = require("./conexion");
const crypto = require("crypto");
const { promisify } = require("util");
const { iniciarWhatsApp } = require("./servicios/whatsapp");
const { z } = require("zod");
const helmet = require("helmet");
const cors = require("cors");
const rateLimit = require("express-rate-limit");
const { mlClient } = require("./services/ml-client");

const app = express();
const query = promisify(conexion.query).bind(conexion);
const ROLES = ["paciente", "medico", "recepcionista", "administrador"];
const TOKEN_SECRET = process.env.TOKEN_SECRET || "clinicita-clave-local-cambiar-en-produccion";
const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";

// Validar TOKEN_SECRET en producción
if (process.env.NODE_ENV === "production" && (!process.env.TOKEN_SECRET || process.env.TOKEN_SECRET === "clinicita-clave-local-cambiar-en-produccion")) {
    console.error("❌ ERROR: TOKEN_SECRET debe configurarse en producción");
    process.exit(1);
}

function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString("hex");
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    return `${salt}:${hash}`;
}

function verifyPassword(password, storedPassword) {
    const [salt, storedHash] = String(storedPassword).split(":");
    if (!salt || !storedHash) return false;
    const hash = crypto.scryptSync(password, salt, 64).toString("hex");
    if (hash.length !== storedHash.length) return false;
    return crypto.timingSafeEqual(Buffer.from(hash, "hex"), Buffer.from(storedHash, "hex"));
}

/**
 * Genera el token de sesión de un usuario después de un login exitoso.
 *
 * Es una versión "casera" de un JWT (JSON Web Token): un string firmado
 * que el cliente guarda y reenvía en cada petición para probar quién es,
 * sin que el servidor tenga que guardar nada de esa sesión en su lado.
 *
 * @param {object} user - Fila del usuario tal como viene de la base de datos
 *                         (debe tener usuario_id y rol).
 * @returns {string} Token con formato "payload.firma".
 */
function createToken(user) {
    // 1. Arma el "contenido" del token: qué usuario es, qué rol tiene,
    //    y cuándo deja de ser válido (ahora + 8 horas en milisegundos).
    //    Se convierte a JSON y luego a Base64url (variante de Base64 segura
    //    para usar en URLs/headers, sin +, / ni =).
    const payload = Buffer.from(JSON.stringify({
        id: user.usuario_id,
        rol: user.rol,
        exp: Date.now() + 8 * 60 * 60 * 1000
    })).toString("base64url");

    // 2. Firma ese payload con HMAC-SHA256 usando el secreto del servidor
    //    (TOKEN_SECRET). Esto es lo que hace que el token no se pueda
    //    falsificar: solo quien conoce TOKEN_SECRET puede generar una
    //    firma que coincida con un payload dado.
    const signature = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("base64url");

    // 3. El token final es "payload.firma" — el cliente puede LEER el
    //    payload (no está encriptado, solo codificado), pero no puede
    //    MODIFICARLO sin invalidar la firma.
    return `${payload}.${signature}`;
}

/**
 * Extrae y valida el usuario a partir del token que viene en la petición.
 *
 * @param {object} req - Objeto request de Express.
 * @returns {object|null} Los datos del usuario ({id, rol, exp}) si el token
 *                         es válido y no ha expirado; null en cualquier otro caso.
 */
function readToken(req) {
    // 1. Busca el header "Authorization". El formato esperado es:
    //    "Authorization: Bearer <token>". Si no viene el header,
    //    se usa un string vacío para no romper el código de abajo.
    const header = req.headers.authorization || "";

    // 2. Si el header empieza con "Bearer ", extrae solo el token
    //    (todo lo que sigue después de esas 7 letras). Si no tiene
    //    ese prefijo, "token" queda vacío.
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";

    // 3. El token tiene formato "payload.firma" — se separa en sus
    //    dos partes usando el punto como delimitador.
    const [payload, signature] = token.split(".");

    // 4. Si falta cualquiera de las dos partes (token vacío, mal formado,
    //    o sin el punto), no hay nada que validar: se rechaza de una vez.
    if (!payload || !signature) return null;

    // 5. Vuelve a calcular la firma esperada para ESE payload, usando
    //    el mismo secreto y algoritmo que en createToken(). Si el token
    //    es legítimo, esta firma debe coincidir exactamente con la que
    //    vino en la petición.
    const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("base64url");

    // 6. Compara la firma recibida contra la esperada. Se usa
    //    timingSafeEqual() en vez de "===" para evitar ataques de
    //    "timing attack" (donde un atacante podría medir cuánto tarda
    //    la comparación para ir adivinando la firma letra por letra).
    //    Primero se comparan las longitudes por separado, porque
    //    timingSafeEqual() lanza error si los strings no miden igual.
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

    // 7. Si la firma es válida, decodifica el payload de vuelta a un
    //    objeto JS normal ({id, rol, exp}).
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));

    // 8. Última validación: revisa que el token no haya expirado ya
    //    (comparando el campo "exp" guardado contra la hora actual).
    //    Si expiró, se rechaza aunque la firma sea perfectamente válida.
    return data.exp > Date.now() ? data : null;
}

/**
 * Middleware de Express que protege una ruta: solo deja pasar si el
 * request trae un token válido y vigente.
 *
 * Uso: app.get("/api/algo", requireAuth, (req, res) => { ... })
 */
function requireAuth(req, res, next) {
    // Intenta leer y validar el token de la petición actual.
    const user = readToken(req);

    // Si no hay token, está mal formado, la firma no coincide, o ya
    // expiró: readToken() devuelve null y se corta la petición aquí
    // con un 401 (No autorizado), sin dejar que llegue a la ruta real.
    if (!user) return res.status(401).json({ mensaje: "Sesión no válida o expirada" });

    // Si el token es válido, se "cuelgan" sus datos (id, rol) en el
    // objeto req, para que cualquier ruta que use este middleware
    // después pueda acceder a req.user.id / req.user.rol sin tener
    // que volver a leer el token.
    req.user = user;

    // next() le da el paso a la siguiente función en la cadena
    // (el siguiente middleware, o la ruta final). Sin esta llamada,
    // la petición se quedaría "colgada" sin respuesta.
    next();
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!roles.includes(req.user.rol)) return res.status(403).json({ mensaje: "No tienes permiso para esta operación" });
        next();
    };
}

async function initializeAuth() {
    await query(`
        CREATE TABLE IF NOT EXISTS usuarios (
            usuario_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            nombre_completo VARCHAR(100) NOT NULL,
            correo VARCHAR(100) NOT NULL UNIQUE,
            clave_hash VARCHAR(150) NOT NULL,
            rol ENUM('paciente', 'medico', 'recepcionista', 'administrador') NOT NULL,
            paciente_id INT NULL,
            medico_id INT NULL,
            activo TINYINT(1) NOT NULL DEFAULT 1,
            fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await query("ALTER TABLE usuarios MODIFY clave_hash VARCHAR(200) NOT NULL");
    const lidPaciente = await query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'pacientes' AND COLUMN_NAME = 'whatsapp_lid'`
    );
    if (!lidPaciente.length) await query("ALTER TABLE pacientes ADD COLUMN whatsapp_lid VARCHAR(100) NULL UNIQUE AFTER telefono_whatsapp");
    const columnasCitas = await query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'citas' AND COLUMN_NAME = 'motivo'`
    );
    if (!columnasCitas.length) await query("ALTER TABLE citas ADD COLUMN motivo VARCHAR(255) NULL AFTER hora_cita");
    const recordatorioCita = await query(
        `SELECT COLUMN_NAME FROM information_schema.COLUMNS
         WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'citas' AND COLUMN_NAME = 'recordatorio_enviado'`
    );
    if (!recordatorioCita.length) await query("ALTER TABLE citas ADD COLUMN recordatorio_enviado TINYINT(1) NOT NULL DEFAULT 0 AFTER motivo");
    await query(`
        CREATE TABLE IF NOT EXISTS fichas_preconsulta (
            ficha_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            cita_id INT NOT NULL,
            paciente_id INT NOT NULL,
            sintomas TEXT NOT NULL,
            fecha_registro TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
            CONSTRAINT fichas_preconsulta_cita_fk FOREIGN KEY (cita_id) REFERENCES citas(cita_id) ON DELETE CASCADE,
            CONSTRAINT fichas_preconsulta_paciente_fk FOREIGN KEY (paciente_id) REFERENCES pacientes(paciente_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    await query(`
        CREATE TABLE IF NOT EXISTS recordatorios (
            recordatorio_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            cita_id INT NOT NULL,
            canal_envio ENUM('WhatsApp', 'SMS', 'Email') DEFAULT 'WhatsApp',
            fecha_envio DATETIME NULL,
            estado_entrega ENUM('Pendiente', 'Enviado', 'Entregado', 'Fallido') DEFAULT 'Pendiente',
            respuesta_paciente TINYINT(1) DEFAULT NULL,
            KEY recordatorios_cita_idx (cita_id),
            CONSTRAINT recordatorios_cita_fk FOREIGN KEY (cita_id) REFERENCES citas(cita_id) ON DELETE CASCADE
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);

    // Actualizar enum canal_envio para incluir WhatsApp+SMS (para pacientes alto riesgo)
    await query(`
        ALTER TABLE recordatorios MODIFY canal_envio ENUM('WhatsApp', 'SMS', 'Email', 'WhatsApp+SMS') DEFAULT 'WhatsApp'
    `).catch(() => {}); // Ignorar error si ya existe

    const demoUsers = [
        ["Paciente Demo", "paciente@clinicita.com", "paciente123", "paciente"],
        ["Médico Demo", "medico@clinicita.com", "medico123", "medico"],
        ["Recepción Demo", "recepcion@clinicita.com", "recepcion123", "recepcionista"],
        ["Administrador Demo", "admin@clinicita.com", "admin123", "administrador"]
    ];

    for (const [nombre, correo, clave, rol] of demoUsers) {
        const existing = await query("SELECT usuario_id, clave_hash FROM usuarios WHERE correo = ?", [correo]);
        if (!existing.length) {
            await query(
                "INSERT INTO usuarios (nombre_completo, correo, clave_hash, rol) VALUES (?, ?, ?, ?)",
                [nombre, correo, hashPassword(clave), rol]
            );
        } else if (existing[0].clave_hash.length < 161) {
            await query("UPDATE usuarios SET clave_hash = ? WHERE usuario_id = ?", [hashPassword(clave), existing[0].usuario_id]);
        }
    }

    await query(`
        UPDATE usuarios u
        JOIN pacientes p ON p.correo_electronico = u.correo
        SET u.paciente_id = p.paciente_id
        WHERE u.rol = 'paciente' AND u.paciente_id IS NULL
    `);
    await query(`
        UPDATE usuarios
        SET paciente_id = (SELECT MIN(paciente_id) FROM pacientes)
        WHERE correo = 'paciente@clinicita.com' AND paciente_id IS NULL
    `);
}

app.use(helmet());
console.log("DEBUG: helmet middleware registered");
app.use((req, res, next) => {
    console.log("DEBUG: helmet middleware hit for:", req.path);
    next();
});
app.use(cors({
    origin: process.env.CORS_ORIGIN || "http://localhost:3000",
    credentials: true
}));
console.log("DEBUG: cors middleware registered");
app.use((req, res, next) => {
    console.log("DEBUG: cors middleware hit for:", req.path);
    next();
});

// Rate limiting
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // máximo 5 intentos de login por IP
    message: { mensaje: "Demasiados intentos, intente más tarde" },
    standardHeaders: true,
    legacyHeaders: false
});

const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100, // máximo 100 requests por IP
    standardHeaders: true,
    legacyHeaders: false
});

app.use(express.json());
console.log("DEBUG: express.json middleware registered");
const fs = require('fs');
try {
    fs.writeFileSync(path.join(__dirname, 'startup.log'), `STARTUP: ${__dirname}\n`);
    console.log("DEBUG: startup.log written to:", path.join(__dirname, 'startup.log'));
} catch (e) {
    console.error("DEBUG: startup file write error:", e);
}
app.use(express.static(path.join(__dirname, "..", "public"), (req, res, next) => {
    console.log("DEBUG: express.static middleware hit for:", req.path);
    next();
}));
app.use("/api", apiLimiter, (req, res, next) => {
    const fs = require('fs');
    try {
        fs.appendFileSync(path.join(__dirname, 'debug.log'), `MIDDLEWARE: ${req.path} ${req.originalUrl}\n`);
    } catch (e) {
        console.error('File write error:', e);
    }
    console.log("DEBUG: /api middleware hit for:", req.path);
    res.set("Cache-Control", "no-store");
    next();
});

// Aplicar rate limiting estricto a endpoints de autenticación
app.post("/api/auth/login", authLimiter);
app.post("/api/auth/registro", authLimiter);

app.post("/api/auth/login", async (req, res) => {
    try {
        const { correo, clave, rol } = req.body;
        if (!correo || !clave || !ROLES.includes(rol)) {
            return res.status(400).json({ mensaje: "Correo, contraseña y rol son obligatorios" });
        }

        const users = await query(
            "SELECT usuario_id, nombre_completo, correo, clave_hash, rol FROM usuarios WHERE correo = ? AND rol = ? AND activo = 1",
            [correo.trim().toLowerCase(), rol]
        );
        const user = users[0];
        if (!user || !verifyPassword(clave, user.clave_hash)) {
            return res.status(401).json({ mensaje: "Correo, contraseña o rol incorrectos" });
        }

        res.json({
            mensaje: "Inicio de sesión correcto",
            token: createToken(user),
            usuario: { id: user.usuario_id, nombre: user.nombre_completo, correo: user.correo, rol: user.rol }
        });
    } catch (error) {
        console.error("Error en login:", error.message);
        res.status(500).json({ mensaje: "No fue posible iniciar sesión" });
    }
});

app.post("/api/auth/registro", async (req, res) => {
    const { nombres, apellidos, correo, clave, documento, telefono, habeas } = req.body;
    if (!nombres || !apellidos || !correo || !clave || !documento || !telefono || !habeas) {
        return res.status(400).json({ mensaje: "Completa todos los campos obligatorios" });
    }

    try {
        const email = correo.trim().toLowerCase();
        const existing = await query("SELECT usuario_id FROM usuarios WHERE correo = ?", [email]);
        if (existing.length) return res.status(409).json({ mensaje: "Ya existe una cuenta con ese correo" });

        const patientResult = await query(
            `INSERT INTO pacientes (nombre_completo, documento_id, telefono_whatsapp, correo_electronico, acepta_politica_datos)
             VALUES (?, ?, ?, ?, 1)`,
            [`${nombres.trim()} ${apellidos.trim()}`, documento.trim(), telefono.trim(), email]
        );
        await query(
            `INSERT INTO usuarios (nombre_completo, correo, clave_hash, rol, paciente_id)
             VALUES (?, ?, ?, 'paciente', ?)`,
            [`${nombres.trim()} ${apellidos.trim()}`, email, hashPassword(clave), patientResult.insertId]
        );
        res.status(201).json({ mensaje: "Cuenta creada correctamente", redireccion: "login.html" });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ mensaje: "El documento o correo ya está registrado" });
        console.error("Error en registro:", error.message);
        res.status(500).json({ mensaje: "No fue posible crear la cuenta" });
    }
});

app.get("/api/auth/me", requireAuth, async (req, res) => {
    const users = await query("SELECT usuario_id, nombre_completo, correo, rol FROM usuarios WHERE usuario_id = ? AND activo = 1", [req.user.id]);
    if (!users.length) return res.status(404).json({ mensaje: "Usuario no encontrado" });
    res.json({ usuario: { id: users[0].usuario_id, nombre: users[0].nombre_completo, correo: users[0].correo, rol: users[0].rol } });
});

app.get("/api/especialidades", requireAuth, requireRole("paciente", "recepcionista", "administrador"), async (req, res) => {
    const especialidades = await query("SELECT DISTINCT especialidad AS nombre FROM medicos WHERE especialidad <> '' ORDER BY especialidad");
    res.json({ especialidades });
});

app.get("/api/medicos", requireAuth, requireRole("paciente", "recepcionista", "administrador"), async (req, res) => {
    const filtros = [];
    let sql = "SELECT medico_id, nombre_completo, especialidad FROM medicos";
    if (req.query.especialidad) {
        sql += " WHERE especialidad = ?";
        filtros.push(req.query.especialidad);
    }
    sql += " ORDER BY nombre_completo";
    const medicos = await query(sql, filtros);
    res.json({ medicos });
});

app.get("/api/horarios", requireAuth, requireRole("paciente"), async (req, res) => {
    const { medico, fecha } = req.query;
    if (!medico || !fecha || Number.isNaN(Date.parse(fecha))) return res.status(400).json({ mensaje: "Médico y fecha son obligatorios" });

    const ocupadas = await query(
        "SELECT hora_cita FROM citas WHERE medico_id = ? AND fecha_cita = ? AND estado NOT IN ('Cancelada', 'No-Asistio')",
        [medico, fecha]
    );
    const ocupadasSet = new Set(ocupadas.map((cita) => String(cita.hora_cita).slice(0, 5)));
    const horasBase = ["08:00", "09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];
    res.json({ horarios: horasBase.filter((hora) => !ocupadasSet.has(hora)) });
});

app.post("/api/citas", requireAuth, requireRole("paciente"), async (req, res) => {
    const { medico_id, fecha, hora, motivo } = req.body;
    if (!medico_id || !fecha || !hora) return res.status(400).json({ mensaje: "Médico, fecha y hora son obligatorios" });
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(fecha)) || !/^\d{2}:\d{2}$/.test(String(hora))) {
        return res.status(400).json({ mensaje: "La fecha u hora no tienen un formato válido" });
    }
    if (motivo !== undefined && (typeof motivo !== "string" || motivo.trim().length > 255)) {
        return res.status(400).json({ mensaje: "El motivo no es válido" });
    }

    const fechaCita = new Date(`${fecha}T${hora}:00${process.env.CLINIC_UTC_OFFSET || "-05:00"}`);
    if (Number.isNaN(fechaCita.getTime()) || fechaCita <= new Date()) return res.status(400).json({ mensaje: "La fecha y hora deben ser futuras" });

    try {
        const users = await query("SELECT paciente_id FROM usuarios WHERE usuario_id = ? AND rol = 'paciente' AND activo = 1", [req.user.id]);
        const pacienteId = users[0]?.paciente_id;
        if (!pacienteId) return res.status(400).json({ mensaje: "El usuario no está asociado a un paciente" });

        const medicos = await query("SELECT medico_id FROM medicos WHERE medico_id = ?", [medico_id]);
        if (!medicos.length) return res.status(404).json({ mensaje: "El médico seleccionado no existe" });

        const conflictos = await query(
            "SELECT cita_id FROM citas WHERE medico_id = ? AND fecha_cita = ? AND hora_cita = ? AND estado NOT IN ('Cancelada', 'No-Asistio')",
            [medico_id, fecha, hora]
        );
        if (conflictos.length) return res.status(409).json({ mensaje: "Ese horario ya está ocupado" });

        const cita = await query(
            "INSERT INTO citas (paciente_id, medico_id, fecha_cita, hora_cita, motivo) VALUES (?, ?, ?, ?, ?)",
            [pacienteId, medico_id, fecha, hora, motivo?.trim() || null]
        );
        await query(`
            INSERT INTO recordatorios (cita_id, canal_envio, estado_entrega)
            SELECT ?, 'WhatsApp', 'Pendiente'
            WHERE NOT EXISTS (SELECT 1 FROM recordatorios WHERE cita_id = ?)
        `, [cita.insertId, cita.insertId]);
        res.status(201).json({ mensaje: "Cita solicitada correctamente", cita_id: cita.insertId });
    } catch (error) {
        console.error("Error al agendar cita:", error.message);
        res.status(500).json({ mensaje: "No fue posible agendar la cita" });
    }
});

app.get("/api/citas", requireAuth, requireRole("paciente"), async (req, res) => {
    const users = await query("SELECT paciente_id FROM usuarios WHERE usuario_id = ? AND rol = 'paciente' AND activo = 1", [req.user.id]);
    const pacienteId = users[0]?.paciente_id;
    if (!pacienteId) return res.status(400).json({ mensaje: "El usuario no está asociado a un paciente" });

    const citas = await query(`
        SELECT c.cita_id, DATE_FORMAT(c.fecha_cita, '%Y-%m-%d') AS fecha, TIME_FORMAT(c.hora_cita, '%H:%i') AS hora,
               m.nombre_completo AS medico, m.especialidad, c.estado, c.motivo
        FROM citas c
        JOIN medicos m ON m.medico_id = c.medico_id
        WHERE c.paciente_id = ?
        ORDER BY c.fecha_cita, c.hora_cita
    `, [pacienteId]);
    res.json({ citas });
});


app.delete("/api/citas/:id", requireAuth, requireRole("paciente"), async (req, res) => {
    const users = await query("SELECT paciente_id FROM usuarios WHERE usuario_id = ? AND rol = 'paciente' AND activo = 1", [req.user.id]); 
    const pacienteId = users[0]?.paciente_id;
    if (!pacienteId) return res.status(400).json({ mensaje: "El usuario no está asociado a un paciente" });
    // Verifica que la cita sea del paciente que hace la petición,
    // para que nadie pueda cancelar citas ajenas cambiando el id en la URL.
    const citaId = await query("SELECT cita_id FROM citas WHERE cita_id = ? AND paciente_id = ?", [req.params.id, pacienteId]);
    if (!citaId.length) return res.status(404).json({ mensaje: "Cita no encontrada o no pertenece al paciente" });

    await query("UPDATE citas SET estado = 'Cancelada' WHERE cita_id = ?", [req.params.id]);
    res.json({ mensaje: "Cita cancelada correctamente" });
})

/**
 * Cuenta las citas del paciente autenticado que tengan un estado
 * específico, indicado como parte de la URL (ej. /api/citas/Pendiente/count).
 *
 * Reemplaza a las rutas separadas /api/citas/pendientes/count y
 * /api/citas/canceladas/count con una sola ruta reutilizable para
 * cualquier estado válido de una cita.
 *
 */
app.get("/api/citas/:estado/count", requireAuth, requireRole("paciente"), async (req, res) => {
    // Lista blanca de los únicos valores permitidos para "estado".
    // Debe coincidir exactamente con el ENUM definido en la columna
    // citas.estado de la base de datos.
    const estadosValidos = ["Pendiente", "Confirmada", "Cancelada", "Completada", "No-Asistio"];

    // req.params.estado toma el valor de la URL en la posición ":estado".
    // Por ejemplo, en GET /api/citas/Pendiente/count, esto sería "Pendiente".
    const estado = req.params.estado;

    // Verifica que lo que llegó en la URL sea uno de los estados
    // permitidos. Esto es una medida de seguridad y de integridad:
    // sin esta validación, alguien podría mandar cualquier texto en
    // la URL (ej. /api/citas/loquesea/count) y aunque no rompería
    // nada grave aquí (la consulta simplemente no encontraría
    // coincidencias), sí sería una entrada no controlada llegando
    // directo a una consulta SQL.
    if (!estadosValidos.includes(estado)) return res.status(400).json({ mensaje: "Estado no válido" });

    // Traduce el usuario_id del token (req.user.id) al paciente_id
    // real, ya que la tabla "citas" se relaciona por paciente_id.
    const users = await query("SELECT paciente_id FROM usuarios WHERE usuario_id = ? AND rol = 'paciente' AND activo = 1", [req.user.id]);

    // Toma el paciente_id de la primera fila encontrada. El "?."
    // evita un error si "users" viniera vacío (usuario sin paciente
    // asociado, o desactivado) — en ese caso queda undefined en vez
    // de lanzar una excepción.
    const pacienteId = users[0]?.paciente_id;

    // Si no hay paciente asociado, corta la petición con un error
    // controlado (400) antes de intentar consultar citas con un
    // pacienteId inexistente.
    if (!pacienteId) return res.status(400).json({ mensaje: "El usuario no está asociado a un paciente" });

    // Cuenta cuántas citas de ESTE paciente tienen exactamente el
    // estado pedido. Como "estado" ya fue validado contra la lista
    // blanca de arriba, es seguro pasarlo como parámetro preparado
    // (el "?" en la consulta) sin riesgo de inyección SQL.
    const result = await query("SELECT COUNT(*) AS total_citas FROM citas WHERE paciente_id = ? AND estado = ?", [pacienteId, estado]);

    // El resultado de una consulta SQL siempre es un arreglo, aunque
    // sea un solo valor — por eso result[0].total_citas, en vez de
    // result.total_citas directamente.
    res.json({ total_citas: result[0].total_citas });
});

// ============================================================
// NUEVOS ENDPOINTS - FASE 1
// ============================================================

// -------------------- VALIDADORES ZOD --------------------
const schemas = {
    // Admin: Usuarios
    crearUsuario: z.object({
        nombre_completo: z.string().min(2).max(100),
        correo: z.string().email().max(100),
        clave: z.string().min(6).max(50),
        rol: z.enum(["paciente", "medico", "recepcionista", "administrador"]),
        paciente_id: z.number().int().positive().optional(),
        medico_id: z.number().int().positive().optional()
    }),
    actualizarUsuario: z.object({
        nombre_completo: z.string().min(2).max(100).optional(),
        correo: z.string().email().max(100).optional(),
        rol: z.enum(["paciente", "medico", "recepcionista", "administrador"]).optional(),
        activo: z.boolean().optional(),
        paciente_id: z.number().int().positive().nullable().optional(),
        medico_id: z.number().int().positive().nullable().optional()
    }),
    // Admin: Especialidades (se gestionan vía medicos)
    // Admin: Sedes
    crearSede: z.object({
        nombre: z.string().min(2).max(100),
        direccion: z.string().min(5).max(255),
        telefono: z.string().max(20).optional(),
        activa: z.boolean().optional()
    }),
    actualizarSede: z.object({
        nombre: z.string().min(2).max(100).optional(),
        direccion: z.string().min(5).max(255).optional(),
        telefono: z.string().max(20).optional().nullable(),
        activa: z.boolean().optional()
    }),
    // Admin: Horarios
    crearHorario: z.object({
        medico_id: z.number().int().positive(),
        sede_id: z.number().int().positive(),
        dia_semana: z.number().int().min(0).max(6),
        hora_inicio: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/),
        hora_fin: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/),
        duracion_slot: z.number().int().positive().max(120).default(30),
        activo: z.boolean().optional()
    }),
    actualizarHorario: z.object({
        medico_id: z.number().int().positive().optional(),
        sede_id: z.number().int().positive().optional(),
        dia_semana: z.number().int().min(0).max(6).optional(),
        hora_inicio: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).optional(),
        hora_fin: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$/).optional(),
        duracion_slot: z.number().int().positive().max(120).optional(),
        activo: z.boolean().optional()
    }),
    // Paciente: Reprogramar cita
    reprogramarCita: z.object({
        medico_id: z.number().int().positive().optional(),
        sede_id: z.number().int().positive().optional(),
        fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        hora: z.string().regex(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/),
        motivo_cambio: z.string().min(2).max(100),
        observaciones: z.string().max(500).optional()
    }),
    // Paciente: Perfil
    actualizarPerfil: z.object({
        nombres: z.string().min(1).max(50).optional(),
        apellidos: z.string().min(1).max(50).optional(),
        telefono: z.string().max(20).optional().nullable(),
        direccion: z.string().max(255).optional().nullable()
    }),
    // Auth: Recuperar contraseña
    recuperarClave: z.object({
        correo: z.string().email().max(100)
    }),
    resetClave: z.object({
        token: z.string().min(32).max(64),
        nueva_clave: z.string().min(6).max(50)
    }),
    // Recepcionista: Citas filtros
    filtrosCitas: z.object({
        fecha: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
        estado: z.enum(["Pendiente", "Confirmada", "Cancelada", "Completada", "No-Asistio"]).optional(),
        q: z.string().max(100).optional(),
        page: z.coerce.number().int().positive().default(1),
        limit: z.coerce.number().int().positive().max(100).default(20)
    }),
    // Recepcionista: Lista espera
    crearListaEspera: z.object({
        documento: z.string().min(5).max(20),
        especialidad_requerida: z.string().max(50).optional(),
        sede_id: z.number().int().positive().optional(),
        prioridad: z.enum(["Alta", "Media", "Baja"]).default("Media"),
        observaciones: z.string().max(500).optional()
    }),
    actualizarListaEspera: z.object({
        prioridad: z.enum(["Alta", "Media", "Baja"]).optional(),
        estado_espera: z.enum(["Activo", "Asignado", "Expirado"]).optional(),
        observaciones: z.string().max(500).optional().nullable()
    }),
    // Médico: Cambiar estado cita
    cambiarEstadoCita: z.object({
        estado: z.enum(["Confirmada", "Completada", "No-Asistio"])
    })
};

// Middleware de validación genérico
function validar(schema) {
    return (req, res, next) => {
        const resultado = schema.safeParse(req.body);
        if (!resultado.success) {
            const errores = resultado.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ");
            return res.status(400).json({ mensaje: "Datos inválidos", errores });
        }
        req.validated = resultado.data;
        next();
    };
}

// Validación de query params
function validarQuery(schema) {
    return (req, res, next) => {
        const resultado = schema.safeParse(req.query);
        if (!resultado.success) {
            const errores = resultado.error.errors.map(e => `${e.path.join(".")}: ${e.message}`).join("; ");
            return res.status(400).json({ mensaje: "Parámetros inválidos", errores });
        }
        req.validatedQuery = resultado.data;
        next();
    };
}

// -------------------- ADMIN: REPORTES --------------------
app.get("/api/reportes/resumen", requireAuth, requireRole("administrador"), async (req, res) => {
    try {
        const [
            totalUsuarios,
            citasMes,
            citasAusentismo,
            totalEspera
        ] = await Promise.all([
            query("SELECT COUNT(*) AS total FROM usuarios WHERE activo = 1"),
            query(`
                SELECT COUNT(*) AS total
                FROM citas
                WHERE fecha_cita >= DATE_FORMAT(NOW(), '%Y-%m-01')
                  AND fecha_cita < DATE_ADD(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL 1 MONTH)
            `),
            query(`
                SELECT
                    COUNT(*) AS total,
                    SUM(CASE WHEN estado = 'No-Asistio' THEN 1 ELSE 0 END) AS ausencias
                FROM citas
                WHERE fecha_cita >= DATE_FORMAT(NOW(), '%Y-%m-01')
                  AND fecha_cita < DATE_ADD(DATE_FORMAT(NOW(), '%Y-%m-01'), INTERVAL 1 MONTH)
            `),
            query("SELECT COUNT(*) AS total FROM lista_espera WHERE estado_espera = 'Activo'")
        ]);

        const ausentismo = citasAusentismo[0].total > 0
            ? Math.round((citasAusentismo[0].ausencias / citasAusentismo[0].total) * 100)
            : 0;

        res.json({
            usuarios: totalUsuarios[0].total,
            citas_mes: citasMes[0].total,
            ausentismo: `${ausentismo}%`,
            lista_espera: totalEspera[0].total
        });
    } catch (error) {
        console.error("Error en reporte resumen:", error.message);
        res.status(500).json({ mensaje: "No fue posible obtener el resumen" });
    }
});

// -------------------- ADMIN: USUARIOS --------------------
app.get("/api/usuarios", requireAuth, requireRole("administrador"), async (req, res) => {
    try {
        const { page = 1, limit = 20, rol, activo, q } = req.query;
        const offset = (page - 1) * limit;
        const filtros = [];
        let where = "WHERE 1=1";

        if (rol) { where += " AND rol = ?"; filtros.push(rol); }
        if (activo !== undefined) { where += " AND activo = ?"; filtros.push(activo === "true" ? 1 : 0); }
        if (q) { where += " AND (nombre_completo LIKE ? OR correo LIKE ?)"; filtros.push(`%${q}%`, `%${q}%`); }

        const [total, usuarios] = await Promise.all([
            query(`SELECT COUNT(*) AS total FROM usuarios ${where}`, filtros),
            query(`
                SELECT u.usuario_id, u.nombre_completo, u.correo, u.rol, u.activo, u.fecha_creacion,
                       p.nombre_completo AS paciente_nombre, p.documento_id,
                       m.nombre_completo AS medico_nombre, m.especialidad
                FROM usuarios u
                LEFT JOIN pacientes p ON p.paciente_id = u.paciente_id
                LEFT JOIN medicos m ON m.medico_id = u.medico_id
                ${where}
                ORDER BY u.fecha_creacion DESC
                LIMIT ? OFFSET ?
            `, [...filtros, Number(limit), offset])
        ]);

        res.json({ usuarios, total: total[0].total, page: Number(page), limit: Number(limit) });
    } catch (error) {
        console.error("Error listando usuarios:", error.message);
        res.status(500).json({ mensaje: "No fue posible listar usuarios" });
    }
});

app.post("/api/usuarios", requireAuth, requireRole("administrador"), validar(schemas.crearUsuario), async (req, res) => {
    try {
        const { nombre_completo, correo, clave, rol, paciente_id, medico_id } = req.validated;
        const email = correo.trim().toLowerCase();

        const existing = await query("SELECT usuario_id FROM usuarios WHERE correo = ?", [email]);
        if (existing.length) return res.status(409).json({ mensaje: "Ya existe un usuario con ese correo" });

        const result = await query(
            `INSERT INTO usuarios (nombre_completo, correo, clave_hash, rol, paciente_id, medico_id)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [nombre_completo.trim(), email, hashPassword(clave), rol, paciente_id || null, medico_id || null]
        );

        // Si es médico, crear registro en medicos si no existe
        if (rol === "medico" && medico_id) {
            await query("UPDATE medicos SET usuario_id = ? WHERE medico_id = ?", [result.insertId, medico_id]);
        }

        res.status(201).json({ mensaje: "Usuario creado correctamente", usuario_id: result.insertId });
    } catch (error) {
        if (error.code === "ER_DUP_ENTRY") return res.status(409).json({ mensaje: "El correo ya está registrado" });
        console.error("Error creando usuario:", error.message);
        res.status(500).json({ mensaje: "No fue posible crear el usuario" });
    }
});

app.put("/api/usuarios/:id", requireAuth, requireRole("administrador"), validar(schemas.actualizarUsuario), async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.validated;

        if (data.correo) {
            const existing = await query("SELECT usuario_id FROM usuarios WHERE correo = ? AND usuario_id <> ?", [data.correo, id]);
            if (existing.length) return res.status(409).json({ mensaje: "El correo ya está en uso" });
        }

        const campos = [];
        const valores = [];
        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined) {
                campos.push(`${key} = ?`);
                valores.push(value);
            }
        }
        if (!campos.length) return res.status(400).json({ mensaje: "No hay datos para actualizar" });

        valores.push(id);
        await query(`UPDATE usuarios SET ${campos.join(", ")} WHERE usuario_id = ?`, valores);

        // Sincronizar medico_id en tabla medicos si cambió
        if (data.medico_id !== undefined) {
            await query("UPDATE medicos SET usuario_id = NULL WHERE usuario_id = ?", [id]);
            if (data.medico_id) {
                await query("UPDATE medicos SET usuario_id = ? WHERE medico_id = ?", [id, data.medico_id]);
            }
        }

        res.json({ mensaje: "Usuario actualizado correctamente" });
    } catch (error) {
        console.error("Error actualizando usuario:", error.message);
        res.status(500).json({ mensaje: "No fue posible actualizar el usuario" });
    }
});

app.delete("/api/usuarios/:id", requireAuth, requireRole("administrador"), async (req, res) => {
    try {
        const { id } = req.params;
        // No permitir auto-eliminación
        if (Number(id) === req.user.id) {
            return res.status(400).json({ mensaje: "No puede eliminarse a sí mismo" });
        }
        await query("UPDATE usuarios SET activo = 0 WHERE usuario_id = ?", [id]);
        res.json({ mensaje: "Usuario desactivado correctamente" });
    } catch (error) {
        console.error("Error desactivando usuario:", error.message);
        res.status(500).json({ mensaje: "No fue posible desactivar el usuario" });
    }
});

// -------------------- ADMIN: SEDES --------------------
app.get("/api/sedes", requireAuth, requireRole("administrador", "recepcionista", "medico", "paciente"), async (req, res) => {
    try {
        const sedes = await query("SELECT sede_id, nombre, direccion, telefono, activa FROM sedes WHERE activa = 1 ORDER BY nombre");
        res.json({ sedes });
    } catch (error) {
        console.error("Error listando sedes:", error.message);
        res.status(500).json({ mensaje: "No fue posible listar sedes" });
    }
});

app.post("/api/sedes", requireAuth, requireRole("administrador"), validar(schemas.crearSede), async (req, res) => {
    try {
        const { nombre, direccion, telefono, activa } = req.validated;
        const result = await query(
            "INSERT INTO sedes (nombre, direccion, telefono, activa) VALUES (?, ?, ?, ?)",
            [nombre.trim(), direccion.trim(), telefono?.trim() || null, activa !== false ? 1 : 0]
        );
        res.status(201).json({ mensaje: "Sede creada correctamente", sede_id: result.insertId });
    } catch (error) {
        console.error("Error creando sede:", error.message);
        res.status(500).json({ mensaje: "No fue posible crear la sede" });
    }
});

app.put("/api/sedes/:id", requireAuth, requireRole("administrador"), validar(schemas.actualizarSede), async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.validated;
        const campos = [];
        const valores = [];
        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined) {
                campos.push(`${key} = ?`);
                valores.push(value);
            }
        }
        if (!campos.length) return res.status(400).json({ mensaje: "No hay datos para actualizar" });
        valores.push(id);
        await query(`UPDATE sedes SET ${campos.join(", ")} WHERE sede_id = ?`, valores);
        res.json({ mensaje: "Sede actualizada correctamente" });
    } catch (error) {
        console.error("Error actualizando sede:", error.message);
        res.status(500).json({ mensaje: "No fue posible actualizar la sede" });
    }
});

app.delete("/api/sedes/:id", requireAuth, requireRole("administrador"), async (req, res) => {
    try {
        const { id } = req.params;
        // Verificar si tiene citas o médicos asociados
        const [citas, medicos] = await Promise.all([
            query("SELECT COUNT(*) AS total FROM citas WHERE sede_id = ?", [id]),
            query("SELECT COUNT(*) AS total FROM horarios WHERE sede_id = ?", [id])
        ]);
        if (citas[0].total > 0 || medicos[0].total > 0) {
            return res.status(409).json({ mensaje: "No se puede eliminar: tiene citas o horarios asociados. Desactive la sede en su lugar." });
        }
        await query("DELETE FROM sedes WHERE sede_id = ?", [id]);
        res.json({ mensaje: "Sede eliminada correctamente" });
    } catch (error) {
        console.error("Error eliminando sede:", error.message);
        res.status(500).json({ mensaje: "No fue posible eliminar la sede" });
    }
});

// -------------------- ADMIN: HORARIOS --------------------
app.get("/api/horarios/admin", requireAuth, requireRole("administrador", "recepcionista", "medico"), async (req, res) => {
    try {
        const { medico_id, sede_id, dia_semana } = req.query;
        const filtros = [];
        let where = "WHERE h.activo = 1";

        if (medico_id) { where += " AND h.medico_id = ?"; filtros.push(medico_id); }
        if (sede_id) { where += " AND h.sede_id = ?"; filtros.push(sede_id); }
        if (dia_semana !== undefined) { where += " AND h.dia_semana = ?"; filtros.push(dia_semana); }

        const horarios = await query(`
            SELECT h.horario_id, h.medico_id, h.sede_id, h.dia_semana, h.hora_inicio, h.hora_fin,
                   h.duracion_slot, h.activo,
                   m.nombre_completo AS medico_nombre, m.especialidad,
                   s.nombre AS sede_nombre
            FROM horarios h
            JOIN medicos m ON m.medico_id = h.medico_id
            JOIN sedes s ON s.sede_id = h.sede_id
            ${where}
            ORDER BY m.nombre_completo, h.dia_semana, h.hora_inicio
        `, filtros);

        res.json({ horarios });
    } catch (error) {
        console.error("Error listando horarios:", error.message);
        res.status(500).json({ mensaje: "No fue posible listar horarios" });
    }
});

app.post("/api/horarios/admin", requireAuth, requireRole("administrador"), validar(schemas.crearHorario), async (req, res) => {
    try {
        const { medico_id, sede_id, dia_semana, hora_inicio, hora_fin, duracion_slot, activo } = req.validated;

        if (hora_inicio >= hora_fin) {
            return res.status(400).json({ mensaje: "La hora de inicio debe ser anterior a la hora de fin" });
        }

        const existing = await query(
            "SELECT horario_id FROM horarios WHERE medico_id = ? AND sede_id = ? AND dia_semana = ? AND hora_inicio = ? AND hora_fin = ?",
            [medico_id, sede_id, dia_semana, hora_inicio, hora_fin]
        );
        if (existing.length) return res.status(409).json({ mensaje: "Ya existe un horario idéntico para este médico/sede/día" });

        const result = await query(
            `INSERT INTO horarios (medico_id, sede_id, dia_semana, hora_inicio, hora_fin, duracion_slot, activo)
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [medico_id, sede_id, dia_semana, hora_inicio, hora_fin, duracion_slot || 30, activo !== false ? 1 : 0]
        );
        res.status(201).json({ mensaje: "Horario creado correctamente", horario_id: result.insertId });
    } catch (error) {
        console.error("Error creando horario:", error.message);
        res.status(500).json({ mensaje: "No fue posible crear el horario" });
    }
});

app.put("/api/horarios/admin/:id", requireAuth, requireRole("administrador"), validar(schemas.actualizarHorario), async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.validated;

        if (data.hora_inicio && data.hora_fin && data.hora_inicio >= data.hora_fin) {
            return res.status(400).json({ mensaje: "La hora de inicio debe ser anterior a la hora de fin" });
        }

        const campos = [];
        const valores = [];
        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined) {
                campos.push(`${key} = ?`);
                valores.push(value);
            }
        }
        if (!campos.length) return res.status(400).json({ mensaje: "No hay datos para actualizar" });
        valores.push(id);
        await query(`UPDATE horarios SET ${campos.join(", ")} WHERE horario_id = ?`, valores);
        res.json({ mensaje: "Horario actualizado correctamente" });
    } catch (error) {
        console.error("Error actualizando horario:", error.message);
        res.status(500).json({ mensaje: "No fue posible actualizar el horario" });
    }
});

app.delete("/api/horarios/admin/:id", requireAuth, requireRole("administrador"), async (req, res) => {
    try {
        const { id } = req.params;
        await query("DELETE FROM horarios WHERE horario_id = ?", [id]);
        res.json({ mensaje: "Horario eliminado correctamente" });
    } catch (error) {
        console.error("Error eliminando horario:", error.message);
        res.status(500).json({ mensaje: "No fue posible eliminar el horario" });
    }
});

// -------------------- PACIENTE: REPROGRAMAR CITA --------------------
app.put("/api/citas/:id/reprogramar", requireAuth, requireRole("paciente"), validar(schemas.reprogramarCita), async (req, res) => {
    try {
        const { id } = req.params;
        const { medico_id, sede_id, fecha, hora, motivo_cambio, observaciones } = req.validated;

        // Verificar que la cita pertenece al paciente
        const users = await query("SELECT paciente_id FROM usuarios WHERE usuario_id = ? AND rol = 'paciente' AND activo = 1", [req.user.id]);
        const pacienteId = users[0]?.paciente_id;
        if (!pacienteId) return res.status(400).json({ mensaje: "El usuario no está asociado a un paciente" });

        const cita = await query("SELECT cita_id, estado, fecha_cita, hora_cita, medico_id, sede_id FROM citas WHERE cita_id = ? AND paciente_id = ?", [id, pacienteId]);
        if (!cita.length) return res.status(404).json({ mensaje: "Cita no encontrada" });
        if (!["Pendiente", "Confirmada"].includes(cita[0].estado)) {
            return res.status(400).json({ mensaje: "Solo se pueden reprogramar citas pendientes o confirmadas" });
        }

        // Validar fecha futura
        const nuevaFechaCita = new Date(`${fecha}T${hora}:00${process.env.CLINIC_UTC_OFFSET || "-05:00"}`);
        if (Number.isNaN(nuevaFechaCita.getTime()) || nuevaFechaCita <= new Date()) {
            return res.status(400).json({ mensaje: "La nueva fecha y hora deben ser futuras" });
        }

        // Verificar médico si se proporciona
        const medicoId = medico_id || cita[0].medico_id;
        if (medico_id) {
            const medicos = await query("SELECT medico_id FROM medicos WHERE medico_id = ? AND activo = 1", [medico_id]);
            if (!medicos.length) return res.status(404).json({ mensaje: "El médico seleccionado no existe" });
        }

        // Verificar sede si se proporciona
        const sedeId = sede_id !== undefined ? sede_id : cita[0].sede_id;
        if (sede_id !== undefined) {
            const sedes = await query("SELECT sede_id FROM sedes WHERE sede_id = ? AND activa = 1", [sede_id]);
            if (!sedes.length) return res.status(404).json({ mensaje: "La sede seleccionada no existe" });
        }

        // Verificar conflicto de horario
        const conflictos = await query(
            "SELECT cita_id FROM citas WHERE medico_id = ? AND fecha_cita = ? AND hora_cita = ? AND estado NOT IN ('Cancelada', 'No-Asistio') AND cita_id <> ?",
            [medicoId, fecha, hora, id]
        );
        if (conflictos.length) return res.status(409).json({ mensaje: "Ese horario ya está ocupado para el médico seleccionado" });

        // Actualizar cita
        await query(
            `UPDATE citas SET medico_id = ?, sede_id = ?, fecha_cita = ?, hora_cita = ?, motivo = CONCAT(COALESCE(motivo, ''), ' | Reprogramada: ', ?, ' - ', ?) WHERE cita_id = ?`,
            [medicoId, sedeId, fecha, hora, motivo_cambio, observaciones || "", id]
        );

        // Resetear recordatorio
        await query("UPDATE citas SET recordatorio_enviado = 0 WHERE cita_id = ?", [id]);
        await query("UPDATE recordatorios SET estado_entrega = 'Pendiente', fecha_envio = NULL WHERE cita_id = ?", [id]);

        res.json({ mensaje: "Cita reprogramada correctamente" });
    } catch (error) {
        console.error("Error reprogramando cita:", error.message);
        res.status(500).json({ mensaje: "No fue posible reprogramar la cita" });
    }
});

// -------------------- PACIENTE: PERFIL --------------------
app.get("/api/usuarios/me", requireAuth, async (req, res) => {
    try {
        const users = await query(`
            SELECT u.usuario_id, u.nombre_completo, u.correo, u.rol, u.paciente_id, u.medico_id,
                   p.documento_id, p.telefono_whatsapp, p.direccion, p.fecha_nacimiento, p.genero, p.correo_electronico
            FROM usuarios u
            LEFT JOIN pacientes p ON p.paciente_id = u.paciente_id
            WHERE u.usuario_id = ? AND u.activo = 1
        `, [req.user.id]);
        if (!users.length) return res.status(404).json({ mensaje: "Usuario no encontrado" });
        res.json({ usuario: users[0] });
    } catch (error) {
        console.error("Error obteniendo perfil:", error.message);
        res.status(500).json({ mensaje: "No fue posible obtener el perfil" });
    }
});

app.put("/api/usuarios/me", requireAuth, validar(schemas.actualizarPerfil), async (req, res) => {
    try {
        const { nombres, apellidos, telefono, direccion } = req.validated;
        const users = await query("SELECT paciente_id FROM usuarios WHERE usuario_id = ? AND activo = 1", [req.user.id]);
        const pacienteId = users[0]?.paciente_id;

        if (pacienteId) {
            const campos = [];
            const valores = [];
            if (nombres || apellidos) {
                const nombreCompleto = `${nombres || ""} ${apellidos || ""}`.trim();
                if (nombreCompleto) {
                    campos.push("nombre_completo = ?");
                    valores.push(nombreCompleto);
                    // Actualizar también en usuarios
                    await query("UPDATE usuarios SET nombre_completo = ? WHERE usuario_id = ?", [nombreCompleto, req.user.id]);
                }
            }
            if (telefono !== undefined) { campos.push("telefono_whatsapp = ?"); valores.push(telefono); }
            if (direccion !== undefined) { campos.push("direccion = ?"); valores.push(direccion); }
            if (campos.length) {
                valores.push(pacienteId);
                await query(`UPDATE pacientes SET ${campos.join(", ")} WHERE paciente_id = ?`, valores);
            }
        }

        res.json({ mensaje: "Perfil actualizado correctamente" });
    } catch (error) {
        console.error("Error actualizando perfil:", error.message);
        res.status(500).json({ mensaje: "No fue posible actualizar el perfil" });
    }
});

// -------------------- AUTH: RECUPERAR CONTRASEÑA --------------------
app.post("/api/auth/recuperar", authLimiter, validar(schemas.recuperarClave), async (req, res) => {
    try {
        const { correo } = req.validated;
        const users = await query("SELECT usuario_id FROM usuarios WHERE correo = ? AND activo = 1", [correo.trim().toLowerCase()]);

        // Siempre responder éxito para no revelar si el correo existe
        if (!users.length) {
            return res.json({ mensaje: "Si el correo existe, recibirá instrucciones para restablecer su contraseña" });
        }

        const usuarioId = users[0].usuario_id;
        const token = crypto.randomBytes(32).toString("hex");
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
        const expiraEn = new Date(Date.now() + 60 * 60 * 1000); // 1 hora

        await query(
            "INSERT INTO tokens_recuperacion (usuario_id, token_hash, expira_en) VALUES (?, ?, ?)",
            [usuarioId, tokenHash, expiraEn]
        );

        // TODO: Enviar email con el token (en desarrollo solo log)
        console.log(`[DEV] Token de recuperación para ${correo}: ${token}`);
        console.log(`[DEV] Link: http://localhost:3000/pages/recuperar.html?token=${token}`);

        res.json({ mensaje: "Si el correo existe, recibirá instrucciones para restablecer su contraseña" });
    } catch (error) {
        console.error("Error en recuperar contraseña:", error.message);
        res.status(500).json({ mensaje: "No fue posible procesar la solicitud" });
    }
});

app.post("/api/auth/reset", authLimiter, validar(schemas.resetClave), async (req, res) => {
    try {
        const { token, nueva_clave } = req.validated;
        const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

        const tokens = await query(
            "SELECT token_id, usuario_id FROM tokens_recuperacion WHERE token_hash = ? AND expira_en > NOW() AND usado = 0",
            [tokenHash]
        );
        if (!tokens.length) return res.status(400).json({ mensaje: "Token inválido o expirado" });

        await query("UPDATE usuarios SET clave_hash = ? WHERE usuario_id = ?", [hashPassword(nueva_clave), tokens[0].usuario_id]);
        await query("UPDATE tokens_recuperacion SET usado = 1 WHERE token_id = ?", [tokens[0].token_id]);

        res.json({ mensaje: "Contraseña restablecida correctamente" });
    } catch (error) {
        console.error("Error restableciendo contraseña:", error.message);
        res.status(500).json({ mensaje: "No fue posible restablecer la contraseña" });
    }
});

// -------------------- RECEPCIONISTA/ADMIN: CITAS CON FILTROS --------------------
app.get("/api/citas/admin", requireAuth, requireRole("recepcionista", "administrador"), validarQuery(schemas.filtrosCitas), async (req, res) => {
    try {
        const { fecha, estado, q, page, limit } = req.validatedQuery;
        const offset = (page - 1) * limit;
        const filtros = [];
        let where = "WHERE 1=1";

        if (fecha) { where += " AND c.fecha_cita = ?"; filtros.push(fecha); }
        if (estado) { where += " AND c.estado = ?"; filtros.push(estado); }
        if (q) { where += " AND (p.nombre_completo LIKE ? OR p.documento_id LIKE ?)"; filtros.push(`%${q}%`, `%${q}%`); }

        const [total, citas] = await Promise.all([
            query(`
                SELECT COUNT(*) AS total
                FROM citas c
                JOIN pacientes p ON p.paciente_id = c.paciente_id
                ${where}
            `, filtros),
            query(`
                SELECT c.cita_id, DATE_FORMAT(c.fecha_cita, '%Y-%m-%d') AS fecha, TIME_FORMAT(c.hora_cita, '%H:%i') AS hora,
                       p.nombre_completo AS paciente, p.documento_id, p.telefono_whatsapp,
                       m.nombre_completo AS medico, m.especialidad,
                       s.nombre AS sede, c.estado, c.motivo, c.fecha_creacion
                FROM citas c
                JOIN pacientes p ON p.paciente_id = c.paciente_id
                JOIN medicos m ON m.medico_id = c.medico_id
                LEFT JOIN sedes s ON s.sede_id = c.sede_id
                ${where}
                ORDER BY c.fecha_cita DESC, c.hora_cita DESC
                LIMIT ? OFFSET ?
            `, [...filtros, limit, offset])
        ]);

        res.json({ citas, total: total[0].total, page, limit });
    } catch (error) {
        console.error("Error listando citas (recepcionista):", error.message);
        res.status(500).json({ mensaje: "No fue posible listar las citas" });
    }
});

app.put("/api/citas/admin/:id", requireAuth, requireRole("recepcionista", "administrador"), async (req, res) => {
    try {
        const { id } = req.params;
        const { medico_id, sede_id, fecha, hora, estado, motivo } = req.body;

        const cita = await query("SELECT cita_id FROM citas WHERE cita_id = ?", [id]);
        if (!cita.length) return res.status(404).json({ mensaje: "Cita no encontrada" });

        const campos = [];
        const valores = [];

        if (medico_id) {
            const medicos = await query("SELECT medico_id FROM medicos WHERE medico_id = ? AND activo = 1", [medico_id]);
            if (!medicos.length) return res.status(404).json({ mensaje: "Médico no encontrado" });
            campos.push("medico_id = ?"); valores.push(medico_id);
        }
        if (sede_id !== undefined) {
            if (sede_id) {
                const sedes = await query("SELECT sede_id FROM sedes WHERE sede_id = ? AND activa = 1", [sede_id]);
                if (!sedes.length) return res.status(404).json({ mensaje: "Sede no encontrada" });
            }
            campos.push("sede_id = ?"); valores.push(sede_id || null);
        }
        if (fecha) { campos.push("fecha_cita = ?"); valores.push(fecha); }
        if (hora) { campos.push("hora_cita = ?"); valores.push(hora); }
        if (estado) { campos.push("estado = ?"); valores.push(estado); }
        if (motivo !== undefined) { campos.push("motivo = ?"); valores.push(motivo); }

        if (!campos.length) return res.status(400).json({ mensaje: "No hay datos para actualizar" });

        // Verificar conflictos si cambian médico/fecha/hora
        if (medico_id || fecha || hora) {
            const actual = await query("SELECT medico_id, fecha_cita, hora_cita FROM citas WHERE cita_id = ?", [id]);
            const mId = medico_id || actual[0].medico_id;
            const f = fecha || actual[0].fecha_cita;
            const h = hora || actual[0].hora_cita;
            const conflictos = await query(
                "SELECT cita_id FROM citas WHERE medico_id = ? AND fecha_cita = ? AND hora_cita = ? AND estado NOT IN ('Cancelada', 'No-Asistio') AND cita_id <> ?",
                [mId, f, h, id]
            );
            if (conflictos.length) return res.status(409).json({ mensaje: "Ese horario ya está ocupado" });
        }

        valores.push(id);
        await query(`UPDATE citas SET ${campos.join(", ")} WHERE cita_id = ?`, valores);

        // Si se cambió fecha/hora, resetear recordatorio
        if (fecha || hora) {
            await query("UPDATE citas SET recordatorio_enviado = 0 WHERE cita_id = ?", [id]);
            await query("UPDATE recordatorios SET estado_entrega = 'Pendiente', fecha_envio = NULL WHERE cita_id = ?", [id]);
        }

        res.json({ mensaje: "Cita actualizada correctamente" });
    } catch (error) {
        console.error("Error actualizando cita (recepcionista):", error.message);
        res.status(500).json({ mensaje: "No fue posible actualizar la cita" });
    }
});

// -------------------- RECEPCIONISTA: LISTA DE ESPERA --------------------
app.get("/api/lista-espera", requireAuth, requireRole("recepcionista", "administrador"), async (req, res) => {
    try {
        const { estado, especialidad, page = 1, limit = 20 } = req.query;
        const offset = (page - 1) * limit;
        const filtros = [];
        let where = "WHERE 1=1";

        if (estado) { where += " AND le.estado_espera = ?"; filtros.push(estado); }
        if (especialidad) { where += " AND le.especialidad_requerida = ?"; filtros.push(especialidad); }

        const [total, espera] = await Promise.all([
            query(`SELECT COUNT(*) AS total FROM lista_espera le ${where}`, filtros),
            query(`
                SELECT le.espera_id, le.paciente_id, le.especialidad_requerida, le.sede_id,
                       le.fecha_inscripcion, le.prioridad, le.estado_espera, le.observaciones,
                       p.nombre_completo, p.documento_id, p.telefono_whatsapp,
                       s.nombre AS sede_nombre
                FROM lista_espera le
                JOIN pacientes p ON p.paciente_id = le.paciente_id
                LEFT JOIN sedes s ON s.sede_id = le.sede_id
                ${where}
                ORDER BY FIELD(le.prioridad, 'Alta', 'Media', 'Baja'), le.fecha_inscripcion
                LIMIT ? OFFSET ?
            `, [...filtros, Number(limit), offset])
        ]);

        res.json({ lista_espera: espera, total: total[0].total, page: Number(page), limit: Number(limit) });
    } catch (error) {
        console.error("Error listando lista de espera:", error.message);
        res.status(500).json({ mensaje: "No fue posible listar la lista de espera" });
    }
});

app.post("/api/lista-espera", requireAuth, requireRole("recepcionista", "administrador"), validar(schemas.crearListaEspera), async (req, res) => {
    try {
        const { documento, especialidad_requerida, sede_id, prioridad, observaciones } = req.validated;

        // Buscar paciente por documento
        const pacientes = await query("SELECT paciente_id, nombre_completo FROM pacientes WHERE documento_id = ?", [documento.trim()]);
        if (!pacientes.length) return res.status(404).json({ mensaje: "Paciente no encontrado con ese documento" });

        const pacienteId = pacientes[0].paciente_id;

        // Verificar si ya está en lista de espera activa para esa especialidad
        const existente = await query(
            "SELECT espera_id FROM lista_espera WHERE paciente_id = ? AND estado_espera = 'Activo' AND (especialidad_requerida = ? OR (especialidad_requerida IS NULL AND ? IS NULL))",
            [pacienteId, especialidad_requerida || null, especialidad_requerida || null]
        );
        if (existente.length) return res.status(409).json({ mensaje: "El paciente ya está en lista de espera para esa especialidad" });

        const result = await query(
            `INSERT INTO lista_espera (paciente_id, especialidad_requerida, sede_id, prioridad, estado_espera, observaciones)
             VALUES (?, ?, ?, ?, 'Activo', ?)`,
            [pacienteId, especialidad_requerida?.trim() || null, sede_id || null, prioridad, observaciones?.trim() || null]
        );

        res.status(201).json({ mensaje: "Paciente inscrito en lista de espera", espera_id: result.insertId });
    } catch (error) {
        console.error("Error inscribiendo en lista de espera:", error.message);
        res.status(500).json({ mensaje: "No fue posible inscribir en lista de espera" });
    }
});

app.put("/api/lista-espera/:id", requireAuth, requireRole("recepcionista", "administrador"), validar(schemas.actualizarListaEspera), async (req, res) => {
    try {
        const { id } = req.params;
        const data = req.validated;

        const campos = [];
        const valores = [];
        for (const [key, value] of Object.entries(data)) {
            if (value !== undefined) {
                campos.push(`${key} = ?`);
                valores.push(value);
            }
        }
        if (!campos.length) return res.status(400).json({ mensaje: "No hay datos para actualizar" });

        valores.push(id);
        await query(`UPDATE lista_espera SET ${campos.join(", ")} WHERE espera_id = ?`, valores);
        res.json({ mensaje: "Lista de espera actualizada correctamente" });
    } catch (error) {
        console.error("Error actualizando lista de espera:", error.message);
        res.status(500).json({ mensaje: "No fue posible actualizar la lista de espera" });
    }
});

app.delete("/api/lista-espera/:id", requireAuth, requireRole("recepcionista", "administrador"), async (req, res) => {
    try {
        const { id } = req.params;
        await query("DELETE FROM lista_espera WHERE espera_id = ?", [id]);
        res.json({ mensaje: "Entrada de lista de espera eliminada correctamente" });
    } catch (error) {
        console.error("Error eliminando lista de espera:", error.message);
        res.status(500).json({ mensaje: "No fue posible eliminar la entrada" });
    }
});

// -------------------- MÉDICO: AGENDA --------------------
app.get("/api/citas/medico", requireAuth, requireRole("medico"), async (req, res) => {
    try {
        const { fecha } = req.query;
        if (!fecha || Number.isNaN(Date.parse(fecha))) {
            return res.status(400).json({ mensaje: "Fecha es obligatoria" });
        }

        // Obtener medico_id del usuario logueado
        const users = await query("SELECT medico_id FROM usuarios WHERE usuario_id = ? AND rol = 'medico' AND activo = 1", [req.user.id]);
        const medicoId = users[0]?.medico_id;
        if (!medicoId) return res.status(400).json({ mensaje: "El usuario no está asociado a un médico" });

        const citas = await query(`
            SELECT c.cita_id, TIME_FORMAT(c.hora_cita, '%H:%i') AS hora,
                   p.nombre_completo AS paciente, p.documento_id,
                   c.motivo, c.estado,
                   s.nombre AS sede
            FROM citas c
            JOIN pacientes p ON p.paciente_id = c.paciente_id
            LEFT JOIN sedes s ON s.sede_id = c.sede_id
            WHERE c.medico_id = ? AND c.fecha_cita = ?
            ORDER BY c.hora_cita
        `, [medicoId, fecha]);

        // Contar KPIs
        const [confirmadas, pendientes, canceladas, atendidas] = await Promise.all([
            query("SELECT COUNT(*) AS total FROM citas WHERE medico_id = ? AND fecha_cita = ? AND estado = 'Confirmada'", [medicoId, fecha]),
            query("SELECT COUNT(*) AS total FROM citas WHERE medico_id = ? AND fecha_cita = ? AND estado = 'Pendiente'", [medicoId, fecha]),
            query("SELECT COUNT(*) AS total FROM citas WHERE medico_id = ? AND fecha_cita = ? AND estado = 'Cancelada'", [medicoId, fecha]),
            query("SELECT COUNT(*) AS total FROM citas WHERE medico_id = ? AND fecha_cita = ? AND estado = 'Completada'", [medicoId, fecha])
        ]);

        res.json({
            citas,
            kpis: {
                confirmadas: confirmadas[0].total,
                pendientes: pendientes[0].total,
                canceladas: canceladas[0].total,
                atendidas: atendidas[0].total
            }
        });
    } catch (error) {
        console.error("Error obteniendo agenda médica:", error.message);
        res.status(500).json({ mensaje: "No fue posible obtener la agenda" });
    }
});

app.put("/api/citas/:id/estado", requireAuth, requireRole("medico", "recepcionista", "administrador"), validar(schemas.cambiarEstadoCita), async (req, res) => {
    try {
        const { id } = req.params;
        const { estado } = req.validated;

        // Verificar permisos: médico solo puede modificar sus citas
        if (req.user.rol === "medico") {
            const users = await query("SELECT medico_id FROM usuarios WHERE usuario_id = ? AND rol = 'medico' AND activo = 1", [req.user.id]);
            const medicoId = users[0]?.medico_id;
            if (!medicoId) return res.status(400).json({ mensaje: "Usuario no asociado a médico" });

            const cita = await query("SELECT cita_id FROM citas WHERE cita_id = ? AND medico_id = ?", [id, medicoId]);
            if (!cita.length) return res.status(404).json({ mensaje: "Cita no encontrada o no pertenece a este médico" });
        }

        const estadosValidos = ["Confirmada", "Completada", "No-Asistio"];
        if (!estadosValidos.includes(estado)) return res.status(400).json({ mensaje: "Estado no válido" });

        await query("UPDATE citas SET estado = ? WHERE cita_id = ?", [estado, id]);
        res.json({ mensaje: `Cita marcada como ${estado}` });
    } catch (error) {
        console.error("Error cambiando estado de cita:", error.message);
        res.status(500).json({ mensaje: "No fue posible cambiar el estado de la cita" });
    }
});

// ============================================================
// ML: SCORE DE RIESGO NO-SHOW (FASE 1.6)
// ============================================================

// Paciente: ver su propio riesgo
app.get("/api/pacientes/me/riesgo", requireAuth, requireRole("paciente"), async (req, res) => {
    try {
        const users = await query("SELECT paciente_id FROM usuarios WHERE usuario_id = ?", [req.user.id]);
        const pacienteId = users[0]?.paciente_id;
        if (!pacienteId) return res.status(400).json({ mensaje: "Sin paciente asociado" });

        const riesgo = await mlClient.getRiesgo(pacienteId);
        res.json({ riesgo });
    } catch (error) {
        console.error("Error obteniendo riesgo:", error.message);
        res.status(500).json({ mensaje: "No fue posible obtener el riesgo" });
    }
});

// Admin/Recepcionista/Médico: ver riesgo de cualquier paciente
app.get("/api/pacientes/:id/riesgo", requireAuth, requireRole("administrador", "recepcionista", "medico"), async (req, res) => {
    try {
        const riesgo = await mlClient.getRiesgo(Number(req.params.id));
        res.json({ riesgo });
    } catch (error) {
        console.error("Error obteniendo riesgo:", error.message);
        res.status(500).json({ mensaje: "No fue posible obtener el riesgo" });
    }
});

// Batch para dashboard recepcionista (colorear filas)
app.post("/api/pacientes/riesgo/batch", requireAuth, requireRole("administrador", "recepcionista"), async (req, res) => {
    try {
        const { paciente_ids } = req.body;
        if (!Array.isArray(paciente_ids) || paciente_ids.length > 100) {
            return res.status(400).json({ mensaje: "Máximo 100 IDs por petición" });
        }
        const riesgos = await mlClient.getRiesgoBatch(paciente_ids);
        res.json({ riesgos });
    } catch (error) {
        console.error("Error batch riesgo:", error.message);
        res.status(500).json({ mensaje: "No fue posible obtener riesgos" });
    }
});

// ============================================================
// 1.6.4 RECÁLCULO MASIVO DE SCORES
// ============================================================
app.post("/api/pacientes/riesgo/recalcular-todos", requireAuth, requireRole("administrador"), async (req, res) => {
    try {
        // Llamar al endpoint del servicio ML para recalcular todos los scores
        const mlResponse = await mlClient.recalcularTodos();
        res.json({
            mensaje: "Recálculo masivo iniciado en background",
            status: "started",
            ml_response: mlResponse
        });
    } catch (error) {
        console.error("Error iniciando recálculo masivo:", error.message);
        if (error.code === 'ECONNREFUSED') {
            return res.status(503).json({ mensaje: "Servicio ML no disponible. Verifique que esté corriendo en " + ML_SERVICE_URL });
        }
        res.status(500).json({ mensaje: "No fue posible iniciar el recálculo masivo" });
    }
});

console.log("DEBUG: Registering test route...");
console.log("DEBUG: ML_SERVICE_URL =", ML_SERVICE_URL);
console.log("DEBUG: mlClient baseURL =", require("./services/ml-client").mlClient.client.defaults.baseURL);
// TEST ROUTE - para verificar registro de rutas
app.get("/api/test", (req, res) => {
    const fs = require('fs');
    fs.appendFileSync('debug.log', `HIT: ${req.path} ${req.originalUrl}\n`);
    console.log("DEBUG: /api/test HIT! Path:", req.path, "OriginalUrl:", req.originalUrl);
    res.json({ mensaje: "Test route works - SIMPLE", test: true, cwd: process.cwd() });
});
console.log("DEBUG: Test route registered");

initializeAuth()
    .then(() => app.listen(3000, async () => {
        console.log("Servidor iniciado en http://localhost:3000");
        console.log(`WhatsApp: ${process.env.ENABLE_WHATSAPP === "true" ? "activado" : "desactivado"}`);
        try {
            await iniciarWhatsApp({ query });
        } catch (error) {
            console.error("No fue posible iniciar WhatsApp:", error.message);
        }
    }))
    .catch((error) => {
        console.error("No fue posible preparar la autenticación:", error);
        process.exit(1);
    });
