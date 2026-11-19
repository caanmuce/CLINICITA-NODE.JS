import apiClient from './apiClient';

export const recordatoriosApi = {
  // GET /api/recordatorios (Recep/Admin listar)
  listar: async (params = {}) => {
    const response = await apiClient.get('/recordatorios', { params });
    return response.data;
  },

  // POST /api/recordatorios/:cita_id/reenviar (Recep/Admin reenviar)
  reenviar: async (cita_id) => {
    const response = await apiClient.post(`/recordatorios/${cita_id}/reenviar`);
    return response.data;
  },
};

export default recordatoriosApi;