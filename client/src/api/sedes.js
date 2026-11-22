import apiClient from "./apiClient";

export const sedesApi = {
  // GET /api/sedes (Listar sedes activas)
  // Backend devuelve: { sedes: [...] }
  listar: async () => {
    const response = await apiClient.get("/sedes");
    return response.data.sedes || [];
  },

  // POST /api/sedes (Crear sede - Admin)
  crear: async (data) => {
    const response = await apiClient.post("/sedes", data);
    return response.data;
  },

  // PUT /api/sedes/:id (Actualizar sede - Admin)
  actualizar: async (id, data) => {
    const response = await apiClient.put(`/sedes/${id}`, data);
    return response.data;
  },

  // DELETE /api/sedes/:id (Eliminar sede - Admin)
  eliminar: async (id) => {
    const response = await apiClient.delete(`/sedes/${id}`);
    return response.data;
  },
};

export default sedesApi;
