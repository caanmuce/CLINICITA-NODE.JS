--
-- Base de datos: `clinicitabd` (creada)
--
DROP DATABASE IF EXISTS clinicitabd;

CREATE DATABASE clinicitabd CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE clinicitabd;

-- --------------------------------------------------------
-- Tabla `sedes`
-- --------------------------------------------------------
CREATE TABLE `sedes` (
  `sede_id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre` varchar(100) NOT NULL,
  `direccion` varchar(255) NOT NULL,
  `telefono` varchar(20) DEFAULT NULL,
  `activa` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`sede_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla `usuarios`
-- --------------------------------------------------------
CREATE TABLE `usuarios` (
  `usuario_id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_completo` varchar(100) NOT NULL,
  `correo` varchar(100) NOT NULL,
  `clave_hash` varchar(200) NOT NULL,
  `rol` enum('paciente','medico','recepcionista','administrador') NOT NULL,
  `paciente_id` int(11) DEFAULT NULL,
  `medico_id` int(11) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`usuario_id`),
  UNIQUE KEY `correo` (`correo`),
  KEY `fk_usuarios_paciente` (`paciente_id`),
  KEY `fk_usuarios_medico` (`medico_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla `medicos`
-- --------------------------------------------------------
CREATE TABLE `medicos` (
  `medico_id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) DEFAULT NULL,
  `nombre_completo` varchar(100) NOT NULL,
  `especialidad` varchar(50) NOT NULL,
  `correo_institucional` varchar(100) DEFAULT NULL,
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`medico_id`),
  KEY `fk_medicos_usuario` (`usuario_id`),
  CONSTRAINT `fk_medicos_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`usuario_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla `pacientes`
-- --------------------------------------------------------
CREATE TABLE `pacientes` (
  `paciente_id` int(11) NOT NULL AUTO_INCREMENT,
  `nombre_completo` varchar(100) NOT NULL,
  `documento_id` varchar(20) NOT NULL,
  `telefono_whatsapp` varchar(15) NOT NULL,
  `whatsapp_lid` varchar(100) DEFAULT NULL,
  `correo_electronico` varchar(100) DEFAULT NULL,
  `direccion` varchar(255) DEFAULT NULL,
  `fecha_nacimiento` date DEFAULT NULL,
  `genero` enum('M','F','Otro') DEFAULT NULL,
  `acepta_politica_datos` tinyint(1) DEFAULT 0,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`paciente_id`),
  UNIQUE KEY `documento_id` (`documento_id`),
  UNIQUE KEY `whatsapp_lid` (`whatsapp_lid`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla `citas`
-- --------------------------------------------------------
CREATE TABLE `citas` (
  `cita_id` int(11) NOT NULL AUTO_INCREMENT,
  `paciente_id` int(11) NOT NULL,
  `medico_id` int(11) NOT NULL,
  `sede_id` int(11) DEFAULT NULL,
  `fecha_cita` date NOT NULL,
  `hora_cita` time NOT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `recordatorio_enviado` tinyint(1) NOT NULL DEFAULT 0,
  `estado` enum('Pendiente','Confirmada','Cancelada','No-Asistio','Completada') DEFAULT 'Pendiente',
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  `fecha_actualizacion` timestamp NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp(),
  PRIMARY KEY (`cita_id`),
  KEY `paciente_id` (`paciente_id`),
  KEY `medico_id` (`medico_id`),
  KEY `sede_id` (`sede_id`),
  KEY `idx_citas_fecha_estado` (`fecha_cita`, `estado`),
  KEY `idx_citas_medico_fecha` (`medico_id`, `fecha_cita`),
  CONSTRAINT `citas_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`paciente_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `citas_ibfk_2` FOREIGN KEY (`medico_id`) REFERENCES `medicos` (`medico_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT `citas_ibfk_3` FOREIGN KEY (`sede_id`) REFERENCES `sedes` (`sede_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla `horarios`
-- --------------------------------------------------------
CREATE TABLE `horarios` (
  `horario_id` int(11) NOT NULL AUTO_INCREMENT,
  `medico_id` int(11) NOT NULL,
  `sede_id` int(11) NOT NULL,
  `dia_semana` tinyint(1) NOT NULL COMMENT '0=Domingo, 1=Lunes, ..., 6=Sábado',
  `hora_inicio` time NOT NULL,
  `hora_fin` time NOT NULL,
  `duracion_slot` int(11) NOT NULL DEFAULT 30 COMMENT 'Duración en minutos de cada cita',
  `activo` tinyint(1) NOT NULL DEFAULT 1,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`horario_id`),
  KEY `fk_horarios_medico` (`medico_id`),
  KEY `fk_horarios_sede` (`sede_id`),
  KEY `idx_horarios_medico_dia` (`medico_id`, `dia_semana`),
  CONSTRAINT `fk_horarios_medico` FOREIGN KEY (`medico_id`) REFERENCES `medicos` (`medico_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_horarios_sede` FOREIGN KEY (`sede_id`) REFERENCES `sedes` (`sede_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla `lista_espera`
-- --------------------------------------------------------
CREATE TABLE `lista_espera` (
  `espera_id` int(11) NOT NULL AUTO_INCREMENT,
  `paciente_id` int(11) NOT NULL,
  `especialidad_requerida` varchar(50) DEFAULT NULL,
  `sede_id` int(11) DEFAULT NULL,
  `fecha_inscripcion` timestamp NOT NULL DEFAULT current_timestamp(),
  `prioridad` enum('Alta','Media','Baja') DEFAULT 'Media',
  `estado_espera` enum('Activo','Asignado','Expirado') DEFAULT 'Activo',
  `observaciones` text DEFAULT NULL,
  PRIMARY KEY (`espera_id`),
  KEY `paciente_id` (`paciente_id`),
  KEY `fk_lista_espera_sede` (`sede_id`),
  KEY `idx_lista_espera_estado_prioridad` (`estado_espera`, `prioridad`, `fecha_inscripcion`),
  CONSTRAINT `lista_espera_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`paciente_id`) ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT `fk_lista_espera_sede` FOREIGN KEY (`sede_id`) REFERENCES `sedes` (`sede_id`) ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla `recordatorios`
-- --------------------------------------------------------
CREATE TABLE `recordatorios` (
  `recordatorio_id` int(11) NOT NULL AUTO_INCREMENT,
  `cita_id` int(11) NOT NULL,
  `canal_envio` enum('WhatsApp','SMS','Email') DEFAULT 'WhatsApp',
  `fecha_envio` datetime DEFAULT NULL,
  `estado_entrega` enum('Pendiente','Enviado','Entregado','Fallido') DEFAULT 'Pendiente',
  `respuesta_paciente` tinyint(1) DEFAULT NULL,
  `intentos` int(11) NOT NULL DEFAULT 0,
  `ultimo_intento` datetime DEFAULT NULL,
  PRIMARY KEY (`recordatorio_id`),
  KEY `recordatorios_cita_idx` (`cita_id`),
  KEY `idx_recordatorios_estado` (`estado_entrega`),
  CONSTRAINT `recordatorios_ibfk_1` FOREIGN KEY (`cita_id`) REFERENCES `citas` (`cita_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla `fichas_preconsulta`
-- --------------------------------------------------------
CREATE TABLE `fichas_preconsulta` (
  `ficha_id` int(11) NOT NULL AUTO_INCREMENT,
  `cita_id` int(11) NOT NULL,
  `paciente_id` int(11) NOT NULL,
  `sintomas` text NOT NULL,
  `fecha_registro` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`ficha_id`),
  KEY `cita_id` (`cita_id`),
  KEY `paciente_id` (`paciente_id`),
  CONSTRAINT `fichas_preconsulta_cita_fk` FOREIGN KEY (`cita_id`) REFERENCES `citas` (`cita_id`) ON DELETE CASCADE,
  CONSTRAINT `fichas_preconsulta_paciente_fk` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`paciente_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla `tokens_recuperacion` (para reset de contraseña)
-- --------------------------------------------------------
CREATE TABLE `tokens_recuperacion` (
  `token_id` int(11) NOT NULL AUTO_INCREMENT,
  `usuario_id` int(11) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expira_en` datetime NOT NULL,
  `usado` tinyint(1) NOT NULL DEFAULT 0,
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`token_id`),
  KEY `fk_tokens_usuario` (`usuario_id`),
  KEY `idx_tokens_expira` (`expira_en`),
  CONSTRAINT `fk_tokens_usuario` FOREIGN KEY (`usuario_id`) REFERENCES `usuarios` (`usuario_id`) ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla `paciente_riesgo_no_show` (Score de riesgo de inasistencia ML)
-- --------------------------------------------------------
CREATE TABLE `paciente_riesgo_no_show` (
  `riesgo_id` int(11) NOT NULL AUTO_INCREMENT,
  `paciente_id` int(11) NOT NULL,
  `score` decimal(5,2) NOT NULL COMMENT '0-100, mayor = más riesgo',
  `percentil` tinyint(3) unsigned NOT NULL COMMENT '1-100 respecto a población',
  `nivel_riesgo` enum('Bajo','Medio','Alto','Crítico') NOT NULL,
  `features_json` json NOT NULL COMMENT 'Features usados para explicabilidad',
  `model_version` varchar(50) NOT NULL,
  `calculado_en` timestamp NOT NULL DEFAULT current_timestamp(),
  PRIMARY KEY (`riesgo_id`),
  UNIQUE KEY `uk_paciente_riesgo` (`paciente_id`),
  KEY `idx_nivel_riesgo` (`nivel_riesgo`),
  KEY `idx_score` (`score`),
  CONSTRAINT `fk_riesgo_paciente` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`paciente_id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Vista para fácil consulta en dashboards
CREATE OR REPLACE VIEW `v_paciente_riesgo_completo` AS
SELECT
    p.paciente_id,
    p.nombre_completo,
    p.documento_id,
    p.telefono_whatsapp,
    p.fecha_nacimiento,
    TIMESTAMPDIFF(YEAR, p.fecha_nacimiento, CURDATE()) AS edad,
    pr.score,
    pr.percentil,
    pr.nivel_riesgo,
    pr.model_version,
    pr.calculado_en,
    pr.features_json
FROM pacientes p
LEFT JOIN paciente_riesgo_no_show pr ON pr.paciente_id = p.paciente_id;

--
-- Índices adicionales
--
ALTER TABLE `usuarios`
  ADD CONSTRAINT `fk_usuarios_paciente` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`paciente_id`) ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT `fk_usuarios_medico` FOREIGN KEY (`medico_id`) REFERENCES `medicos` (`medico_id`) ON DELETE SET NULL ON UPDATE CASCADE;

--
-- AUTO_INCREMENT
--
ALTER TABLE `sedes` MODIFY `sede_id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `medicos` MODIFY `medico_id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `pacientes` MODIFY `paciente_id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `citas` MODIFY `cita_id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `horarios` MODIFY `horario_id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `lista_espera` MODIFY `espera_id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `recordatorios` MODIFY `recordatorio_id` int(11) NOT NULL AUTO_INCREMENT;
ALTER TABLE `tokens_recuperacion` MODIFY `token_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Triggers
--
DELIMITER $$

-- Trigger 1: al completar una cita, marca como "Asignado" SOLO las
-- entradas de lista de espera que sigan Activas para ese paciente.
CREATE TRIGGER trg_actualizar_lista_espera
AFTER UPDATE ON citas
FOR EACH ROW
BEGIN
    IF NEW.estado = 'Completada' AND OLD.estado <> 'Completada' THEN
        UPDATE lista_espera
        SET estado_espera = 'Asignado'
        WHERE paciente_id = NEW.paciente_id
          AND estado_espera = 'Activo';
    END IF;
END$$

-- Trigger 2: crea el recordatorio de WhatsApp pendiente.
CREATE TRIGGER trg_crear_recordatorio
AFTER INSERT ON citas
FOR EACH ROW
BEGIN
    INSERT INTO recordatorios
    (
        cita_id,
        canal_envio,
        fecha_envio,
        estado_entrega,
        respuesta_paciente,
        intentos
    )
    VALUES
    (
        NEW.cita_id,
      'WhatsApp',
      NULL,
      'Pendiente',
        NULL,
        0
    );
END$$

-- Trigger 3: validar que no se sobrepasen horarios al insertar cita
CREATE TRIGGER trg_validar_horario_cita
BEFORE INSERT ON citas
FOR EACH ROW
BEGIN
    DECLARE slot_count INT;
    DECLARE dia_semana_cita INT;
    SET dia_semana_cita = DAYOFWEEK(NEW.fecha_cita) - 1; -- 0=Domingo

    SELECT COUNT(*) INTO slot_count
    FROM horarios h
    WHERE h.medico_id = NEW.medico_id
      AND h.sede_id = NEW.sede_id
      AND h.dia_semana = dia_semana_cita
      AND h.activo = 1
      AND NEW.hora_cita >= h.hora_inicio
      AND NEW.hora_cita < h.hora_fin;

    IF slot_count = 0 AND NEW.sede_id IS NOT NULL THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'El médico no tiene horario configurado para esta sede y día';
    END IF;
END$$

DELIMITER ;

--
-- Procedimientos
--
DELIMITER $$

CREATE PROCEDURE RegistrarCita
(
    IN pPaciente INT,
    IN pMedico INT,
    IN pFecha DATE,
    IN pHora TIME
)
BEGIN
    INSERT INTO citas
    (
        paciente_id,
        medico_id,
        fecha_cita,
        hora_cita
    )
    VALUES
    (
        pPaciente,
        pMedico,
        pFecha,
        pHora
    );
END$$

CREATE PROCEDURE ConsultarCitasPaciente
(
    IN pPaciente INT
)
BEGIN
    SELECT
        cita_id,
        fecha_cita,
        hora_cita,
        estado
    FROM citas
    WHERE paciente_id = pPaciente;
END$$

-- Procedimiento: Obtener horarios disponibles de un médico en una fecha
CREATE PROCEDURE ObtenerHorariosDisponibles
(
    IN pMedico INT,
    IN pFecha DATE,
    IN pSede INT
)
BEGIN
    DECLARE dia_semana_cita INT;
    SET dia_semana_cita = DAYOFWEEK(pFecha) - 1;

    -- Obtener slots de horario configurados
    SELECT
        h.horario_id,
        h.hora_inicio,
        h.hora_fin,
        h.duracion_slot
    FROM horarios h
    WHERE h.medico_id = pMedico
      AND h.sede_id = pSede
      AND h.dia_semana = dia_semana_cita
      AND h.activo = 1
    ORDER BY h.hora_inicio;
END$$

-- Procedimiento: Generar slots de tiempo disponibles para una fecha
CREATE PROCEDURE GenerarSlotsDisponibles
(
    IN pMedico INT,
    IN pFecha DATE,
    IN pSede INT
)
BEGIN
    DECLARE dia_semana_cita INT;
    DECLARE done INT DEFAULT FALSE;
    DECLARE v_hora_inicio TIME;
    DECLARE v_hora_fin TIME;
    DECLARE v_duracion INT;
    DECLARE v_slot TIME;

    DECLARE cur_horarios CURSOR FOR
        SELECT hora_inicio, hora_fin, duracion_slot
        FROM horarios
        WHERE medico_id = pMedico
          AND sede_id = pSede
          AND dia_semana = (DAYOFWEEK(pFecha) - 1)
          AND activo = 1;

    DECLARE CONTINUE HANDLER FOR NOT FOUND SET done = TRUE;

    -- Tabla temporal para slots
    CREATE TEMPORARY TABLE IF NOT EXISTS temp_slots (
        slot_time TIME PRIMARY KEY
    );

    TRUNCATE TABLE temp_slots;

    OPEN cur_horarios;
    read_loop: LOOP
        FETCH cur_horarios INTO v_hora_inicio, v_hora_fin, v_duracion;
        IF done THEN
            LEAVE read_loop;
        END IF;

        SET v_slot = v_hora_inicio;
        WHILE v_slot < v_hora_fin DO
            INSERT IGNORE INTO temp_slots (slot_time) VALUES (v_slot);
            SET v_slot = ADDTIME(v_slot, SEC_TO_TIME(v_duracion * 60));
        END WHILE;
    END LOOP;
    CLOSE cur_horarios;

    -- Retornar slots libres (no ocupados por citas)
    SELECT ts.slot_time AS hora
    FROM temp_slots ts
    WHERE NOT EXISTS (
        SELECT 1 FROM citas c
        WHERE c.medico_id = pMedico
          AND c.fecha_cita = pFecha
          AND c.hora_cita = ts.slot_time
          AND c.estado NOT IN ('Cancelada', 'No-Asistio')
    )
    ORDER BY ts.slot_time;

    DROP TEMPORARY TABLE IF EXISTS temp_slots;
END$$

DELIMITER ;

--
-- Datos de prueba
--

-- Sedes
INSERT INTO sedes (nombre, direccion, telefono, activa) VALUES
('Sede Principal', 'Calle 100 #15-20, Bogotá', '6011234567', 1),
('Sede Norte', 'Av. 19 #100-30, Bogotá', '6017654321', 1),
('Sede Sur', 'Calle 30 Sur #45-10, Bogotá', '6019876543', 1);

-- Médicos (usuario_id se vinculará después con usuarios)
INSERT INTO medicos (usuario_id, nombre_completo, especialidad, correo_institucional, activo) VALUES
(NULL, 'Dra. Laura Gómez', 'Pediatría', 'laura.gomez@clinicita.com', 1),
(NULL, 'Dr. Andrés Rico', 'Cardiología', 'andres.rico@clinicita.com', 1),
(NULL, 'Dra. María Torres', 'Dermatología', 'maria.torres@clinicita.com', 1),
(NULL, 'Dr. Carlos Mendoza', 'Medicina General', 'carlos.mendoza@clinicita.com', 1);

-- Pacientes
INSERT INTO pacientes (nombre_completo, documento_id, telefono_whatsapp, correo_electronico, direccion, fecha_nacimiento, genero, acepta_politica_datos) VALUES
('Juan Pérez', '1001234567', '3001234567', 'juan.perez@mail.com', 'Calle 45 #12-34', '1990-05-15', 'M', 1),
('María Torres', '1009876543', '3009876543', 'maria.torres@mail.com', 'Carrera 10 #20-45', '1985-08-22', 'F', 1),
('Carlos Ruiz', '1011121314', '3011121314', 'carlos.ruiz@mail.com', 'Av. 68 #40-50', '1992-03-10', 'M', 1);

-- Horarios de ejemplo (Lunes a Viernes 8:00-12:00 y 14:00-17:00, slots de 30 min)
-- Dra. Laura Gómez (medico_id=1) - Sede Principal (sede_id=1)
INSERT INTO horarios (medico_id, sede_id, dia_semana, hora_inicio, hora_fin, duracion_slot, activo) VALUES
(1, 1, 1, '08:00:00', '12:00:00', 30, 1), -- Lunes mañana
(1, 1, 1, '14:00:00', '17:00:00', 30, 1), -- Lunes tarde
(1, 1, 2, '08:00:00', '12:00:00', 30, 1), -- Martes mañana
(1, 1, 2, '14:00:00', '17:00:00', 30, 1), -- Martes tarde
(1, 1, 3, '08:00:00', '12:00:00', 30, 1), -- Miércoles mañana
(1, 1, 3, '14:00:00', '17:00:00', 30, 1), -- Miércoles tarde
(1, 1, 4, '08:00:00', '12:00:00', 30, 1), -- Jueves mañana
(1, 1, 4, '14:00:00', '17:00:00', 30, 1), -- Jueves tarde
(1, 1, 5, '08:00:00', '12:00:00', 30, 1); -- Viernes mañana

-- Dr. Andrés Rico (medico_id=2) - Sede Norte (sede_id=2)
INSERT INTO horarios (medico_id, sede_id, dia_semana, hora_inicio, hora_fin, duracion_slot, activo) VALUES
(2, 2, 1, '08:00:00', '12:00:00', 30, 1),
(2, 2, 1, '14:00:00', '17:00:00', 30, 1),
(2, 2, 2, '08:00:00', '12:00:00', 30, 1),
(2, 2, 2, '14:00:00', '17:00:00', 30, 1),
(2, 2, 3, '08:00:00', '12:00:00', 30, 1),
(2, 2, 3, '14:00:00', '17:00:00', 30, 1),
(2, 2, 4, '08:00:00', '12:00:00', 30, 1),
(2, 2, 4, '14:00:00', '17:00:00', 30, 1),
(2, 2, 5, '08:00:00', '12:00:00', 30, 1);

-- Dra. María Torres (medico_id=3) - Sede Sur (sede_id=3)
INSERT INTO horarios (medico_id, sede_id, dia_semana, hora_inicio, hora_fin, duracion_slot, activo) VALUES
(3, 3, 1, '08:00:00', '12:00:00', 30, 1),
(3, 3, 2, '08:00:00', '12:00:00', 30, 1),
(3, 3, 3, '08:00:00', '12:00:00', 30, 1),
(3, 3, 4, '08:00:00', '12:00:00', 30, 1),
(3, 3, 5, '08:00:00', '12:00:00', 30, 1);

-- Dr. Carlos Mendoza (medico_id=4) - Sede Principal (sede_id=1)
INSERT INTO horarios (medico_id, sede_id, dia_semana, hora_inicio, hora_fin, duracion_slot, activo) VALUES
(4, 1, 1, '08:00:00', '12:00:00', 30, 1),
(4, 1, 1, '14:00:00', '17:00:00', 30, 1),
(4, 1, 2, '08:00:00', '12:00:00', 30, 1),
(4, 1, 2, '14:00:00', '17:00:00', 30, 1),
(4, 1, 3, '08:00:00', '12:00:00', 30, 1),
(4, 1, 3, '14:00:00', '17:00:00', 30, 1),
(4, 1, 4, '08:00:00', '12:00:00', 30, 1),
(4, 1, 4, '14:00:00', '17:00:00', 30, 1),
(4, 1, 5, '08:00:00', '12:00:00', 30, 1),
(4, 1, 5, '14:00:00', '17:00:00', 30, 1);

-- Lista de espera de ejemplo
INSERT INTO lista_espera (paciente_id, especialidad_requerida, sede_id, prioridad, estado_espera, observaciones) VALUES
(1, 'Cardiología', 2, 'Alta', 'Activo', 'Paciente con antecedentes familiares'),
(2, 'Dermatología', 3, 'Media', 'Activo', NULL),
(3, 'Pediatría', 1, 'Baja', 'Activo', 'Control rutinario');