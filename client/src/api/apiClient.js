import axios from 'axios';

// Usamos '/api' para aprovechar el proxy de Vite configurado en vite.config.js
const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Interceptor de petición para adjuntar el token de autenticación
apiClient.interceptors.request.use(
  (config) => {
    // Intentar leer el token de ambas claves para compatibilidad con legacy
    const token = localStorage.getItem('authToken') || localStorage.getItem('clinicita_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor de respuesta para manejar errores globales (ej. 401)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Limpiar ambas claves de token
      localStorage.removeItem('authToken');
      localStorage.removeItem('clinicita_token');
      // Redirigir al login si fuera necesario o dejar que el contexto lo maneje
    }
    return Promise.reject(error);
  }
);

export default apiClient;
