use cln
ALTER TABLE lista_espera
    MODIFY estado_espera ENUM('Activo','Ofertado','Asignado','Expirado','Cancelado') DEFAULT 'Activo',
    ADD COLUMN medico_preferido_id INT NULL AFTER sede_id,
    ADD COLUMN fecha_desde DATE NULL AFTER medico_preferido_id,
    ADD COLUMN fecha_hasta DATE NULL AFTER fecha_desde,
    ADD COLUMN franja_horaria ENUM('Manana','Tarde','Cualquiera') NOT NULL DEFAULT 'Cualquiera' AFTER fecha_hasta;

ALTER TABLE lista_espera
    ADD CONSTRAINT fk_lista_espera_medico_preferido
    FOREIGN KEY (medico_preferido_id) REFERENCES medicos(medico_id)
    ON DELETE SET NULL ON UPDATE CASCADE;

CREATE TABLE lista_espera_ofertas (
    oferta_id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    espera_id INT NOT NULL,
    paciente_id INT NOT NULL,
    medico_id INT NOT NULL,
    sede_id INT NULL,
    fecha_cita DATE NOT NULL,
    hora_cita TIME NOT NULL,
    especialidad VARCHAR(50) NOT NULL,
    estado ENUM('Pendiente','Aceptada','Rechazada','Expirada','Cancelada') NOT NULL DEFAULT 'Pendiente',
    fecha_oferta DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    vence_en DATETIME NOT NULL,
    fecha_respuesta DATETIME NULL,
    cita_id INT NULL,
    slot_reservado VARCHAR(80) GENERATED ALWAYS AS
        (CASE WHEN estado = 'Pendiente' THEN CONCAT(medico_id, '|', fecha_cita, '|', hora_cita) ELSE NULL END) STORED,
    espera_activa INT GENERATED ALWAYS AS
        (CASE WHEN estado = 'Pendiente' THEN espera_id ELSE NULL END) STORED,
    UNIQUE KEY uq_lista_espera_slot_activo (slot_reservado),
    UNIQUE KEY uq_lista_espera_paciente_ofertado (espera_activa),
    KEY idx_lista_espera_ofertas_vencimiento (estado, vence_en),
    KEY idx_lista_espera_ofertas_paciente (paciente_id, estado),
    CONSTRAINT fk_espera_oferta_espera FOREIGN KEY (espera_id) REFERENCES lista_espera(espera_id) ON DELETE CASCADE,
    CONSTRAINT fk_espera_oferta_paciente FOREIGN KEY (paciente_id) REFERENCES pacientes(paciente_id) ON DELETE CASCADE,
    CONSTRAINT fk_espera_oferta_medico FOREIGN KEY (medico_id) REFERENCES medicos(medico_id) ON DELETE RESTRICT,
    CONSTRAINT fk_espera_oferta_sede FOREIGN KEY (sede_id) REFERENCES sedes(sede_id) ON DELETE SET NULL,
    CONSTRAINT fk_espera_oferta_cita FOREIGN KEY (cita_id) REFERENCES citas(cita_id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

DROP TRIGGER IF EXISTS trg_actualizar_lista_espera;
DROP TRIGGER IF EXISTS trg_bloquear_cita_sobre_oferta;
DROP TRIGGER IF EXISTS trg_bloquear_actualizacion_cita_sobre_oferta;

DELIMITER $$
CREATE TRIGGER trg_bloquear_cita_sobre_oferta
BEFORE INSERT ON citas
FOR EACH ROW
BEGIN
    IF NEW.estado NOT IN ('Cancelada', 'No-Asistio') AND EXISTS (
        SELECT 1 FROM lista_espera_ofertas o
        WHERE o.medico_id = NEW.medico_id
          AND o.fecha_cita = NEW.fecha_cita
          AND o.hora_cita = NEW.hora_cita
          AND o.estado = 'Pendiente' AND o.vence_en > NOW()
    ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Horario reservado temporalmente por una oferta de lista de espera';
    END IF;
END$$

CREATE TRIGGER trg_bloquear_actualizacion_cita_sobre_oferta
BEFORE UPDATE ON citas
FOR EACH ROW
BEGIN
    IF NEW.estado NOT IN ('Cancelada', 'No-Asistio')
       AND (OLD.estado IN ('Cancelada', 'No-Asistio')
            OR NEW.medico_id <> OLD.medico_id
            OR NEW.fecha_cita <> OLD.fecha_cita
            OR NEW.hora_cita <> OLD.hora_cita)
       AND EXISTS (
            SELECT 1 FROM lista_espera_ofertas o
            WHERE o.medico_id = NEW.medico_id
              AND o.fecha_cita = NEW.fecha_cita
              AND o.hora_cita = NEW.hora_cita
              AND o.estado = 'Pendiente' AND o.vence_en > NOW()
       ) THEN
        SIGNAL SQLSTATE '45000' SET MESSAGE_TEXT = 'Horario reservado temporalmente por una oferta de lista de espera';
    END IF;
END$$
DELIMITER ;

-- NOTA: el trigger antiguo trg_actualizar_lista_espera se elimina intencionalmente.
-- Una cita completada no debe cerrar todas las solicitudes de espera del paciente.
