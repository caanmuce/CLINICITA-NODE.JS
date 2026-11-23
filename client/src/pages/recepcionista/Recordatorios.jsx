// src/pages/recepcionista/Recordatorios.jsx - Gestión de recordatorios (Recepcionista/Admin)
import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  AlertCircle,
  Loader2,
  Search,
  Send,
  CheckCircle,
  XCircle,
} from "lucide-react";
import { recordatoriosApi } from "../../api/recordatorios";

const formatDateTime = (dateStr) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  });
};

const getEstadoColor = (estado) => {
  switch (estado) {
    case "Enviado":
      return "bg-blue-100 text-blue-800";
    case "Entregado":
      return "bg-green-100 text-green-800";
    case "Pendiente":
      return "bg-yellow-100 text-yellow-800";
    case "Fallido":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getEstadoIcon = (estado) => {
  switch (estado) {
    case "Enviado":
      return <Send className="h-3 w-3" />;
    case "Entregado":
      return <CheckCircle className="h-3 w-3" />;
    case "Pendiente":
      return <Clock className="h-3 w-3" />;
    case "Fallido":
      return <XCircle className="h-3 w-3" />;
    default:
      return <AlertCircle className="h-3 w-3" />;
  }
};

export const RecepcionistaRecordatorios = () => {
  const [filtros, setFiltros] = useState({ estado: "", fecha: "" });
  const [recordatorios, setRecordatorios] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reenviandoId, setReenviandoId] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);

  const cargarRecordatorios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { ...filtros, page, limit };
      Object.keys(params).forEach((key) => {
        if (params[key] === "") delete params[key];
      });
      const data = await recordatoriosApi.listar(params);
      const lista = Array.isArray(data?.recordatorios) ? data.recordatorios : [];
      setRecordatorios(lista);
      setTotal(data?.total || 0);
    } catch (e) {
      console.error("Error cargando recordatorios:", e);
      setError("No se pudieron cargar los recordatorios");
    } finally {
      setLoading(false);
    }
  }, [filtros, page, limit]);

  useEffect(() => {
    cargarRecordatorios();
  }, [cargarRecordatorios]);

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const handleReenviar = async (citaId) => {
    if (!window.confirm("¿Reenviar el recordatorio para esta cita?")) return;
    setReenviandoId(citaId);
    try {
      await recordatoriosApi.reenviar(citaId);
      await cargarRecordatorios();
    } catch (err) {
      const msg =
        err.response?.data?.mensaje ||
        "No se pudo reenviar el recordatorio. Intenta nuevamente.";
      alert(msg);
    } finally {
      setReenviandoId(null);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-4" />
        <p className="text-gray-500">Cargando recordatorios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Recordatorios</h1>
          <p className="text-gray-500 mt-1">
            Gestiona el envío de recordatorios de citas por WhatsApp
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar paciente, médico..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div className="relative flex-1 sm:w-64">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="date"
              name="fecha"
              value={filtros.fecha}
              onChange={handleFiltroChange}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <select
            name="estado"
            value={filtros.estado}
            onChange={handleFiltroChange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:w-64"
          >
            <option value="">Todos los estados</option>
            <option value="Pendiente">Pendiente</option>
            <option value="Enviado">Enviado</option>
            <option value="Entregado">Entregado</option>
            <option value="Fallido">Fallido</option>
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
        {recordatorios.length === 0 && !loading ? (
          <div className="p-12 text-center">
            <Clock className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay recordatorios
            </h3>
            <p className="text-gray-500">
              Los recordatorios se crean automáticamente al agendar citas.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Médico</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha y Hora</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado entrega</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha envío</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado cita</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {recordatorios.map((r) => (
                  <tr key={r.recordatorio_id || r.cita_id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-gray-900 font-medium">{r.paciente || "—"}</td>
                    <td className="px-4 py-4 text-gray-600">{r.medico || "—"}</td>
                    <td className="px-4 py-4 text-gray-600">{formatDateTime(r.fecha)}</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(r.estado_entrega)}`}>
                        {getEstadoIcon(r.estado_entrega)}
                        {r.estado_entrega}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{r.fecha_envio ? formatDateTime(r.fecha_envio) : "—"}</td>
                    <td className="px-4 py-4 text-gray-600 capitalize">{r.estado_cita || "—"}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {r.estado_entrega === "Pendiente" && (
                          <button
                            onClick={() => handleReenviar(r.cita_id)}
                            disabled={reenviandoId === r.cita_id}
                            className="px-3 py-1.5 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Reenviar recordatorio"
                          >
                            {reenviandoId === r.cita_id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Send className="h-4 w-4" />
                            )}
                          </button>
                        )}
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
              Total: {total} recordatorios · Página {page} de {totalPages}
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

