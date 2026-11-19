// src/pages/admin/Usuarios.jsx - PENDIENTE: Implementar funcionalidad completa

import React from 'react';
import { Users, UserPlus, Search, AlertCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

export const AdminUsuarios = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Gestión de Usuarios</h1>
          <p className="text-gray-500 mt-1">Administra cuentas de acceso al sistema</p>
        </div>
        <Link to="/admin/usuarios/nuevo" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          <UserPlus className="h-5 w-5" />
          Nuevo usuario
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <input type="text" placeholder="Buscar por nombre, correo, rol..." className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500" />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Usuario</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Correo</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rol</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Estado</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último acceso</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              <tr>
                <td colSpan="6" className="px-4 py-12 text-center text-gray-500">
                  <Users className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                  <p>No hay usuarios registrados</p>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
        <h3 className="font-medium text-yellow-900 mb-2 flex items-center gap-2"><AlertCircle className="h-5 w-5" /> Página en desarrollo</h3>
        <p className="text-sm text-yellow-700">Pendientes:
          <ul className="list-disc list-inside mt-2 space-y-1 text-xs">
            <li>GET /api/admin/usuarios - Listar con filtros (rol, estado, búsqueda)</li>
            <li>POST /api/admin/usuarios - Crear (nombre, correo, clave, rol, medico_id/paciente_id opcional)</li>
            <li>GET /api/admin/usuarios/:id - Detalle</li>
            <li>PUT /api/admin/usuarios/:id - Actualizar (rol, estado, datos)</li>
            <li>PUT /api/admin/usuarios/:id/password - Resetear contraseña</li>
            <li>DELETE /api/admin/usuarios/:id - Desactivar (soft delete)</li>
            <li>Roles: paciente, medico, recepcionista, administrador</li>
          </ul>
        </p>
      </div>
    </div>
  );
};