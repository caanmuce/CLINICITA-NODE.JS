// src/pages/LoginPage.jsx - Login de Clinicita (rediseño moderno SaaS médico)
import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import apiClient from "../api/apiClient";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader,
  HeartPulse,
  Mail,
  Lock,
  UserCog,
  AlertCircle,
  Shield,
  Stethoscope,
  Calendar,
  Users,
  CheckCircle,
  Sparkles,
  Eye,
  EyeOff,
} from "lucide-react";

const LoginPage = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [correo, setCorreo] = useState("");
  const [clave, setClave] = useState("");
  const [rol, setRol] = useState("paciente");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  useEffect(() => {
    const correoInput = document.getElementById("correo");
    if (correoInput) correoInput.focus();
  }, []);

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: "easeOut" },
    },
  };

  const panelVariants = {
    hidden: { opacity: 0, x: -30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut" } },
  };

  const formVariants = {
    hidden: { opacity: 0, x: 30 },
    visible: { opacity: 1, x: 0, transition: { duration: 0.6, ease: "easeOut", delay: 0.2 } },
  };

  const prefersReducedMotion = typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // const containerVariants = { // unused - keeping for reference
  //   hidden: { opacity: 0 },
  //   visible: {
  //     opacity: 1,
  //     transition: { staggerChildren: 0.1, delayChildren: 0.2 },
  //   },
  // };

  const handleLogin = useCallback(
    async (e) => {
      e.preventDefault();
      if (!correo || !clave || !rol) {
        setError("Por favor, completa correo, contraseña y selecciona un rol.");
        return;
      }
      setIsLoading(true);
      setError(null);
      try {
        const response = await apiClient.post("/auth/login", {
          correo,
          clave,
          rol,
        });
        const token = response.data.token;
        const userData = response.data.usuario;
        login(token, userData);
        const rolUsuario = userData?.rol || userData?.role || "paciente";
        const RUTAS_POR_ROL = {
          paciente: "/paciente",
          medico: "/medico",
          recepcionista: "/recepcionista",
          administrador: "/admin",
        };
        const rutaDestino = RUTAS_POR_ROL[rolUsuario];
        if (rutaDestino) {
          navigate(rutaDestino, { replace: true });
        } else {
          navigate("/paciente", { replace: true });
        }
      } catch (err) {
        console.error(
          "Login error:",
          err.response ? err.response.data : err.message,
        );
        setError(
          err.response?.data?.mensaje ||
            "Error de autenticación. Intenta de nuevo.",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [correo, clave, rol, login, navigate],
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-teal-50 flex" role="main">
      {/* Panel izquierdo - Informativo */}
      <motion.div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        {...(prefersReducedMotion ? {} : { variants: panelVariants, initial: "hidden", animate: "visible" })}
      >
        {/* Elementos decorativos de fondo */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-100/50 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-teal-200/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: "1s"}} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-teal-100/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: "2s"}} />
        </div>
       
        <div className="relative z-10 max-w-lg w-full text-center">
          {/* Logo */}
          <motion.div
            {...(prefersReducedMotion ? {} : { variants: itemVariants })}
            className="mb-10"
          >
            <Link
              to="/"
              className="inline-flex items-center gap-4"
              aria-label="Clinica - Inicio"
            >
              <motion.div
                whileHover={{scale: 1.1, rotate: 5}}
                whileTap={{scale: 0.95}}
                className="p-4 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 shadow-lg shadow-teal-500/25"
              >
                <HeartPulse className="h-10 w-10 text-white" aria-hidden="true" />
              </motion.div>
              <span className="font-serif font-bold text-4xl tracking-tight text-gray-900 self-center">
                Clini<span className="text-teal-600">Cita</span>
              </span>
            </Link>
          </motion.div>
         
          {/* Título y mensaje principal */}
          <motion.div
            {...(prefersReducedMotion ? {} : { variants: itemVariants })}
            className="mb-8"
          >
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">
              Simplifica la <span className="text-teal-600">gestión de tu clínica</span> con tecnología moderna
            </h1>
            <p className="text-lg lg:text-xl text-gray-600 mb-8 max-w-xl mx-auto leading-relaxed">
              Sistema integral de citas, pacientes, historial médico y predicción de no-show con ML.
              Diseñado para equipos médicos que valoran la eficiencia y la experiencia del paciente.
            </p>
          </motion.div>
          {/* Características destacadas */}
          <motion.div
            {...(prefersReducedMotion ? {} : { variants: itemVariants })}
            className="grid grid-cols-3 gap-6 mb-10"
          >
            <div className="p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-teal-100 hover:border-teal-200 hover:shadow-lg transition-all duration-300">
              <div className="p-3 rounded-xl bg-teal-100 text-teal-600 mb-3 inline-flex">
                <Calendar className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Agenda Inteligente</h3>
              <p className="text-sm text-gray-500">Gestión de citas optimizada</p>
            </div>
            <div className="p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-teal-100 hover:border-teal-200 hover:shadow-lg transition-all duration-300">
              <div className="p-3 rounded-xl bg-teal-100 text-teal-600 mb-3 inline-flex">
                <Users className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">Pacientes 360°</h3>
              <p className="text-sm text-gray-500">Historial completo unificado</p>
            </div>
            <div className="p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-teal-100 hover:border-teal-200 hover:shadow-lg transition-all duration-300">
              <div className="p-3 rounded-xl bg-teal-100 text-teal-600 mb-3 inline-flex">
                <Sparkles className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="font-semibold text-gray-900 mb-1">ML No-Show</h3>
              <p className="text-sm text-gray-500">Predicción de ausencias</p>
            </div>
          </motion.div>

          {/* Estadísticas de confianza */}
          <motion.div
            {...(prefersReducedMotion ? {} : { variants: itemVariants })}
            className="flex flex-col sm:flex-row justify-center gap-8 text-center pt-8 border-t border-teal-100">
            <div>
              <p className="text-3xl font-bold text-teal-600 mb-1">500+</p>
              <p className="text-sm text-gray-500">Profesionales activos</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-teal-600 mb-1">50K+</p>
              <p className="text-sm text-gray-500">Citas gestionadas</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-teal-600 mb-1">99.9%</p>
              <p className="text-sm text-gray-500">Uptime garantizado</p>
            </div>
          </motion.div>
        </div>

        {/* Elementos decorativos flotantes */}
        <div className="absolute bottom-8 left-8 right-8 flex justify-center gap-4 pointer-events-none" aria-hidden="true">
          <motion.div
            animate={{y: [0, -10, 0]}}
            transition={{duration: 3, repeat: Infinity, ease: "easeInOut"}}
            className="p-3 rounded-xl bg-white/60 backdrop-blur-sm border border-teal-100 shadow-lg"
          >
            <Shield className="h-5 w-5 text-teal-600" />
          </motion.div>
          <motion.div
            animate={{y: [0, -15, 0]}}
            transition={{duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5}}
            className="p-3 rounded-xl bg-white/60 backdrop-blur-sm border border-teal-100 shadow-lg"
          >
            <Stethoscope className="h-5 w-5 text-teal-600" />
          </motion.div>
          <motion.div
            animate={{y: [0, -8, 0]}}
            transition={{duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1}}
            className="p-3 rounded-xl bg-white/60 backdrop-blur-sm border border-teal-100 shadow-lg"
          >
            <CheckCircle className="h-5 w-5 text-teal-600" />
          </motion.div>
        </div>
      </motion.div>

      {/* Panel derecho - Formulario */}
      <motion.div
        className="flex w-full lg:w-1/2 flex-col items-center justify-center p-8 lg:p-12"
        {...(prefersReducedMotion ? {} : { variants: formVariants, initial: "hidden", animate: "visible" })}
      >
{/* Animar error */}
            <AnimatePresence mode="wait">
              {error && (
                <motion.div
                  key="error"
                  initial={{opacity: 0, y: -10, scale: 0.98}}
                  animate={{opacity: 1, y: 0, scale: 1}}
                  exit={{opacity: 0, y: -10, scale: 0.98}}
                  className="mb-6 p-4 rounded-xl flex items-center gap-3 bg-red-50 border border-red-200 text-red-800"
                  role="alert"
                >
                  <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                  <span className="text-sm">{error}</span>
                </motion.div>
              )}
            </AnimatePresence>
           
            <form onSubmit={handleLogin} noValidate className="space-y-5">
              {/* Campo Correo */}
              <motion.div
                {...(prefersReducedMotion ? {} : { variants: itemVariants, transition: { duration: 0.3 } })}
                className="relative">
                <label
                  htmlFor="correo"
                  className="block text-sm font-medium text-gray-700 mb-2">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail
                    className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200 ${focusedField === "correo" ? "text-teal-500" : "text-gray-400"}`}
                    aria-hidden="true"
                  />
                  <input
                    type="email"
                    id="correo"
                    name="correo"
                    required
                    autoComplete="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    onFocus={() => setFocusedField("correo")}
                    onBlur={() => setFocusedField(null)}
                    disabled={isLoading}
                    className={`w-full pl-10 pr-4 py-3.5 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 ${error && !correo ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                    placeholder="tu@correo.com"
                    aria-describedby="correo-error"
                    aria-invalid={error && !correo}
                  />
                </div>
              </motion.div>
             
              {/* Campo Clave */}
              <motion.div
                {...(prefersReducedMotion ? {} : { variants: itemVariants })}
                className="relative">
                <label
                  htmlFor="clave"
                  className="block text-sm font-medium text-gray-700 mb-2">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock
                    className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200 ${focusedField === "clave" ? "text-teal-500" : "text-gray-400"}`}
                    aria-hidden="true" />
                  <input
                    type={showPassword ? "text" : "password"}
                    id="clave"
                    name="clave"
                    required
                    autoComplete="current-password"
                    value={clave}
                    onChange={(e) => setClave(e.target.value)}
                    onFocus={() => setFocusedField("clave")}
                    onBlur={() => setFocusedField(null)}
                    disabled={isLoading}
                    className={`w-full pl-10 pr-12 py-3.5 rounded-xl border appearance-none cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 ${error && !clave ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                    placeholder="••••••••"
                    aria-describedby="clave-error"
                    aria-invalid={error && !clave}
                  />
                </div>
              </motion.div>
              
              {/* Selector de Rol */}
              <motion.div
                {...(prefersReducedMotion ? {} : { variants: itemVariants })}
                className="relative">
                <label
                  htmlFor="rol"
                  className="block text-sm font-medium text-gray-700 mb-2">
                  Rol
                </label>
                <div className="relative">
                  <UserCog
                    className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200 ${focusedField === "rol" ? "text-teal-500" : "text-gray-400"}`}
                    aria-hidden="true" />
                  <select
                    id="rol"
                    name="rol"
                    value={rol}
                    onChange={(e) => setRol(e.target.value)}
                    onFocus={() => setFocusedField("rol")}
                    onBlur={() => setFocusedField(null)}
                    disabled={isLoading}
                    className={`w-full pl-10 pr-4 py-3.5 rounded-xl border appearance-none cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 border-gray-200 bg-gray-50`}
                  >
                    <option value="paciente">Paciente</option>
                    <option value="medico">Médico</option>
                    <option value="recepcionista">Recepcionista</option>
                    <option value="administrador">Administrador</option>
                  </select>
                </div>
              </motion.div>
             
              {/* Recordar sesión */}
              <motion.div
                {...(prefersReducedMotion ? {} : { variants: itemVariants })}
                className="flex items-center">
                <input
                  type="checkbox"
                  id="recordar"
                  name="recordar"
                  className="h-4 w-4 rounded border-gray-300 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 accent-teal-600 transition-colors"
                  disabled={isLoading}
                />
                <label
                  htmlFor="recordar"
                  className="ml-3 text-sm text-gray-600 cursor-pointer select-none">
                  Recordar sesión
                </label>
              </motion.div>
             
              {/* Botón de envío */}
              <motion.button
                {...(prefersReducedMotion ? {} : { 
                  whileHover: { scale: 1.01, boxShadow: "0 8px 25px rgba(13, 148, 136, 0.4)" },
                  whileTap: { scale: 0.98 },
                })}
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 pr-6 rounded-xl font-semibold text-base text-white transition-all duration-200 flex items-center justify-center justify-center gap-2 relative overflow-hidden"
                style={{background: "linear-gradient(135deg, #0D9488 0%, #0A7A70 100%)", boxShadow: "0 4px 12px rgba(13, 148, 136, 0.3)"}}
                aria-busy={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader className="h-5 w-5 animate-spin" aria-hidden="true" />
                    <span>Ingresando...</span>
                  </>
                ) : (
                  "Ingresar"
                )}
                <motion.div
                  className="absolute inset-0 bg-white/20"
                  animate={{width: isLoading ? "100%" : 0}}
                  transition={{duration: 0.3}}
                />
              </motion.button>
            </form>
         
          {/* Enlaces inferiores */}
          <motion.div
            {...(prefersReducedMotion ? {} : { variants: itemVariants })}
            className="mt-8 pt-6 border-t border-teal-100 text-center text-sm">
            <p className="mb-3">
              <Link
                to="/recuperar"
                className="text-teal-600 hover:text-teal-700 font-medium transition-colors">
                ¿Olvidaste tu contraseña?
              </Link>
            </p>
            <p className="mb-0">
              ¿No tienes cuenta? {" "}
              <Link
                to="/registro"
                className="text-teal-600 hover:text-teal-700 font-semibold transition-colors">
                Crea una cuenta
              </Link>
            </p>
          </motion.div>
        <>
          {/* Footer */}
        <motion.p
          {...(prefersReducedMotion ? {} : { variants: itemVariants })}
          className="text-center text-xs mt-8 text-gray-400">
          © 2026 Clinicita — Equipo ADSO ATHENA LABS · SENA
        </motion.p>
        </>
    </motion.div>
  </div>
);
  };

export default LoginPage;
