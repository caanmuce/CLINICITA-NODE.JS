import React, { useState, useEffect, useCallback } from "react";
import { BarChart3, Calendar, FileText, AlertCircle, Loader2, Search, BarChart } from "lucide-react";
import { Link } from "react-router-dom";
import { reportesApi } from "../../api/reportes";
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

export const AdminReportes = () => {
  const [reportes, setReportes] = useState([]);
  const [totales, setTotales] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtroDesde, setFiltroDesde] = useState("");
  const [filtroHasta, setFiltroHasta] = useState("");

  const cargarReportes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = {};
      if (filtroDesde) params.desde = filtroDesde;
      if (filtroHasta) params.hasta = filtroHasta;
      const data = await reportesApi.obtenerAusentismo(params);
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
  }, [filtroDesde, filtroHasta]);

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

  const formatDateShort = (dateStr) => {
    if (!dateStr) return "—";
    const date = new Date(dateStr);
    return date.toLocaleDateString("es-CO", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Reportes y Estadísticas</h1>
          <p className="text-gray-500 mt-1">
            Analiza citas, ausentismo y actividad clínica
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
          <div className="relative w-full sm:w-64">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="date"
              placeholder="Desde"
              value={filtroDesde}
              onChange={(e) => setFiltroDesde(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div className="relative w-full sm:w-64">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="date"
              placeholder="Hasta"
              value={filtroHasta}
              onChange={(e) => setFiltroHasta(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <button
            onClick={cargarReportes}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors self-end sm:self-auto"
          >
            <Search className="h-5 w-5" /> Filtrar
          </button>
        </div>
      </div>

      {/* Tarjetas de totales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Citas programadas</p>
          <p className="text-2xl font-bold text-gray-900">{totales.programadas || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Atendidas</p>
          <p className="text-2xl font-bold text-gray-900">{totales.atendidas || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Canceladas</p>
          <p className="text-2xl font-bold text-gray-900">{totales.canceladas || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-500 uppercase">Inasistencias</p>
          <p className="text-2xl font-bold text-gray-900">{totales.inasistencias || 0}</p>
        </div>
      </div>

      {/* Tasa de ausentismo */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-teal-600" />
          Tasa de ausentismo
        </h3>
        <div className="text-3xl font-bold text-gray-900 mb-2">
          {totales.tasa_ausentismo || "0%"}
        </div>
        <p className="text-sm text-gray-500">
          Porcentaje de citas no asistidas en el período seleccionado.
        </p>
      </div>

      {/* Gráfico de barras: citas por especialidad */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <BarChart className="h-5 w-5 text-teal-600" />
          Citas por especialidad
        </h3>
        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height={300}>
            <RechartsBarChart
              data={reportes}
              margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
            >
              <XAxis
                dataKey="especialidad"
                tick={{ fontSize: 12 }}
                tickLine={false}
                axisLine={false}
                label={{ value: "Especialidad", position: "bottom", offset: 0, style: { fontSize: 12 } }}
              />
              <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
              <Bar dataKey="programadas" fill="#0D9488" radius={[4, 4, 0, 0]} />
              <Bar dataKey="atendidas" fill="#10B981" radius={[4, 4, 0, 0]} />
              <Bar dataKey="canceladas" fill="#EF4444" radius={[4, 4, 0, 0]} />
            </RechartsBarChart>
          </ResponsiveContainer>
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Inasistencias</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {reportes.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center text-gray-500">
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
                    <td className="px-4 py-4 text-gray-600">{r.canceladas || 0}</td>
                    <td className="px-4 py-4 text-gray-600">{r.inasistencias || 0}</td>
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


