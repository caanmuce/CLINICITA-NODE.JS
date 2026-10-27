"""API FastAPI para servicio de riesgo no-show"""
from fastapi import FastAPI, HTTPException, BackgroundTasks
from contextlib import asynccontextmanager
from typing import List, Optional
import os
import json
import pandas as pd
from datetime import datetime

from .config import settings
from .database import get_db_pool, close_pool
from .features.builder import FeatureBuilder
from .model.predictor import ModelPredictor
from .schemas import (
    RiskResponse, BatchRequest, TrainRequest, HealthResponse,
    TrainResponse, FeatureImportance
)

# Estado global
predictor: Optional[ModelPredictor] = None
feature_builder: Optional[FeatureBuilder] = None


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Inicialización y limpieza"""
    global predictor, feature_builder

    # Inicializar pool y feature builder
    pool = get_db_pool()
    feature_builder = FeatureBuilder(pool)

    # Cargar modelo más reciente
    model_dir = settings.model_dir
    if os.path.exists(model_dir):
        model_files = [f for f in os.listdir(model_dir) if f.endswith('.pkl')]
        if model_files:
            latest = max(model_files, key=lambda f: os.path.getmtime(os.path.join(model_dir, f)))
            predictor = ModelPredictor(os.path.join(model_dir, latest))
            print(f"✅ Modelo cargado: {latest}")
        else:
            print("⚠️ No hay modelo entrenado. Entrena primero con POST /train")
    else:
        print(f"⚠️ Directorio de modelos no existe: {model_dir}")

    yield

    # Cleanup
    close_pool()


app = FastAPI(
    title="CliniCita No-Show Risk API",
    description="API para predicción de riesgo de inasistencia de pacientes",
    version="1.0.0",
    lifespan=lifespan
)


@app.get("/health", response_model=HealthResponse)
async def health():
    """Health check"""
    return {
        "status": "healthy",
        "model_loaded": predictor is not None,
        "model_version": predictor.model_metadata.get('run_id') if predictor else None
    }


@app.get("/riesgo/{paciente_id}", response_model=RiskResponse)
async def get_riesgo(paciente_id: int):
    """Obtiene riesgo de no-show para un paciente"""
    if not predictor:
        raise HTTPException(503, "Modelo no cargado. Entrena primero con POST /train")

    features_df = feature_builder.build_features([paciente_id])
    if features_df.empty:
        raise HTTPException(404, "Paciente sin historial suficiente")

    result = predictor.predict(features_df.iloc[0])
    return result


@app.post("/riesgo/batch", response_model=List[RiskResponse])
async def get_riesgo_batch(request: BatchRequest):
    """Obtiene riesgo para múltiples pacientes"""
    if not predictor:
        raise HTTPException(503, "Modelo no cargado")

    if len(request.paciente_ids) > 100:
        raise HTTPException(400, "Máximo 100 IDs por petición")

    features_df = feature_builder.build_features(request.paciente_ids)
    if features_df.empty:
        return []

    results = predictor.predict_batch(features_df)
    return results


@app.post("/train", response_model=TrainResponse)
async def train_model(request: TrainRequest, background_tasks: BackgroundTasks):
    """Dispara reentrenamiento en background"""
    from .model.trainer import ModelTrainer

    def train_background():
        global predictor
        try:
            trainer = ModelTrainer(feature_builder, get_db_pool())
            result = trainer.train(n_trials=request.n_trials)

            # Recargar modelo
            predictor = ModelPredictor(result['model_path'])
            print(f"✅ Modelo reentrenado: {result['run_id']}, AUC: {result['auc']:.4f}")
        except Exception as e:
            print(f"❌ Error en entrenamiento: {e}")

    background_tasks.add_task(train_background)
    return {
        "message": "Entrenamiento iniciado en background",
        "status": "started"
    }


@app.post("/recalcular-todos")
async def recalcular_todos(background_tasks: BackgroundTasks):
    """Recalcula scores para TODOS los pacientes y guarda en BD"""
    if not predictor:
        raise HTTPException(503, "Modelo no cargado")

    def recalcular_background():
        from .database import execute_query, get_db_pool
        pool = get_db_pool()

        # Obtener todos los pacientes con historial
        pacientes = execute_query("SELECT paciente_id FROM pacientes")
        ids = [p['paciente_id'] for p in pacientes]

        print(f"🔄 Recalculando riesgo para {len(ids)} pacientes...")

        # Procesar en chunks
        chunk_size = 100
        for i in range(0, len(ids), chunk_size):
            chunk = ids[i:i+chunk_size]
            features_df = feature_builder.build_features(chunk)

            for _, row in features_df.iterrows():
                result = predictor.predict(row)
                execute_query("""
                    INSERT INTO paciente_riesgo_no_show
                    (paciente_id, score, percentil, nivel_riesgo, features_json, model_version)
                    VALUES (%s, %s, %s, %s, %s, %s)
                    ON DUPLICATE KEY UPDATE
                        score=VALUES(score), percentil=VALUES(percentil),
                        nivel_riesgo=VALUES(nivel_riesgo), features_json=VALUES(features_json),
                        model_version=VALUES(model_version), calculado_en=NOW()
                """, (
                    int(row['paciente_id']),
                    result['score'],
                    result['percentil'],
                    result['nivel_riesgo'],
                    json.dumps(result['features_principales']),
                    result['model_version']
                ))

        print(f"✅ Recalculados {len(ids)} pacientes")

    background_tasks.add_task(recalcular_background)
    return {"message": "Recálculo masivo iniciado", "status": "started"}