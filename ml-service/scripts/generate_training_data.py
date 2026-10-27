#!/usr/bin/env python3
"""
Genera datos sintéticos de entrenamiento para el modelo de riesgo no-show.
Crea pacientes con perfiles de riesgo variados (Alto, Medio, Bajo) y
historiales de citas realistas distribuidos en 12 meses.
"""

import pymysql
import random
from datetime import datetime, timedelta, date
from typing import List, Dict
import sys

import os

# Configuración de BD - usar variables de entorno o defaults
DB_CONFIG = {
    "host": os.getenv("DB_HOST", "mysql"),
    "port": int(os.getenv("DB_PORT", "3306")),
    "user": os.getenv("DB_USER", "root"),
    "password": os.getenv("DB_PASSWORD", "clinicita123"),
    "database": os.getenv("DB_NAME", "clinicitabd"),
    "charset": "utf8mb4",
    "cursorclass": pymysql.cursors.DictCursor,
    "autocommit": True,
}

NOMBRES = [
    "Ana", "Carlos", "María", "Juan", "Laura", "Pedro", "Sofia", "Luis",
    "Elena", "Miguel", "Carmen", "Javier", "Isabel", "Andrés", "Lucía",
    "Fernando", "Patricia", "Diego", "Paula", "Roberto", "Monica", "Ricardo",
    "Silvia", "Alejandro", "Raquel", "Daniel", "Teresa", "Pablo", "Rosa"
]

APELLIDOS = [
    "García", "Rodríguez", "González", "Fernández", "López", "Martínez",
    "Sánchez", "Pérez", "Gómez", "Martín", "Jiménez", "Ruiz", "Hernández",
    "Díaz", "Moreno", "Álvarez", "Muñoz", "Romero", "Alonso", "Gutiérrez",
    "Navarro", "Torres", "Domínguez", "Vázquez", "Ramos", "Gil", "Ramírez"
]


def generate_nombre_completo():
    return f"{random.choice(NOMBRES)} {random.choice(APELLIDOS)} {random.choice(APELLIDOS)}"


def generate_documento_id(paciente_id: int) -> str:
    num = 10000000 + paciente_id * 12345 + random.randint(0, 99999)
    letra = "TRWAGMYFPDXBNJZSQVHLCKE"[num % 23]
    return f"{num}{letra}"


def generate_telefono_whatsapp() -> str:
    prefix = random.choice(["6", "7"])
    return f"+34 {prefix}{random.randint(10000000, 99999999)}"

# Perfiles de riesgo con probabilidades
RISK_PROFILES = {
    "alto": {
        "weight": 0.25,  # 25% de pacientes son alto riesgo
        "no_show_prob": 0.35,
        "cancel_prob": 0.20,
        "complete_prob": 0.35,
        "pending_prob": 0.10,
        "avg_appointments": 8,
        "lead_time_days": (1, 14),  # Citas con poca antelación
        "age_range": (18, 45),
        "whatsapp_confirm_rate": 0.3,
    },
    "medio": {
        "weight": 0.45,  # 45% medio
        "no_show_prob": 0.15,
        "cancel_prob": 0.15,
        "complete_prob": 0.55,
        "pending_prob": 0.15,
        "avg_appointments": 5,
        "lead_time_days": (7, 30),
        "age_range": (25, 60),
        "whatsapp_confirm_rate": 0.6,
    },
    "bajo": {
        "weight": 0.30,  # 30% bajo
        "no_show_prob": 0.03,
        "cancel_prob": 0.08,
        "complete_prob": 0.75,
        "pending_prob": 0.14,
        "avg_appointments": 4,
        "lead_time_days": (14, 60),
        "age_range": (30, 75),
        "whatsapp_confirm_rate": 0.85,
    }
}

ESPECIALIDADES = [
    "Pediatría", "Cardiología", "Dermatología", "Medicina General",
    "Ginecología", "Oftalmología", "Traumatología", "Neurología",
    "Psiquiatría", "Endocrinología"
]

