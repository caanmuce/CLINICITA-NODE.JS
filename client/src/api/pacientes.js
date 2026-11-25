import apiClient from "./apiClient";

export const pacientesApi = {
  // GET /api/pacientes (Buscar pacientes - Recep/Admin)
  // Backend devuelve: { pacientes: [...] }
  buscar: async (q, limit = 10) => {
    const response = await apiClient.get("/pacientes", {
      params: { q, limit },
    });
    return response.data.pacientes || [];
  },

  // GET /api/pacientes/me/riesgo (Paciente ve su riesgo no-show)
  verMiRiesgo: async () => {
    const response = await apiClient.get("/pacientes/me/riesgo");
    return response.data;
  },

  // GET /api/pacientes/:id/riesgo (Admin/Recep/Médico ve riesgo de paciente)
  verRiesgo: async (id) => {
    const response = await apiClient.get(`/pacientes/${id}/riesgo`);
    return response.data;
  },

  // POST /api/pacientes/riesgo/batch (Batch risk para dashboard recepción)
  verRiesgoBatch: async (paciente_ids) => {
    const response = await apiClient.post("/pacientes/riesgo/batch", {
      paciente_ids,
    });
    return response.data;
  },

  // POST /api/pacientes/riesgo/recalcular-todos (Admin recalcula todos)
  recalcularTodos: async () => {
    const response = await apiClient.post("/pacientes/riesgo/recalcular-todos");
    return response.data;
  },
};

export default pacientesApi;
