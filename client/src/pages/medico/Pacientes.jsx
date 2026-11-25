// src/pages/medico/Pacientes.jsx - Pacientes atendidos por el médico
import React, { useState, useEffect, useCallback } from "react";
import { Users, Search, AlertCircle, Loader2, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { pacientesApi } from "../../api/pacientes";

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

export const MedicoPacientes = () => {
  const [pacientes, setPacientes] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const navigate = useNavigate();

  const cargarPacientes = useCallback(async (q) => {
    setLoading(true);
    setError(null);
    try {
      const resp = await pacientesApi.buscar(q || "", 50);
      const data = resp.pacientes || resp || [];
      setPacientes(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error("Error cargando pacientes:", e);
      setError("No se pudieron cargar los pacientes");
    } finally {
      setLoading(false);
    }
  }, []);

  const handleVerHistorial = (id) => {
    navigate(`/medico/pacientes/${id}`);
  };

  useEffect(() => {
    cargarPacientes(searchTerm);
  }, [searchTerm, cargarPacientes]);

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
          <h1 className="text-2xl font-bold text-gray-900">Mis Pacientes</h1>
          <p className="text-gray-500 mt-1">
            Historial clínico y seguimiento de pacientes atendidos
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar por nombre, DNI, teléfono..."
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
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DNI</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Edad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última cita</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Próxima cita</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {pacientes.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-4 py-12 text-center text-gray-500">
                    <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                    <p>No se encontraron pacientes</p>
                  </td>
                </tr>
              ) : (
                pacientes.map((p) => (
                  <tr key={p.id || p.paciente_id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-gray-900 font-medium">
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4 text-gray-400" />
                        <span>{p.nombre_completo || p.nombre || "\u2014"}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-gray-600">{p.documento_id || p.dni || "\u2014"}</td>
                    <td className="px-4 py-4 text-gray-600">{p.edad || "\u2014"}</td>
                    <td className="px-4 py-4 text-gray-600">{formatDate(p.ultima_cita || p.fecha_ultima_cita)}</td>
                    <td className="px-4 py-4 text-gray-600">{formatDate(p.proxima_cita || "\u2014")}</td>
                    <td className="px-4 py-4">
                      <button
                        onClick={() => handleVerHistorial(p.id || p.paciente_id)}
                        className="px-2 py-1.5 text-xs text-teal-600 hover:text-teal-800 hover:underline border border-transparent rounded hover:bg-teal-50"
                        title="Ver historial clínico"
                      >
                        <FileText className="h-3.5 w-3.5" />
                      </button>
                    </td>
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

export default MedicoPacientes;
