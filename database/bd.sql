--
-- Base de datos: `clinicitabd` (creada)
--
DROP DATABASE IF EXISTS clinicitabd;

CREATE DATABASE clinicitabd CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci;
USE clinicitabd;

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
  UNIQUE KEY `correo` (`correo`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla `medicos`
-- --------------------------------------------------------
CREATE TABLE `medicos` (
  `medico_id` int(11) NOT NULL,
  `nombre_completo` varchar(100) NOT NULL,
  `especialidad` varchar(50) NOT NULL,
  `correo_institucional` varchar(100) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla `pacientes`
-- --------------------------------------------------------
CREATE TABLE `pacientes` (
  `paciente_id` int(11) NOT NULL,
  `nombre_completo` varchar(100) NOT NULL,
  `documento_id` varchar(20) NOT NULL,
  `telefono_whatsapp` varchar(15) NOT NULL,
  `whatsapp_lid` varchar(100) DEFAULT NULL,
  `correo_electronico` varchar(100) DEFAULT NULL,
  `acepta_politica_datos` tinyint(1) DEFAULT 0
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla `citas`
-- --------------------------------------------------------
CREATE TABLE `citas` (
  `cita_id` int(11) NOT NULL,
  `paciente_id` int(11) NOT NULL,
  `medico_id` int(11) NOT NULL,
  `fecha_cita` date NOT NULL,
  `hora_cita` time NOT NULL,
  `motivo` varchar(255) DEFAULT NULL,
  `recordatorio_enviado` tinyint(1) NOT NULL DEFAULT 0,
  `estado` enum('Pendiente','Confirmada','Cancelada','No-Asistio','Completada') DEFAULT 'Pendiente',
  `fecha_creacion` timestamp NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla `lista_espera`
-- --------------------------------------------------------
CREATE TABLE `lista_espera` (
  `espera_id` int(11) NOT NULL,
  `paciente_id` int(11) NOT NULL,
  `especialidad_requerida` varchar(50) DEFAULT NULL,
  `fecha_inscripcion` timestamp NOT NULL DEFAULT current_timestamp(),
  `prioridad` enum('Alta','Media','Baja') DEFAULT 'Media',
  `estado_espera` enum('Activo','Asignado','Expirado') DEFAULT 'Activo'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- --------------------------------------------------------
-- Tabla `recordatorios`
-- --------------------------------------------------------
CREATE TABLE `recordatorios` (
  `recordatorio_id` int(11) NOT NULL,
  `cita_id` int(11) NOT NULL,
  `canal_envio` enum('WhatsApp','SMS','Email') DEFAULT NULL,
  `fecha_envio` datetime DEFAULT NULL,
  `estado_entrega` enum('Pendiente','Enviado','Entregado','Fallido') DEFAULT 'Pendiente',
  `respuesta_paciente` tinyint(1) DEFAULT NULL
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

--
-- Índices
--
ALTER TABLE `medicos`
  ADD PRIMARY KEY (`medico_id`);

ALTER TABLE `pacientes`
  ADD PRIMARY KEY (`paciente_id`),
  ADD UNIQUE KEY `documento_id` (`documento_id`),
  ADD UNIQUE KEY `whatsapp_lid` (`whatsapp_lid`);

ALTER TABLE `citas`
  ADD PRIMARY KEY (`cita_id`),
  ADD KEY `paciente_id` (`paciente_id`),
  ADD KEY `medico_id` (`medico_id`);

ALTER TABLE `lista_espera`
  ADD PRIMARY KEY (`espera_id`),
  ADD KEY `paciente_id` (`paciente_id`);

ALTER TABLE `recordatorios`
  ADD PRIMARY KEY (`recordatorio_id`),
  ADD KEY `cita_id` (`cita_id`);

--
-- AUTO_INCREMENT
--
ALTER TABLE `medicos`
  MODIFY `medico_id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `pacientes`
  MODIFY `paciente_id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `citas`
  MODIFY `cita_id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `lista_espera`
  MODIFY `espera_id` int(11) NOT NULL AUTO_INCREMENT;

ALTER TABLE `recordatorios`
  MODIFY `recordatorio_id` int(11) NOT NULL AUTO_INCREMENT;

--
-- Llaves foráneas
--
ALTER TABLE `citas`
  ADD CONSTRAINT `citas_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`paciente_id`) ON DELETE RESTRICT ON UPDATE CASCADE,
  ADD CONSTRAINT `citas_ibfk_2` FOREIGN KEY (`medico_id`) REFERENCES `medicos` (`medico_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE `lista_espera`
  ADD CONSTRAINT `lista_espera_ibfk_1` FOREIGN KEY (`paciente_id`) REFERENCES `pacientes` (`paciente_id`) ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE `recordatorios`
  ADD CONSTRAINT `recordatorios_ibfk_1` FOREIGN KEY (`cita_id`) REFERENCES `citas` (`cita_id`) ON DELETE CASCADE ON UPDATE CASCADE;

--
-- Datos de prueba
--
INSERT INTO medicos (nombre_completo, especialidad, correo_institucional) VALUES
('Dra. Laura Gómez', 'Pediatría', 'laura.gomez@clinicita.com'),
('Dr. Andrés Rico', 'Cardiología', 'andres.rico@clinicita.com');

INSERT INTO pacientes (nombre_completo, documento_id, telefono_whatsapp, correo_electronico, acepta_politica_datos) VALUES
('Juan Pérez', '1001234567', '3001234567', 'juan.perez@mail.com', 1),
('María Torres', '1009876543', '3009876543', 'maria.torres@mail.com', 1);

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
        respuesta_paciente
    )
    VALUES
    (
        NEW.cita_id,
      'WhatsApp',
      NULL,
      'Pendiente',
        NULL
    );
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

DELIMITER ;