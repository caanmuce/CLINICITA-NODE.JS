"""Entrenamiento del modelo simple (sin Optuna)"""
import pandas as pd
import numpy as np
import xgboost as xgb
import mlflow
import mlflow.xgboost
import joblib
import os
from datetime import datetime
from typing import Tuple, Dict, Any
from sklearn.model_selection import StratifiedKFold
from sklearn.metrics import roc_auc_score
from sklearn.preprocessing import LabelEncoder
import logging

logger = logging.getLogger(__name__)


class ModelTrainer:
    def __init__(self, feature_builder, db_pool, mlflow_uri: str = None):
        self.feature_builder = feature_builder
        self.db_pool = db_pool
        self.mlflow_uri = mlflow_uri or os.getenv("MLFLOW_TRACKING_URI", "http://mlflow:5000")
        mlflow.set_tracking_uri(self.mlflow_uri)
        mlflow.set_experiment("clinicita-no-show-risk")

    def prepare_training_data(self) -> Tuple[pd.DataFrame, pd.Series, pd.Series]:
        """Prepara X, y para entrenamiento"""
        logger.info("Construyendo features para entrenamiento...")
        features_df = self.feature_builder.build_features()

        if features_df.empty:
            raise ValueError("No hay datos para entrenar")

        # Target: predecir riesgo de No-Asistio basado en historial reciente
        # target = 1 si el paciente tuvo al menos 1 No-Asistio en los últimos 90 días
        # (proxy simple y efectivo para riesgo alto; en producción se usaría ventana temporal)
        target_query = """
        SELECT paciente_id,
               CAST(CASE WHEN SUM(CASE WHEN estado = 'No-Asistio' THEN 1 ELSE 0 END) > 0 THEN 1 ELSE 0 END AS UNSIGNED) AS target
        FROM citas
        WHERE fecha_cita >= DATE_SUB(CURDATE(), INTERVAL 90 DAY)
        GROUP BY paciente_id
        """

        import pymysql
        with self.db_pool.get_conn() as conn:
            with conn.cursor() as cursor:
                cursor.execute(target_query)
                targets = pd.DataFrame(cursor.fetchall())

        # Merge features + target
        data = features_df.merge(targets[['paciente_id', 'target']], on='paciente_id', how='left')

        data['target'] = pd.to_numeric(data['target'], errors='coerce').fillna(0).astype(int)  # Sin próxima cita = 0

        # Preparar X, y
        exclude_cols = ['paciente_id', 'target', 'genero']
        cat_cols = ['genero']

        # Encode categóricos
        for col in cat_cols:
            if col in data.columns:
                le = LabelEncoder()
                data[col] = le.fit_transform(data[col].astype(str))

        X = data.drop(columns=[c for c in exclude_cols if c in data.columns])
        y = data['target']
        paciente_ids = data['paciente_id']

        logger.info(f"Datos preparados: {X.shape[0]} muestras, {X.shape[1]} features, target rate: {y.mean():.3f}")
        return X, y, paciente_ids

    def train(self, n_trials: int = 50) -> Dict[str, Any]:
        """Entrena modelo simple (sin Optuna para datasets pequeños)"""
        X, y, paciente_ids = self.prepare_training_data()

        # Parámetros fijos conservadores para datasets pequeños
        n_samples = X.shape[0]
        minority_count = min(int(y.sum()), len(y) - int(y.sum()))

        final_params = {
            'objective': 'binary:logistic',
            'eval_metric': 'auc',
            'tree_method': 'hist',
            'verbosity': 0,
            'n_estimators': 50,  # Pocos árboles para evitar overfitting
            'max_depth': 2,      # Profundidad muy baja
            'learning_rate': 0.1,
            'subsample': 0.8,
            'colsample_bytree': 0.8,
            'min_child_weight': 5,
            'gamma': 1,
            'reg_alpha': 1,
            'reg_lambda': 1,
            'scale_pos_weight': (y == 0).sum() / max((y == 1).sum(), 1)
        }

        logger.info(f"Entrenando modelo simple con {n_samples} muestras, {X.shape[1]} features, target rate: {y.mean():.3f}")

        model = xgb.XGBClassifier(**final_params, random_state=42)
        model.fit(X, y)

        # Evaluación final (en los mismos datos - solo para referencia)
        y_pred_proba = model.predict_proba(X)[:, 1]
        auc = roc_auc_score(y, y_pred_proba)
        logger.info(f"AUC en entrenamiento: {auc:.4f}")

        # Feature importance
        importance = pd.DataFrame({
            'feature': X.columns,
            'importance': model.feature_importances_
        }).sort_values('importance', ascending=False)

        # Calibración de probabilidades (Platt scaling) - saltar para datasets pequeños
        # La calibración con CV causa problemas de dtype con XGBoost en datasets pequeños
        logger.warning("Saltando calibración para dataset pequeño; usando modelo sin calibrar")
        calibrated = model

        # Logging MLflow
        with mlflow.start_run() as run:
            mlflow.log_params(final_params)
            mlflow.log_metric("auc", auc)
            mlflow.log_metric("n_samples", len(X))
            mlflow.log_metric("target_rate", y.mean())

            # Log feature importance
            importance.to_csv("feature_importance.csv", index=False)
            mlflow.log_artifact("feature_importance.csv")

            # Log modelo
            mlflow.xgboost.log_model(calibrated, "model", registered_model_name="clinicita-no-show")

            run_id = run.info.run_id

        # Guardar localmente para serving rápido
        model_dir = "/models"
        os.makedirs(model_dir, exist_ok=True)
        model_path = os.path.join(model_dir, f"no_show_model_{run_id}.pkl")

        joblib.dump({
            'model': calibrated,
            'feature_names': list(X.columns),
            'run_id': run_id,
            'auc': auc,
            'params': final_params,
            'trained_at': datetime.now().isoformat()
        }, model_path)

        logger.info(f"Modelo guardado en: {model_path}")

        return {
            'model_path': model_path,
            'run_id': run_id,
            'auc': auc,
            'feature_importance': importance.to_dict('records'),
            'feature_names': list(X.columns)
        }