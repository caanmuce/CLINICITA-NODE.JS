// src/pages/admin/Usuarios.jsx - Gestión de usuarios
import React, { useState, useEffect, useCallback } from "react";
import { Users, UserPlus, Search, AlertCircle, Loader2, Trash2 } from "lucide-react";
import { Link } from "react-router-dom";
import { usuariosApi } from "../../api/usuarios";

const ROLE_LABELS = {
  paciente: "Paciente",
  medico: "Médico",
  recepcionista: "Recepcionista",
  administrador: "Administrador",
};

const formatDate = (dateStr) => {
  if (!dateStr) return "\u2014";
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "America/Bogota",
  });
};

export const AdminUsuarios = () => {
  const [usuarios, setUsuarios] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Modal de edición de usuario
  const [editUsuario, setEditUsuario] = useState(null);
  const [editData, setEditData] = useState({
    nombre_completo: "",
    correo: "",
    rol: "",
    activo: true,
  });
  const [saving, setSaving] = useState(false);
  const [eliminandoId, setEliminandoId] = useState(null);

  const cargarUsuarios = useCallback(async (q) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await usuariosApi.listar({ q, rol: "" });
      const data = resp.usuarios || resp || [];
      setUsuarios(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando usuarios:", e);
      setError("No se pudieron cargar los usuarios");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarUsuarios(searchTerm);
  }, [searchTerm, cargarUsuarios]);

  const abrirEdicion = (u) => {
    setEditUsuario(u);
    setEditData({
      nombre_completo: u.nombre_completo || u.nombre || "",
      correo: u.correo || u.correo_electronico || "",
      rol: u.rol || "",
      activo: u.activo !== undefined ? u.activo : true,
    });
  };

  const cerrarEdicion = () => {
    setEditUsuario(null);
    setEditData({ nombre_completo: "", correo: "", rol: "", activo: true });
  };

  const handleEditChange = (e) => {
    const { name, value } = e.target;
    setEditData((prev) => ({ ...prev, [name]: value }));
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    if (!editUsuario?.id && !editUsuario?.usuario_id) return;
    setSaving(true);
    try {
      await usuariosApi.actualizar(editUsuario.id || editUsuario.usuario_id, {
        nombre_completo: editData.nombre_completo,
        correo: editData.correo,
        rol: editData.rol,
        activo: editData.activo === "true" || editData.activo === true,
      });
      cerrarEdicion();
      await cargarUsuarios(searchTerm);
      setError(null);
    } catch (err) {
      // No cerrar el modal si la operación falla
      setError("No se pudo actualizar el usuario: " + (err.message || "Intente nuevamente"));
    } finally {
      setSaving(false);
    }
  };

  const handleEliminar = async (id) => {
    if (!window.confirm("¿Eliminar este usuario?")) return;
    setEliminandoId(id);
    try {
      await usuariosApi.eliminar(id);
      await cargarUsuarios(searchTerm);
    } catch (err) {
      const msg = err.response?.data?.mensaje || "No se pudo eliminar el usuario.";
      alert(msg);
    } finally {
      setEliminandoId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-4" />
        <p className="text-gray-500">Cargando usuarios...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500 mt-1">
            Administra cuentas de acceso al sistema
          </p>
        </div>
        <Link
          to="/admin/usuarios/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
        >
          <UserPlus className="h-5 w-5" />
          Nuevo usuario
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, correo, rol..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último acceso</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {usuarios.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-gray-500">
                    <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p>No hay usuarios registrados</p>
                  </td>
                </tr>
              ) : (
                usuarios.map((u) => (
                  <tr key={u.id || u.usuario_id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-gray-900 font-medium">{u.nombre_completo || u.nombre || "\u2014"}</td>
                    <td className="px-4 py-4 text-gray-600">{u.correo || u.correo_electronico || "\u2014"}</td>
                    <td className="px-4 py-4 text-gray-600">{ROLE_LABELS[u.rol] || u.rol || "\u2014"}</td>
                    <td className="px-4 py-4 text-gray-600">{u.estado || "Activo"}</td>
                    <td className="px-4 py-4 text-gray-600">{formatDate(u.ultimo_acceso || u.fecha_ultimo_acceso)}</td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => abrirEdicion(u)}
                          className="text-teal-600 hover:text-teal-800 text-sm font-medium"
                        >
                          Editar
                        </button>
                        <button
                          onClick={() => handleEliminar(u.id || u.usuario_id)}
                          className="text-red-600 hover:text-red-800 text-sm font-medium disabled:opacity-50"
                          disabled={eliminandoId === u.id || eliminandoId === u.usuario_id}
                        >
                          {eliminandoId === u.id || eliminandoId === u.usuario_id ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Editar usuario */}
      {editUsuario && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
          <div className="bg-white rounded-xl border border-gray-200 w-full max-w-md p-6 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 mb-4">Editar usuario</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nombre completo
                </label>
                <input
                  name="nombre_completo"
                  value={editData.nombre_completo}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Correo
                </label>
                <input
                  name="correo"
                  type="email"
                  value={editData.correo}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Rol
                </label>
                <select
                  name="rol"
                  value={editData.rol}
                  onChange={handleEditChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                >
                  <option value="administrador">Administrador</option>
                  <option value="recepcionista">Recepcionista</option>
                  <option value="medico">Médico</option>
                  <option value="paciente">Paciente</option>
                </select>
              </div>
              <div className="flex items-center gap-3">
                <input
                  id="activo"
                  type="checkbox"
                  checked={editData.activo === true || editData.activo === "true"}
                  onChange={(e) => setEditData({ ...editData, activo: e.target.checked })}
                  className="rounded border-gray-300 text-teal-600 focus:ring-teal-500"
                />
                <label htmlFor="activo" className="text-sm text-gray-700">
                  Usuario activo
                </label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={cerrarEdicion}
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
                  {saving ? "Guardando..." : "Guardar cambios"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminUsuarios;