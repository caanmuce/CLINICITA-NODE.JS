import React, { useState, useEffect, useCallback } from "react";
import { Stethoscope, UserPlus, Search, AlertCircle, Loader2, Edit, Trash2, AlertTriangle } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { medicosApi } from "../../api/medicos";

export const AdminMedicos = () => {
  const navigate = useNavigate();
  const [medicos, setMedicos] = useState([]);
  const [especialidadFilter, setEspecialidadFilter] = useState("");
  const [especialidades, setEspecialidades] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [eliminandoId, setEliminandoId] = useState(null);
  const [eliminarConfirm, setEliminarConfirm] = useState(null);

  const cargarMedicos = useCallback(async (especialidad) => {
    setLoading(true);
    setError(null);
    try {
      const data = await medicosApi.listar(especialidad || undefined);
      setMedicos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando medicos:", e);
      setError("No se pudieron cargar los medicos");
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarEspecialidades = useCallback(async () => {
    try {
      const data = await medicosApi.listarEspecialidades();
      setEspecialidades(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando especialidades:", e);
    }
  }, []);

  const handleEditar = (id) => {
    navigate(`/admin/medicos/${id}`);
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Está seguro de que desea eliminar este médico?")) return;
    setEliminandoId(id);
    try {
      await medicosApi.eliminar(id);
      setMedicos((prev) => prev.filter((m) => (m.id || m.medico_id) !== id));
    } catch (e) {
      console.error("Error eliminando medico:", e);
      setError("No se pudo eliminar el médico");
    } finally {
      setEliminandoId(null);
    }
  };

  useEffect(() => {
    cargarEspecialidades();
    cargarMedicos(especialidadFilter);
  }, [especialidadFilter, cargarEspecialidades, cargarMedicos]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-4" />
        <p className="text-gray-500">Cargando medicos...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion de Medicos</h1>
          <p className="text-gray-500 mt-1">
            Plantilla medica, especialidades y asignacion a sedes
          </p>
        </div>
        <Link
          to="/admin/medicos/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          Nuevo medico
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar medico, especialidad..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <select
            value={especialidadFilter}
            onChange={(e) => setEspecialidadFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="">Todas las especialidades</option>
            {especialidades.map((esp) => (
              <option key={esp.nombre || esp.id} value={esp.nombre || esp.id}>
                {esp.nombre || esp.especialidad_nombre || esp.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-800 text-sm ml-2">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Medico</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Especialidad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CMP</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sede</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {medicos.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-gray-500">
                    <Stethoscope className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p>No hay medicos registrados</p>
                  </td>
                </tr>
              ) : (
                medicos.map((m) => (
                  <tr key={m.id || m.medico_id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-gray-900 font-medium">
                      {m.nombre_completo || m.nombre || "\u2014"}
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {m.especialidad_nombre || m.especialidad || "\u2014"}
                    </td>
                    <td className="px-4 py-4 text-gray-600">{m.cmp || "\u2014"}</td>
                    <td className="px-4 py-4 text-gray-600">{m.sede_nombre || "\u2014"}</td>
                    <td className="px-4 py-4 text-gray-600">{m.estado || "Activo"}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditar(m.id || m.medico_id)}
                          disabled={eliminandoId === (m.id || m.medico_id)}
                          className="px-2 py-1.5 text-xs text-teal-600 hover:text-teal-800 hover:underline border border-transparent rounded hover:bg-teal-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Editar médico"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleEliminar(m.id || m.medico_id)}
                          disabled={eliminandoId === (m.id || m.medico_id)}
                          className="px-2 py-1.5 text-xs text-red-600 hover:text-red-800 hover:underline border border-transparent rounded hover:bg-red-50 disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Eliminar médico"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminMedicos;
