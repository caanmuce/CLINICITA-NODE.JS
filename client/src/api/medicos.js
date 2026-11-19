import apiClient from './apiClient';

export const medicosApi = {
  // GET /api/medicos (Listar médicos activos)
  listar: async (especialidad) => {
    const response = await apiClient.get('/medicos', { params: { especialidad } });
    return response.data;
  },

  // GET /api/especialidades (Listar especialidades únicas)
  listarEspecialidades: async () => {
    const response = await apiClient.get('/especialidades');
    return response.data;
  },
};

export default medicosApi;