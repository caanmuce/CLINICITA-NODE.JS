import apiClient from './apiClient';

export const usuariosApi = {
  // GET /api/usuarios (Admin)
  listar: async (params = {}) => {
    const response = await apiClient.get('/usuarios', { params });
    return response.data;
  },

  // POST /api/usuarios (Admin)
  crear: async (data) => {
    const response = await apiClient.post('/usuarios', data);
    return response.data;
  },

  // PUT /api/usuarios/:id (Admin)
  actualizar: async (id, data) => {
    const response = await apiClient.put(`/usuarios/${id}`, data);
    return response.data;
  },

  // DELETE /api/usuarios/:id (Admin)
  eliminar: async (id) => {
    const response = await apiClient.delete(`/usuarios/${id}`);
    return response.data;
  },

  // GET /api/usuarios/me - Obtener perfil del usuario autenticado
  obtenerPerfil: async () => {
    const response = await apiClient.get('/usuarios/me');
    return response.data;
  },

  // PUT /api/usuarios/me - Actualizar perfil del usuario autenticado
  actualizarPerfil: async (data) => {
    // El backend espera: nombres, apellidos, telefono, direccion
    const response = await apiClient.put('/usuarios/me', data);
    return response.data;
  },
};

export default usuariosApi;