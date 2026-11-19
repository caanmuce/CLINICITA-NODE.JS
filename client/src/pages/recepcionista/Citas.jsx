// src/pages/recepcionista/Citas.jsx - PENDIENTE: Implementar funcionalidad completa

import React from 'react';
import { Calendar, PlusCircle, Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';

export const RecepcionistaCitas = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Citas</h1>
          <p className="text-gray-500 mt-1">Programar, confirmar y gestionar todas las citas médicas</p>
        </div>
        <div className="flex gap-2">
          <Link to="/recepcionista/citas/nueva" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
            <PlusCircle className="h-5 w-5" />
            Nueva cita
          </Link>
        </div>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type="text" placeholder="Buscar paciente, médico, DNI..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500">
            <option>Todas</option>
            <option>Hoy</option>
            <option>Esta semana</option>
            <option>Pendientes</option>
            <option>Confirmadas</option>
            <option>En sala</option>
            <option>Atendidas</option>
            <option>Canceladas</option>
          </select>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"><Filter className="h-5 w-5" /> Filtros</button>
        </div>
      </div>

      {/* Tabla de citas */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha / Hora</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Médico</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Especialidad</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sede</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                  <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p>No hay citas registradas</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <h3 className="font-medium text-yellow-900 mb-2 flex items-center gap-2"><span>⚠</span> Página en desarrollo</h3>
        <p className="text-sm text-yellow-700">Pendientes:
          <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
            <li>GET /api/citas - Listar con filtros (fecha, estado, medico_id, paciente_id)</li>
            <li>POST /api/citas - Crear cita (paciente_id, medico_id, fecha, hora, motivo, sede_id)</li>
            <li>GET /api/citas/:id - Detalle cita</li>
            <li>PUT /api/citas/:id - Modificar cita</li>
            <li>PUT /api/citas/:id/confirmar - Confirmar asistencia</li>
            <li>PUT /api/citas/:id/llegada - Check-in paciente</li>
            <li>PUT /api/citas/:id/sala - Asignar consultorio</li>
            <li>PUT /api/citas/:id/cancelar - Cancelar con motivo</li>
            <li>GET /api/medicos/disponibles?fecha=&especialidad= - Para agendar</li>
          </ul>
        </p>
      </div>
    </div>
  );
};