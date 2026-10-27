/**
 * Cliente para servicio ML de riesgo no-show
 * Con fallback heurístico si el servicio no está disponible
 */
const axios = require("axios");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const ML_TIMEOUT = 5000;

class MLClient {
    constructor() {
        this.client = axios.create({
            baseURL: ML_SERVICE_URL,
            timeout: ML_TIMEOUT
        });
    }

    async getRiesgo(pacienteId) {
        try {
            const resp = await this.client.get(`/riesgo/${pacienteId}`);
            return resp.data;
        } catch (error) {
            if (error.code === 'ECONNREFUSED' || error.response?.status === 503) {
                console.warn("[ML] Servicio no disponible, usando fallback heurístico");
                return this.fallbackHeuristico(pacienteId);
            }
            console.error(`[ML] Error obteniendo riesgo para paciente ${pacienteId}:`, error.message);
            throw error;
        }
    }

    async getRiesgoBatch(pacienteIds) {
        try {
            const resp = await this.client.post("/riesgo/batch", { paciente_ids: pacienteIds });
            return resp.data;
        } catch (error) {
            console.warn("[ML] Batch falló, usando fallback individual");
            const results = [];
            for (const id of pacienteIds) {
                try {
                    results.push(await this.getRiesgo(id));
                } catch (e) {
                    results.push(this._fallbackDefault(id));
                }
            }
            return results;
        }
    }

    // Fallback heurístico simple si ML no está disponible
    async fallbackHeuristico(pacienteId) {
        const conexion = require("../conexion");
        const query = require("util").promisify(conexion.query).bind(conexion);

        try {
            const [citas] = await query(`
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN estado = 'No-Asistio' THEN 1 ELSE 0 END) as no_shows,
                       SUM(CASE WHEN estado = 'Cancelada' THEN 1 ELSE 0 END) as canceladas
                FROM citas WHERE paciente_id = ?
            `, [pacienteId]);

            const total = citas[0].total || 1;
            const tasaNoShow = (citas[0].no_shows || 0) / total;
            const tasaCancel = (citas[0].canceladas || 0) / total;

            // Score heurístico: 50% no-show rate + 30% cancel rate + 20% base
            const score = Math.min(100, Math.round((tasaNoShow * 50 + tasaCancel * 30 + 10) * 100) / 100);

            return {
                paciente_id: pacienteId,
                score,
                percentil: Math.min(99, Math.round(score)),
                nivel_riesgo: score >= 70 ? "Crítico" : score >= 50 ? "Alto" : score >= 30 ? "Medio" : "Bajo",
                features_principales: { tasa_no_show_heuristica: tasaNoShow, tasa_cancel_heuristica: tasaCancel },
                model_version: "heuristic-v1",
                calculado_en: new Date().toISOString()
            };
        } catch (error) {
            console.error("[ML] Error en fallback heurístico:", error.message);
            return this._fallbackDefault(pacienteId);
        }
    }

    _fallbackDefault(pacienteId) {
        return {
            paciente_id: pacienteId,
            score: 20,
            percentil: 20,
            nivel_riesgo: "Bajo",
            features_principales: {},
            model_version: "default-fallback",
            calculado_en: new Date().toISOString()
        };
    }

    // Iniciar recálculo masivo de scores en el servicio ML
    async recalcularTodos() {
        try {
            const resp = await this.client.post("/recalcular-todos");
            return resp.data;
        } catch (error) {
            console.error("[ML] Error iniciando recálculo masivo:", error.message);
            throw error;
        }
    }
}

module.exports = { MLClient, mlClient: new MLClient() };