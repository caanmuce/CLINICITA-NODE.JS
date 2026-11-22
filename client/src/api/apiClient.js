import axios from "axios";

// Usamos '/api' para aprovechar el proxy de Vite configurado en vite.config.js
const apiClient = axios.create({
  baseURL: "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor de petición para adjuntar el token de autenticación
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("authToken");
    if (token) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Interceptor de respuesta para manejar errores globales
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (!error.response) {
      // Error de red o timeout
      error.userMessage =
        "Error de conexión. Verifica tu internet e intenta nuevamente.";
      return Promise.reject(error);
    }

    const status = error.response.status;
    const data = error.response.data;

    switch (status) {
      case 400:
        error.userMessage =
          data?.mensaje ||
          data?.errores ||
          "Datos inválidos. Revisa el formulario.";
        break;
      case 401:
        localStorage.removeItem("authToken");
        localStorage.removeItem("clinicita_usuario");
        error.userMessage =
          "Tu sesión ha expirado. Por favor, inicia sesión nuevamente.";
        break;
      case 403:
        error.userMessage =
          data?.mensaje || "No tienes permiso para realizar esta acción.";
        break;
      case 404:
        error.userMessage = data?.mensaje || "El recurso solicitado no existe.";
        break;
      case 500:
        error.userMessage =
          data?.mensaje || "Error interno del servidor. Intenta más tarde.";
        break;
      default:
        error.userMessage = data?.mensaje || "Ocurrió un error inesperado.";
    }

    return Promise.reject(error);
  },
);

export default apiClient;
