// src/pages/recepcionista/Pacientes.jsx - PENDIENTE: Implementar funcionalidad completa

import React from 'react';
import { Users, Search, UserPlus, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const RecepcionistaPacientes = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Pacientes</h1>
          <p className="text-gray-500 mt-1">Registro, búsqueda y gestión de pacientes</p>
        </div>
        <Link to="/recepcionista/pacientes/nuevo" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          <UserPlus className="h-5 w-5" />
          Nuevo paciente
        </Link>
      </div>

      {/* Búsqueda */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
            <input type="text" placeholder="Buscar por nombre, DNI, teléfono, correo..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
        </div>
      </div>

      {/* Tabla pacientes */}
      <div className="bg-white rounded-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Paciente</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DNI</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Teléfono</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Fecha nac.</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Última cita</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td colSpan="7" className="px-4 py-12 text-center text-gray-500">
                  <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p>No hay pacientes registrados</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <h3 className="font-medium text-yellow-900 mb-2 flex items-center gap-2"><AlertCircle className="h-5 w-5" /> Página en desarrollo</h3>
        <p className="text-sm text-yellow-700">Pendientes:
          <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
            <li>GET /api/pacientes - Listar con búsqueda y paginación</li>
            <li>POST /api/pacientes - Registrar nuevo (nombre, dni, telefono, correo, fecha_nacimiento, genero, direccion)</li>
            <li>GET /api/pacientes/:id - Detalle completo</li>
            <li>PUT /api/pacientes/:id - Actualizar datos</li>
            <li>GET /api/pacientes/:id/citas - Historial de citas</li>
            <li>Validación DNI único en backend</li>
          </ul>
        </p>
      </div>
    </div>
  );
};