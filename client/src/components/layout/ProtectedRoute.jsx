// src/components/layout/ProtectedRoute.jsx

import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

/**
 * ProtectedRoute - Wrapper que protege rutas por autenticación y rol
 *
 * @param {string[]} allowedRoles - Array de roles permitidos (ej: ['paciente', 'medico'])
 * @param {React.ReactNode} children - Contenido a renderizar si tiene acceso
 * @returns {React.ReactElement} - Componente o redirección
 */
export const ProtectedRoute = ({ allowedRoles = [], children }) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Mientras carga la verificación de autenticación
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-teal-600 border-t-transparent" />
      </div>
    );
  }

  // No autenticado -> redirigir a login
  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Verificar rol si se especifican roles permitidos
  if (allowedRoles.length > 0) {
    const userRole = user?.rol?.toLowerCase();
    const hasAccess = allowedRoles.some(
      (role) => role.toLowerCase() === userRole,
    );

    if (!hasAccess) {
      // Redirigir al dashboard correspondiente a su rol
      const dashboards = {
        paciente: "/paciente",
        medico: "/medico",
        recepcionista: "/recepcionista",
        administrador: "/admin",
      };
      const fallback = dashboards[userRole] || "/login";
      return <Navigate to={fallback} replace />;
    }
  }

  return <>{children}</>;
};

/**
 * RoleRoute - Variante que requiere un rol específico
 * @param {string} role - Rol requerido
 * @param {React.ReactNode} children - Contenido a renderizar
 */
export const RoleRoute = ({ role, children }) => {
  return <ProtectedRoute allowedRoles={[role]}>{children}</ProtectedRoute>;
};
