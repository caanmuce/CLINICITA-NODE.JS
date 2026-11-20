// src/pages/medico/Agenda.jsx - PENDIENTE: Implementar funcionalidad completa

import React from 'react';
import { Calendar, PlusCircle, ChevronLeft, ChevronRight, Settings } from 'lucide-react';
import { Link } from 'react-router-dom';

export const MedicoAgenda = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mi Agenda</h1>
          <p className="text-gray-500 mt-1">Gestiona tu disponibilidad semanal y horarios de atención</p>
        </div>
        <div className="flex gap-2">
          <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"><ChevronLeft className="h-5 w-5" /></button>
          <button className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"><ChevronRight className="h-5 w-5" /></button>
          <Link to="/medico/agenda/configurar" className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"><Settings className="h-5 w-5" /> Configurar</Link>
        </div>
      </div>

      {/* Vista semanal placeholder */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Semana del 15 al 21 de enero</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-24">Hora</th>
                {['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'].map((dia, i) => (
                  <th key={i} className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-l border-gray-200">
                    <div className="font-semibold">{dia}</div>
                    <div className="text-gray-400">{15 + i} Ene</div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: 12 }, (_, h) => 8 + h).map((hora) => (
                <tr key={hora} className="border-t border-gray-100 hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-500 font-medium w-24">
                    {hora.toString().padStart(2, '0')}:00
                  </td>
                  {Array.from({ length: 7 }).map((_, d) => (
                    <td key={d} className="border-l border-gray-200 h-20 relative">
                      <div className="absolute inset-1 bg-gray-50 rounded border border-dashed border-gray-200" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="p-4 text-center text-gray-500 border-t border-gray-200">
          <Calendar className="h-10 w-10 mx-auto text-gray-300 mb-2" />
          <p>Haz clic en un espacio para agregar disponibilidad</p>
          <button className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors">
            <PlusCircle className="h-5 w-5" />
            Agregar horario
          </button>
        </div>
      </div>

      {/* Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <h3 className="font-medium text-yellow-900 mb-2 flex items-center gap-2"><span>⚠</span> Página en desarrollo</h3>
        <div className="text-sm text-yellow-700">Funcionalidades pendientes:
          <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
            <li>GET /api/horarios/medico/:id - Obtener horarios semanales</li>
            <li>POST /api/horarios - Crear bloque de disponibilidad (dia_semana, hora_inicio, hora_fin, sede_id)</li>
            <li>PUT /api/horarios/:id - Modificar horario</li>
            <li>DELETE /api/horarios/:id - Eliminar horario</li>
            <li>Validación: no superponer horarios, mínimo 30 min, máximo 4h</li>
            <li>Excepciones: feriados, vacaciones (POST /api/horarios/excepciones)</li>
            <li>Vista mensual y sincronización con citas agendadas</li>
          </ul>
        </div>
      </div>
    </div>
  );
};