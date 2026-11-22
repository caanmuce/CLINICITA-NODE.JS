// src/pages/recepcionista/Citas.jsx - Gestión de citas (Recepcionista)

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  PlusCircle,
  Search,
  Filter,
  Loader2,
  X,
  Edit,
  Trash2,
  CheckCircle,
  Clock,
  AlertCircle,
  UserPlus,
  ShieldAlert,
  TrendingUp,
  HeartPulse,
} from "lucide-react";
import { citasApi } from "../../api/citas";
import { pacientesApi } from "../../api/pacientes";
import { useAuth } from "../../context/AuthContext";
import { getColombiaDate } from "../../utils/dateUtils";

const ESTADOS_CITA = [
  "Pendiente",
  "Confirmada",
  "Completada",
  "Cancelada",
  "No-Asistio",
];

const getRiesgoColor = (nivel) => {
  switch (nivel) {
    case "Crítico":
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
    case "Crítico":
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

export const RecepcionistaCitas = () => {
  const { user } = useAuth();
  const [filtros, setFiltros] = useState({
    fecha: "",
    estado: "",
    q: "",
    page: 1,
    limit: 20,
  });
  const [citas, setCitas] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [editingCita, setEditingCita] = useState(null);
  const [formData, setFormData] = useState({
    paciente_id: "",
    medico_id: "",
    sede_id: "",
    fecha: "",
    hora: "",
    motivo: "",
    estado: "Pendiente",
  });
  const [pacientes, setPacientes] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [riesgos, setRiesgos] = useState({}); // mapa paciente_id -> riesgo

  // Reemplazar fetch directo por apiClient/pacientesApi para autenticación uniforme
  const cargarPacientes = useCallback(async () => {
    try {
      const resp = await pacientesApi.buscar("", 200);
      setPacientes(resp.pacientes || resp || []);
    } catch (e) {
      console.error("Error cargando pacientes:", e);
    }
  }, []);

  const cargarMedicos = useCallback(async () => {
    try {
      const { medicosApi } = await import("../../api/medicos");
      const resp = await medicosApi.listar();
      setMedicos(resp.medicos || resp || []);
    } catch (e) {
      console.error("Error cargando médicos:", e);
    }
  }, []);

  const cargarSedes = useCallback(async () => {
    try {
      const { sedesApi } = await import("../../api/sedes");
      const resp = await sedesApi.listar();
      setSedes(resp.sedes || resp || []);
    } catch (e) {
      console.error("Error cargando sedes:", e);
    }
  }, []);

  // Cargar riesgos en batch para los pacientes de las citas cargadas
  const cargarRiesgosBatch = useCallback(async (citaPacienteIds) => {
    if (!citaPacienteIds.length) return;
    try {
      const response = await pacientesApi.verRiesgoBatch(citaPacienteIds);
      const riesgosData = response?.riesgos || response || {};
      // Convertir a mapa para lookup rápido
      const mapaRiesgos = {};
      Object.entries(riesgosData).forEach(([pid, riesgo]) => {
        mapaRiesgos[Number(pid)] = riesgo;
      });
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
      const params = { ...filtros };
      Object.keys(params).forEach(
        (key) => params[key] === "" && delete params[key],
      );
      const data = await citasApi.listarAdmin(params);
      setCitas(data.citas || []);
      setTotal(data.total || 0);

      // Extraer IDs de pacientes únicos y cargar sus riesgos
      const pacienteIds = [
        ...new Set(
          (data.citas || []).map((c) => c.paciente_id).filter(Boolean),
        ),
      ];
      if (pacienteIds.length > 0) {
        cargarRiesgosBatch(pacienteIds);
      }
    } catch (err) {
      setError(
        "Error al cargar citas: " + (err.message || "Intente nuevamente"),
      );
    } finally {
      setLoading(false);
    }
  }, [filtros, cargarRiesgosBatch]);

  useEffect(() => {
    cargarPacientes();
    cargarMedicos();
    cargarSedes();
    cargarCitas();
  }, [cargarPacientes, cargarMedicos, cargarSedes, cargarCitas]);

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setFiltros((prev) => ({ ...prev, page: newPage }));
  };

  const abrirModal = (cita = null) => {
    if (cita) {
      setEditingCita(cita);
      setFormData({
        paciente_id: cita.paciente_id,
        medico_id: cita.medico_id,
        sede_id: cita.sede_id || "",
        fecha: cita.fecha,
        hora: cita.hora.slice(0, 5),
        motivo: cita.motivo || "",
        estado: cita.estado,
      });
    } else {
      setEditingCita(null);
      setFormData({
        paciente_id: "",
        medico_id: "",
        sede_id: "",
        fecha: getColombiaDate(),
        hora: "",
        motivo: "",
        estado: "Pendiente",
      });
    }
    setShowModal(true);
  };

  const cerrarModal = () => {
    setShowModal(false);
    setEditingCita(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const payload = {
        paciente_id: Number(formData.paciente_id),
        medico_id: Number(formData.medico_id),
        sede_id: formData.sede_id ? Number(formData.sede_id) : null,
        fecha: formData.fecha,
        hora: formData.hora,
        motivo: formData.motivo,
        estado: formData.estado,
      };
      if (editingCita) {
        await citasApi.actualizarAdmin(editingCita.cita_id, payload);
      } else {
        await citasApi.crearAdmin(payload);
      }
      cerrarModal();
      await cargarCitas();
    } catch (err) {
      setError("Error al guardar: " + (err.message || "Intente nuevamente"));
    } finally {
      setLoading(false);
    }
  };

  const handleCambiarEstado = async (cita, nuevoEstado) => {
    if (!window.confirm(`¿Cambiar estado a "${nuevoEstado}"?`)) return;
    setLoading(true);
    try {
      await citasApi.cambiarEstado(cita.cita_id, nuevoEstado);
      await cargarCitas();
    } catch (err) {
      setError(
        "Error al cambiar estado: " + (err.message || "Intente nuevamente"),
      );
    } finally {
      setLoading(false);
    }
  };

  const handleEliminar = async (cita) => {
    if (!window.confirm("¿Eliminar esta cita?")) return;
    setLoading(true);
    try {
      await citasApi.actualizarAdmin(cita.cita_id, { estado: "Cancelada" });
      await cargarCitas();
    } catch (err) {
      setError("Error al eliminar: " + (err.message || "Intente nuevamente"));
    } finally {
      setLoading(false);
    }
  };

  const getEstadoColor = (estado) => {
    const colores = {
      Pendiente: "bg-yellow-100 text-yellow-800",
      Confirmada: "bg-blue-100 text-blue-800",
      Completada: "bg-green-100 text-green-800",
      Cancelada: "bg-red-100 text-red-800",
      "No-Asistio": "bg-gray-100 text-gray-800",
    };
    return colores[estado] || "bg-gray-100 text-gray-800";
  };

  const totalPages = Math.ceil(total / filtros.limit) || 1;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Citas</h1>
          <p className="text-gray-500 mt-1">
            Programar, confirmar y gestionar todas las citas médicas
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => abrirModal()}
            className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
          >
            <UserPlus className="h-5 w-5" />
            Nueva cita
          </button>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              name="q"
              placeholder="Buscar paciente, médico, DNI..."
              value={filtros.q}
              onChange={handleFiltroChange}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha
            </label>
            <input
              type="date"
              name="fecha"
              value={filtros.fecha}
              onChange={handleFiltroChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Estado
            </label>
            <select
              name="estado"
              value={filtros.estado}
              onChange={handleFiltroChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">Todos</option>
              {ESTADOS_CITA.map((e) => (
                <option key={e} value={e}>
                  {e}
                </option>
              ))}
            </select>
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors self-end">
            <Filter className="h-5 w-5" /> Filtros
          </button>
        </div>
      </div>

      {/* Tabla de citas */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Fecha / Hora
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Paciente
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Acciones
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                  </td>
                </tr>
              ) : citas.length === 0 ? (
                <tr>
                  <td
                    colSpan="8"
                    className="px-4 py-12 text-center text-gray-500"
                  >
                    <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p>No hay citas registradas</p>
                  </td>
                </tr>
              ) : (
                citas.map((cita) => (
                  <tr key={cita.cita_id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2 text-gray-900">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span>{cita.fecha}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-500">
                        <Clock className="h-4 w-4" />
                        <span>{cita.hora}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <p className="text-gray-900 font-medium">
                        {cita.paciente}
                      </p>
                      <p className="text-gray-500 text-xs">
                        {cita.documento_id}
                      </p>
                      {/* Mostrar riesgo no-show del paciente */}
                      {riesgos[cita.paciente_id] && (
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mt-1 ${getRiesgoColor(riesgos[cita.paciente_id].nivel)}`}
                        >
                          {getRiesgoIcon(riesgos[cita.paciente_id].nivel)}
                          {riesgos[cita.paciente_id].nivel}
                          {riesgos[cita.paciente_id].score !== undefined && (
                            <> • {riesgos[cita.paciente_id].score}/100</>
                          )}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-900">
                      {cita.medico}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {cita.especialidad}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500">
                      {cita.sede}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getEstadoColor(cita.estado)}`}
                      >
                        {cita.estado}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-500 max-w-xs truncate">
                      {cita.motivo || "-"}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() =>
                            handleCambiarEstado(cita, "Confirmada")
                          }
                          disabled={cita.estado !== "Pendiente"}
                          className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Confirmar"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleCambiarEstado(cita, "Completada")
                          }
                          disabled={cita.estado !== "Confirmada"}
                          className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Marcar como atendida"
                        >
                          <CheckCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() =>
                            handleCambiarEstado(cita, "No-Asistio")
                          }
                          disabled={cita.estado !== "Confirmada"}
                          className="p-2 text-gray-600 hover:bg-gray-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="No asistió"
                        >
                          <X className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => abrirModal(cita)}
                          className="p-2 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleEliminar(cita)}
                          disabled={[
                            "Cancelada",
                            "Completada",
                            "No-Asistio",
                          ].includes(cita.estado)}
                          className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Cancelar"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Paginación */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-gray-200 flex items-center justify-between">
            <p className="text-sm text-gray-500">
              Total: {total} citas · Página {filtros.page} de {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                onClick={() => handlePageChange(filtros.page - 1)}
                disabled={filtros.page === 1}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
              >
                Anterior
              </button>
              <button
                onClick={() => handlePageChange(filtros.page + 1)}
                disabled={filtros.page === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-lg text-sm disabled:opacity-50"
              >
                Siguiente
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Modal crear/editar */}
      {showModal && (
        <div
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
          onClick={cerrarModal}
        >
          <div
            className="bg-white rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 border-b border-gray-200 flex items-center justify-between sticky top-0 bg-white z-10 rounded-t-2xl">
              <h3 className="text-xl font-bold text-gray-900">
                {editingCita ? "Editar cita" : "Nueva cita"}
              </h3>
              <button
                onClick={cerrarModal}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <X className="h-6 w-6 text-gray-400" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm flex items-center gap-2">
                  <AlertCircle className="h-4 w-4" />
                  {error}
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Paciente
                </label>
                <select
                  value={formData.paciente_id}
                  onChange={(e) =>
                    setFormData({ ...formData, paciente_id: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                >
                  <option value="">Seleccione...</option>
                  {pacientes.map((p) => (
                    <option key={p.paciente_id} value={p.paciente_id}>
                      {p.nombre_completo} - {p.documento_id}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Médico
                </label>
                <select
                  value={formData.medico_id}
                  onChange={(e) =>
                    setFormData({ ...formData, medico_id: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                >
                  <option value="">Seleccione...</option>
                  {medicos.map((m) => (
                    <option key={m.medico_id} value={m.medico_id}>
                      {m.nombre_completo} - {m.especialidad}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sede
                </label>
                <select
                  value={formData.sede_id}
                  onChange={(e) =>
                    setFormData({ ...formData, sede_id: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">Seleccione...</option>
                  {sedes.map((s) => (
                    <option key={s.sede_id} value={s.sede_id}>
                      {s.nombre}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha
                  </label>
                  <input
                    type="date"
                    value={formData.fecha}
                    onChange={(e) =>
                      setFormData({ ...formData, fecha: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hora
                  </label>
                  <input
                    type="time"
                    value={formData.hora}
                    onChange={(e) =>
                      setFormData({ ...formData, hora: e.target.value })
                    }
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo
                </label>
                <textarea
                  value={formData.motivo}
                  onChange={(e) =>
                    setFormData({ ...formData, motivo: e.target.value })
                  }
                  rows={2}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Motivo de la consulta"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Estado
                </label>
                <select
                  value={formData.estado}
                  onChange={(e) =>
                    setFormData({ ...formData, estado: e.target.value })
                  }
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  required
                >
                  {ESTADOS_CITA.map((e) => (
                    <option key={e} value={e}>
                      {e}
                    </option>
                  ))}
                </select>
              </div>
              <div className="pt-4 border-t border-gray-200 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={cerrarModal}
                  className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50"
                >
                  {loading ? (
                    <Loader2 className="h-5 w-5 animate-spin" />
                  ) : editingCita ? (
                    "Guardar cambios"
                  ) : (
                    "Crear cita"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {error && !showModal && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" /> {error}
          </p>
        </div>
      )}
    </div>
  );
};
