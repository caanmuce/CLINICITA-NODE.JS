// src/pages/paciente/ListaEspera.jsx - Lista de espera del paciente

import React, { useState, useEffect, useCallback } from "react";
import {
  Clock,
  User,
  AlertCircle,
  PlusCircle,
  Loader2,
  CheckCircle,
  XCircle,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import { listaEsperaApi } from "../../api/listaEspera";

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-CO", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  });
};

const getEstadoColor = (estado) => {
  // Backend devuelve solo 'Activo' para la lista del paciente
  // Mapear a estilos del frontend
  switch (estado) {
    case "Activo":
      return "bg-yellow-100 text-yellow-800";
    case "Asignado":
      return "bg-blue-100 text-blue-800";
    case "Expirado":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getEstadoLabel = (estado) => {
  switch (estado) {
    case "Activo":
      return "Pendiente";
    case "Asignado":
      return "Asignado (cupo liberado)";
    case "Expirado":
      return "Expirado";
    default:
      return estado;
  }
};

const getPrioridadColor = (prioridad) => {
  // Backend devuelve 'Alta', 'Media', 'Baja' (Title Case)
  switch (prioridad) {
    case "Alta":
      return "bg-red-100 text-red-800";
    case "Media":
      return "bg-teal-100 text-teal-800";
    case "Baja":
      return "bg-green-100 text-green-800";
    // Compatibilidad con valores legacy lowercase
    case "alta":
      return "bg-red-100 text-red-800";
    case "normal":
      return "bg-teal-100 text-teal-800";
    case "baja":
      return "bg-green-100 text-green-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

const getPrioridadLabel = (prioridad) => {
  switch (prioridad) {
    case "Alta":
      return "Alta";
    case "Media":
      return "Normal";
    case "Baja":
      return "Baja";
    case "alta":
      return "Alta";
    case "normal":
      return "Normal";
    case "baja":
      return "Baja";
    default:
      return prioridad;
  }
};

const getPrioridadIcon = (prioridad) => {
  switch (prioridad) {
    case "Alta":
    case "alta":
      return <ArrowUp className="h-4 w-4" />;
    case "Baja":
    case "baja":
      return <ArrowDown className="h-4 w-4" />;
    default:
      return <Clock className="h-4 w-4" />;
  }
};

export const PacienteListaEspera = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lista, setLista] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formError, setFormError] = useState(null);
  const [especialidades, setEspecialidades] = useState([]);

  const cargarLista = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await listaEsperaApi.listarMiLista();
      const data = response.data || response || [];
      setLista(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Error cargando lista de espera:", err);
      setError(
        err.userMessage ||
          "No se pudo cargar la lista de espera. Intenta nuevamente.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const cargarEspecialidades = useCallback(async () => {
    try {
      const { medicosApi } = await import("../../api/medicos");
      const response = await medicosApi.listarEspecialidades();
      const data = response.data || response || [];
      // listarEspecialidades ya devuelve array de { nombre }
      setEspecialidades(
        Array.isArray(data)
          ? data.map((e) => ({ especialidad_id: e.nombre, nombre: e.nombre }))
          : [],
      );
    } catch (err) {
      console.warn("Error cargando especialidades:", err);
    }
  }, []);

  useEffect(() => {
    cargarLista();
    cargarEspecialidades();
  }, [cargarLista, cargarEspecialidades]);

  const handleInscribir = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const especialidad_requerida = formData.get("especialidad_requerida");
    const sede_id = formData.get("sede_id")
      ? Number(formData.get("sede_id"))
      : undefined;
    const observaciones = formData.get("observaciones") || undefined;

    if (!especialidad_requerida) {
      setFormError("Especialidad es obligatoria");
      return;
    }

    setFormError(null);
    try {
      await listaEsperaApi.inscribirme({
        especialidad_requerida,
        sede_id,
        observaciones,
      });
      setShowForm(false);
      await cargarLista();
    } catch (err) {
      console.error("Error inscribiendo:", err);
      setFormError(
        err.userMessage || "No se pudo inscribir. Intenta nuevamente.",
      );
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Lista de espera</h1>
          <p className="text-gray-500 mt-1">
            Gestiona tu posición en la lista de espera por especialidad
          </p>
        </div>
        {!showForm && lista.length > 0 && (
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
          >
            <PlusCircle className="h-5 w-5" />
            Inscribirme
          </button>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0" />
          <p className="text-red-800">{error}</p>
        </div>
      )}

      {/* Formulario de inscripción */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <PlusCircle className="h-5 w-5 text-teal-600" /> Nueva inscripción
            </h2>
            <button
              onClick={() => {
                setShowForm(false);
                setFormError(null);
              }}
              className="text-gray-400 hover:text-gray-600"
            >
              <XCircle className="h-5 w-5" />
            </button>
          </div>

          <form onSubmit={handleInscribir} className="space-y-4">
            {formError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-800 text-sm flex items-center gap-2">
                <AlertCircle className="h-4 w-4 flex-shrink-0" />
                {formError}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Especialidad *
              </label>
              <select
                name="especialidad_requerida"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                required
              >
                <option value="">Seleccionar especialidad</option>
                {especialidades.map((esp) => (
                  <option key={esp.nombre} value={esp.nombre}>
                    {esp.nombre}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sede (opcional)
              </label>
              <select
                name="sede_id"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">Sin preferencia de sede</option>
                {/* Las sedes se cargarían desde la API si fuera necesario */}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Observaciones (opcional)
              </label>
              <textarea
                name="observaciones"
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Información adicional para recepción..."
                maxLength={500}
              />
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <button
                type="button"
                onClick={() => {
                  setShowForm(false);
                  setFormError(null);
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="flex items-center gap-2 px-6 py-2 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
              >
                <PlusCircle className="h-5 w-5" />
                Inscribirme
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Lista de espera */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {lista.length === 0 && !showForm ? (
          <div className="p-12 text-center">
            <Clock className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No estás en ninguna lista de espera
            </h3>
            <p className="text-gray-500 mb-6">
              Cuando te inscribas, aparecerás aquí con tu posición y estado
            </p>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-2 px-6 py-3 bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors"
            >
              <PlusCircle className="h-5 w-5" />
              Inscribirme en lista de espera
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    #
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Especialidad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Prioridad
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Motivo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha inscripción
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Posición
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lista.map((item, index) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-gray-900 font-medium">
                      {index + 1}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-400" />
                        <span>{item.especialidad_nombre || "—"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getPrioridadColor(item.prioridad)}`}
                      >
                        {getPrioridadIcon(item.prioridad)}
                        {getPrioridadLabel(item.prioridad)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-600 max-w-xs truncate">
                      {item.motivo || "—"}
                    </td>
                    <td className="px-4 py-4 text-gray-600">
                      {formatDate(item.fecha_inscripcion)}
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(item.estado)}`}
                      >
                        {item.estado === "confirmada" && (
                          <CheckCircle className="h-3 w-3" />
                        )}
                        {item.estado === "pendiente" && (
                          <Clock className="h-3 w-3" />
                        )}
                        {item.estado === "atendida" && (
                          <CheckCircle className="h-3 w-3" />
                        )}
                        {item.estado === "cancelada" && (
                          <XCircle className="h-3 w-3" />
                        )}
                        {getEstadoLabel(item.estado)}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-gray-900 font-medium">
                      {item.posicion ? `#${item.posicion}` : "—"}
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
