"""Feature engineering para riesgo de no-show"""
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional
import logging

logger = logging.getLogger(__name__)


class FeatureBuilder:
    """Construye features de riesgo no-show por paciente"""

    def __init__(self, db_pool):
        self.db_pool = db_pool
        self.reference_date = datetime.now()

    def build_features(self, paciente_ids: List[int] = None) -> pd.DataFrame:
        """Extrae y calcula todas las features para pacientes dados"""

        where_clause = "WHERE 1=1"
        params = []
        if paciente_ids:
            placeholders = ",".join(["%s"] * len(paciente_ids))
            where_clause += f" AND c.paciente_id IN ({placeholders})"
            params.extend(paciente_ids)

        query = f"""
        SELECT
            c.paciente_id,
            c.cita_id,
            c.fecha_cita,
            c.hora_cita,
            c.estado,
            c.fecha_creacion,
            c.medico_id,
            c.sede_id,
            m.especialidad,
            p.fecha_nacimiento,
            p.genero,
            p.whatsapp_lid,
            p.direccion,
            r.canal_envio,
            r.estado_entrega,
            r.fecha_envio,
            r.respuesta_paciente
        FROM citas c
        JOIN pacientes p ON p.paciente_id = c.paciente_id
        JOIN medicos m ON m.medico_id = c.medico_id
        LEFT JOIN recordatorios r ON r.cita_id = c.cita_id
        {where_clause}
        ORDER BY c.paciente_id, c.fecha_cita, c.hora_cita
        """

        try:
            import pymysql
            with self.db_pool.get_conn() as conn:
                with conn.cursor() as cursor:
                    cursor.execute(query, params)
                    rows = cursor.fetchall()
                    df = pd.DataFrame(rows)
        except Exception as e:
            logger.error(f"Error ejecutando query de features: {e}")
            return pd.DataFrame()

        if df.empty:
            logger.warning("No se encontraron datos para construir features")
            return pd.DataFrame()

        # Feature engineering por paciente
        features_list = []
        for pid, group in df.groupby('paciente_id'):
            feat = self._compute_patient_features(pid, group)
            features_list.append(feat)

        result_df = pd.DataFrame(features_list)
        logger.info(f"Features construidas: {result_df.shape[0]} pacientes, {result_df.shape[1]} features")

        return result_df

    def _compute_patient_features(self, pid: int, df: pd.DataFrame) -> Dict:
        """Calcula features para un paciente individual"""
        now = self.reference_date

        # Básicas
        total_citas = len(df)
        citas_completadas = len(df[df['estado'] == 'Completada'])
        citas_no_show = len(df[df['estado'] == 'No-Asistio'])
        citas_canceladas = len(df[df['estado'] == 'Cancelada'])
        citas_confirmadas = len(df[df['estado'] == 'Confirmada'])
        citas_pendientes = len(df[df['estado'] == 'Pendiente'])

        # Features temporales
        df['fecha_creacion'] = pd.to_datetime(df['fecha_creacion'], errors='coerce')
        df['fecha_cita'] = pd.to_datetime(df['fecha_cita'], errors='coerce')
        df['antelacion_dias'] = (df['fecha_cita'] - df['fecha_creacion']).dt.days

        # Hora de la cita (0-23)
        df['hora_cita_num'] = pd.to_datetime(df['hora_cita'], format='%H:%M:%S', errors='coerce').dt.hour
        df['es_manana'] = df['hora_cita_num'] < 12

        # Día de semana (0=Lunes)
        df['dia_semana'] = df['fecha_cita'].dt.dayofweek

        # Ventana reciente (últimos 90 días)
        cutoff_90 = now - timedelta(days=90)
        recent = df[df['fecha_cita'] >= cutoff_90]

        # Features de WhatsApp
        wa_msgs = df.dropna(subset=['canal_envio'])
        wa_confirmados = len(wa_msgs[(wa_msgs['canal_envio'] == 'WhatsApp') & (wa_msgs['respuesta_paciente'] == 1)])
        wa_enviados = len(wa_msgs[wa_msgs['canal_envio'] == 'WhatsApp'])
        wa_tasa_confirmacion = wa_confirmados / wa_enviados if wa_enviados > 0 else 0

        # Tiempo respuesta promedio (placeholder - necesitaría timestamp real de respuesta)
        tiempo_resp_promedio = -1

        # Médico/especialidad habitual
        medico_frecuente = df['medico_id'].mode().iloc[0] if not df['medico_id'].mode().empty else None
        especialidad_frecuente = df['especialidad'].mode().iloc[0] if not df['especialidad'].mode().empty else None

        # Edad
        edad = -1
        if pd.notna(df['fecha_nacimiento'].iloc[0]):
            nacimiento = pd.to_datetime(df['fecha_nacimiento'].iloc[0], errors='coerce')
            if pd.notna(nacimiento):
                edad = (now - nacimiento).days / 365.25

        # Tiene LID vinculado
        tiene_lid = pd.notna(df['whatsapp_lid'].iloc[0]) and df['whatsapp_lid'].iloc[0] != ''

        # Features compuestas
        features = {
            'paciente_id': pid,
            # Volumen
            'total_citas': total_citas,
            'citas_completadas': citas_completadas,
            'citas_no_show': citas_no_show,
            'citas_canceladas': citas_canceladas,
            'citas_confirmadas': citas_confirmadas,
            'citas_pendientes': citas_pendientes,
            # Tasas históricas
            'tasa_no_show': citas_no_show / total_citas if total_citas > 0 else 0,
            'tasa_cancelacion': citas_canceladas / total_citas if total_citas > 0 else 0,
            'tasa_completada': citas_completadas / total_citas if total_citas > 0 else 0,
            # Recientes (90 días)
            'citas_ultimos_90d': len(recent),
            'no_show_ultimos_90d': len(recent[recent['estado'] == 'No-Asistio']),
            'tasa_no_show_reciente': len(recent[recent['estado'] == 'No-Asistio']) / len(recent) if len(recent) > 0 else 0,
            # Antelación
            'antelacion_promedio': df['antelacion_dias'].mean() if not df['antelacion_dias'].isna().all() else -1,
            'antelacion_mediana': df['antelacion_dias'].median() if not df['antelacion_dias'].isna().all() else -1,
            'antelacion_std': df['antelacion_dias'].std() if not df['antelacion_dias'].isna().all() else -1,
            # Preferencias horarias
            'pct_manana': df['es_manana'].mean() if not df['es_manana'].isna().all() else 0.5,
            'hora_promedio': df['hora_cita_num'].mean() if not df['hora_cita_num'].isna().all() else 12,
            # Día semana preferido
            'dia_semana_moda': int(df['dia_semana'].mode().iloc[0]) if not df['dia_semana'].mode().empty else -1,
            # WhatsApp
            'tiene_lid': int(tiene_lid),
            'wa_tasa_confirmacion': wa_tasa_confirmacion,
            'wa_tiempo_respuesta_promedio': tiempo_resp_promedio,
            # Demográficos
            'edad': edad,
            'genero': df['genero'].iloc[0] if pd.notna(df['genero'].iloc[0]) else 'Otro',
            # Consistencia
            'medico_habitual': float(df['medico_id'].eq(medico_frecuente).mean()) if medico_frecuente else 0,
            'especialidad_habitual': float(df['especialidad'].eq(especialidad_frecuente).mean()) if especialidad_frecuente else 0,
            # Rachas
            'racha_no_show_actual': self._calcular_racha_no_show(df),
            'dias_desde_ultima_cita': (now - df['fecha_cita'].max()).days if total_citas > 0 and pd.notna(df['fecha_cita'].max()) else -1,
            # Próximas citas
            'citas_proximas_30d': len(df[(df['fecha_cita'] >= now) & (df['fecha_cita'] <= now + timedelta(days=30))])
        }

        return features

    def _calcular_racha_no_show(self, df: pd.DataFrame) -> int:
        """Cuenta No-Asistio consecutivos al final del historial"""
        racha = 0
        for estado in reversed(df['estado'].values):
            if estado == 'No-Asistio':
                racha += 1
            else:
                break
        return racha