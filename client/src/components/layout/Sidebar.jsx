// src/components/layout/Sidebar.jsx

import React, { useState, useEffect } from "react";
import { NavLink, Link } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import {
  Home,
  Calendar,
  Users,
  User,
  LogOut,
  Clock,
  FileText,
  Stethoscope,
  Building,
  BarChart,
  ArrowLeft,
  Settings,
  HeartPulse,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

const menuItems = {
  paciente: [
    { path: "/paciente", label: "Dashboard", icon: Home },
    { path: "/paciente/citas", label: "Mis Citas", icon: Calendar },
    { path: "/paciente/agendar", label: "Agendar Cita", icon: Clock },
    {
      path: "/paciente/lista-espera",
      label: "Lista de Espera",
      icon: FileText,
    },
    { path: "/paciente/preconsulta", label: "Pre-consulta", icon: Stethoscope },
    { path: "/paciente/perfil", label: "Mi Perfil", icon: User },
    { path: "/paciente/configuracion", label: "Configuración", icon: Settings },
  ],
  medico: [
    { path: "/medico", label: "Dashboard", icon: Home },
    { path: "/medico/agenda", label: "Mi Agenda", icon: Calendar },
    { path: "/medico/citas", label: "Mis Citas", icon: FileText },
    { path: "/medico/pacientes", label: "Pacientes", icon: Users },
    { path: "/medico/configuracion", label: "Configuración", icon: Settings },
  ],
  recepcionista: [
    { path: "/recepcionista", label: "Dashboard", icon: Home },
    { path: "/recepcionista/citas", label: "Gestión Citas", icon: Calendar },
    { path: "/recepcionista/pacientes", label: "Pacientes", icon: Users },
    { path: "/recepcionista/horarios", label: "Horarios", icon: Clock },
    { path: "/recepcionista/configuracion", label: "Configuración", icon: Settings },
  ],
  administrador: [
    { path: "/admin", label: "Dashboard", icon: Home },
    { path: "/admin/usuarios", label: "Usuarios", icon: Users },
    { path: "/admin/medicos", label: "Médicos", icon: Stethoscope },
    { path: "/admin/sedes", label: "Sedes", icon: Building },
    { path: "/admin/reportes", label: "Reportes", icon: BarChart },
    { path: "/admin/lista-espera", label: "Lista de Espera", icon: Calendar },
    { path: "/admin/especialidades", label: "Especialidades", icon: Stethoscope },
    { path: "/admin/horarios", label: "Horarios", icon: Clock },
    { path: "/admin/configuracion", label: "Configuración", icon: Settings },
  ],
};

const roleLabels = {
  paciente: "Paciente",
  medico: "Médico",
  recepcionista: "Recepcionista",
  administrador: "Administrador",
};

export const Sidebar = ({ collapsed = false, onToggle }) => {
  const { user, logout } = useAuth();
  const rol = user?.rol?.toLowerCase() || "paciente";
  const items = menuItems[rol] || menuItems.paciente;
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  const getActiveClass = (isActive) => {
    const base =
      "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200";
    if (isActive) {
      return base + " bg-teal-50 text-teal-700 shadow-sm";
    }
    return (
      base +
      " text-gray-600 hover:bg-gray-50 hover:text-gray-900 hover:shadow-sm"
    );
  };

  return (
    <aside
      className={
        "fixed left-0 top-0 h-full bg-white border-r border-gray-200 z-40 flex flex-col transition-all duration-300 ease-in-out " +
        (collapsed ? "w-20" : "w-64")
      }
      style={{ width: collapsed ? "5rem" : "16rem" }}
    >
      {/* Logo / Brand */}
      <div className="flex items-center justify-between h-16 px-4 border-b border-gray-200">
        <Link
          to="/"
          className="flex items-center gap-2 hover:text-teal-700 transition-colors"
          title="Ir al inicio"
        >
          <AnimatePresence mode="wait">
            {!collapsed && mounted && (
              <>
                <motion.span
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.2 }}
                  className="text-xl font-bold text-teal-600 whitespace-nowrap"
                >
                  CliniCita
                </motion.span>
                <motion.div whileHover={{scale: 1.1, rotate: 5}} whileTap={{scale: 0.95}} className="p-2 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 shadow-lg shadow-teal-500/25">
                  <HeartPulse className="h-8 w-8 text-white" aria-hidden="true" />
                </motion.div>
              </>
            )}
          </AnimatePresence>
        </Link>
        <button
          onClick={onToggle}
          className="p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors flex-shrink-0"
          aria-label={collapsed ? "Expandir menú" : "Colapsar menú"}
        >
          <motion.div
            animate={{ rotate: collapsed ? 180 : 0 }}
            transition={{ duration: 0.2 }}
          >
            <ArrowLeft className="h-5 w-5" />
          </motion.div>
        </button>
      </div>

      {/* User Info */}
      <AnimatePresence mode="wait">
        {!collapsed && user && mounted && (
          <motion.div
            initial={{ opacity: 0, height: 0, y: -10 }}
            animate={{ opacity: 1, height: "auto", y: 0 }}
            exit={{ opacity: 0, height: 0, y: -10 }}
            transition={{ duration: 0.2 }}
            className="px-4 py-3 border-b border-gray-200 overflow-hidden"
          >
            <p className="text-sm font-medium text-gray-900 truncate">
              {user.nombre}
            </p>
            <p className="text-xs text-gray-500 capitalize">
              {roleLabels[rol] || rol}
            </p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {mounted &&
          items.map((item, index) => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) => getActiveClass(isActive)}
              title={collapsed ? item.label : undefined}
            >
              <motion.div
                initial={{ scale: 0.8 }}
                animate={{ scale: 1 }}
                transition={{ delay: index * 0.05, duration: 0.2 }}
              >
                <item.icon
                  className="h-5 w-5 flex-shrink-0"
                  aria-hidden="true"
                />
              </motion.div>
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0, x: -10, width: 0 }}
                    animate={{ opacity: 1, x: 0, width: "auto" }}
                    exit={{ opacity: 0, x: -10, width: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    {item.label}
                  </motion.span>
                )}
              </AnimatePresence>
            </NavLink>
          ))}
      </nav>

      {/* Logout */}
      <div className="p-3 border-t border-gray-200">
        <button
          onClick={logout}
          className={
            "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-red-600 hover:bg-red-50 transition-colors w-full " +
            (collapsed ? "justify-center" : "")
          }
          title={collapsed ? "Cerrar sesión" : undefined}
        >
          <LogOut className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
          <AnimatePresence mode="wait">
            {!collapsed && mounted && (
              <motion.span
                initial={{ opacity: 0, x: -10, width: 0 }}
                animate={{ opacity: 1, x: 0, width: "auto" }}
                exit={{ opacity: 0, x: -10, width: 0 }}
                transition={{ duration: 0.15 }}
              >
                Cerrar sesión
              </motion.span>
            )}
          </AnimatePresence>
        </button>
      </div>
    </aside>
  );
};
