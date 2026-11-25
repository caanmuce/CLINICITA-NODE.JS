// src/pages/recepcionista/Horarios.jsx - Gestión de horarios y disponibilidad (Recepcionista/Admin)

import React, { useState, useEffect, useCallback } from "react";
import {
  Calendar,
  AlertCircle,
  Search,
  Filter,
  ChevronLeft,
  ChevronRight,
  Loader2,
} from "lucide-react";
import { horariosApi } from "../../api/horarios";
import { medicosApi } from "../../api/medicos";
import { sedesApi } from "../../api/sedes";
import { useAuth } from "../../context/AuthContext";

const DIAS_SEMANA = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export const RecepcionistaHorarios = () => {
  const { user } = useAuth();
  const [filtros, setFiltros] = useState({
    medico_id: "",
    sede_id: "",
    dia_semana: "",
    semana: "",
  });
  const [horarios, setHorarios] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 20;

  const cargarMedicos = useCallback(async () => {
    try {
      const data = await medicosApi.listar();
      setMedicos(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando médicos:", e);
    }
  }, []);

  const cargarSedes = useCallback(async () => {
    try {
      const data = await sedesApi.listar();
      setSedes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando sedes:", e);
    }
  }, []);

  const cargarHorarios = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = { ...filtros, page, limit };
      Object.keys(params).forEach(
        (key) => params[key] === "" && delete params[key],
      );
      const data = await horariosApi.listarAdmin(params);
      setHorarios(data.horarios || []);
      // El backend no pagina aún, pero preparamos para cuando lo haga
      setTotalPages(
        Math.ceil((data.total || data.horarios?.length || 0) / limit) || 1,
      );
    } catch (err) {
      setError(
        "Error al cargar horarios: " + (err.message || "Intente nuevamente"),
      );
    } finally {
      setLoading(false);
    }
  }, [filtros, page, limit]);

  useEffect(() => {
    cargarMedicos();
    cargarSedes();
    cargarHorarios();
  }, [cargarMedicos, cargarSedes, cargarHorarios]);

  const handleFiltroChange = (e) => {
    const { name, value } = e.target;
    setFiltros((prev) => ({ ...prev, [name]: value }));
    setPage(1);
  };

  const getDiaNombre = (dia) => DIAS_SEMANA[dia] || `Día ${dia}`;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Horarios y Disponibilidad
          </h1>
          <p className="text-gray-500 mt-1">
            Gestiona la agenda de médicos y disponibilidad de consultorios
          </p>
        </div>
        <div className="flex gap-2">
          {/* Botón "Agregar horario" oculto: Recepcionista NO tiene permiso POST /api/horarios/admin (solo administrador) */}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative w-full sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar médico..."
              name="medico_id"
              value={filtros.medico_id}
              onChange={handleFiltroChange}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div className="relative w-full sm:w-64">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              name="sede_id"
              value={filtros.sede_id}
              onChange={handleFiltroChange}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">Todas las sedes</option>
              {sedes.map((s) => (
                <option key={s.sede_id} value={s.sede_id}>
                  {s.nombre}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                Médico
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                Especialidad
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                Sede
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                Día
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                Inicio
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                Fin
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                Slot
              </th>
              <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                Estado
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {loading && (
              <tr>
                <td
                  colSpan="9"
                  className="px-4 py-12 text-center text-gray-500"
                >
                  <Loader2 className="h-8 w-8 animate-spin mx-auto" />
                </td>
              </tr>
            )}
            {!loading && horarios.length === 0 && (
              <tr>
                <td
                  colSpan="9"
                  className="px-4 py-12 text-center text-gray-500"
                >
                  <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p>No hay horarios configurados</p>
                </td>
              </tr>
            )}
            {!loading &&
              horarios.length > 0 &&
              horarios.map((h) => (
                <tr key={h.horario_id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {h.medico_nombre}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {h.especialidad}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {h.sede_nombre}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900 font-medium">
                    {getDiaNombre(h.dia_semana)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {h.hora_inicio?.slice(0, 5)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">
                    {h.hora_fin?.slice(0, 5)}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">
                    {h.duracion_slot} min
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={[
                        "inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium",
                        h.activo
                          ? "bg-green-100 text-green-800"
                          : "bg-gray-100 text-gray-800",
                      ].join(" ")}
                    >
                      {h.activo ? "Activo" : "Inactivo"}
                    </span>
                  </td>
                  {/* Recepcionista no puede editar ni eliminar: solo lectura */}
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      {horarios.length === 0 && !loading && (
        <div className="p-8 text-center text-gray-500 border-t border-gray-200">
          <Calendar className="h-10 w-10 mx-auto text-gray-300 mb-2" />
          <p>No hay horarios configurados</p>
          <p className="mt-2 text-sm text-gray-600">
            Los horarios solo pueden ser gestionados por un administrador.
          </p>
        </div>
      )}

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-red-800 flex items-center gap-2">
            <Calendar className="h-5 w-5 text-red-600 flex-shrink-0" />
            {error}
          </p>
        </div>
      )}
    </div>
  );
};