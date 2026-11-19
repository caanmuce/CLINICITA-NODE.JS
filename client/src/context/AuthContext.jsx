// src/context/AuthContext.jsx

import React, { createContext, useState, useEffect, useContext } from 'react';
import apiClient from '../api/apiClient';

const AuthContext = createContext();

// Clave única de localStorage para el token (unificada)
const TOKEN_KEY = 'authToken';
const USER_KEY = 'clinicita_usuario';

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
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
  };

  // Refresca el usuario consultando /api/usuarios/me
  // Útil después de editar perfil para actualizar el estado global
  const refreshUser = async () => {
    try {
      const response = await apiClient.get('/usuarios/me');
      const backendUser = response.data.usuario;
      const userData = mapUserFromBackend(backendUser);
      setUser(userData);
      localStorage.setItem(USER_KEY, JSON.stringify(userData));
      return userData;
    } catch (error) {
      console.error('Error refrescando usuario:', error);
      // Si falla (ej. 401), limpiar auth
      clearAuthData();
      setUser(null);
      setIsAuthenticated(false);
      throw error;
    }
  };

  // Check authentication status on mount
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
      const checkAuth = async () => {
        try {
          const response = await apiClient.get('/usuarios/me');
          const backendUser = response.data.usuario;
          const userData = mapUserFromBackend(backendUser);
          setUser(userData);
          setIsAuthenticated(true);
          // Sincronizar USER_KEY si no existe
          if (!localStorage.getItem(USER_KEY)) {
            localStorage.setItem(USER_KEY, JSON.stringify(userData));
          }
        } catch (error) {
          console.error('Authentication failed:', error);
          clearAuthData();
          setIsAuthenticated(false);
          setUser(null);
        } finally {
          setLoading(false);
        }
      };
      checkAuth();
    } else {
      setTimeout(() => setLoading(false), 0);
    }
  }, []);

  const login = (token, userData) => {
    localStorage.setItem(TOKEN_KEY, token);
    localStorage.setItem(USER_KEY, JSON.stringify(userData));
    setUser(userData);
    setIsAuthenticated(true);
  };

  const logout = () => {
    clearAuthData();
    setUser(null);
    setIsAuthenticated(false);
    window.location.href = '/login';
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, loading, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
