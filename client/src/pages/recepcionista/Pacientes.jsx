import React, { useState, useEffect, useCallback } from "react";
import { User, Search, AlertCircle, Loader2, Calendar, Phone } from "lucide-react";
import { Link } from "react-router-dom";
import { pacientesApi } from "../../api/pacientes";

export const RecepcionistaPacientes = () => {
  const [pacientes, setPacientes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filtroNombre, setFiltroNombre] = useState("");

  const cargarPacientes = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await pacientesApi.buscar(filtroNombre, 200);
      setPacientes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando pacientes:", e);
      setError("No se pudieron cargar los pacientes");
    } finally {
      setLoading(false);
    }
  }, [filtroNombre]);

  useEffect(() => {
    cargarPacientes();
  }, [cargarPacientes]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-teal-600 mb-4" />
        <p className="text-gray-500">Cargando pacientes...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestion de Pacientes</h1>
          <p className="text-gray-500 mt-1">
            Registro, busqueda y actualizacion de pacientes
          </p>
        </div>
        <Link
          to="/recepcionista/pacientes/nuevo"
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
        >
          <User className="h-5 w-5" />
          Nuevo paciente
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar paciente por nombre o DNI..."
            value={filtroNombre}
            onChange={(e) => setFiltroNombre(e.target.value)}
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DNI</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Telefono</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha Nacimiento</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pacientes.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-4 py-12 text-center text-gray-500">
                    <User className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p>No hay pacientes registrados</p>
                  </td>
                </tr>
              ) : (
                pacientes.map((p) => (
                  <tr key={p.id || p.paciente_id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-gray-900 font-medium">
                      {p.nombre_completo || p.nombre || "\u2014"}
                    </td>
                    <td className="px-4 py-4 text-gray-600">{p.dni || "\u2014"}</td>
                    <td className="px-4 py-4 text-gray-600">{p.telefono || "\u2014"}</td>
                    <td className="px-4 py-4 text-gray-600">{p.fecha_nacimiento || "\u2014"}</td>
                    <td className="px-4 py-4 text-gray-600">{p.estado || "Activo"}</td>
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

export default Pacientes;