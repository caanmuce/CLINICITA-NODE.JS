import React, { useState, useEffect, useCallback } from "react";
import { MapPin, Building, Search, AlertCircle, Loader2, UserPlus } from "lucide-react";
import { Link } from "react-router-dom";
import { sedesApi } from "../../api/sedes";

export const AdminSedes = () => {
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtroCiudad, setFiltroCiudad] = useState("");

  const cargarSedes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await sedesApi.listar();
      setSedes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando sedes:", e);
      setError("No se pudieron cargar las sedes");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarSedes();
  }, [cargarSedes]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-4" />
        <p className="text-gray-500">Cargando sedes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion de Sedes</h1>
          <p className="text-gray-500 mt-1">
            Centros medicos, direcciones y horarios de atencion
          </p>
        </div>
        <Link
          to="/admin/sedes/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
        >
          <Building className="h-5 w-5" />
          Nueva sede
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar sede, ciudad..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <input
            type="text"
            placeholder="Filtrar por ciudad"
            value={filtroCiudad}
            onChange={(e) => setFiltroCiudad(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          />
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sede</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ciudad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Direccion</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefono</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sedes.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center text-gray-500">
                    <MapPin className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p>No hay sedes registradas</p>
                  </td>
                </tr>
              ) : (
                sedes.map((s) => (
                  <tr key={s.id || s.sede_id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-gray-900 font-medium">{s.nombre || "\u2014"}</td>
                    <td className="px-4 py-4 text-gray-600">{s.ciudad || "\u2014"}</td>
                    <td className="px-4 py-4 text-gray-600">{s.direccion || "\u2014"}</td>
                    <td className="px-4 py-4 text-gray-600">{s.telefono || "\u2014"}</td>
                    <td className="px-4 py-4 text-gray-600">{s.estado || "Activo"}</td>
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

export default AdminSedes;