MEDICOS = [
    (1, "Pediatría"), (2, "Cardiología"), (3, "Dermatología"),
    (4, "Medicina General"), (5, "Ginecología"), (6, "Oftalmología"),
    (7, "Traumatología"), (8, "Neurología"), (9, "Psiquiatría"),
    (10, "Endocrinología")
]

SEDES = [1, 2, 3]
GENEROS = ["M", "F"]
CANALES = ["WhatsApp", "SMS", "WhatsApp+SMS", "Email", "Llamada"]
ESTADOS_CITA = ["Completada", "No-Asistio", "Cancelada", "Confirmada", "Pendiente"]
ESTADOS_ENTREGA = ["Entregado", "Pendiente", "Fallido", "Leido"]
RESPUESTAS = [None, 0, 1]  # None = no respuesta, 0 = no confirma, 1 = confirma


def get_connection():
    return pymysql.connect(**DB_CONFIG)


def clear_existing_data(cursor):
    """Limpia datos de prueba anteriores (mantiene estructura)"""
    # Eliminar en orden por FK
    cursor.execute("DELETE FROM recordatorios WHERE cita_id IN (SELECT cita_id FROM citas WHERE paciente_id > 8)")
    cursor.execute("DELETE FROM citas WHERE paciente_id > 8")
    cursor.execute("DELETE FROM pacientes WHERE paciente_id > 8")
    print("Datos de prueba anteriores eliminados")


