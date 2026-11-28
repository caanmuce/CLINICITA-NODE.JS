// src/pages/medico/Citas.jsx - GestiÃ³n de citas del mÃ©dico: listar, cambiar estado

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  Clock,
  User,
  Stethoscope,
  Search,
  Filter,
  CheckCircle,
  FileText,
  AlertCircle,
  Loader2,
  ChevronLeft,
  ChevronRight,
  UserCog,
  XCircle,
  ShieldAlert,
  TrendingUp,
  HeartPulse,
} from "lucide-react";
import { citasApi } from "../../api/citas";
import { pacientesApi } from "../../api/pacientes";

// Funciones de utilidad
const formatDateTime = (dateStr) => {
  if (!dateStr) return "â€”";
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  });
};

const formatTime = (dateStr) => {
  if (!dateStr) return "â€”";
  const date = new Date(dateStr);
  return date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Bogota",
  });
};

// Mapeo de estados del backend (Title Case) a estilos
const getEstadoColor = (estado) => {
  switch (estado) {
    case "Confirmada":
      return "bg-green-100 text-green-800";
    case "Pendiente":
      return "bg-yellow-100 text-yellow-800";
    case "Completada":
      return "bg-purple-100 text-purple-800";
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
      return "No asistiÃ³";
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
      return <UserCog className="h-4 w-4" />;
    default:
      return <AlertCircle className="h-4 w-4" />;
  }
};

// Riesgo ML colors
const getRiesgoColor = (nivel) => {
  switch (nivel) {
    case "CrÃ­tico":
      return "bg-red-100 text-red-800 border border-red-200";
    case "Alto":
      return "bg-orange-100 text-orange-800 border border-orange-200";
    case "Medio":
      return "bg-yellow-100 text-yellow-800 border border-yellow-200";
    case "Bajo":
      return "bg-green-100 text-green-800 border border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border border-gray-200";
  }
};

const getRiesgoIcon = (nivel) => {
  switch (nivel) {
    case "CrÃ­tico":
      return <ShieldAlert className="h-3 w-3" />;
    case "Alto":
      return <AlertCircle className="h-3 w-3" />;
    case "Medio":
      return <TrendingUp className="h-3 w-3" />;
    case "Bajo":
      return <HeartPulse className="h-3 w-3" />;
    default:
      return <ShieldAlert className="h-3 w-3" />;
  }
};

const getColombiaDate = () => {
  const now = new Date();
  const offset = -5 * 60;
  const colombiaTime = new Date(
    now.getTime() + (offset + now.getTimezoneOffset()) * 60000,
  );
  return colombiaTime.toISOString().split("T")[0];
};

// Normalizar estado del backend para filtros internos
const normalizeEstado = (estado) => {
  if (!estado) return "";
  return estado.toLowerCase().replace(" ", "_").replace("-", "_");
};

