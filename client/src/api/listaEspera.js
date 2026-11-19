import apiClient from './apiClient';

export const listaEsperaApi = {
  // GET /api/lista-espera (Recep/Admin listar)
  listarAdmin: async (params = {}) => {
    const response = await apiClient.get('/lista-espera', { params });
    return response.data;
  },

  // POST /api/lista-espera (Recep/Admin inscribir paciente)
  crearAdmin: async (data) => {
    const response = await apiClient.post('/lista-espera', data);
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
  listarMiLista: async () => {
    const response = await apiClient.get('/lista-espera/me');
    return response.data;
  },

  // POST /api/lista-espera/me (Paciente se inscribe)
  inscribirme: async (data) => {
    const response = await apiClient.post('/lista-espera/me', data);
    return response.data;
  },

  // GET /api/lista-espera/me/count (KPI paciente)
  contarMiLista: async () => {
    const response = await apiClient.get('/lista-espera/me/count');
    return response.data;
  },

  // GET /api/lista-espera/:estado/count (KPI paciente por estado)
  contarPorEstado: async (estado) => {
    const response = await apiClient.get(`/lista-espera/${estado}/count`);
    return response.data;
  },
};

export default listaEsperaApi;