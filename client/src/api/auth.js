import apiClient from './apiClient';

export const authApi = {
  // POST /api/auth/login
  login: async (correo, clave, rol) => {
    const response = await apiClient.post('/auth/login', { correo, clave, rol });
    return response.data;
  },

  // POST /api/auth/registro
  registro: async (data) => {
    const response = await apiClient.post('/auth/registro', data);
    return response.data;
  },

  // GET /api/auth/me
  me: async () => {
    const response = await apiClient.get('/auth/me');
    return response.data;
  },

  // POST /api/auth/recuperar
  recuperar: async (correo) => {
    const response = await apiClient.post('/auth/recuperar', { correo });
    return response.data;
  },

  // POST /api/auth/reset
  reset: async (token, nueva_clave) => {
    const response = await apiClient.post('/auth/reset', { token, nueva_clave });
    return response.data;
  },

  // PUT /api/auth/cambiar-clave
  cambiarClave: async (clave_actual, nueva_clave) => {
    const response = await apiClient.put('/auth/cambiar-clave', { clave_actual, nueva_clave });
    return response.data;
  },
};

export default authApi;