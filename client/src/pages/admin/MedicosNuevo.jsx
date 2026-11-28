import React, { useState, useCallback } from "react";
import { UserPlus, AlertCircle, Loader2, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { medicosApi } from "../../api/medicos";

export const AdminMedicosNuevo = () => {
  const navigate = useNavigate();
  const [especialidades, setEspecialidades] = useState([]);
  const [formData, setFormData] = useState({
    nombre_completo: "",
    correo: "",
    clave: "",
    especialidad: "",
    cmp: "",
    telefono: "",
    sede_id: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargarEspecialidades = useCallback(async () => {
    try {
      const data = await medicosApi.listarEspecialidades();
      setEspecialidades(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando especialidades:", e);
    }
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setError(null);
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await medicosApi.crear({
        nombre_completo: formData.nombre_completo,
        correo: formData.correo,
        clave: formData.clave,
        especialidad: formData.especialidad,
        cmp: formData.cmp,
        telefono: formData.telefono,
        sede_id: formData.sede_id || null,
      });
      navigate("/admin/medicos");
    } catch (err) {
      const msg = err.response?.data?.mensaje || "No se pudo crear el médico.";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-4" />
        <p className="text-gray-500">Creando médico...</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link to="/admin/medicos" className="text-gray-400 hover:text-teal-600">
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-2xl font-bold text-gray-900">Nuevo médico</h1>
      </div>
      <p className="text-gray-500">Registra un nuevo médico en la plantilla</p>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-red-600" />
          <span className="text-red-800 text-sm">{error}</span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Nombre completo
            </label>
            <input
              name="nombre_completo"
              value={formData.nombre_completo}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Correo electrónico
            </label>
            <input
              name="correo"
              type="email"
              value={formData.correo}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              name="clave"
              type="password"
              value={formData.clave}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
              required
              minLength="6"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              CMP (Colegio Médico)
            </label>
            <input
              name="cmp"
              value={formData.cmp}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Teléfono
            </label>
            <input
              name="telefono"
              value={formData.telefono}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Especialidad
            </label>
            <select
              name="especialidad"
              value={formData.especialidad}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
            >
              <option value="">Seleccionar especialidad</option>
              {especialidades.map((esp) => (
                <option key={esp.nombre || esp.id} value={esp.nombre || esp.id}>
                  {esp.nombre || esp.especialidad_nombre || esp.id}
                </option>
              ))}
            </select>
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Link
              to="/admin/medicos"
              className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 disabled:opacity-60"
            >
              {loading ? "Creando..." : "Crear médico"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminMedicosNuevo;
