// src/pages/recepcionista/Horarios.jsx - PENDIENTE: Implementar funcionalidad completa

import React from 'react';
import { Calendar, PlusCircle, AlertCircle } from 'lucide-react';

export const RecepcionistaHorarios = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Horarios y Disponibilidad</h1>
          <p className="text-gray-500 mt-1">Gestiona la agenda de médicos y disponibilidad de consultorios</p>
        </div>
        <div className="flex gap-2">
          <button className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
            <PlusCircle className="h-5 w-5" />
            Agregar horario
          </button>
        </div>
      </div>

      {/* Selector de médico */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Filtrar por médico</label>
            <select className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
              <option>Todos los médicos</option>
              <option>Dr. Juan Pérez - Cardiología</option>
              <option>Dra. María García - Dermatología</option>
            </select>
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700 mb-1">Semana</label>
            <input type="week" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
        </div>
      </div>

      {/* Vista semanal de horarios */}
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
                  <td className="px-4 py-2 text-sm text-gray-500 font-medium w-24">{hora.toString().padStart(2, '0')}:00</td>
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
          <p>Haz clic para asignar disponibilidad a un médico</p>
        </div>
      </div>

      {/* Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <h3 className="font-medium text-yellow-900 mb-2 flex items-center gap-2"><AlertCircle className="h-5 w-5" /> Página en desarrollo</h3>
        <p className="text-sm text-yellow-700">Pendientes:
          <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
            <li>GET /api/horarios - Listar horarios (filtros: medico_id, semana, sede_id)</li>
            <li>POST /api/horarios - Crear (medico_id, dia_semana, hora_inicio, hora_fin, sede_id, consultorio)</li>
            <li>PUT /api/horarios/:id - Modificar</li>
            <li>DELETE /api/horarios/:id - Eliminar</li>
            <li>GET /api/medicos - Lista para selector</li>
            <li>Validaciones: no solapamiento, consultorio disponible</li>
            <li>Excepciones: feriados, vacaciones médicas</li>
          </ul>
        </p>
      </div>
    </div>
  );
};