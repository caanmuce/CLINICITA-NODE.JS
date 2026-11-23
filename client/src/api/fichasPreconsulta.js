import apiClient from "./apiClient";

export const fichasPreconsultaApi = {
  // POST /api/fichas-preconsulta (Crear ficha - Paciente)
  crear: async (data) => {
    const response = await apiClient.post("/fichas-preconsulta", data);
    return response.data;
  },

  // GET /api/fichas-preconsulta/cita/:cita_id (Obtener por cita - Paciente/Médico)
  obtenerPorCita: async (cita_id) => {
    const response = await apiClient.get(`/fichas-preconsulta/cita/${cita_id}`);
    return response.data;
  },

  // GET /api/fichas-preconsulta/paciente/:paciente_id (Obtener por paciente)
  obtenerPorPaciente: async (paciente_id) => {
    const response = await apiClient.get(`/fichas-preconsulta/paciente/${paciente_id}`);
    return response.data;
  },

  // PUT /api/fichas-preconsulta/:id (Actualizar ficha - Paciente)
  actualizar: async (id, data) => {
    const response = await apiClient.put(`/fichas-preconsulta/${id}`, data);
    return response.data;
  },
};

export default fichasPreconsultaApi;
