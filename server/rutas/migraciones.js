/**
 * server/rutas/migraciones.js
 * ---------------------------------------------------------------------------
 * "Migraciones" de los módulos MÉDICO y ADMIN.
 *
 * Una migración es un cambio a la estructura (o a datos base) de la base de
 * datos. Seguimos el mismo patrón que ya usa initializeAuth() en server.js:
 *   - CREATE TABLE IF NOT EXISTS ...      (crea solo si no existe)
 *   - consultar information_schema        (¿ya existe esta columna?)
 * Por eso esta función se puede ejecutar CADA VEZ que arranca el servidor:
 * la primera vez crea lo que falta; las siguientes no hacen nada.
 *
 * VERSIÓN 2 (adaptada a la base de datos nueva del equipo):
 *   La base ya trae las tablas `sedes` y `horarios` (con sede_id y duracion_slot)
 *   y la columna `medicos.activo`. Por eso YA NO creamos una tabla propia de
 *   horarios: usar dos tablas de horarios dejaría datos duplicados y el trigger
 *   `trg_validar_horario_cita` de bd.sql miraría una tabla distinta a la que
 *   edita el admin.
 *
 * Qué hace ahora:
 *   1. Comprueba que existan `sedes` y `horarios` (si no, avisa claro y detiene).
 *   2. Crea la tabla `especialidades` (catálogo que administra el admin).
 *   3. Agrega `medicos.activo` SOLO si falta (bases antiguas).
 *   4. Vincula el médico demo (medico@clinicita.com) con un registro de `medicos`,
 *      en los DOS sentidos: usuarios.medico_id y medicos.usuario_id.
 */

/** ¿Existe la tabla? Consulta el catálogo interno de MySQL (information_schema). */
async function tablaExiste(query, tabla) {
    const filas = await query(
        "SELECT 1 FROM information_schema.TABLES WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ?",
        [tabla]
    );
    return filas.length > 0;
}

/** ¿Existe la columna en la tabla? */
async function columnaExiste(query, tabla, columna) {
    const filas = await query(
        "SELECT 1 FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
        [tabla, columna]
    );
    return filas.length > 0;
}

/**
 * Ejecuta todas las migraciones. Se llama desde server.js justo después de
 * initializeAuth() y antes de app.listen().
 *
 * @param {{query: Function}} deps - la función query(sql, params) de server.js
 * @throws {Error} si la base de datos es la versión antigua (sin sedes/horarios)
 */
async function migrar({ query }) {
    // ---------------------------------------------------------------------
    // 1) Requisito: la base de datos debe ser la versión con sedes y horarios
    // ---------------------------------------------------------------------
    // Si alguien arranca el servidor con el bd.sql viejo, preferimos un mensaje
    // claro al arrancar a un error SQL confuso la primera vez que el admin
    // abra la pantalla de horarios.
    for (const tabla of ["sedes", "horarios"]) {
        if (!(await tablaExiste(query, tabla))) {
            throw new Error(
                `Falta la tabla "${tabla}". Importa el database/bd.sql más reciente del repositorio ` +
                "(incluye sedes y horarios) antes de arrancar el servidor."
            );
        }
    }

    // ---------------------------------------------------------------------
    // 2) Tabla `especialidades`
    // ---------------------------------------------------------------------
    // Hasta ahora la "especialidad" era solo un texto dentro de `medicos`.
    // Con esta tabla el admin puede crear, describir y activar/desactivar
    // especialidades. `medicos.especialidad` sigue siendo texto y debe
    // coincidir con especialidades.nombre (así no rompemos el código de paciente).
    await query(`
        CREATE TABLE IF NOT EXISTS especialidades (
            especialidad_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
            nombre VARCHAR(50) NOT NULL UNIQUE,
            descripcion VARCHAR(255) NULL,
            activo TINYINT(1) NOT NULL DEFAULT 1,
            fecha_creacion TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
    // Copia las especialidades que ya existen en `medicos` (Pediatría,
    // Cardiología...). INSERT IGNORE salta las que ya estén: no duplica.
    await query(`
        INSERT IGNORE INTO especialidades (nombre)
        SELECT DISTINCT especialidad FROM medicos WHERE especialidad <> ''
    `);

    // ---------------------------------------------------------------------
    // 3) Columna `medicos.activo` (solo para bases antiguas)
    // ---------------------------------------------------------------------
    // El bd.sql nuevo ya la trae; este chequeo evita el error si alguien usa
    // una base creada con la versión anterior.
    if (!(await columnaExiste(query, "medicos", "activo"))) {
        await query("ALTER TABLE medicos ADD COLUMN activo TINYINT(1) NOT NULL DEFAULT 1");
    }

    // ---------------------------------------------------------------------
    // 4) Vincular el médico demo con un registro real de `medicos`
    // ---------------------------------------------------------------------
    // initializeAuth() crea el usuario medico@clinicita.com pero NO le asigna
    // medico_id (a diferencia del paciente demo). Sin ese dato la agenda no
    // sabe de qué médico es, y la ruta /api/citas/medico responde
    // "El usuario no está asociado a un médico".
    //
    // El vínculo existe en DOS sentidos en la base nueva:
    //   usuarios.medico_id  -> qué médico es este usuario
    //   medicos.usuario_id  -> qué usuario es este médico
    // Se llenan los dos para que ambas formas de consultar den lo mismo.
    // Solo actúa si medico_id sigue vacío, así que nunca pisa un vínculo existente.
    await query(`
        UPDATE usuarios
        SET medico_id = (SELECT MIN(medico_id) FROM medicos WHERE usuario_id IS NULL)
        WHERE correo = 'medico@clinicita.com' AND rol = 'medico' AND medico_id IS NULL
    `);
    await query(`
        UPDATE medicos m
        JOIN usuarios u ON u.medico_id = m.medico_id
        SET m.usuario_id = u.usuario_id
        WHERE u.correo = 'medico@clinicita.com' AND m.usuario_id IS NULL
    `);
}

module.exports = { migrar };
