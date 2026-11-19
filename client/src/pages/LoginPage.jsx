// src/pages/LoginPage.jsx
// Login oficial de CliniCita — réplica fiel del diseño en public/pages/login.html
// Mantiene toda la lógica React: AuthContext, apiClient, React Router, validaciones, loading, errores.

import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import apiClient from '../api/apiClient';
import { Loader } from 'lucide-react';

const RUTAS_POR_ROL = {
  paciente: '/paciente',
  medico: '/medico',
  recepcionista: '/recepcionista',
  administrador: '/admin'
};

const CLINICITA_COLORS = {
  dark: '#1B2A4A',
  mid: '#2E5090',
  light: '#E8F0FE',
  accent: '#00B4D8',
  white: '#FFFFFF',
  grayBg: '#F8FAFC',
  textDark: '#1E293B',
  textMuted: '#64748B',
  errorBg: '#FEF2F2',
  errorBorder: '#FECACA',
  errorText: '#B91C1C',
};

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [correo, setCorreo] = useState('');
  const [clave, setClave] = useState('');
  const [rol, setRol] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    const correoInput = document.getElementById('correo');
    if (correoInput) correoInput.focus();
  }, []);

  const handleLogin = useCallback(async (e) => {
    e.preventDefault();
    if (!correo || !clave || !rol) {
      setError('Por favor, completa todos los campos.');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const response = await apiClient.post('/auth/login', { correo, clave, rol });
      const token = response.data.token; 
      const userData = response.data.usuario;
      login(token, userData);
      const rutaDestino = RUTAS_POR_ROL[rol];
      if (rutaDestino) {
        navigate(rutaDestino, { replace: true });
      } else {
        throw new Error('Rol no reconocido');
      }
    } catch (err) {
      console.error('Login error:', err.response ? err.response.data : err.message);
      setError(err.response?.data?.mensaje || 'Error de autenticación. Intenta de nuevo.');
    } finally {
      setIsLoading(false);
    }
  }, [correo, clave, rol, login, navigate]);

  const handleTogglePassword = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div 
      className="min-h-screen flex items-center justify-center py-12 px-4"
      style={{ backgroundColor: CLINICITA_COLORS.grayBg }}
      role="main"
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <a href="/" className="inline-flex items-center text-decoration-none" aria-label="CliniCita - Inicio">
            <svg 
              className="w-8 h-8 mr-2" 
              fill="currentColor" 
              viewBox="0 0 16 16" 
              aria-hidden="true"
              style={{ color: CLINICITA_COLORS.mid }}
            >
              <path d="M8 1.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0V2a.5.5 0 0 1 .5-.5zM3.5 4a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5zM14.5 4a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5zM2.146 5.646a.5.5 0 0 1 .708 0L4 7.293l1.146-1.147a.5.5 0 1 1 .708.708L4.707 8l1.147 1.146a.5.5 0 0 1-.708.708L4 8.707l-1.146 1.147a.5.5 0 0 1-.708-.708L3.293 8 2.146 6.854a.5.5 0 0 1 0-.708zM13.854 5.646a.5.5 0 0 1 .708 0l1.147 1.147a.5.5 0 0 1-.708.708L14.707 8l1.146 1.147a.5.5 0 0 1-.708.708L14 8.707l-1.146 1.147a.5.5 0 0 1-.708-.708L13.293 8 12.146 6.854a.5.5 0 0 1 0-.708zM8 11.5a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5z"/>
              <path d="M8 2.5a5.5 5.5 0 0 1 5.5 5.5v1.5H2.5V8a5.5 5.5 0 1 1 5.5-5.5z"/>
            </svg>
            <span className="text-2xl font-bold" style={{ 
              color: CLINICITA_COLORS.dark,
              fontFamily: '"Playfair Display", Georgia, serif',
              fontWeight: 900
            }}>
              Clini<span style={{ color: CLINICITA_COLORS.mid }}>Cita</span>
            </span>
          </a>
        </div>

        <div 
          className="rounded-2xl shadow-xl overflow-hidden"
          style={{ 
            backgroundColor: CLINICITA_COLORS.white,
            border: `1px solid ${CLINICITA_COLORS.light}`,
            boxShadow: '0 20px 40px -15px rgba(27, 42, 74, 0.15)'
          }}
        >
          <div 
            className="px-6 py-4"
            style={{ 
              backgroundColor: CLINICITA_COLORS.dark,
              borderBottom: `1px solid ${CLINICITA_COLORS.mid}`
            }}
          >
            <h1 className="text-xl font-semibold text-white text-center m-0" style={{ 
              fontFamily: '"Playfair Display", Georgia, serif',
              fontWeight: 700,
              letterSpacing: '0.5px'
            }}>
              Iniciar sesión
            </h1>
          </div>

          <div className="p-6 md:p-8">
            {error && (
              <div 
                className="mb-6 p-4 rounded-lg text-sm flex items-center gap-3 animate-slide-down"
                role="alert"
                style={{ 
                  backgroundColor: CLINICITA_COLORS.errorBg,
                  border: `1px solid ${CLINICITA_COLORS.errorBorder}`,
                  color: CLINICITA_COLORS.errorText
                }}
              >
                <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14zm0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16z"/>
                  <path d="M8 4a.5.5 0 0 1 .5.5v3.5a.5.5 0 0 1-1 0V8a.5.5 0 0 1 .5-.5z"/>
                  <path d="M8 10a.5.5 0 0 1 .5.5v1.5a.5.5 0 0 1-1 0v-1.5A.5.5 0 0 1 8 10z"/>
                </svg>
                <span className="flex-1">{error}</span>
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-5" noValidate>
              {/* Campo: Tipo de usuario */}
              <div>
                <label htmlFor="rol" className="block text-sm font-medium mb-1.5" style={{ color: CLINICITA_COLORS.textDark }}>
                  Tipo de usuario
                </label>
                <div className="relative">
                  <select id="rol" name="rol" required value={rol} onChange={(e) => setRol(e.target.value)} disabled={isLoading} className="w-full appearance-none pl-4 pr-10 py-3 border rounded-lg text-base transition-all duration-200" style={{ backgroundColor: CLINICITA_COLORS.white, borderColor: '#E2E8F0', color: CLINICITA_COLORS.textDark, boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }} aria-describedby="rol-error">
                    <option value="">Selecciona tu rol</option>
                    <option value="paciente">Paciente</option>
                    <option value="medico">Médico</option>
                    <option value="recepcionista">Recepcionista</option>
                    <option value="administrador">Administrador</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true" style={{ color: CLINICITA_COLORS.textMuted }}>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Campo: Contraseña con toggle */}
              <div>
                <label htmlFor="clave" className="block text-sm font-medium mb-1.5" style={{ color: CLINICITA_COLORS.textDark }}>
                  Contraseña
                </label>
                <div className="relative">
                  <input type={showPassword ? 'text' : 'password'} id="clave" name="clave" required autoComplete="current-password" value={clave} onChange={(e) => setClave(e.target.value)} disabled={isLoading} className="w-full pl-4 pr-12 py-3 border rounded-lg text-base transition-all duration-200" style={{ backgroundColor: CLINICITA_COLORS.white, borderColor: '#E2E8F0', color: CLINICITA_COLORS.textDark, boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)' }} placeholder="••••••••" aria-describedby="clave-error" />
                  <button type="button" onClick={handleTogglePassword} disabled={isLoading} className="absolute inset-y-0 right-0 flex items-center pr-3 text-sm transition-colors" style={{ color: CLINICITA_COLORS.textMuted }} aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'} aria-pressed={showPassword}>
                    {showPassword ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88a3 3 0 114.242-4.242M9.88 9.88L6 6m0 0l-1.5 1.5M6 6l12 12" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Checkbox: Recordar sesión */}
              <div className="flex items-center">
                <input type="checkbox" id="recordar" name="recordar" className="h-4 w-4 rounded border-gray-300 focus:ring-2 focus:ring-offset-0 transition-colors" style={{ borderColor: '#E2E8F0', accentColor: CLINICITA_COLORS.mid }} disabled={isLoading} />
                <label htmlFor="recordar" className="ml-3 text-sm text-gray-600 cursor-pointer select-none" style={{ color: CLINICITA_COLORS.textMuted }}>
                  Recordar sesión
                </label>
              </div>

              {/* Botón submit */}
              <button type="submit" disabled={isLoading} className="w-full py-3.5 rounded-lg font-semibold text-base text-white transition-all duration-200 flex items-center justify-center gap-2" style={{ backgroundColor: CLINICITA_COLORS.mid, boxShadow: '0 4px 12px rgba(46, 80, 144, 0.3)' }} aria-busy={isLoading}>
                {isLoading ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" aria-hidden="true" />
                    <span>Ingresando...</span>
                  </>
                ) : (
                  'Ingresar'
                )}
              </button>
            </form>

            {/* Enlaces inferiores */}
            <div className="mt-6 text-center text-sm" style={{ color: CLINICITA_COLORS.textMuted }}>
              <p className="mb-2">
                <Link to="/recuperar" className="hover:underline transition-colors" style={{ color: CLINICITA_COLORS.mid }}>
                  ¿Olvidaste tu contraseña?
                </Link>
              </p>
              <p className="mb-0">
                ¿No tienes cuenta?{' '}
                <Link to="/registro" className="font-medium hover:underline transition-colors" style={{ color: CLINICITA_COLORS.mid }}>
                  Regístrate
                </Link>
              </p>
            </div>
          </div>
        </div>

        {/* Footer pequeño con marca */}
        <p className="text-center text-xs mt-6" style={{ color: CLINICITA_COLORS.textMuted }}>
          © 2026 CliniCita — Equipo ADSO ATHENA LABS · SENA
        </p>
      </div>
    </div>
  );
};

export default LoginPage;