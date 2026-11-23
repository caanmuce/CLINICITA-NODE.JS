// src/pages/medico/Agenda.jsx - Agenda del médico: ver su disponibilidad semanal (solo lectura)

import React, { useState, useEffect, useCallback } from "react";
import { Calendar, ChevronLeft, ChevronRight, Settings } from "lucide-react";
import { Link } from "react-router-dom";
import { horariosApi } from "../../api/horarios";
import { useAuth } from "../../context/AuthContext";
import { getColombiaDate } from "../../utils/dateUtils";

const DIAS_SEMANA = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

export const MedicoAgenda = () => {
  const { user } = useAuth();
  const [semanaInicio, setSemanaInicio] = useState(() => {
    const hoy = new Date(getColombiaDate());
    const dia = hoy.getDay();
    const inicio = new Date(hoy);
    inicio.setDate(hoy.getDate() - dia);
    return inicio.toISOString().split("T")[0];
  });

  const medicoId = user?.medico_id || (user?.rol === "medico" ? user.id : null);

  const [horarios, setHorarios] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const cargarHorarios = useCallback(async () => {
    if (!medicoId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await horariosApi.listarAdmin({ medico_id: medicoId });
      const horariosArray = data.horarios || data || [];
      setHorarios(Array.isArray(horariosArray) ? horariosArray : []);
    } catch (e) {
      console.error("Error cargando horarios:", e);
      setError("No se pudieron cargar los horarios");
    } finally {
      setLoading(false);
    }
  }, [medicoId]);

  useEffect(() => {
    cargarHorarios();
  }, [cargarHorarios]);

  const semanaPasada = () => {
    const fecha = new Date(semanaInicio);
    fecha.setDate(fecha.getDate() - 7);
    setSemanaInicio(fecha.toISOString().split("T")[0]);
  };

  const semanaSiguiente = () => {
    const fecha = new Date(semanaInicio);
    fecha.setDate(fecha.getDate() + 7);
    setSemanaInicio(fecha.toISOString().split("T")[0]);
  };

  const horariosPorDia = (diaSemana) => {
    return horarios
      .filter((h) => h.dia_semana === diaSemana)
      .sort((a, b) => a.hora_inicio.localeCompare(b.hora_inicio));
  };

  if (!medicoId) {
    return (
      <div className="space-y-6">
        <div className="bg-red-50 border border-red-200 rounded-xl p-4">
          <Calendar className="h-5 w-5 text-red-600 mx-auto mb-2" />
          <p className="text-center text-red-800">
            No se pudo identificar al médico. Inicie sesión nuevamente.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Agenda</h1>
          <p className="text-gray-500 mt-1">
            Gestiona tu disponibilidad semanal y horarios de atención
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={semanaPasada}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            onClick={semanaSiguiente}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            aria-label="Semana siguiente"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
          <Link
            to="/medico/agenda/configurar"
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <Settings className="h-5 w-5" /> Configurar
          </Link>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Semana del{" "}
            {new Date(semanaInicio).toLocaleDateString("es-CO", {
              day: "numeric",
              month: "long",
            })}
            al{" "}
            {new Date(
              new Date(semanaInicio).getTime() + 6 * 86400000,
            ).toLocaleDateString("es-CO", {
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </h2>
          {/* Médico solo puede consultar. Crear/editar/eliminar horarios es solo administrador */}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr>
              <th className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                Hora
              </th>
              {DIAS_SEMANA.map((dia) => (
                <th key={dia} className="px-4 py-2 text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-200">
                  {dia}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {Array.from({ length: 14 }, (_, h) => 7 + h).map((hora) => (
              <tr key={hora} className="border-t border-gray-100 hover:bg-gray-50">
                <td className="px-4 py-2 text-sm text-gray-500 font-medium w-24">
                  {hora.toString().padStart(2, "0")}:00
                </td>
                {DIAS_SEMANA.map((_, d) => {
                  const hs = horariosPorDia(d).filter((h) => {
                    const inicio = h.hora_inicio.slice(0, 5);
                    const fin = h.hora_fin.slice(0, 5);
                    return (
                      inicio <= `${hora.toString().padStart(2, "0")}:00` &&
                      fin > `${hora.toString().padStart(2, "0")}:00`
                    );
                  });
                  return (
                    <td key={d} className="border-l border-gray-200 h-24 relative p-1">
                      {hs.map((h) => (
                        <div
                          key={h.horario_id}
                          className="absolute inset-x-1 bg-teal-100 border border-teal-300 rounded text-teal-900 text-xs p-1 truncate hover:z-10"
                          title={`${h.hora_inicio.slice(0, 5)}-${h.hora_fin.slice(0, 5)} · ${h.duracion_slot}min · Sede ${h.sede_nombre || h.sede_id}`}
                        >
                          {h.hora_inicio.slice(0, 5)}-{h.hora_fin.slice(0, 5)}
                        </div>
                      ))}
                      {hs.length === 0 && (
                        <div className="absolute inset-1 bg-gray-50 rounded border border-dashed border-gray-200" />
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {horarios.length === 0 && !loading && (
        <div className="p-8 text-center text-gray-500 border-t border-gray-200">
          <Calendar className="h-10 w-10 mx-auto text-gray-300 mb-2" />
          <p>No hay horarios configurados para esta semana</p>
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