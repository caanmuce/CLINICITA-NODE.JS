// src/context/AuthContext.jsx

import React, { createContext, useState, useEffect, useContext } from 'react';
import apiClient from '../api/apiClient';

const AuthContext = createContext();

// Claves de localStorage para sincronizar con el frontend legacy
const LEGACY_TOKEN_KEY = 'clinicita_token';
const LEGACY_USER_KEY = 'clinicita_usuario';
const REACT_TOKEN_KEY = 'authToken';

// Mapea la respuesta de /api/usuarios/me al formato que espera el frontend
// Backend retorna: { usuario: { usuario_id, nombre_completo, correo, rol, paciente_id, medico_id, ... } }
// Frontend espera: { id, nombre, correo, rol, paciente_id, medico_id, ... }
const mapUserFromBackend = (backendUser) => {
  if (!backendUser) return null;
  return {
    id: backendUser.usuario_id,
    nombre: backendUser.nombre_completo,
    correo: backendUser.correo,
    rol: backendUser.rol,
    paciente_id: backendUser.paciente_id,
    medico_id: backendUser.medico_id,
    documento_id: backendUser.documento_id,
    telefono_whatsapp: backendUser.telefono_whatsapp,
    direccion: backendUser.direccion,
    fecha_nacimiento: backendUser.fecha_nacimiento,
    genero: backendUser.genero,
    correo_electronico: backendUser.correo_electronico,
  };
};

export const AuthProvider = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const clearAuthData = () => {
    localStorage.removeItem(REACT_TOKEN_KEY);
    localStorage.removeItem(LEGACY_TOKEN_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
  };

  // Check authentication status on mount
  useEffect(() => {
    // Intentar leer el token de ambas claves para compatibilidad
    const token = localStorage.getItem(LEGACY_TOKEN_KEY) || localStorage.getItem(REACT_TOKEN_KEY);
    if (token) {
      // Use the correct endpoint: /api/usuarios/me
      const checkAuth = async () => {
        try {
          const response = await apiClient.get('/usuarios/me');
          // Backend response structure for /api/usuarios/me is { usuario: { ... } }
          const backendUser = response.data.usuario;
          const userData = mapUserFromBackend(backendUser);
          setUser(userData);
          setIsAuthenticated(true);
          // Sincronizar claves legacy si no existen (ej. login hecho en React)
          if (!localStorage.getItem(LEGACY_TOKEN_KEY)) {
            localStorage.setItem(LEGACY_TOKEN_KEY, token);
          }
          if (!localStorage.getItem(LEGACY_USER_KEY)) {
            localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(userData));
          }
          // También sincronizar REACT_TOKEN_KEY
          if (!localStorage.getItem(REACT_TOKEN_KEY)) {
            localStorage.setItem(REACT_TOKEN_KEY, token);
          }
        } catch (error) {
          console.error('Authentication failed:', error);
          // Token is invalid or expired
          clearAuthData();
          setIsAuthenticated(false);
          setUser(null);
        } finally {
          setLoading(false);
        }
      };
      checkAuth();
    } else {
      // Use setTimeout to avoid synchronous setState in effect
      setTimeout(() => setLoading(false), 0);
    }
  }, []);

  const login = (token, userData) => {
    // userData viene del login: { id, nombre, correo, rol }
    // Guardar en todas las claves para compatibilidad con legacy
    localStorage.setItem(REACT_TOKEN_KEY, token);
    localStorage.setItem(LEGACY_TOKEN_KEY, token);
    localStorage.setItem(LEGACY_USER_KEY, JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    clearAuthData();
    setUser(null);
    setIsAuthenticated(false);
    // Navegación SPA a la ruta de login de React
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
