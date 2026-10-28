#!/usr/bin/env python3
"""Script standalone para entrenar el modelo"""
import sys
import os

# Agregar directorio actual al path
sys.path.insert(0, '/app')

from app.database import get_db_pool
from app.features.builder import FeatureBuilder
from app.model.trainer import ModelTrainer


if __name__ == "__main__":
    print("🔧 Conectando a BD...")
    pool = get_db_pool()

    print("🏗️ Construyendo features...")
    builder = FeatureBuilder(pool)

    print("🤖 Entrenando modelo...")
    trainer = ModelTrainer(builder, pool)
    result = trainer.train(n_trials=100)

    print(f"\n✅ Entrenamiento completado:")
    print(f"   Run ID: {result['run_id']}")
    print(f"   AUC: {result['auc']:.4f}")
    print(f"   Modelo guardado en: {result['model_path']}")
    print(f"   Features: {len(result['feature_names'])}")

    # Top 10 features
    print("\n📊 Top 10 features más importantes:")
    for f in result['feature_importance'][:10]:
        print(f"   {f['feature']}: {f['importance']:.4f}")

    pool.close()