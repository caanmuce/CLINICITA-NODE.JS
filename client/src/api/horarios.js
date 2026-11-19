import apiClient from './apiClient';

export const horariosApi = {
  // GET /api/horarios (Slots disponibles para agendar)
  // Backend devuelve: { horarios: ['08:00', '08:30', ...] }
  // Frontend espera: [{ id, hora_inicio, hora_fin }, ...]
  obtenerDisponibles: async (medico, fecha) => {
    const response = await apiClient.get('/horarios', { params: { medico, fecha } });
    const horarios = response.data.horarios || [];
    // Transformar array de strings a array de objetos
    return horarios.map((hora, index) => ({
      id: `${medico}-${fecha}-${index}`,
      hora_inicio: hora,
      hora_fin: null, // No disponible en respuesta simple
    }));
  },

  // GET /api/horarios/admin (Listar todos los horarios - Admin/Recep/Médico)
  listarAdmin: async (params = {}) => {
    const response = await apiClient.get('/horarios/admin', { params });
    return response.data;
  },

  // POST /api/horarios/admin (Crear horario - Admin)
  crear: async (data) => {
    const response = await apiClient.post('/horarios/admin', data);
    return response.data;
  },

  // PUT /api/horarios/admin/:id (Actualizar horario - Admin)
  actualizar: async (id, data) => {
    const response = await apiClient.put(`/horarios/admin/${id}`, data);
    return response.data;
  },

  // DELETE /api/horarios/admin/:id (Eliminar horario - Admin)
  eliminar: async (id) => {
    const response = await apiClient.delete(`/horarios/admin/${id}`);
    return response.data;
  },
};

export default horariosApi;