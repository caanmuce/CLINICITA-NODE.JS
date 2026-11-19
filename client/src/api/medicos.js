import apiClient from './apiClient';

export const medicosApi = {
  // GET /api/medicos (Listar médicos activos)
  // Backend devuelve: { medicos: [{ medico_id, nombre_completo, especialidad }, ...] }
  // Frontend espera: [{ id, nombre, apellido, especialidad_nombre, sede_id, sede_nombre }, ...]
  listar: async (especialidad) => {
    const response = await apiClient.get('/medicos', { params: { especialidad } });
    const medicos = response.data.medicos || [];
    // Transformar campos del backend al formato que espera el frontend
    return medicos.map(medico => {
      const partesNombre = (medico.nombre_completo || '').split(' ');
      const nombre = partesNombre[0] || '';
      const apellido = partesNombre.slice(1).join(' ') || '';
      return {
        id: medico.medico_id,
        nombre,
        apellido,
        nombre_completo: medico.nombre_completo,
        especialidad_nombre: medico.especialidad,
        especialidad: medico.especialidad,
        sede_id: null, // El backend no devuelve sede en este endpoint
        sede_nombre: null,
      };
    });
  },

  // GET /api/especialidades (Listar especialidades únicas)
  // Backend devuelve: { especialidades: [{ nombre }, ...] }
  listarEspecialidades: async () => {
    const response = await apiClient.get('/especialidades');
    return response.data.especialidades || [];
  },
};

export default medicosApi;