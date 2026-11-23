// src/pages/paciente/Citas.jsx - Mis citas: consultar, mostrar estados y cancelar

import React, { useState, useEffect } from "react";
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Search,
  XCircle,
  Loader2,
  AlertCircle,
  CheckCircle,
  Trash2,
} from "lucide-react";
import { Link } from "react-router-dom";
import { citasApi } from "../../api/citas";

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota",
  });
};

const formatTime = (timeStr) => {
  if (!timeStr) return "—";
  const [hours, minutes] = timeStr.split(":");
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Bogota",
  });
};

const formatDateShort = (dateStr) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota",
  });
};

// Backend devuelve estados en Title Case: 'Confirmada', 'Pendiente', 'Completada', 'Cancelada', 'No-Asistio'
const getEstadoColor = (estado) => {
  switch (estado) {
    case "Confirmada":
      return "bg-green-100 text-green-800";
    case "Pendiente":
      return "bg-yellow-100 text-yellow-800";
    case "Completada":
      return "bg-teal-100 text-teal-800";
    case "Cancelada":
      return "bg-red-100 text-red-800";
    case "No-Asistio":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getEstadoLabel = (estado) => {
  switch (estado) {
    case "Confirmada":
      return "Confirmada";
    case "Pendiente":
      return "Pendiente";
    case "Completada":
      return "Completada";
    case "Cancelada":
      return "Cancelada";
    case "No-Asistio":
      return "No asistió";
    default:
      return estado;
  }
};

const getEstadoIcon = (estado) => {
  switch (estado) {
    case "Confirmada":
      return <CheckCircle className="h-4 w-4" />;
    case "Pendiente":
      return <Clock className="h-4 w-4" />;
    case "Completada":
      return <CheckCircle className="h-4 w-4" />;
    case "Cancelada":
      return <XCircle className="h-4 w-4" />;
    case "No-Asistio":
      return <AlertCircle className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
};

const ESTADOS_OPTIONS = [
  { value: "", label: "Todos los estados" },
  { value: "Pendiente", label: "Pendiente" },
  { value: "Confirmada", label: "Confirmada" },
  { value: "Completada", label: "Completada" },
  { value: "Cancelada", label: "Cancelada" },
  { value: "No-Asistio", label: "No asistió" },
];

export const PacienteCitas = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [citas, setCitas] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [cancelandoId, setCancelandoId] = useState(null);

  const cargarCitas = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await citasApi.listarMisCitas();
      const data = response.data || response || [];
      const citasData = Array.isArray(data) ? data : data?.citas || data?.data || [];
      setCitas(citasData);
    } catch (err) {
      console.error("Error cargando citas:", err);
      setError("No se pudieron cargar las citas. Intenta nuevamente.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => cargarCitas(), 0);
  }, []);

  const handleCancelar = async (citaId) => {
    if (!window.confirm("¿Estás seguro de que deseas cancelar esta cita?"))
      return;

    setCancelandoId(citaId);
    try {
      await citasApi.cancelar(citaId);
      setCitas((prev) =>
        prev.map((cita) =>
          (cita.cita_id || cita.id) === citaId
            ? { ...cita, estado: "Cancelada" }
            : cita,
        ),
      );
    } catch (err) {
      console.error("Error cancelando cita:", err);
      const msg =
        err.response?.data?.message ||
        "No se pudo cancelar la cita. Intenta nuevamente.";
      alert(msg);
    } finally {
      setCancelandoId(null);
    }
  };

  const citasFiltradas = citas.filter((cita) => {
    const matchesSearch =
      !searchTerm ||
      (cita.medico &&
        cita.medico.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cita.especialidad &&
        cita.especialidad.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cita.sede &&
        cita.sede.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (cita.motivo &&
        cita.motivo.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesEstado = !estadoFilter || cita.estado === estadoFilter;

    return matchesSearch && matchesEstado;
  });

  // Helper to combine fecha and hora into a Date for comparison
  const getCitaDateTime = (cita) => {
    if (cita.fecha_hora) return new Date(cita.fecha_hora).getTime();
    if (cita.fecha && cita.hora)
      return new Date(`${cita.fecha}T${cita.hora}:00`).getTime();
    return 0;
  };

  // eslint-disable-next-line react-hooks/purity -- Date.now() is acceptable for current timestamp in render
  const nowTimestamp = Date.now();

  const citasProximas = citasFiltradas
    .filter(
      (c) =>
        ["Pendiente", "Confirmada"].includes(c.estado) &&
        getCitaDateTime(c) >= nowTimestamp,
    )
    .sort((a, b) => getCitaDateTime(a) - getCitaDateTime(b));

  const citasHistorial = citasFiltradas
    .filter(
      (c) =>
        ["Completada", "Cancelada", "No-Asistio"].includes(c.estado) ||
        getCitaDateTime(c) < nowTimestamp,
    )
    .sort((a, b) => getCitaDateTime(b) - getCitaDateTime(a));

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Citas</h1>
          <p className="text-gray-500 mt-1">
            Historial y próximas citas médicas
          </p>
        </div>
        <Link
          to="/paciente/agendar"
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
        >
          <span className="h-5 w-5">+</span>
          Agendar nueva
        </Link>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
          <p className="text-red-700">{error}</p>
          <button
            onClick={cargarCitas}
            className="ml-auto px-3 py-1 text-sm text-red-700 hover:text-red-900 underline"
          >
            Reintentar
          </button>
        </div>
      )}

      {/* Filtros y búsqueda */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por médico, especialidad, sede, motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <select
            value={estadoFilter}
            onChange={(e) => setEstadoFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 bg-white"
          >
            {ESTADOS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Próximas citas */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-teal-600" />
            Próximas citas ({citasProximas.length})
          </h2>
        </div>
        {citasProximas.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No tienes citas programadas</p>
            <p className="text-sm text-gray-400 mt-1">
              Haz clic en 'Agendar nueva' para programar una cita
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha y Hora
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Médico
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Especialidad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sede
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {citasProximas.map((cita) => (
                  <tr
                    key={cita.cita_id || cita.id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-gray-900">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>
                          {cita.fecha ? formatDate(cita.fecha) : "—"}{" "}
                          {cita.hora ? formatTime(cita.hora) : ""}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">
                          {cita.medico || "—"}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">{cita.especialidad || "—"}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>Sede por confirmar</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={
                          "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium " +
                          getEstadoColor(cita.estado)
                        }
                      >
                        {getEstadoIcon(cita.estado)}
                        {getEstadoLabel(cita.estado)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {["pendiente", "confirmada"].includes(cita.estado) && (
                          <button
                            onClick={() => handleCancelar(cita.id)}
                            disabled={cancelandoId === cita.id}
                            className="flex items-center gap-1 px-3 py-1.5 text-sm text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Cancelar cita"
                          >
                            {cancelandoId === cita.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                            <span className="hidden sm:inline">Cancelar</span>
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
      </div>

      {/* Historial de citas */}
      <div className="bg-white rounded-xl border border-gray-200 mt-6">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="h-5 w-5 text-teal-600" />
            Historial de citas ({citasHistorial.length})
          </h2>
        </div>
        {citasHistorial.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Clock className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No hay citas en el historial</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Médico
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Especialidad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Sede
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Motivo
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {citasHistorial.map((cita) => (
                  <tr
                    key={cita.cita_id || cita.id}
                    className="hover:bg-gray-50"
                  >
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2 text-gray-900">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>
                          {cita.fecha ? formatDateShort(cita.fecha) : "—"}{" "}
                          {cita.hora ? formatTime(cita.hora) : ""}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>{cita.medico || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">{cita.especialidad || "—"}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span>Sede por confirmar</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={
                          "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium " +
                          getEstadoColor(cita.estado)
                        }
                      >
                        {getEstadoIcon(cita.estado)}
                        {getEstadoLabel(cita.estado)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-600 max-w-xs truncate">
                      {cita.motivo || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {citas.length === 0 && !error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
          <h3 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
            <span>📋</span> Sin citas registradas
          </h3>
          <p className="text-sm text-yellow-700">
            No tienes citas agendadas aún. Haz clic en 'Agendar nueva' para
            programar tu primera cita.
          </p>
        </div>
      )}
    </div>
  );
};