// Componente principal
const MedicoCitas = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [citas, setCitas] = useState([]);
  const [selectedDate, setSelectedDate] = useState(getColombiaDate());
  const [searchTerm, setSearchTerm] = useState("");
  const [estadoFilter, setEstadoFilter] = useState("");
  const [showDetail, setShowDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [changingState, setChangingState] = useState(null);
  const [riesgos, setRiesgos] = useState({}); // mapa paciente_id -> riesgo

  // Cargar riesgos individualmente (el endpoint batch solo autoriza admin/recepcionista;
  // el mÃ©dico puede consultar el riesgo de cada paciente vÃ­a GET /api/pacientes/:id/riesgo)
  const cargarRiesgosBatch = useCallback(async (citaPacienteIds) => {
    if (!citaPacienteIds.length) return;
    try {
      const mapaRiesgos = {};
      await Promise.all(citaPacienteIds.map(async (pid) => {
        try {
          const response = await pacientesApi.verRiesgo(pid);
          const riesgo = response?.riesgo || response || null;
          if (riesgo) mapaRiesgos[Number(pid)] = riesgo;
        } catch (e) {
          // Fallar en silencio por paciente: no bloquear la carga de citas
        }
      }));
      setRiesgos(mapaRiesgos);
    } catch (e) {
      console.warn("No se pudieron cargar riesgos:", e);
      setRiesgos({});
    }
  }, []);


  const cargarCitas = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await citasApi.listarMedico(selectedDate);
      const data = response.citas || response.data || response;
      setCitas(data);

      // Extraer IDs de pacientes Ãºnicos y cargar sus riesgos
      const pacienteIds = [
        ...new Set((data || []).map((c) => c.paciente_id).filter(Boolean)),
      ];
      if (pacienteIds.length > 0) {
        cargarRiesgosBatch(pacienteIds);
      }
    } catch (err) {
      setError(
        "Error al cargar las citas: " + (err.message || "Intente nuevamente"),
      );
    } finally {
      setLoading(false);
    }
  }, [selectedDate, cargarRiesgosBatch]);

  useEffect(() => {
    cargarCitas();
  }, [cargarCitas]);

  const handleFechaChange = (dias) => {
    const fecha = new Date(selectedDate);
    fecha.setDate(fecha.getDate() + dias);
    setSelectedDate(fecha.toISOString().split("T")[0]);
  };

  const isToday = selectedDate === getColombiaDate();

  const citasFiltradas = citas.filter((cita) => {
    const matchesSearch =
      !searchTerm ||
      cita.paciente?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      cita.documento_id?.includes(searchTerm) ||
      cita.motivo?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesEstado =
      !estadoFilter || normalizeEstado(cita.estado) === estadoFilter;
    return matchesSearch && matchesEstado;
  });

  const handleVerDetalle = async (cita) => {
    setShowDetail(cita);
    setDetailLoading(true);
    try {
      // Cargar ficha de preconsulta si existe
      const { fichasPreconsultaApi } =
        await import("../../api/fichasPreconsulta");
      const response = await fichasPreconsultaApi.obtenerPorCita(cita.cita_id);
      const preconsulta = response.data || response;
      setShowDetail((prev) => (prev ? { ...prev, preconsulta } : null));
    } catch (e) {
      console.warn("No hay ficha de preconsulta o error:", e);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleCambiarEstado = async (citaId, nuevoEstado) => {
    setChangingState(citaId);
    try {
      await citasApi.cambiarEstado(citaId, nuevoEstado);
      await cargarCitas();
    } catch (err) {
      setError(
        "Error al cambiar estado: " + (err.message || "Intente nuevamente"),
      );
    } finally {
      setChangingState(null);
    }
  };

  const handleNoShow = async (citaId) => {
    if (
      !window.confirm(
        'Â¿Marcar como "No asistiÃ³"? Esta acciÃ³n no se puede deshacer.',
      )
    )
      return;
    await handleCambiarEstado(citaId, "No-Asistio");
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mis Citas</h1>
          <p className="text-gray-500 mt-1">
            Gestiona tu agenda mÃ©dica del dÃ­a
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 bg-white border border-gray-200 rounded-xl px-4 py-2 shadow-sm">
            <button
              onClick={() => handleFechaChange(-1)}
              disabled={!isToday}
              className="p-2 text-gray-600 hover:text-teal-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <span className="font-medium text-gray-900 min-w-[140px] text-center">
              {formatDateTime(selectedDate + "T00:00:00")}
            </span>
            <button
              onClick={() => handleFechaChange(1)}
              className="p-2 text-gray-600 hover:text-teal-600 transition-colors"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
          </div>
          <button
            onClick={() => handleFechaChange(0)}
            className="px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors flex items-center gap-2"
          >
            <Calendar className="h-4 w-4" /> Hoy
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" /> {error}
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar paciente, DNI, motivo..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Filtrar por estado
            </label>
            <select
              value={estadoFilter}
              onChange={(e) => setEstadoFilter(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">Todos</option>
              <option value="confirmada">Confirmada</option>
              <option value="pendiente">Pendiente</option>
              <option value="completada">Completada</option>
              <option value="cancelada">Cancelada</option>
              <option value="no_asistio">No asistiÃ³</option>
            </select>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-12">
            <Loader2 className="h-8 w-8 animate-spin mx-auto text-teal-600" />
          </div>
        ) : citasFiltradas.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="h-16 w-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg">
              No hay citas para esta fecha
            </p>
            <p className="text-gray-400 text-sm mt-1">
              Intenta cambiar la fecha o los filtros
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {citasFiltradas.map((cita) => (
              <div
                key={cita.cita_id}
                className="bg-white rounded-xl border border-gray-200 p-4 hover:border-teal-300 transition-colors"
              >
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-center gap-4 flex-1 min-w-0">
                    <div className="p-3 bg-teal-100 rounded-lg flex-shrink-0">
                      <User className="h-6 w-6 text-teal-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-medium text-gray-900 truncate">
                        {cita.paciente || "Paciente"}
                      </p>
                      <div className="flex flex-wrap gap-4 text-sm text-gray-500 mt-1">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" /> {cita.hora || "â€”"}
                        </span>
                        <span className="flex items-center gap-1">
                          <Stethoscope className="h-4 w-4" /> {cita.sede || "â€”"}
                        </span>
                      </div>
                      {/* Mostrar riesgo no-show del paciente */}
                      {riesgos[cita.paciente_id] && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${getRiesgoColor(riesgos[cita.paciente_id].nivel)}`}
                        >
                          {getRiesgoIcon(riesgos[cita.paciente_id].nivel)}
                          {riesgos[cita.paciente_id].nivel}
                          {riesgos[cita.paciente_id].score !== undefined && (
                            <> â€¢ {riesgos[cita.paciente_id].score}/100</>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span
                      className={
                        "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium " +
                        getEstadoColor(cita.estado)
                      }
                    >
                      {getEstadoIcon(cita.estado)}
                      {getEstadoLabel(cita.estado)}
                    </span>
                    <button
                      onClick={() => handleVerDetalle(cita)}
                      className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" /> Ver detalle
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {showDetail && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={() => setShowDetail(null)}
        >
          <div
            className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
              <div>
                <h3 className="text-xl font-bold text-gray-900">
                  {showDetail.paciente || "Paciente"}
                </h3>
                <p className="text-gray-500">
                  {showDetail.sede || ""} Â·{" "}
                  {showDetail.hora ? selectedDate + " " + showDetail.hora : ""}
                </p>
              </div>
              <button
                onClick={() => setShowDetail(null)}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <AlertCircle className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm text-gray-500">DNI</p>
                  <p className="font-medium">
                    {showDetail.documento_id || "â€”"}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Sede</p>
                  <p className="font-medium">{showDetail.sede || "â€”"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Hora</p>
                  <p className="font-medium">{showDetail.hora || "â€”"}</p>
                </div>
                <div>
                  <p className="text-sm text-gray-500">Estado</p>
                  <span
                    className={
                      "inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium " +
                      getEstadoColor(showDetail.estado)
                    }
                  >
                    {getEstadoIcon(showDetail.estado)}
                    {getEstadoLabel(showDetail.estado)}
                  </span>
                </div>
                {/* Riesgo en el detalle */}
                {riesgos[showDetail.paciente_id] && (
                  <div className="col-span-2">
                    <p className="text-sm text-gray-500">Riesgo No-Show</p>
                    <span
                      className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getRiesgoColor(riesgos[showDetail.paciente_id].nivel)}`}
                    >
                      {getRiesgoIcon(riesgos[showDetail.paciente_id].nivel)}
                      {riesgos[showDetail.paciente_id].nivel}
                      {riesgos[showDetail.paciente_id].score !== undefined && (
                        <> â€¢ {riesgos[showDetail.paciente_id].score}/100</>
                      )}
                    </span>
                  </div>
                )}
              </div>
              {showDetail.motivo && (
                <div>
                  <p className="text-sm text-gray-500">Motivo de la consulta</p>
                  <p className="font-medium">{showDetail.motivo}</p>
                </div>
              )}
              {showDetail.preconsulta && showDetail.preconsulta.sintomas && (
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4">
                  <p className="text-sm font-medium text-teal-900 mb-2 flex items-center gap-2">
                    <FileText className="h-4 w-4" /> Ficha de pre-consulta
                  </p>
                  <div className="space-y-2 text-sm">
                    <p>
                      <strong>SÃ­ntomas:</strong>{" "}
                      {showDetail.preconsulta.sintomas}
                    </p>
                  </div>
                </div>
              )}
              <div className="pt-4 border-t border-gray-200 flex gap-3 justify-end">
                <button
                  onClick={() => setShowDetail(null)}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MedicoCitas;
