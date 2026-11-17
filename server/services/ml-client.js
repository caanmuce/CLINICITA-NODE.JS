/**
 * Cliente para servicio ML de riesgo no-show
 * Con fallback heurístico si el servicio no está disponible
 */
const axios = require("axios");

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:8000";
const ML_TIMEOUT = 5000;
const CB_FAILURE_THRESHOLD = 3;
const CB_COOLDOWN_MS = 30_000;
const CB_CLOSED = "CLOSED";
const CB_OPEN = "OPEN";
const CB_HALF_OPEN = "HALF_OPEN";

class MLClient {
    constructor() {
        this.client = axios.create({
            baseURL: ML_SERVICE_URL,
            timeout: ML_TIMEOUT
        });
        this._cbState = CB_CLOSED;
        this._cbFailures = 0;
        this._cbOpenedAt = 0;
        this._cbProbeInFlight = false;
    }

    _esFalloDeCircuito(error) {
        const status = error.response?.status;
        if (status === 404 || status === 409) return false;
        if (status >= 500 && status <= 599) return true;
        return !status && ["ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN", "ERR_NETWORK", "ECONNABORTED", "ERR_CANCELED", "UND_ERR_CONNECT_TIMEOUT"].includes(error.code);
    }

    async _llamada(fn, fallback) {
        if (this._cbState === CB_OPEN) {
            if (Date.now() - this._cbOpenedAt < CB_COOLDOWN_MS) return fallback();
            this._cbState = CB_HALF_OPEN;
        }

        if (this._cbState === CB_HALF_OPEN) {
            if (this._cbProbeInFlight) return fallback();
            this._cbProbeInFlight = true;
        }

        try {
            const result = await fn();
            this._cbFailures = 0;
            this._cbState = CB_CLOSED;
            return result;
        } catch (error) {
            if (this._esFalloDeCircuito(error)) {
                this._cbFailures += 1;
                if (this._cbState === CB_HALF_OPEN || this._cbFailures >= CB_FAILURE_THRESHOLD) {
                    this._cbState = CB_OPEN;
                    this._cbOpenedAt = Date.now();
                    console.warn("[ML] Circuit Breaker OPEN durante 30 segundos");
                }
                return fallback();
            }
            if (this._cbState === CB_HALF_OPEN) {
                this._cbState = CB_CLOSED;
                this._cbFailures = 0;
            }
            throw error;
        } finally {
            this._cbProbeInFlight = false;
        }
    }

    async getRiesgo(pacienteId) {
        try {
            return await this._llamada(async () => {
                const resp = await this.client.get(`/riesgo/${pacienteId}`, { signal: AbortSignal.timeout(ML_TIMEOUT) });
                return resp.data;
            }, () => this.fallbackHeuristico(pacienteId));
        } catch (error) {
            if (error.response?.status === 404) return this.fallbackHeuristico(pacienteId);
            throw error;
        }
    }

    async getRiesgoBatch(pacienteIds) {
        return this._llamada(async () => {
            const resp = await this.client.post("/riesgo/batch", { paciente_ids: pacienteIds }, { signal: AbortSignal.timeout(ML_TIMEOUT) });
            return resp.data;
        }, async () => {
            console.warn("[ML] Batch no disponible, usando fallback individual");
            const results = [];
            for (const id of pacienteIds) {
                try {
                    results.push(await this.fallbackHeuristico(id));
                } catch (error) {
                    results.push(this._fallbackDefault(id));
                }
            }
            return results;
        });
    }

    // Fallback heurístico simple si ML no está disponible
    async fallbackHeuristico(pacienteId) {
        const conexion = require("../conexion");
        const query = require("util").promisify(conexion.query).bind(conexion);

        try {
            const citas = await query(`
                SELECT COUNT(*) as total,
                       SUM(CASE WHEN estado = 'No-Asistio' THEN 1 ELSE 0 END) as no_shows,
                       SUM(CASE WHEN estado = 'Cancelada' THEN 1 ELSE 0 END) as canceladas
                FROM citas WHERE paciente_id = ?
            `, [pacienteId]);

            const resumen = citas[0] || {};
            const total = Number(resumen.total) || 1;
            const tasaNoShow = (Number(resumen.no_shows) || 0) / total;
            const tasaCancel = (Number(resumen.canceladas) || 0) / total;

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
        return this._llamada(async () => {
            const resp = await this.client.post("/recalcular-todos", null, { signal: AbortSignal.timeout(ML_TIMEOUT) });
            return resp.data;
        }, () => {
            throw new Error("Servicio ML temporalmente no disponible; recálculo masivo omitido por Circuit Breaker");
        }).catch((error) => {
            console.error("[ML] Error iniciando recálculo masivo:", error.message);
            throw error;
        });
    }
}

module.exports = { MLClient, mlClient: new MLClient() };