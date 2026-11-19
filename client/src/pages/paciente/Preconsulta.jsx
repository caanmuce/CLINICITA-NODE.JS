// src/pages/paciente/Preconsulta.jsx - PENDIENTE: Implementar funcionalidad completa

import React from 'react';
import { ClipboardCheck, AlertCircle, Save } from 'lucide-react';

export const PacientePreconsulta = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Ficha de pre-consulta</h1>
        <p className="text-gray-500 mt-1">Completa tu información médica antes de la cita para agilizar la atención</p>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="p-4 border-b border-gray-200 bg-blue-50">
          <h2 className="text-lg font-semibold text-gray-900">Próxima cita: Cardiología - Dr. Pérez</h2>
          <p className="text-sm text-gray-500 mt-1">Lunes 15 enero, 10:30 AM - Sede Principal</p>
        </div>
        <div className="p-6">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
            <p className="text-sm text-blue-800"><strong>Esta cita requiere pre-consulta.</strong> Completa el formulario al menos 2 horas antes de tu cita.</p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo de la consulta *</label>
              <textarea rows={3} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Describe brevemente el motivo de tu consulta..." />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Síntomas principales</label>
                <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Ej: Dolor en el pecho, dificultad para respirar..." />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duración de síntomas</label>
                <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Ej: 3 días" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Medicamentos actuales</label>
              <textarea rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Lista los medicamentos que tomas actualmente..." />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alergias conocidas</label>
              <input type="text" className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Ej: Penicilina, Ibuprofeno... (Ninguna si no tienes)" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Antecedentes relevantes</label>
              <textarea rows={2} className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" placeholder="Cirugías previas, enfermedades crónicas, antecedentes familiares..." />
            </div>
            <div className="flex gap-3 pt-4">
              <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors"><Save className="h-5 w-5" /> Guardar y enviar</button>
              <button className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">Guardar borrador</button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 mt-6">
        <div className="p-4 border-b border-gray-200"><h2 className="text-lg font-semibold text-gray-900">Historial de pre-consultas</h2></div>
        <div className="divide-y divide-gray-200">
          <div className="p-4 flex items-center justify-between">
            <div><p className="font-medium text-gray-900">Cardiología - Dr. Pérez</p><p className="text-sm text-gray-500">Completada - Lunes 8 enero, 2024</p></div>
            <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-medium rounded-full flex items-center gap-1"><ClipboardCheck className="h-3 w-3" /> Completada</span>
          </div>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <h3 className="font-medium text-yellow-900 mb-2 flex items-center gap-2"><AlertCircle className="h-5 w-5" /> Página en desarrollo</h3>
        <p className="text-sm text-yellow-700">Funcionalidades pendientes:
          <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
            <li>GET /api/fichas-preconsulta/paciente/:id - Listar fichas del paciente</li>
            <li>GET /api/fichas-preconsulta/:id - Obtener ficha específica</li>
            <li>POST /api/fichas-preconsulta - Crear/actualizar ficha</li>
            <li>Validación: solo editable hasta 2h antes de la cita</li>
            <li>Asociación automática con cita programada (cita_id)</li>
            <li>Vista de solo lectura para médico en su panel</li>
          </ul>
        </p>
      </div>
    </div>
  );
};