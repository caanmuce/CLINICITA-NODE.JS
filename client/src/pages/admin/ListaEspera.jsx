// src/pages/admin/ListaEspera.jsx - Gestion de lista de espera (Administrador/Recepcionista)
import React, { useState, useEffect, useCallback } from "react";
import { Calendar, UserPlus, Search, AlertCircle, Loader2, Trash2, Edit3, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { listaEsperaApi } from "../../api/listaEspera";

const ESTADO_LABELS = {
  Activo: "Activo",
  Inactivo: "Inactivo",
  Completado: "Completado",
};

const ESTADO_COLORS = {
  Activo: "bg-green-100 text-green-800",
  Inactivo: "bg-gray-100 text-gray-800",
  Completado: "bg-blue-100 text-blue-800",
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota",
  });
};

export const AdminListaEspera = () => {
  const [filtros, setFiltros] = useState({ estado: "", especialidad: "", q: "" });
  const [lista, setLista] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [eliminandoId, setEliminandoId] = useState(null);

  const cargarLista = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { ...filtros, page, limit };
      Object.keys(params).forEach((key) => {
        if (params[key] === "") delete params[key];
      });
      const data = await listaEsperaApi.listarAdmin(params);
      const items = Array.isArray(data?.lista_espera) ? data.lista_espera : Array.isArray(data) ? data : [];
      setLista(items);
      setTotal(data?.total || items.length);
    } catch (e) {
      console.error("Error cargando lista de espera:", e);
      setError("No se pudieron cargar las entradas de lista de espera");
    } finally {
      setLoading(false);
    }
  }, [filtros, page, limit]);

  useEffect(() => {
    cargarLista();
  }, [cargarLista]);

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Eliminar esta entrada de la lista de espera?")) return;
    setEliminandoId(id);
    try {
      await listaEsperaApi.eliminarAdmin(id);
      await cargarLista();
    } catch (err) {
      const msg = err.response?.data?.mensaje || "No se pudo eliminar la entrada.";
      alert(msg);
    } finally {
      setEliminandoId(null);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-4" />
        <p className="text-gray-500">Cargando lista de espera...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lista de Espera</h1>
          <p className="text-gray-500 mt-1">
            Administra las inscripciones de pacientes en lista de espera
          </p>
        </div>
        <Link
          to="/admin/lista-espera/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          Nueva inscripción
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por paciente, especialidad..."
              name="q"
              value={filtros.q}
              onChange={handleFiltroChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <select
            name="estado"
            value={filtros.estado}
            onChange={handleFiltroChange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:w-64"
          >
            <option value="">Todos los estados</option>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
            <option value="Completado">Completado</option>
          </select>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {lista.length === 0 && !loading ? (
          <div className="p-12 text-center">
            <Clock className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay entradas en lista de espera
            </h3>
            <p className="text-gray-500">
              Las inscripciones aparecerán aquí cuando los pacientes se registren.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Especialidad</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sede</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Prioridad</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha inscripción</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Posición</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lista.map((item) => (
                  <tr key={item.id || item.espera_id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-gray-900 font-medium">{item.paciente_nombre || item.nombre || "—"}</td>
                    <td className="px-4 py-4 text-gray-600 capitalize">{item.especialidad_nombre || item.especialidad || "—"}</td>
                    <td className="px-4 py-4 text-gray-600 capitalize">{item.sede_nombre || item.sede || "—"}</td>
                    <td className="px-4 py-4 text-gray-600 capitalize">{item.prioridad || "—"}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${ESTADO_COLORS[item.estado] || "bg-gray-100 text-gray-800"}`}>
                        {ESTADO_LABELS[item.estado] || item.estado}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{formatDate(item.fecha_inscripcion)}</td>
                    <td className="px-4 py-4 text-gray-600">{item.posicion || "—"}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEliminar(item.id || item.espera_id)}
                          disabled={eliminandoId === item.id}
                          className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Eliminar"
                        >
                          {eliminandoId === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Total: {total} entradas · Página {page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => setPage(page - 1)}
                disabled={page === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => setPage(page + 1)}
                disabled={page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminListaEspera;

