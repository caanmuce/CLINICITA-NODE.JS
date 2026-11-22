import React, { useState, useEffect, useCallback } from "react";
import { BarChart3, Calendar, FileText, AlertCircle, Loader2, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { reportesApi } from "../../api/reportes";

export const AdminReportes = () => {
  const [reportes, setReportes] = useState([]);
  const [totales, setTotales] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtroFecha, setFiltroFecha] = useState("");
  const [filtroTipo, setFiltroTipo] = useState("");

  const cargarReportes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await reportesApi.obtenerAusentismo({ fecha: filtroFecha || undefined, tipo: filtroTipo || undefined });
      // Backend devuelve: { totales, detalle }
      const reportesArray = Array.isArray(data?.detalle) ? data.detalle : [];
      setReportes(reportesArray);
      setTotales(data?.totales || {});
    } catch (e) {
      console.error("Error cargando reportes:", e);
      setError("No se pudieron cargar los reportes");
    } finally {
      setLoading(false);
    }
  }, [filtroFecha, filtroTipo]);

  useEffect(() => {
    cargarReportes();
  }, [cargarReportes]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-4" />
        <p className="text-gray-500">Cargando reportes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes y Estadisticas</h1>
          <p className="text-gray-500 mt-1">
            Analiza citas, ingresos y actividad clinica
          </p>
        </div>
        <Link
          to="/admin/reportes/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
        >
          <FileText className="h-5 w-5" />
          Nuevo reporte
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar reportes..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <select
            value={filtroTipo}
            onChange={(e) => setFiltroTipo(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
          >
            <option value="">Todos los tipos</option>
            <option value="citas">Citas</option>
            <option value="ingresos">Ingresos</option>
            <option value="pacientes">Pacientes</option>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Especialidad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Programadas</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Atendidas</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Canceladas</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reportes.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-4 py-12 text-center text-gray-500">
                    <BarChart3 className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p>No hay reportes disponibles</p>
                  </td>
                </tr>
              ) : (
                reportes.map((r) => (
                  <tr key={r.especialidad || r.id || Math.random()} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-gray-900 font-medium">{r.especialidad || "\u2014"}</td>
                    <td className="px-4 py-4 text-gray-600">{r.programadas || "\u2014"}</td>
                    <td className="px-4 py-4 text-gray-600">{r.atendidas || "\u2014"}</td>
                    <td className="px-4 py-4 text-gray-600">{r.canceladas || "—"}</td>
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

export default AdminReportes;


