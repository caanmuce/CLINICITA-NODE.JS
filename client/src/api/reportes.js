import apiClient from "./apiClient";

export const reportesApi = {
  // GET /api/reportes/resumen (Admin)
  obtenerResumen: async () => {
    const response = await apiClient.get("/reportes/resumen");
    return response.data;
  },

  // GET /api/reportes/ausentismo (Admin)
  // Backend devuelve: { totales, detalle }
  obtenerAusentismo: async (params = {}) => {
    const response = await apiClient.get("/reportes/ausentismo", { params });
    return response.data;
  },
};

export default reportesApi;
