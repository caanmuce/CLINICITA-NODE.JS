// src/pages/admin/Reportes.jsx - PENDIENTE: Implementar funcionalidad completa

import React from 'react';
import { BarChart, Download, Filter, AlertCircle, Calendar } from 'lucide-react';

export const AdminReportes = () => {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Reportes y Estadísticas</h1>
        <p className="text-gray-500 mt-1">Métricas operativas y financieras del centro médico</p>
      </div>

      {/* Filtros de fecha */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <label className="text-sm font-medium text-gray-700">Desde:</label>
            <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <div className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-gray-400" />
            <label className="text-sm font-medium text-gray-700">Hasta:</label>
            <input type="date" className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
          </div>
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"><Filter className="h-5 w-5" /> Filtrar</button>
          <button className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors ml-auto"><Download className="h-5 w-5" /> Exportar PDF</button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total citas', value: '0', change: '+0%' },
          { label: 'Citas atendidas', value: '0', change: '+0%' },
          { label: 'Tasa no-show', value: '0%', change: '+0%' },
          { label: 'Ingresos', value: 'S/ 0', change: '+0%' },
        ].map((kpi, i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6">
            <p className="text-sm font-medium text-gray-500">{kpi.label}</p>
            <p className="text-3xl font-bold text-gray-900 mt-1">{kpi.value}</p>
            <p className="text-sm text-green-600 mt-1">{kpi.change} vs mes anterior</p>
          </div>
        ))}
      </div>

      {/* Gráficos placeholder */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><BarChart className="h-5 w-5" /> Citas por día</h3>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <BarChart className="h-16 w-16" />
            <p>Gráfico pendiente (Chart.js / Recharts)</p>
          </div>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><BarChart className="h-5 w-5" /> Citas por especialidad</h3>
          <div className="h-64 flex items-center justify-center text-gray-400">
            <BarChart className="h-16 w-16" />
            <p>Gráfico pendiente</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2"><BarChart className="h-5 w-5" /> Ocupación por médico</h3>
        <div className="h-64 flex items-center justify-center text-gray-400">
          <BarChart className="h-16 w-16" />
          <p>Gráfico pendiente</p>
        </div>
      </div>

      {/* Notice */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <h3 className="font-medium text-yellow-900 mb-2 flex items-center gap-2"><AlertCircle className="h-5 w-5" /> Página en desarrollo</h3>
        <p className="text-sm text-yellow-700">Pendientes: GET /api/admin/reportes?desde=&hasta=, KPIs (citas, no-show, ingresos, ocupación), Gráficos (Recharts/Chart.js), Exportar PDF/Excel, Filtros avanzados (medico, sede, especialidad)</p>
      </div>
    </div>
  );
};