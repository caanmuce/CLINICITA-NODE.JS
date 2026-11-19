// src/pages/medico/Pacientes.jsx - PENDIENTE: Implementar funcionalidad completa

import React from 'react';
import { Users, Search } from 'lucide-react';

export const MedicoPacientes = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mis Pacientes</h1>
        <p className="text-gray-500 mt-1">Historial clínico y seguimiento de pacientes atendidos</p>
      </div>

      {/* Búsqueda */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input type="text" placeholder="Buscar por nombre, DNI, teléfono..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
      </div>

      {/* Lista de pacientes */}
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
              <tr>
                <td colSpan="6" className="px-4 py-12 text-center text-gray-500">
                  <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p>No tienes pacientes registrados</p>
                  <p className="text-sm text-gray-400 mt-1">Los pacientes aparecerán aquí tras su primera cita</p>
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
            <li>GET /api/pacientes/medico/:id - Pacientes atendidos por el médico</li>
            <li>GET /api/pacientes/:id/historial - Historial clínico completo</li>
            <li>GET /api/fichas-preconsulta/paciente/:id - Pre-consultas del paciente</li>
            <li>Ver evolución: diagnósticos, tratamientos, recetas, ordenes</li>
            <li>Adjuntar archivos: resultados, imágenes, documentos</li>
          </ul>
        </p>
      </div>
    </div>
  );
};