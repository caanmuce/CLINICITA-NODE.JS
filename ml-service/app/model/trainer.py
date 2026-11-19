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
from sklearn.model_selection import StratifiedGroupKFold
from sklearn.metrics import roc_auc_score, average_precision_score
import logging

logger = logging.getLogger(__name__)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)


class ModelTrainer:
    def __init__(self, feature_builder, db_pool, mlflow_uri: str = None):
        self.feature_builder = feature_builder
        self.db_pool = db_pool
        self.mlflow_uri = mlflow_uri or os.getenv("MLFLOW_TRACKING_URI", "http://mlflow:5000")
        mlflow.set_tracking_uri(self.mlflow_uri)
        mlflow.set_experiment("clinicita-no-show-risk")
        self.feature_encoders = {}

    def prepare_training_data(self) -> Tuple[pd.DataFrame, pd.Series, pd.Series, pd.DataFrame]:
        """Prepara X, y para entrenamiento"""
        logger.info("Construyendo features para entrenamiento...")
        features_df = self.feature_builder.build_training_dataset()

        if features_df.empty:
            raise ValueError("No hay datos para entrenar")

        data = features_df.copy()
        data['target'] = pd.to_numeric(data['target'], errors='coerce').fillna(0).astype(int)

        # Preparar X, y. _cita_datetime se conserva para diagnostico temporal,
        # pero nunca se entrega a XGB como feature.
        exclude_cols = ['paciente_id', 'target', 'genero', '_cita_datetime']
        X = data.drop(columns=[c for c in exclude_cols if c in data.columns])
        for col in X.columns:
            if col != 'especialidad':
                X[col] = pd.to_numeric(X[col], errors='coerce').fillna(-1)
        y = data['target']
        paciente_ids = data['paciente_id']

        logger.info(f"Datos preparados: {X.shape[0]} muestras, {X.shape[1]} features, target rate: {y.mean():.3f}")
        return X, y, paciente_ids, data

    def log_ml_diagnostics(self, data, X, y, paciente_ids,
                           train_idx=None, test_idx=None):
        """Registra formas, corte temporal, columnas y correlaciones sospechosas."""
        logger.info(
            "ML_DIAGNOSTICS dataset_shape=%s features=%d target_rate=%.4f",
            X.shape,
            X.shape[1],
            float(y.mean()),
        )

        if train_idx is not None:
            logger.info(
                "ML_SPLIT train_shape=%s test_shape=%s",
                X.iloc[train_idx].shape,
                X.iloc[test_idx].shape,
            )

        date_columns = [
            c for c in ('_cita_datetime', 'fecha_cita', 'appointment_datetime')
            if c in data.columns
        ]
        if date_columns:
            date_col = date_columns[0]
            dates = pd.to_datetime(data[date_col], errors='coerce').dropna()
            logger.info(
                "ML_DIAGNOSTICS date_column=%s range=%s..%s",
                date_col,
                dates.min(),
                dates.max(),
            )
        else:
            logger.warning(
                "ML_DIAGNOSTICS no_date_column_retained temporal_split_not_possible"
            )

        logger.info("ML_DIAGNOSTICS x_columns=%s", list(X.columns))

        if paciente_ids is not None:
            if train_idx is not None:
                train_patients = set(paciente_ids.iloc[train_idx])
                test_patients = set(paciente_ids.iloc[test_idx])
                overlap = train_patients & test_patients
                logger.info(
                    "ML_DIAGNOSTICS patient_overlap=%d train_patients=%d test_patients=%d",
                    len(overlap),
                    len(train_patients),
                    len(test_patients),
                )

        diagnostic_X = X.copy()
        diagnostic_y = y.copy()
        if train_idx is not None:
            diagnostic_X = X.iloc[train_idx]
            diagnostic_y = y.iloc[train_idx]

        numeric_X = diagnostic_X.select_dtypes(include=[np.number])
        if not numeric_X.empty:
            correlations = (
                numeric_X.assign(_target=diagnostic_y.to_numpy())
                .corr(numeric_only=True)['_target']
                .drop(labels=['_target'], errors='ignore')
                .dropna()
                .sort_values(key=lambda s: s.abs(), ascending=False)
            )
            logger.info(
                "ML_DIAGNOSTICS top_target_correlations=%s",
                correlations.head(20).round(6).to_dict(),
            )

    def encode_fold_categories(self, X_train, X_validation):
        X_train_encoded = X_train.copy()
        X_validation_encoded = X_validation.copy()

        for col in ('especialidad',):
            if col not in X_train_encoded.columns:
                continue
            values = sorted(
                X_train_encoded[col].fillna('Desconocida').astype(str).unique()
            )
            encoder = {value: index for index, value in enumerate(values)}
            X_train_encoded[col] = (
                X_train_encoded[col].fillna('Desconocida')
                .astype(str).map(encoder).fillna(-1)
            )
            X_validation_encoded[col] = (
                X_validation_encoded[col].fillna('Desconocida')
                .astype(str).map(encoder).fillna(-1)
            )

        return X_train_encoded, X_validation_encoded

    def train(self, n_trials: int = 50) -> Dict[str, Any]:
        """Entrena modelo simple (sin Optuna para datasets pequeños)"""
        X, y, paciente_ids, data = self.prepare_training_data()
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

        n_samples = X.shape[0]
        logger.info(f"Entrenando modelo simple con {n_samples} muestras, {X.shape[1]} features, target rate: {y.mean():.3f}")
        self.log_ml_diagnostics(data, X, y, paciente_ids)

        n_patients = paciente_ids.nunique()
        n_splits = min(5, n_patients)
        if n_splits < 2:
            raise ValueError("Se necesitan al menos 2 pacientes para validacion por grupos")

        splitter = StratifiedGroupKFold(
            n_splits=n_splits,
            shuffle=True,
            random_state=42,
        )
        roc_auc_scores = []
        pr_auc_scores = []

        for fold, (train_idx, test_idx) in enumerate(
            splitter.split(X, y, groups=paciente_ids),
            start=1,
        ):
            X_train_raw = X.iloc[train_idx]
            X_test_raw = X.iloc[test_idx]
            y_train = y.iloc[train_idx]
            y_test = y.iloc[test_idx]

            self.log_ml_diagnostics(
                data,
                X,
                y,
                paciente_ids,
                train_idx=train_idx,
                test_idx=test_idx,
            )
            X_train, X_test = self.encode_fold_categories(
                X_train_raw,
                X_test_raw,
            )

            fold_params = final_params.copy()
            fold_params['scale_pos_weight'] = (
                (y_train == 0).sum() / max((y_train == 1).sum(), 1)
            )
            fold_model = xgb.XGBClassifier(
                **fold_params,
                random_state=42,
            )
            fold_model.fit(X_train, y_train)
            y_proba = fold_model.predict_proba(X_test)[:, 1]

            if len(np.unique(y_test)) < 2:
                logger.warning(
                    "ML_VALIDATION fold=%d skipped_auc_only_one_class",
                    fold,
                )
                continue

            fold_roc_auc = roc_auc_score(y_test, y_proba)
            fold_pr_auc = average_precision_score(y_test, y_proba)
            roc_auc_scores.append(fold_roc_auc)
            pr_auc_scores.append(fold_pr_auc)
            logger.info(
                "ML_VALIDATION fold=%d roc_auc=%.6f pr_auc=%.6f "
                "train_shape=%s test_shape=%s",
                fold,
                fold_roc_auc,
                fold_pr_auc,
                X_train.shape,
                X_test.shape,
            )

        if not roc_auc_scores:
            raise ValueError(
                "No fue posible calcular ROC-AUC out-of-fold: "
                "los folds no contienen ambas clases"
            )

        mean_roc_auc = float(np.mean(roc_auc_scores))
        mean_pr_auc = float(np.mean(pr_auc_scores))
        logger.info(
            "ML_VALIDATION out_of_fold mean_roc_auc=%.6f "
            "mean_pr_auc=%.6f folds=%d",
            mean_roc_auc,
            mean_pr_auc,
            len(roc_auc_scores),
        )
        logger.info(
            "ML_VALIDATION temporal_holdout=not_applied "
            "method=StratifiedGroupKFold(n_splits=%d,group=paciente_id)",
            n_splits,
        )

        # Encoding final ajustado exclusivamente con el dataset completo,
        # despues de registrar todas las metricas de validacion.
        X_final = X.copy()
        self.feature_encoders = {}
        for col in ('especialidad',):
            if col not in X_final.columns:
                continue
            values = sorted(
                X_final[col].fillna('Desconocida').astype(str).unique()
            )
            encoder = {value: index for index, value in enumerate(values)}
            self.feature_encoders[col] = encoder
            X_final[col] = (
                X_final[col].fillna('Desconocida')
                .astype(str).map(encoder).fillna(-1)
            )

        model = xgb.XGBClassifier(**final_params, random_state=42)
        model.fit(X_final, y)
        auc = mean_roc_auc

        # Feature importance
        importance = pd.DataFrame({
            'feature': X_final.columns,
            'importance': model.feature_importances_
        }).sort_values('importance', ascending=False)

        # Calibración de probabilidades (Platt scaling) - saltar para datasets pequeños
        # La calibración con CV causa problemas de dtype con XGBoost en datasets pequeños
        logger.warning("Saltando calibración para dataset pequeño; usando modelo sin calibrar")
        calibrated = model

        # Logging MLflow
        with mlflow.start_run() as run:
            mlflow.log_params(final_params)
            mlflow.log_metric("roc_auc_oof", mean_roc_auc)
            mlflow.log_metric("pr_auc_oof", mean_pr_auc)
            mlflow.log_metric("auc", mean_roc_auc)
            mlflow.log_metric("n_samples", len(X))
            mlflow.log_metric("target_rate", y.mean())

            # Log feature importance
            importance.to_csv("feature_importance.csv", index=False)
            mlflow.log_artifact("feature_importance.csv")

            # Log modelo
            mlflow.xgboost.log_model(calibrated, "model", registered_model_name="clinicita-no-show")

            run_id = run.info.run_id

        # Guardar localmente para serving rápido
        from ..config import settings
        model_dir = settings.model_dir
        os.makedirs(model_dir, exist_ok=True)
        model_path = os.path.join(model_dir, f"no_show_model_{run_id}.pkl")

        joblib.dump({
            'model': calibrated,
            'feature_names': list(X.columns),
            'run_id': run_id,
            'auc': auc,
            'params': final_params,
            'trained_at': datetime.now().isoformat(),
            'feature_encoders': self.feature_encoders
        }, model_path)

        logger.info(f"Modelo guardado en: {model_path}")

        return {
            'model_path': model_path,
            'run_id': run_id,
            'auc': auc,
            'feature_importance': importance.to_dict('records'),
            'feature_names': list(X.columns)
        }