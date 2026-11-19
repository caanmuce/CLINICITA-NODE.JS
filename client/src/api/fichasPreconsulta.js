/**
 * ⚠️ PENDIENTE: Backend NO tiene endpoints para fichas de preconsulta
 * 
 * La tabla `fichas_preconsulta` existe en la BD (se crea en inicialización)
 * pero no hay endpoints REST implementados en server.js.
 * 
 * Cuando el backend implemente estos endpoints, descomentar y ajustar:
 */

export const fichasPreconsultaApi = {
  // POST /api/fichas-preconsulta (Crear ficha - Paciente/Médico)
  // crear: async (data) => {
  //   const response = await apiClient.post('/fichas-preconsulta', data);
  //   return response.data;
  // },

  // GET /api/fichas-preconsulta/cita/:cita_id (Obtener por cita)
  // obtenerPorCita: async (cita_id) => {
  //   const response = await apiClient.get(`/fichas-preconsulta/cita/${cita_id}`);
  //   return response.data;
  // },

  // GET /api/fichas-preconsulta/paciente/:paciente_id (Obtener por paciente)
  // obtenerPorPaciente: async (paciente_id) => {
  //   const response = await apiClient.get(`/fichas-preconsulta/paciente/${paciente_id}`);
  //   return response.data;
  // },

  // PUT /api/fichas-preconsulta/:id (Actualizar ficha)
  // actualizar: async (id, data) => {
  //   const response = await apiClient.put(`/fichas-preconsulta/${id}`, data);
  //   return response.data;
  // },
};

export default fichasPreconsultaApi;