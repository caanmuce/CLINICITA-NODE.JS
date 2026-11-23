import apiClient from "./apiClient";

export const listaEsperaApi = {
  // GET /api/lista-espera (Recep/Admin listar)
  listarAdmin: async (params = {}) => {
    const response = await apiClient.get("/lista-espera", { params });
    return response.data;
  },

  // POST /api/lista-espera (Recep/Admin inscribir paciente)
  crearAdmin: async (data) => {
    const response = await apiClient.post("/lista-espera", data);
    return response.data;
  },

  // PUT /api/lista-espera/:id (Recep/Admin actualizar)
  actualizarAdmin: async (id, data) => {
    const response = await apiClient.put(`/lista-espera/${id}`, data);
    return response.data;
  },

  // DELETE /api/lista-espera/:id (Recep/Admin eliminar)
  eliminarAdmin: async (id) => {
    const response = await apiClient.delete(`/lista-espera/${id}`);
    return response.data;
  },

  // GET /api/lista-espera/me (Paciente ve su lista de espera)
  // Backend devuelve: { lista_espera: [{ espera_id, especialidad_requerida, sede, prioridad, fecha_inscripcion, posicion, estado_espera, oferta_id, oferta_fecha, oferta_hora, oferta_vence_en, oferta_medico }, ...] }
  listarMiLista: async () => {
    const response = await apiClient.get("/lista-espera/me");
    const lista = response.data.lista_espera || [];
    // Transformar campos del backend al formato que espera el frontend, conservando estados reales
    return lista.map((item) => ({
      id: item.espera_id,
      especialidad_nombre: item.especialidad_requerida,
      sede_nombre: item.sede,
      prioridad: item.prioridad, // Backend: 'Alta', 'Media', 'Baja'
      estado: item.estado_espera || "Activo", // Usar estado real del backend
      motivo: item.observaciones || null,
      fecha_inscripcion: item.fecha_inscripcion,
      posicion: item.posicion,
      oferta_id: item.oferta_id || null,
      oferta_fecha: item.oferta_fecha || null,
      oferta_hora: item.oferta_hora || null,
      oferta_vence_en: item.oferta_vence_en || null,
      oferta_medico: item.oferta_medico || null,
    }));
  },

  // POST /api/lista-espera/ofertas/:id/responder (Paciente acepta/rechaza oferta)
  responderOferta: async (ofertaId, decision) => {
    const response = await apiClient.post(`/lista-espera/ofertas/${ofertaId}/responder`, {
      decision,
    });
    return response.data;
  },

  // DELETE /api/lista-espera/me/:id (Paciente se retira de la lista)
  retirarMe: async (id) => {
    const response = await apiClient.delete(`/lista-espera/me/${id}`);
    return response.data;
  },

  // POST /api/lista-espera/me (Paciente se inscribe)
  inscribirme: async (data) => {
    const response = await apiClient.post("/lista-espera/me", data);
    return response.data;
  },

  // GET /api/lista-espera/me/count (KPI paciente)
  contarMiLista: async () => {
    const response = await apiClient.get("/lista-espera/me/count");
    return response.data;
  },

  // GET /api/lista-espera/:estado/count (KPI paciente por estado)
  contarPorEstado: async (estado) => {
    const response = await apiClient.get(`/lista-espera/${estado}/count`);
    return response.data;
  },
};

export default listaEsperaApi;
