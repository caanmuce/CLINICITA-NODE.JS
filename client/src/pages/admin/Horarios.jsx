// src/pages/admin/Horarios.jsx - CRUD de horarios (Administrador)
import React, { useState, useEffect, useCallback } from "react";
import { Calendar, Clock, Search, AlertCircle, Loader2, Trash2, Edit3, Plus, X } from "lucide-react";
import { horariosApi } from "../../api/horarios";
import { medicosApi } from "../../api/medicos";
import { sedesApi } from "../../api/sedes";

const DIAS_SEMANA = [
  { value: 1, label: "Lunes" },
  { value: 2, label: "Martes" },
  { value: 3, label: "Miércoles" },
  { value: 4, label: "Jueves" },
  { value: 5, label: "Viernes" },
  { value: 6, label: "Sábado" },
  { value: 0, label: "Domingo" },
];

export const AdminHorarios = () => {
  const [filtros, setFiltros] = useState({ medico_id: "", sede_id: "", dia_semana: "" });
  const [horarios, setHorarios] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [sedes, setSedes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [page, setPage] = useState(1);
  const [limit] = useState(20);
  const [total, setTotal] = useState(0);

  // Modal CRUD
  const [modalOpen, setModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState("crear"); // "crear" | "editar"
  const [editId, setEditId] = useState(null);
  const [formData, setFormData] = useState({
    medico_id: "",
    sede_id: "",
    dia_semana: "",
    hora_inicio: "",
    hora_fin: "",
    duracion_slot: 30,
    activo: true,
  });
  const [saving, setSaving] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);

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
      Object.keys(params).forEach((key) => {
        if (params[key] === "") delete params[key];
      });
      const data = await horariosApi.listarAdmin(params);
      const items = Array.isArray(data?.horarios) ? data.horarios : Array.isArray(data) ? data : [];
      setHorarios(items);
      setTotal(data?.total || items.length);
    } catch (e) {
      console.error("Error cargando horarios:", e);
      setError("No se pudieron cargar los horarios");
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

  const abrirCrear = () => {
    setModalMode("crear");
    setEditId(null);
    setFormData({ medico_id: "", sede_id: "", dia_semana: "", hora_inicio: "", hora_fin: "", duracion_slot: 30, activo: true });
    setModalOpen(true);
  };

  const abrirEditar = (h) => {
    setModalMode("editar");
    setEditId(h.horario_id);
    setFormData({
      medico_id: h.medico_id || "",
      sede_id: h.sede_id || "",
      dia_semana: String(h.dia_semana || ""),
      hora_inicio: h.hora_inicio?.slice(0, 5) || "",
      hora_fin: h.hora_fin?.slice(0, 5) || "",
      duracion_slot: h.duracion_slot || 30,
      activo: h.activo !== undefined ? h.activo : true,
    });
    setModalOpen(true);
  };

  const cerrarModal = () => {
    setModalOpen(false);
    setEditId(null);
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      if (modalMode === "crear") {
        await horariosApi.crear({
          medico_id: Number(formData.medico_id),
          sede_id: Number(formData.sede_id),
          dia_semana: Number(formData.dia_semana),
          hora_inicio: formData.hora_inicio,
          hora_fin: formData.hora_fin,
          duracion_slot: Number(formData.duracion_slot),
          activo: formData.activo,
        });
      } else {
        await horariosApi.actualizar(editId, {
          medico_id: Number(formData.medico_id),
          sede_id: Number(formData.sede_id),
          dia_semana: Number(formData.dia_semana),
          hora_inicio: formData.hora_inicio,
          hora_fin: formData.hora_fin,
          duracion_slot: Number(formData.duracion_slot),
          activo: formData.activo,
        });
      }
      cerrarModal();
      await cargarHorarios();
    } catch (err) {
      const msg = err.response?.data?.mensaje || "No se pudo guardar el horario.";
      alert(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Eliminar este horario?")) return;
    setEliminandoId(id);
    try {
      await horariosApi.eliminar(id);
      await cargarHorarios();
    } catch (err) {
      const msg = err.response?.data?.mensaje || "No se pudo eliminar el horario.";
      alert(msg);
    } finally {
      setEliminandoId(null);
    }
  };

  const totalPages = Math.ceil(total / limit) || 1;

  const getDiaNombre = (dia) => {
    const d = DIAS_SEMANA.find((d) => d.value === Number(dia));
    return d ? d.label : `Día ${dia}`;
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-4" />
        <p className="text-gray-500">Cargando horarios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Horarios Médicos</h1>
          <p className="text-gray-500 mt-1">
            Configura la disponibilidad y horarios de atención de los médicos
          </p>
        </div>
        <button
          onClick={abrirCrear}
          disabled={saving}
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-60 transition-colors"
        >
          <Plus className="h-5 w-5" />
          Nuevo horario
        </button>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 sm:w-64">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <select
              name="medico_id"
              value={filtros.medico_id}
              onChange={handleFiltroChange}
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">Todos los médicos</option>
              {medicos.map((m) => (
                <option key={m.medico_id || m.id} value={m.medico_id || m.id}>
                  {m.nombre_completo || m.nombre || "Médico"}
                </option>
              ))}
            </select>
          </div>
          <div className="relative flex-1 sm:w-64">
            <select
              name="sede_id"
              value={filtros.sede_id}
              onChange={handleFiltroChange}
              className="w-full pl-4 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">Todas las sedes</option>
              {sedes.map((s) => (
                <option key={s.sede_id || s.id} value={s.sede_id || s.id}>
                  {s.nombre || "Sede"}
                </option>
              ))}
            </select>
          </div>
          <select
            name="dia_semana"
            value={filtros.dia_semana}
            onChange={handleFiltroChange}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 sm:w-64"
          >
            <option value="">Todos los días</option>
            {DIAS_SEMANA.map((d) => (
              <option key={d.value} value={d.value}>
                {d.label}
              </option>
            ))}
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
        {horarios.length === 0 && !loading ? (
          <div className="p-12 text-center">
            <Calendar className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">
              No hay horarios configurados
            </h3>
            <p className="text-gray-500">
              Crea un horario para asignar disponibilidad a un médico.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Médico</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sede</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Día</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora inicio</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hora fin</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Slot (min)</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {horarios.map((h) => (
                  <tr key={h.horario_id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-gray-900 font-medium">
                      {h.medico_nombre || h.medico || "—"}
                    </td>
                    <td className="px-4 py-4 text-gray-600 capitalize">
                      {h.sede_nombre || h.sede || "—"}
                    </td>
                    <td className="px-4 py-4 text-gray-600 capitalize">
                      {getDiaNombre(h.dia_semana)}
                    </td>
                    <td className="px-4 py-4 text-gray-600">{h.hora_inicio?.slice(0, 5) || "—"}</td>
                    <td className="px-4 py-4 text-gray-600">{h.hora_fin?.slice(0, 5) || "—"}</td>
                    <td className="px-4 py-4 text-gray-600">{h.duracion_slot || "—"} min</td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${h.activo ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"}`}>
                        {h.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => abrirEditar(h)}
                          className="px-3 py-1.5 bg-teal-600 text-white text-xs rounded hover:bg-teal-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Editar"
                          disabled={saving || eliminandoId === h.horario_id}
                        >
                          {saving || eliminandoId === h.horario_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Edit3 className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleEliminar(h.horario_id)}
                          className="px-3 py-1.5 bg-red-600 text-white text-xs rounded hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors" title="Eliminar"
                          disabled={saving || eliminandoId === h.horario_id}
                        >
                          {eliminandoId === h.horario_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
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
              Total: {total} horarios · Página {page} de {totalPages}
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

      {/* Modal CRUD */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-md p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">
              {modalMode === "crear" ? "Nuevo horario" : "Editar horario"}
            </h2>
            <form onSubmit={handleFormSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Médico</label>
                <select
                  name="medico_id"
                  value={formData.medico_id}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">Seleccionar médico</option>
                  {medicos.map((m) => (
                    <option key={m.medico_id || m.id} value={m.medico_id || m.id}>
                      {m.nombre_completo || m.nombre || "Médico"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sede</label>
                <select
                  name="sede_id"
                  value={formData.sede_id}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="">Seleccionar sede</option>
                  {sedes.map((s) => (
                    <option key={s.sede_id || s.id} value={s.sede_id || s.id}>
                      {s.nombre || "Sede"}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Día de la semana</label>
                <select
                  name="dia_semana"
                  value={formData.dia_semana}
                  onChange={handleFormChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  {DIAS_SEMANA.map((d) => (
                    <option key={d.value} value={d.value}>
                      {d.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora inicio</label>
                  <input
                    name="hora_inicio"
                    type="time"
                    value={formData.hora_inicio}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora fin</label>
                  <input
                    name="hora_fin"
                    type="time"
                    value={formData.hora_fin}
                    onChange={handleFormChange}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="activo"
                  type="checkbox"
                  checked={formData.activo === true || formData.activo === "true"}
                  onChange={(e) => setFormData({ ...formData, activo: e.target.checked })}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="activo" className="text-sm text-gray-700">
                  Horario activo
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={cerrarModal}
                  disabled={saving}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-60"
                >
                  {saving ? "Guardando..." : "Guardar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminHorarios;