def insert_pacientes(cursor, n_pacientes: int = 300) -> List[Dict]:
    """Inserta pacientes con perfiles de riesgo variados"""
    pacientes = []

    # Calcular cuántos de cada perfil
    n_alto = int(n_pacientes * RISK_PROFILES["alto"]["weight"])
    n_medio = int(n_pacientes * RISK_PROFILES["medio"]["weight"])
    n_bajo = n_pacientes - n_alto - n_medio

    profile_counts = {"alto": n_alto, "medio": n_medio, "bajo": n_bajo}
    print(f"Generando pacientes: Alto={n_alto}, Medio={n_medio}, Bajo={n_bajo}")

    paciente_id = 9  # Empezar después de los 8 existentes

    for profile_name, count in profile_counts.items():
        profile = RISK_PROFILES[profile_name]

        for i in range(count):
            edad = random.randint(*profile["age_range"])
            # Fecha nacimiento basada en edad
            nacimiento_year = datetime.now().year - edad
            nacimiento_month = random.randint(1, 12)
            nacimiento_day = random.randint(1, 28)
            fecha_nac = date(nacimiento_year, nacimiento_month, nacimiento_day)

            genero = random.choice(GENEROS)
            whatsapp_lid = f"lid_{paciente_id}" if random.random() > 0.1 else None
            direccion = f"Calle {random.randint(1,100)} #{random.randint(1,99)}-{random.randint(1,99)}"
            tiene_lid = 1 if whatsapp_lid else 0

            nombre_completo = generate_nombre_completo()
            documento_id = generate_documento_id(paciente_id)
            telefono_whatsapp = generate_telefono_whatsapp()

            cursor.execute("""
                INSERT INTO pacientes (paciente_id, nombre_completo, documento_id, telefono_whatsapp,
                                      fecha_nacimiento, genero, whatsapp_lid, direccion)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (paciente_id, nombre_completo, documento_id, telefono_whatsapp,
                  fecha_nac, genero, whatsapp_lid, direccion))

            pacientes.append({
                "paciente_id": paciente_id,
                "profile": profile_name,
                "edad": edad,
                "genero": genero,
                "whatsapp_lid": whatsapp_lid,
                "direccion": direccion,
                "tiene_lid": tiene_lid,
                "whatsapp_confirm_rate": profile["whatsapp_confirm_rate"]
            })
            paciente_id += 1

    print(f"Insertados {len(pacientes)} pacientes nuevos")
    return pacientes


def generate_appointment_history(paciente: Dict, reference_date: date) -> List[Dict]:
    """Genera historial de citas para un paciente según su perfil"""
    profile = RISK_PROFILES[paciente["profile"]]
    n_citas = max(1, int(random.gauss(profile["avg_appointments"], 2)))

    citas = []
    # Generar citas distribuidas en los últimos 365 días
    for i in range(n_citas):
        # Fecha de cita aleatoria en el último año
        days_ago = random.randint(0, 365)
        fecha_cita = reference_date - timedelta(days=days_ago)

        # Saltar si es futuro muy lejano (más de 90 días)
        if (fecha_cita - reference_date).days > 90:
            continue

        # Hora de cita (7am - 6pm)
        hora = random.randint(7, 17)
        hora_cita = timedelta(hours=hora, minutes=random.choice([0, 15, 30, 45]))

        # Médico y especialidad
        medico_id, especialidad = random.choice(MEDICOS)
        sede_id = random.choice(SEDES)

        # Estado de cita según probabilidades del perfil
        rand = random.random()
        if rand < profile["no_show_prob"]:
            estado = "No-Asistio"
        elif rand < profile["no_show_prob"] + profile["cancel_prob"]:
            estado = "Cancelada"
        elif rand < profile["no_show_prob"] + profile["cancel_prob"] + profile["complete_prob"]:
            estado = "Completada"
        else:
            estado = "Pendiente" if fecha_cita >= reference_date else "Confirmada"

        # Fecha creación (antes de la cita)
        lead_days = random.randint(*profile["lead_time_days"])
        fecha_creacion = fecha_cita - timedelta(days=lead_days)
        if fecha_creacion > reference_date:
            fecha_creacion = reference_date - timedelta(days=1)

        # Recordatorio
        canal = random.choice(CANALES)
        if canal in ["WhatsApp", "WhatsApp+SMS"]:
            # Tasa de confirmación según perfil
            respuesta = 1 if random.random() < paciente["whatsapp_confirm_rate"] else 0
            estado_entrega = "Entregado" if random.random() > 0.05 else "Fallido"
        else:
            respuesta = None
            estado_entrega = random.choice(ESTADOS_ENTREGA)

        fecha_envio = fecha_cita - timedelta(days=random.randint(1, 3))
        if fecha_envio < fecha_creacion:
            fecha_envio = fecha_creacion + timedelta(hours=1)

        citas.append({
            "paciente_id": paciente["paciente_id"],
            "fecha_cita": fecha_cita,
            "hora_cita": hora_cita,
            "estado": estado,
            "fecha_creacion": fecha_creacion,
            "medico_id": medico_id,
            "sede_id": sede_id,
            "especialidad": especialidad,
            "canal_envio": canal,
            "estado_entrega": estado_entrega,
            "fecha_envio": fecha_envio,
            "respuesta_paciente": respuesta
        })

    return citas


def get_valid_schedules(cursor):
    """Obtiene horarios válidos de la base de datos"""
    cursor.execute("""
        SELECT medico_id, sede_id, dia_semana, hora_inicio, hora_fin
        FROM horarios
        WHERE activo = 1
    """)
    schedules = cursor.fetchall()

    # Organizar por (medico_id, sede_id, dia_semana)
    schedule_map = {}
    for s in schedules:
        key = (s['medico_id'], s['sede_id'], s['dia_semana'])
        if key not in schedule_map:
            schedule_map[key] = []
        schedule_map[key].append({
            'hora_inicio': s['hora_inicio'],
            'hora_fin': s['hora_fin']
        })
    return schedule_map


def generate_appointment_history(paciente: Dict, reference_date: date, valid_schedules: Dict) -> List[Dict]:
    """Genera historial de citas para un paciente según su perfil, usando horarios válidos"""
    profile = RISK_PROFILES[paciente["profile"]]
    n_citas = max(1, int(random.gauss(profile["avg_appointments"], 2)))

    citas = []
    # Generar citas distribuidas en los últimos 365 días
    for i in range(n_citas):
        # Fecha de cita aleatoria en el último año
        days_ago = random.randint(0, 365)
        fecha_cita = reference_date - timedelta(days=days_ago)

        # Saltar si es futuro muy lejano (más de 90 días)
        if (fecha_cita - reference_date).days > 90:
            continue

        # Día de la semana (0=Domingo en MySQL)
        dia_semana = (fecha_cita.weekday() + 1) % 7  # Python: Mon=0, MySQL: Sun=0

        # Elegir médico y sede que tengan horario para este día
        valid_keys = [(med, sed) for (med, sed, d) in valid_schedules.keys() if d == dia_semana]
        if not valid_keys:
            continue  # No hay médicos disponibles para este día

        medico_id, sede_id = random.choice(valid_keys)
        schedule_info = valid_schedules[(medico_id, sede_id, dia_semana)]

        # Elegir un slot de horario válido
        slot = random.choice(schedule_info)
        hora_inicio = slot['hora_inicio']
        hora_fin = slot['hora_fin']

        # Convertir a horas para random (manejar timedelta y time objects)
        def parse_hour(time_obj):
            if hasattr(time_obj, 'hour'):
                return time_obj.hour
            # timedelta or string format
            s = str(time_obj)
            return int(s.split(':')[0])

        inicio_hora = parse_hour(hora_inicio)
        fin_hora = parse_hour(hora_fin)

        # Hora de cita (dentro del horario válido)
        hora = random.randint(inicio_hora, max(inicio_hora, fin_hora - 1))
        hora_cita = timedelta(hours=hora, minutes=random.choice([0, 15, 30, 45]))

        # Especialidad del médico
        especialidad = next((esp for med, esp in MEDICOS if med == medico_id), "Medicina General")

        # Estado de cita según probabilidades del perfil
        rand = random.random()
        if rand < profile["no_show_prob"]:
            estado = "No-Asistio"
        elif rand < profile["no_show_prob"] + profile["cancel_prob"]:
            estado = "Cancelada"
        elif rand < profile["no_show_prob"] + profile["cancel_prob"] + profile["complete_prob"]:
            estado = "Completada"
        else:
            estado = "Pendiente" if fecha_cita >= reference_date else "Confirmada"

        # Fecha creación (antes de la cita)
        lead_days = random.randint(*profile["lead_time_days"])
        fecha_creacion = fecha_cita - timedelta(days=lead_days)
        if fecha_creacion > reference_date:
            fecha_creacion = reference_date - timedelta(days=1)

        # Recordatorio
        canal = random.choice(CANALES)
        if canal in ["WhatsApp", "WhatsApp+SMS"]:
            # Tasa de confirmación según perfil
            respuesta = 1 if random.random() < paciente["whatsapp_confirm_rate"] else 0
            estado_entrega = "Entregado" if random.random() > 0.05 else "Fallido"
        else:
            respuesta = None
            estado_entrega = random.choice(ESTADOS_ENTREGA)

        fecha_envio = fecha_cita - timedelta(days=random.randint(1, 3))
        if fecha_envio < fecha_creacion:
            fecha_envio = fecha_creacion + timedelta(hours=1)

        citas.append({
            "paciente_id": paciente["paciente_id"],
            "fecha_cita": fecha_cita,
            "hora_cita": hora_cita,
            "estado": estado,
            "fecha_creacion": fecha_creacion,
            "medico_id": medico_id,
            "sede_id": sede_id,
            "especialidad": especialidad,
            "canal_envio": canal,
            "estado_entrega": estado_entrega,
            "fecha_envio": fecha_envio,
            "respuesta_paciente": respuesta
        })

    return citas


def insert_citas_and_recordatorios(cursor, pacientes: List[Dict], reference_date: date):
    """Inserta citas y recordatorios para todos los pacientes"""
    # Obtener horarios válidos
    valid_schedules = get_valid_schedules(cursor)

    cita_id = 41  # Continuar después de los 40 existentes
    total_citas = 0
    total_recordatorios = 0

    for paciente in pacientes:
        citas = generate_appointment_history(paciente, reference_date, valid_schedules)

        for cita in citas:
            # Insertar cita
            cursor.execute("""
                INSERT INTO citas (cita_id, paciente_id, fecha_cita, hora_cita, estado,
                                  fecha_creacion, medico_id, sede_id)
                VALUES (%s, %s, %s, %s, %s, %s, %s, %s)
            """, (cita_id, cita["paciente_id"], cita["fecha_cita"], cita["hora_cita"],
                  cita["estado"], cita["fecha_creacion"], cita["medico_id"], cita["sede_id"]))
            total_citas += 1

            # Insertar recordatorio (80% probabilidad) - dejar que la BD auto-incremente recordatorio_id
            if random.random() < 0.8:
                cursor.execute("""
                    INSERT INTO recordatorios (cita_id, canal_envio,
                                              estado_entrega, fecha_envio, respuesta_paciente)
                    VALUES (%s, %s, %s, %s, %s)
                """, (cita_id, cita["canal_envio"],
                      cita["estado_entrega"], cita["fecha_envio"], cita["respuesta_paciente"]))
                total_recordatorios += 1

            cita_id += 1

    print(f"Insertadas {total_citas} citas y {total_recordatorios} recordatorios")
    return total_citas, total_recordatorios


def verify_data(cursor):
    """Verifica que los datos se insertaron correctamente"""
    cursor.execute("SELECT COUNT(*) as c FROM pacientes WHERE paciente_id > 8")
    n_pac = cursor.fetchone()["c"]

    cursor.execute("SELECT COUNT(*) as c FROM citas WHERE paciente_id > 8")
    n_cit = cursor.fetchone()["c"]

    cursor.execute("SELECT COUNT(*) as c FROM recordatorios WHERE cita_id IN (SELECT cita_id FROM citas WHERE paciente_id > 8)")
    n_rec = cursor.fetchone()["c"]

    # Distribución de estados
    cursor.execute("""
        SELECT estado, COUNT(*) as c
        FROM citas WHERE paciente_id > 8
        GROUP BY estado
    """)
    estados = cursor.fetchall()

    # Distribución de perfiles (via no-show rate)
    cursor.execute("""
        SELECT p.paciente_id,
               SUM(CASE WHEN c.estado = 'No-Asistio' THEN 1 ELSE 0 END) as no_shows,
               COUNT(*) as total
        FROM pacientes p
        JOIN citas c ON c.paciente_id = p.paciente_id
        WHERE p.paciente_id > 8
        GROUP BY p.paciente_id
        HAVING total > 0
    """)
    perfiles = cursor.fetchall()

    no_show_rates = [p["no_shows"] / p["total"] for p in perfiles if p["total"] > 0]

    print(f"\n--- Verificación ---")
    print(f"Pacientes nuevos: {n_pac}")
    print(f"Citas nuevas: {n_cit}")
    print(f"Recordatorios nuevos: {n_rec}")
    print(f"Estados de citas: {[(e['estado'], e['c']) for e in estados]}")
    print(f"Tasa no-show promedio: {sum(no_show_rates)/len(no_show_rates):.2%}" if no_show_rates else "N/A")
    print(f"Rango tasas no-show: {min(no_show_rates):.2%} - {max(no_show_rates):.2%}" if no_show_rates else "N/A")


def main():
    n_pacientes = int(sys.argv[1]) if len(sys.argv) > 1 else 300

    print(f"=== Generando {n_pacientes} pacientes de entrenamiento ===")
    print(f"Fecha de referencia: {date.today()}")

    conn = get_connection()
    cursor = conn.cursor()

    try:
        clear_existing_data(cursor)
        pacientes = insert_pacientes(cursor, n_pacientes)
        insert_citas_and_recordatorios(cursor, pacientes, date.today())
        verify_data(cursor)
        print("\n✅ Generación de datos completada exitosamente")
    except Exception as e:
        print(f"❌ Error: {e}")
        conn.rollback()
        raise
    finally:
        cursor.close()
        conn.close()


if __name__ == "__main__":
    main()