const express = require("express");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const conexion = require("./conexion");
const crypto = require("crypto");
const { promisify } = require("util");
const { iniciarWhatsApp } = require("./servicios/whatsapp");

const app = express();
const query = promisify(conexion.query).bind(conexion);
const ROLES = ["paciente", "medico", "recepcionista", "administrador"];
const TOKEN_SECRET = process.env.TOKEN_SECRET || "clinicita-clave-local-cambiar-en-produccion";

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

function createToken(user) {
    const payload = Buffer.from(JSON.stringify({
        id: user.usuario_id,
        rol: user.rol,
        exp: Date.now() + 8 * 60 * 60 * 1000
    })).toString("base64url");
    const signature = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("base64url");
    return `${payload}.${signature}`;
}

function readToken(req) {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : "";
    const [payload, signature] = token.split(".");
    if (!payload || !signature) return null;

    const expected = crypto.createHmac("sha256", TOKEN_SECRET).update(payload).digest("base64url");
    if (signature.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) return null;

    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return data.exp > Date.now() ? data : null;
}

function requireAuth(req, res, next) {
    const user = readToken(req);
    if (!user) return res.status(401).json({ mensaje: "Sesión no válida o expirada" });
    req.user = user;
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

app.use(express.json());
app.use(express.static(path.join(__dirname, "..", "public")));
app.use("/api", (req, res, next) => {
    res.set("Cache-Control", "no-store");
    next();
});

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

    const fechaCita = new Date(`${fecha}T${hora}:00`);
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
    //HOLA CAMILO
    //hola fefo