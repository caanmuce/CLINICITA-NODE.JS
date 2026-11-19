// src/pages/admin/Medicos.jsx - PENDIENTE: Implementar funcionalidad completa

import React from 'react';
import { Stethoscope, UserPlus, Search, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminMedicos = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Médicos</h1>
          <p className="text-gray-500 mt-1">Plantilla médica, especialidades y asignación a sedes</p>
        </div>
        <Link to="/admin/medicos/nuevo" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          <UserPlus className="h-5 w-5" />
          Nuevo médico
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1"><Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" /><input type="text" placeholder="Buscar médico, especialidad..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" /></div>
          <select className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"><option>Todas las especialidades</option><option>Cardiología</option><option>Dermatología</option></select>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="overflow-x-auto"><table className="w-full"><thead className="bg-gray-50"><tr><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Médico</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Especialidad</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CMP</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sedes</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th><th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th></tr></thead><tbody className="divide-y divide-gray-200"><tr><td colSpan="6" className="px-4 py-12 text-center text-gray-500"><Stethoscope className="h-12 w-12 mx-auto text-gray-300 mb-3" /><p>No hay médicos registrados</p></td></tr></tbody></table></div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4"><h3 className="font-medium text-yellow-900 mb-2 flex items-center gap-2"><AlertCircle className="h-5 w-5" /> Página en desarrollo</h3><p className="text-sm text-yellow-700">Pendientes: GET /api/admin/medicos, POST /api/admin/medicos (usuario_id, especialidad, cmp, sedes[]), PUT /api/admin/medicos/:id, GET /api/especialidades, GET /api/sedes</p></div>
    </div>
  );
};