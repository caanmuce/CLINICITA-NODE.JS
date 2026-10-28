"""Esquemas Pydantic para API"""
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime


class RiskResponse(BaseModel):
    """Respuesta de riesgo individual"""
    paciente_id: int
    score: float = Field(ge=0, le=100, description="Score 0-100")
    percentil: int = Field(ge=1, le=100)
    nivel_riesgo: str
    features_principales: Dict[str, Any]
    model_version: str
    calculado_en: str


class BatchRequest(BaseModel):
    """Request para batch de pacientes"""
    paciente_ids: List[int]


class TrainRequest(BaseModel):
    """Request para entrenamiento"""
    n_trials: int = 50
    force_retrain: bool = False


class HealthResponse(BaseModel):
    """Respuesta de health check"""
    status: str
    model_loaded: bool
    model_version: Optional[str] = None


class FeatureImportance(BaseModel):
    """Importancia de feature"""
    feature: str
    importance: float


class TrainResponse(BaseModel):
    """Respuesta de entrenamiento"""
    message: str
    status: str
    run_id: Optional[str] = None
    auc: Optional[float] = None
    feature_importance: Optional[List[FeatureImportance]] = None