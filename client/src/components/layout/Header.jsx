// src/components/layout/Header.jsx

import React, { useState, useRef, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { Menu, Bell, User, ChevronDown, LogOut, Settings, HeartPulse, Home } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export const Header = ({ onMenuClick }) => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const notificationsRef = useRef(null);

  const RUTAS_PERFIL = {
    paciente: "/paciente/perfil",
    medico: "/medico/perfil",
    recepcionista: "/recepcionista/perfil",
    administrador: "/admin/perfil",
  };

  const RUTAS_CONFIG = {
    paciente: "/paciente/configuracion",
    medico: "/medico/configuracion",
    recepcionista: "/recepcionista/configuracion",
    administrador: "/admin/configuracion",
  };

  const rol = user?.rol?.toLowerCase() || "paciente";

  const irPerfil = () => {
    navigate(RUTAS_PERFIL[rol] || "/paciente/perfil");
    setIsDropdownOpen(false);
  };

  const irConfiguracion = () => {
    navigate(RUTAS_CONFIG[rol] || "/paciente/configuracion");
    setIsDropdownOpen(false);
  };

  const handleLogout = () => {
    logout();
    setIsDropdownOpen(false);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
      if (notificationsRef.current && !notificationsRef.current.contains(event.target)) {
        setIsNotificationsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-30 flex items-center justify-between px-6 transition-all duration-300">
      {/* Mobile menu button - izquierda */}
      <motion.button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
        aria-label="Abrir menú"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <Menu className="h-6 w-6" />
      </motion.button>

      {/* Logo Clinicita - centro */}
      <div className="absolute left-1/2 -translate-x-1/2 flex items-center gap-2 cursor-pointer z-10">
        <Link
          to="/"
          onClick={(e) => {
            e.stopPropagation();
            setIsDropdownOpen(false);
            setIsNotificationsOpen(false);
          }}
          className="flex items-center gap-2"
        >
          <motion.div
            whileHover={{ scale: 1.1, rotate: 5 }}
            whileTap={{ scale: 0.95 }}
            className="p-3 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 shadow-lg shadow-teal-500/25"
          >
            <HeartPulse className="h-8 w-8 text-white" aria-hidden="true" />
          </motion.div>
        </Link>
      </div>

      {/* Right side actions */}
      <div className="flex items-center gap-4">
        {/* Notifications */}
        <motion.button
          onClick={() => setIsNotificationsOpen(!isNotificationsOpen)}
          className="relative p-2 rounded-lg hover:bg-gray-100 text-gray-500 transition-colors"
          aria-label="Notificaciones"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
        >
          <Bell className="h-5 w-5" />
        </motion.button>

        {/* Notifications panel */}
        <AnimatePresence>
          {isNotificationsOpen && (
            <motion.div
              ref={notificationsRef}
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              transition={{ duration: 0.15, ease: "easeOut" }}
              className="absolute top-16 right-0 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
            >
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="text-sm font-medium text-gray-900">Notificaciones</h3>
                <p className="text-xs text-gray-500">Sin notificaciones pendientes</p>
              </div>
              <div className="px-4 py-3 text-center text-gray-500 text-sm">
                No hay notificaciones disponibles en este momento.
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* User dropdown */}
        <div className="relative" ref={dropdownRef}>
          <motion.button
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-100 transition-colors"
            aria-label="Menú de usuario"
            aria-expanded={isDropdownOpen}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <div className="h-8 w-8 rounded-full bg-teal-100 flex items-center justify-center">
              <User className="h-5 w-5 text-teal-600" />
            </div>
            <span className="hidden sm:block text-sm font-medium text-gray-700">
              {user?.nombre}
            </span>
            <motion.div
              animate={{ rotate: isDropdownOpen ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              className="h-4 w-4 text-gray-400 hidden sm:block"
            >
              <ChevronDown />
            </motion.div>
          </motion.button>

          {/* Dropdown menu */}
          <AnimatePresence>
            {isDropdownOpen && (
              <motion.div
                initial={{ opacity: 0, y: -10, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -10, scale: 0.95 }}
                transition={{ duration: 0.15, ease: "easeOut" }}
                className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50"
              >
                <div className="px-4 py-2 border-b border-gray-200">
                  <p className="text-sm font-medium text-gray-900">
                    {user?.nombre}
                  </p>
                  <p className="text-xs text-gray-500">{user?.correo}</p>
                </div>
                <motion.button
                  onClick={irPerfil}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  whileHover={{ x: 4 }}
                >
                  <User className="h-4 w-4" />
                  Mi perfil
                </motion.button>
                <motion.button
                  onClick={irConfiguracion}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  whileHover={{ x: 4 }}
                >
                  <Settings className="h-4 w-4" />
                  Configuración
                </motion.button>
                <motion.button
                  onClick={() => {
                    navigate("/");
                    setIsDropdownOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors cursor-pointer"
                  whileHover={{ x: 4 }}
                >
                  <Home className="h-4 w-4" />
                  Volver a inicio
                </motion.button>
                <hr className="my-1 border-gray-200" />
                <motion.button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                  whileHover={{ x: 4 }}
                >
                  <LogOut className="h-4 w-4" />
                  Cerrar sesión
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </header>
  );
};
