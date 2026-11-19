import apiClient from './apiClient';

export const citasApi = {
  // POST /api/citas (Paciente agenda su cita)
  crear: async (data) => {
    const response = await apiClient.post('/citas', data);
    return response.data;
  },

  // GET /api/citas (Paciente lista sus citas)
  listarMisCitas: async () => {
    const response = await apiClient.get('/citas');
    return response.data;
  },

  // DELETE /api/citas/:id (Paciente cancela su cita)
  cancelar: async (id) => {
    const response = await apiClient.delete(`/citas/${id}`);
    return response.data;
  },

  // GET /api/citas/:estado/count (KPIs dashboard paciente)
  contarPorEstado: async (estado) => {
    const response = await apiClient.get(`/citas/${estado}/count`);
    return response.data;
  },

  // PUT /api/citas/:id/reprogramar (Paciente reprograma)
  reprogramar: async (id, data) => {
    const response = await apiClient.put(`/citas/${id}/reprogramar`, data);
    return response.data;
  },

  // GET /api/citas/admin (Recepcionista/Admin lista todas)
  listarAdmin: async (params = {}) => {
    const response = await apiClient.get('/citas/admin', { params });
    return response.data;
  },

  // PUT /api/citas/admin/:id (Recepcionista/Admin actualiza cita)
  actualizarAdmin: async (id, data) => {
    const response = await apiClient.put(`/citas/admin/${id}`, data);
    return response.data;
  },

  // GET /api/citas/medico (Médico ve su agenda)
  listarMedico: async (fecha) => {
    const response = await apiClient.get('/citas/medico', { params: { fecha } });
    return response.data;
  },

  // PUT /api/citas/:id/estado (Médico/Recep/Admin cambia estado)
  cambiarEstado: async (id, estado) => {
    const response = await apiClient.put(`/citas/${id}/estado`, { estado });
    return response.data;
  },

  // POST /api/citas/admin (Recepcionista/Admin agenda a nombre de paciente)
  crearAdmin: async (data) => {
    const response = await apiClient.post('/citas/admin', data);
    return response.data;
  },

  // PUT /api/citas/:id/confirmar (Paciente confirma su cita)
  confirmar: async (id) => {
    const response = await apiClient.put(`/citas/${id}/confirmar`);
    return response.data;
  },
};

export default citasApi;