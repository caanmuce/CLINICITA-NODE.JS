// src/pages/auth/RecuperarPage.jsx
// Recuperar contraseña - réplica fiel del diseño en public/pages/recuperar.html
// Usa authApi.recuperar(correo) del backend existente

import React, { useState, useCallback, useEffect } from "react";
import { Link } from "react-router-dom";
import { authApi } from "../../api/auth";
import { Loader2, Mail, AlertCircle, CheckCircle } from "lucide-react";

const CLINICITA_COLORS = {
  dark: "#1B2A4A",
  mid: "#2E5090",
  light: "#E8F0FE",
  accent: "#00B4D8",
  white: "#FFFFFF",
  grayBg: "#F8FAFC",
  textDark: "#1E293B",
  textMuted: "#64748B",
  errorBg: "#FEF2F2",
  errorBorder: "#FECACA",
  errorText: "#B91C1C",
  successBg: "#F0FDF4",
  successBorder: "#BBF7D0",
  successText: "#166534",
};

const RecuperarPage = () => {
  const [correo, setCorreo] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  useEffect(() => {
    const correoInput = document.getElementById("correo");
    if (correoInput) correoInput.focus();
  }, []);

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();
      if (!correo.trim()) {
        setError("Por favor, ingresa tu correo electrónico.");
        return;
      }
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) {
        setError("Por favor, ingresa un correo válido.");
        return;
      }

      setIsLoading(true);
      setError(null);
      setSuccess(null);

      try {
        await authApi.recuperar(correo.trim().toLowerCase());
        setSuccess(
          "Si el correo existe en nuestro sistema, recibirás un enlace para restablecer tu contraseña.",
        );
      } catch (err) {
        console.error(
          "Recuperar error:",
          err.response ? err.response.data : err.message,
        );
        setError(
          err.response?.data?.mensaje ||
            "Error al solicitar recuperación. Intenta de nuevo.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [correo],
  );

  return (
    <div
      className="min-h-screen flex items-center justify-center py-12 px-4"
      style={{ backgroundColor: CLINICITA_COLORS.grayBg }}
      role="main"
    >
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <Link
            to="/"
            className="inline-flex items-center text-decoration-none"
            aria-label="CliniCita - Inicio"
          >
            <svg
              className="w-8 h-8 mx-auto"
              fill="currentColor"
              viewBox="0 0 16 16"
              aria-hidden="true"
              style={{ color: CLINICITA_COLORS.mid }}
            >
              <path d="M8 1.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0V2a.5.5 0 0 1 .5-.5zM3.5 4a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5zM14.5 4a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5zM2.146 5.646a.5.5 0 0 1 .708 0L4 7.293l1.146-1.147a.5.5 0 1 1 .708.708L4.707 8l1.147 1.146a.5.5 0 0 1-.708.708L4 8.707l-1.146 1.147a.5.5 0 0 1-.708-.708L3.293 8 2.146 6.854a.5.5 0 0 1 0-.708zM13.854 5.646a.5.5 0 0 1 .708 0l1.147 1.147a.5.5 0 0 1-.708.708L13.293 8l1.146 1.147a.5.5 0 0 1-.708.708l-1.147-1.147a.5.5 0 0 1 0-.708z" />
            </svg>
          </Link>
        </div>

        <div
          className="bg-white rounded-2xl shadow-xl overflow-hidden"
          style={{ boxShadow: "0 20px 40px rgba(27, 42, 74, 0.1)" }}
        >
          <div
            className="px-6 py-4"
            style={{ backgroundColor: CLINICITA_COLORS.mid }}
          >
            <h1 className="text-xl font-semibold text-white text-center">
              Recuperar contraseña
            </h1>
          </div>

          <div className="p-6">
            {error && (
              <div
                className="mb-4 p-3 rounded-lg flex items-center gap-2 text-sm"
                role="alert"
                style={{
                  backgroundColor: CLINICITA_COLORS.errorBg,
                  border: `1px solid ${CLINICITA_COLORS.errorBorder}`,
                  color: CLINICITA_COLORS.errorText,
                }}
              >
                <AlertCircle
                  className="h-5 w-5 flex-shrink-0"
                  aria-hidden="true"
                />
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div
                className="mb-4 p-3 rounded-lg flex items-center gap-2 text-sm"
                role="status"
                style={{
                  backgroundColor: CLINICITA_COLORS.successBg,
                  border: `1px solid ${CLINICITA_COLORS.successBorder}`,
                  color: CLINICITA_COLORS.successText,
                }}
              >
                <CheckCircle
                  className="h-5 w-5 flex-shrink-0"
                  aria-hidden="true"
                />
                <span>{success}</span>
              </div>
            )}

            {!success && (
              <p className="text-sm text-center text-gray-500 mb-6">
                Ingresa el correo asociado a tu cuenta. Te enviaremos un enlace
                para restablecer tu contraseña.
              </p>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="mb-4">
                <label
                  htmlFor="correo"
                  className="block text-sm font-medium text-gray-700 mb-1"
                >
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail
                    className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
                    aria-hidden="true"
                  />
                  <input
                    type="email"
                    id="correo"
                    name="correo"
                    autoComplete="email"
                    required
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors disabled:opacity-50"
                    style={{
                      borderColor: error
                        ? CLINICITA_COLORS.errorBorder
                        : "#E2E8F0",
                      boxShadow: error
                        ? `0 0 0 1px ${CLINICITA_COLORS.errorBorder}`
                        : "none",
                    }}
                    placeholder="tu@correo.com"
                    disabled={isLoading}
                    aria-describedby={error ? "correo-error" : undefined}
                    aria-invalid={error ? "true" : "false"}
                  />
                </div>
                {error && (
                  <p
                    id="correo-error"
                    className="mt-1 text-sm"
                    style={{ color: CLINICITA_COLORS.errorText }}
                  >
                    {error}
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 rounded-lg font-semibold text-base text-white transition-all duration-200 flex items-center justify-center gap-2"
                style={{
                  backgroundColor: CLINICITA_COLORS.mid,
                  boxShadow: "0 4px 12px rgba(46, 80, 144, 0.3)",
                }}
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2
                      className="h-5 w-5 animate-spin"
                      aria-hidden="true"
                    />
                    <span>Enviando...</span>
                  </>
                ) : (
                  "Enviar enlace"
                )}
              </button>
            </form>

            {!success && (
              <div
                className="mt-6 text-center text-sm"
                style={{ color: CLINICITA_COLORS.textMuted }}
              >
                <Link
                  to="/login"
                  className="hover:underline transition-colors"
                  style={{ color: CLINICITA_COLORS.mid }}
                >
                  Volver al inicio de sesión
                </Link>
              </div>
            )}
          </div>
        </div>

        <p
          className="text-center text-xs mt-6"
          style={{ color: CLINICITA_COLORS.textMuted }}
        >
          © 2026 CliniCita — Equipo ADSO ATHENA LABS · SENA
        </p>
      </div>
    </div>
  );
};

export default RecuperarPage;
