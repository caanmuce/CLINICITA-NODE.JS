// src/pages/admin/Especialidades.jsx - Listado de especialidades (Administrador)
import React, { useState, useEffect, useCallback } from "react";
import { Stethoscope, Search, AlertCircle, Loader2 } from "lucide-react";
import { Link } from "react-router-dom";
import { medicosApi } from "../../api/medicos";

export const AdminEspecialidades = () => {
  const [especialidades, setEspecialidades] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargarEspecialidades = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await medicosApi.listarEspecialidades();
      const lista = Array.isArray(data) ? data : [];
      setEspecialidades(lista);
    } catch (e) {
      console.error("Error cargando especialidades:", e);
      setError("No se pudieron cargar las especialidades");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarEspecialidades();
  }, [cargarEspecialidades]);

  const filtradas = especialidades.filter((e) =>
    e.nombre.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-4" />
        <p className="text-gray-500">Cargando especialidades...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Especialidades</h1>
          <p className="text-gray-500 mt-1">
            Lista de especialidades médicas disponibles en el sistema
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar especialidad..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-800 text-sm ml-2">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {filtradas.length === 0 && !loading ? (
          <div className="p-12 text-center">
            <Stethoscope className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay especialidades
            </h3>
            <p className="text-gray-500">
              Las especialidades se derivan de los médicos registrados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nombre</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Médicos</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filtradas.map((esp) => (
                  <tr key={esp.nombre} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-gray-900 font-medium capitalize">
                      {esp.nombre}
                    </td>
                    <td className="px-4 py-4 text-gray-600">{esp.total_medicos || "—"}</td>
                    <td className="px-4 py-4">
                      <Link to={`/admin/medicos?especialidad=${encodeURIComponent(esp.nombre)}`} className="text-teal-600 hover:text-teal-800 text-sm font-medium underline hover:decoration-teal-200">



                        Ver médicos
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminEspecialidades;





