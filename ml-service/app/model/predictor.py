"""Predictor para inferencia del modelo"""
import joblib
import numpy as np
import pandas as pd
from typing import Any, Dict, List
import os


class ModelPredictor:
    def __init__(self, model_path: str):
        """Carga modelo desde archivo pickle"""
        if not os.path.exists(model_path):
            raise FileNotFoundError(f"Modelo no encontrado: {model_path}")

        artifact = joblib.load(model_path)
        self.model = artifact['model']
        self.feature_names = artifact['feature_names']
        self.model_metadata = {
            'run_id': artifact['run_id'],
            'auc': artifact['auc'],
            'trained_at': artifact['trained_at'],
            'params': artifact['params']
        }
        logger.info(f"Modelo cargado: {artifact['run_id'][:8]}, AUC: {artifact['auc']:.4f}")

    def predict(self, features: pd.Series) -> Dict[str, Any]:
        """Predice riesgo para un paciente"""
        # Alinear features
        X = pd.DataFrame([features])[self.feature_names].fillna(-1)

        # Probabilidad
        prob = self.model.predict_proba(X)[0, 1]
        score = round(prob * 100, 2)

        # Percentil (simplificado - en producción usar distribución de referencia)
        percentil = min(int(score), 99)

        # Nivel de riesgo
        if score >= 70:
            nivel = "Critico"
        elif score >= 50:
            nivel = "Alto"
        elif score >= 30:
            nivel = "Medio"
        else:
            nivel = "Bajo"

        # Top features explicativas
        try:
            importances = self.model.feature_importances_
            top_idx = np.argsort(importances)[-5:][::-1]
            features_principales = {
                self.feature_names[i]: round(float(X.iloc[0, i]), 3)
                for i in top_idx if X.iloc[0, i] != -1
            }
        except:
            features_principales = {}

        return {
            'paciente_id': int(features.get('paciente_id', 0)),
            'score': score,
            'percentil': percentil,
            'nivel_riesgo': nivel,
            'features_principales': features_principales,
            'model_version': self.model_metadata['run_id'][:8],
            'calculado_en': pd.Timestamp.now().isoformat()
        }

    def predict_batch(self, features_df: pd.DataFrame) -> List[Dict[str, Any]]:
        """Predice riesgo para múltiples pacientes"""
        results = []
        for _, row in features_df.iterrows():
            results.append(self.predict(row))
        return results


# Logger simple
import logging
logger = logging.getLogger(__name__)