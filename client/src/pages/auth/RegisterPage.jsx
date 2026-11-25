// src/pages/auth/RegisterPage.jsx

import React, { useState, useCallback, useEffect } from "react";
import { useNavigate, Link } from "react-router-dom";
import { authApi } from "../../api/auth";
import { motion, AnimatePresence } from "framer-motion";
import {
  Loader2,
  Mail,
  Lock,
  User,
  Shield,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle,
  HeartPulse,
  Calendar,
  Users,
  Sparkles,
  Stethoscope,
  IdCard,
  Phone,
} from "lucide-react";

const RegisterPage = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    correo: "",
    clave: "",
    confirmarClave: "",
    documento: "",
    telefono: "",
    habeas: false,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);
  const [focusedField, setFocusedField] = useState(null);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // const containerVariants = { // unused - keeping for reference
  //   hidden: { opacity: 0 },
  //   visible: {
  //     opacity: 1,
  //     transition: {
  //       staggerChildren: 0.08,
  //       delayChildren: 0.2,
  //     },
  //   },
  // };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  };

  const panelVariants = {
    hidden: { opacity: 0, x: -40 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] },
    },
  };

  const formVariants = {
    hidden: { opacity: 0, x: 40 },
    visible: {
      opacity: 1,
      x: 0,
      transition: { duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94], delay: 0.1 },
    },
  };

  const validateField = useCallback(
    (name, value) => {
      const errors = { ...fieldErrors };

      switch (name) {
        case "nombres":
          if (!value.trim()) errors.nombres = "Los nombres son obligatorios";
          else if (value.trim().length < 2)
            errors.nombres = "Mínimo 2 caracteres";
          else delete errors.nombres;
          break;
        case "apellidos":
          if (!value.trim())
            errors.apellidos = "Los apellidos son obligatorios";
          else if (value.trim().length < 2)
            errors.apellidos = "Mínimo 2 caracteres";
          else delete errors.apellidos;
          break;
        case "correo":
          if (!value.trim()) errors.correo = "El correo es obligatorio";
          else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value))
            errors.correo = "Correo inválido";
          else delete errors.correo;
          break;
        case "clave":
          if (!value) errors.clave = "La contraseña es obligatoria";
          else if (value.length < 8) errors.clave = "Mínimo 8 caracteres";
          else delete errors.clave;
          let strength = 0;
          if (value.length >= 8) strength++;
          if (/[A-Z]/.test(value)) strength++;
          if (/[a-z]/.test(value)) strength++;
          if (/[0-9]/.test(value)) strength++;
          if (/[^A-Za-z0-9]/.test(value)) strength++;
          setPasswordStrength(strength);
          break;
        case "confirmarClave":
          if (!value) errors.confirmarClave = "Confirma tu contraseña";
          else if (value !== formData.clave)
            errors.confirmarClave = "Las contraseñas no coinciden";
          else delete errors.confirmarClave;
          break;
        case "documento":
          if (!value.trim()) errors.documento = "El documento es obligatorio";
          else if (value.trim().length < 6)
            errors.documento = "Documento inválido";
          else delete errors.documento;
          break;
        case "telefono":
          if (!value.trim()) errors.telefono = "El teléfono es obligatorio";
          else if (!/^[+]?[\d\s\-()]{7,}$/.test(value))
            errors.telefono = "Teléfono inválido";
          else delete errors.telefono;
          break;
        case "habeas":
          if (!value) errors.habeas = "Debes aceptar la política de datos";
          else delete errors.habeas;
          break;
        default:
          break;
      }

      setFieldErrors(errors);
      return Object.keys(errors).length === 0;
    },
    [fieldErrors, formData.clave],
  );
  const handleChange = useCallback(
    (e) => {
      const { name, value, type, checked } = e.target;
      const newValue = type === "checkbox" ? checked : value;
      setFormData((prev) => ({ ...prev, [name]: newValue }));

      if (name !== "habeas") {
        validateField(name, newValue);
      }
    },
    [validateField],
  );

  const handleBlur = useCallback(
    (e) => {
      const { name, value } = e.target;
      validateField(name, value);
    },
    [validateField],
  );

  const validateForm = useCallback(() => {
    let isValid = true;
    const fields = [
      "nombres",
      "apellidos",
      "correo",
      "clave",
      "confirmarClave",
      "documento",
      "telefono",
      "habeas",
    ];

    fields.forEach((field) => {
      const value = formData[field];
      if (!validateField(field, value)) {
        isValid = false;
      }
    });

    return isValid;
  }, [formData, validateField]);

  const getStrengthLabel = () => {
    if (passwordStrength <= 1)
      return { label: "Muy débil", color: "text-red-600", bg: "bg-red-500" };
    if (passwordStrength === 2)
      return { label: "Débil", color: "text-orange-600", bg: "bg-orange-500" };
    if (passwordStrength === 3)
      return { label: "Media", color: "text-yellow-600", bg: "bg-yellow-500" };
    if (passwordStrength === 4)
      return { label: "Fuerte", color: "text-green-600", bg: "bg-green-500" };
    return {
      label: "Muy fuerte",
      color: "text-emerald-600",
      bg: "bg-emerald-500",
    };
  };

  const handleSubmit = useCallback(
    async (e) => {
      e.preventDefault();

      if (!validateForm()) {
        setError("Por favor, corrige los errores en el formulario");
        return;
      }

      setIsLoading(true);
      setError(null);
      setSuccess(null);

      try {
        const response = await authApi.registro({
          nombres: formData.nombres.trim(),
          apellidos: formData.apellidos.trim(),
          correo: formData.correo.trim().toLowerCase(),
          clave: formData.clave,
          documento: formData.documento.trim(),
          telefono: formData.telefono.trim(),
          habeas: formData.habeas,
        });

        setSuccess(
          response.mensaje ||
            "Cuenta creada correctamente. Redirigiendo al login...",
        );

        setTimeout(() => {
          navigate("/login", { replace: true });
        }, 2000);
      } catch (err) {
        console.error("Error en registro:", err);
        if (err.response?.data?.mensaje) {
          setError(err.response.data.mensaje);
        } else if (err.response?.status === 409) {
          setError("Ya existe una cuenta con ese correo o documento");
        } else {
          setError("No fue posible crear la cuenta. Intenta de nuevo.");
        }
      } finally {
        setIsLoading(false);
      }
    },
    [formData, validateForm, navigate],
  );

  const strengthInfo = getStrengthLabel();

  return (
    <div className="min-h-screen bg-gradient-to-br from-teal-50 via-white to-teal-50 flex" role="main">
      {/* Panel izquierdo - Informativo */}
      <motion.div
        className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12 relative overflow-hidden"
        {...(prefersReducedMotion ? {} : { variants: panelVariants, initial: "hidden", animate: "visible" })}
      >
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-teal-100/50 rounded-full blur-3xl animate-pulse" />
          <div className="absolute bottom-1/4 right-1/4 w-72 h-72 bg-teal-200/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: "1s"}} />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-64 h-64 bg-teal-100/30 rounded-full blur-3xl animate-pulse" style={{animationDelay: "2s"}} />
        </div>
      
        <div className="relative z-10 max-w-lg w-full text-center">
          <motion.div {...(prefersReducedMotion ? {} : { variants: itemVariants })} className="mb-10">
            <Link to="/" className="inline-flex items-center gap-4" aria-label="Clinica - Inicio">
              <motion.div whileHover={{scale: 1.1, rotate: 5}} whileTap={{scale: 0.95}} className="p-4 rounded-2xl bg-gradient-to-br from-teal-500 to-teal-700 shadow-lg shadow-teal-500/25">
                <HeartPulse className="h-10 w-10 text-white" aria-hidden="true" />
              </motion.div>
              <span className="font-serif font-bold text-4xl tracking-tight text-gray-900 self-center">Clini<span className="text-teal-600">Cita</span></span>
            </Link>
          </motion.div>
        
          <motion.div {...(prefersReducedMotion ? {} : { variants: itemVariants })} className="mb-8">
            <h1 className="text-4xl lg:text-5xl font-bold text-gray-900 leading-tight mb-6">Únete a la <span className="text-teal-600">comunidad médica</span> que transforma la atención</h1>
            <p className="text-lg lg:text-xl text-gray-600 mb-8 max-w-xl mx-auto leading-relaxed">Sistema integral de citas, pacientes, historial médico y predicción de no-show con ML. Diseñado para equipos médicos que valoran la eficiencia y la experiencia del paciente.</p>
          </motion.div>
          
          <motion.div {...(prefersReducedMotion ? {} : { variants: itemVariants })} className="grid grid-cols-3 gap-6 mb-10">
            <div className="p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-teal-100 hover:border-teal-200 hover:shadow-lg transition-all duration-300">
              <div className="p-3 rounded-xl bg-teal-100 text-teal-600 mb-3 inline-flex"><Calendar className="h-6 w-6" aria-hidden="true" /></div>
              <h3 className="font-semibold text-gray-900 mb-1">Agenda Inteligente</h3>
              <p className="text-sm text-gray-500">Gestión de citas optimizada</p>
            </div>
            <div className="p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-teal-100 hover:border-teal-200 hover:shadow-lg transition-all duration-300">
              <div className="p-3 rounded-xl bg-teal-100 text-teal-600 mb-3 inline-flex"><Users className="h-6 w-6" aria-hidden="true" /></div>
              <h3 className="font-semibold text-gray-900 mb-1">Pacientes 360°</h3>
              <p className="text-sm text-gray-500">Historial completo unificado</p>
            </div>
            <div className="p-4 bg-white/80 backdrop-blur-sm rounded-2xl border border-teal-100 hover:border-teal-200 hover:shadow-lg transition-all duration-300">
              <div className="p-3 rounded-xl bg-teal-100 text-teal-600 mb-3 inline-flex"><Sparkles className="h-6 w-6" aria-hidden="true" /></div>
              <h3 className="font-semibold text-gray-900 mb-1">ML No-Show</h3>
              <p className="text-sm text-gray-500">Predicción de ausencias</p>
            </div>
          </motion.div>

          <motion.div {...(prefersReducedMotion ? {} : { variants: itemVariants })} className="flex flex-col sm:flex-row justify-center gap-8 text-center pt-8 border-t border-teal-100">
            <div><p className="text-3xl font-bold text-teal-600 mb-1">500+</p><p className="text-sm text-gray-500">Profesionales activos</p></div>
            <div><p className="text-3xl font-bold text-teal-600 mb-1">50K+</p><p className="text-sm text-gray-500">Citas gestionadas</p></div>
            <div><p className="text-3xl font-bold text-teal-600 mb-1">99.9%</p><p className="text-sm text-gray-500">Uptime garantizado</p></div>
          </motion.div>
        </div>

        <div className="absolute bottom-8 left-8 right-8 flex justify-center gap-4 pointer-events-none" aria-hidden="true">
          <motion.div animate={{y: [0, -10, 0]}} transition={{duration: 3, repeat: Infinity, ease: "easeInOut"}} className="p-3 rounded-xl bg-white/60 backdrop-blur-sm border border-teal-100 shadow-lg"><Shield className="h-5 w-5 text-teal-600" /></motion.div>
          <motion.div animate={{y: [0, -15, 0]}} transition={{duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5}} className="p-3 rounded-xl bg-white/60 backdrop-blur-sm border border-teal-100 shadow-lg"><Stethoscope className="h-5 w-5 text-teal-600" /></motion.div>
          <motion.div animate={{y: [0, -8, 0]}} transition={{duration: 3.5, repeat: Infinity, ease: "easeInOut", delay: 1}} className="p-3 rounded-xl bg-white/60 backdrop-blur-sm border border-teal-100 shadow-lg"><CheckCircle className="h-5 w-5 text-teal-600" /></motion.div>
        </div>
      </motion.div>

      {/* Panel derecho - Formulario */}
      <motion.div
        className="flex w-full lg:w-1/2 flex-col items-center justify-center p-8 lg:p-12"
        {...(prefersReducedMotion ? {} : { variants: formVariants, initial: "hidden", animate: "visible" })}
      >
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-teal-600">Crear Cuenta</h2>
          <p className="text-gray-500 mt-2">
            Regístrate como paciente en CliniCita
          </p>
        </div>

        {error && (
          <motion.div
            initial={{opacity: 0, y: -10, scale: 0.98}}
            animate={{opacity: 1, y: 0, scale: 1}}
            className="mb-6 p-4 rounded-xl flex items-center gap-3 bg-red-50 border border-red-200 text-red-800 w-full max-w-md"
            role="alert"
          >
            <AlertCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span className="text-sm">{error}</span>
          </motion.div>
        )}

        {success && (
          <motion.div
            initial={{opacity: 0, y: -10, scale: 0.98}}
            animate={{opacity: 1, y: 0, scale: 1}}
            className="mb-6 p-4 rounded-xl flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 w-full max-w-md"
            role="alert"
          >
            <CheckCircle className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
            <span className="text-sm">{success}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} noValidate className="space-y-5 w-full max-w-md">
          <motion.div
            {...(prefersReducedMotion ? {} : { variants: itemVariants, transition: { duration: 0.3 } })}
            className="w-full"
          >
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-teal-500" aria-hidden="true" />
              Información Personal
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Campo Nombres */}
              <motion.div
                {...(prefersReducedMotion ? {} : { variants: itemVariants })}
                className="relative"
              >
                <label
                  htmlFor="nombres"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Nombres
                </label>
                <div className="relative">
                  <User
                    className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200 ${focusedField === "nombres" ? "text-teal-500" : "text-gray-400"}`}
                    aria-hidden="true" />
                  <input
                    type="text"
                    id="nombres"
                    name="nombres"
                    required
                    autoComplete="given-name"
                    value={formData.nombres}
                    onChange={handleChange}
                    onFocus={() => setFocusedField("nombres")}
                    onBlur={() => setFocusedField(null)}
                    disabled={isLoading}
                    className={`w-full pl-10 pr-4 py-3.5 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 ${fieldErrors.nombres ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                    placeholder="Juan"
                    aria-describedby="nombres-error"
                    aria-invalid={!!fieldErrors.nombres}
                  />
                </div>
                <AnimatePresence>
                  {fieldErrors.nombres && (
                    <motion.p
                      key="nombres-error"
                      id="nombres-error"
                      initial={{opacity: 0, y: -5}}
                      animate={{opacity: 1, y: 0}}
                      exit={{opacity: 0, y: -5}}
                      className="mt-2 text-sm text-red-600 flex items-center gap-1"
                      role="alert"
                    >
                      <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      {fieldErrors.nombres}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Campo Apellidos */}
              <motion.div
                {...(prefersReducedMotion ? {} : { variants: itemVariants })}
                className="relative"
              >
                <label
                  htmlFor="apellidos"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Apellidos
                </label>
                <div className="relative">
                  <User
                    className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200 ${focusedField === "apellidos" ? "text-teal-500" : "text-gray-400"}`}
                    aria-hidden="true" />
                  <input
                    type="text"
                    id="apellidos"
                    name="apellidos"
                    required
                    autoComplete="family-name"
                    value={formData.apellidos}
                    onChange={handleChange}
                    onFocus={() => setFocusedField("apellidos")}
                    onBlur={() => setFocusedField(null)}
                    disabled={isLoading}
                    className={`w-full pl-10 pr-4 py-3.5 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 ${fieldErrors.apellidos ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                    placeholder="Pérez Gómez"
                    aria-describedby="apellidos-error"
                    aria-invalid={!!fieldErrors.apellidos}
                  />
                </div>
                <AnimatePresence>
                  {fieldErrors.apellidos && (
                    <motion.p
                      key="apellidos-error"
                      id="apellidos-error"
                      initial={{opacity: 0, y: -5}}
                      animate={{opacity: 1, y: 0}}
                      exit={{opacity: 0, y: -5}}
                      className="mt-2 text-sm text-red-600 flex items-center gap-1"
                      role="alert"
                    >
                      <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      {fieldErrors.apellidos}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </motion.div>

          {/* Campo Correo */}
          <motion.div
            {...(prefersReducedMotion ? {} : { variants: itemVariants, transition: { duration: 0.3 } })}
            className="relative"
          >
            <label
              htmlFor="correo"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Correo electrónico
            </label>
            <div className="relative">
              <Mail
                className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200 ${focusedField === "correo" ? "text-teal-500" : "text-gray-400"}`}
                aria-hidden="true" />
              <input
                type="email"
                id="correo"
                name="correo"
                required
                autoComplete="email"
                value={formData.correo}
                onChange={handleChange}
                onFocus={() => setFocusedField("correo")}
                onBlur={() => setFocusedField(null)}
                disabled={isLoading}
                className={`w-full pl-10 pr-4 py-3.5 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 ${fieldErrors.correo ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                placeholder="juan@ejemplo.com"
                aria-describedby="correo-error"
                aria-invalid={!!fieldErrors.correo}
              />
            </div>
            <AnimatePresence>
              {fieldErrors.correo && (
                <motion.p
                  key="correo-error"
                  id="correo-error"
                  initial={{opacity: 0, y: -5}}
                  animate={{opacity: 1, y: 0}}
                  exit={{opacity: 0, y: -5}}
                  className="mt-2 text-sm text-red-600 flex items-center gap-1"
                  role="alert"
                >
                  <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                  {fieldErrors.correo}
                </motion.p>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Sección 2: Credenciales de Acceso */}
          <motion.div
            {...(prefersReducedMotion ? {} : { variants: itemVariants, transition: { duration: 0.3 } })}
            className="w-full"
          >
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Lock className="h-5 w-5 text-teal-500" aria-hidden="true" />
              Credenciales de Acceso
            </h3>
            <div className="space-y-5">
              {/* Campo Contraseña */}
              <motion.div
                {...(prefersReducedMotion ? {} : { variants: itemVariants })}
                className="relative"
              >
                <label
                  htmlFor="clave"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
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
                    autoComplete="new-password"
                    value={formData.clave}
                    onChange={handleChange}
                    onFocus={() => setFocusedField("clave")}
                    onBlur={() => setFocusedField(null)}
                    disabled={isLoading}
                    className={`w-full pl-10 pr-12 py-3.5 rounded-xl border appearance-none cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 ${fieldErrors.clave ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                    placeholder="••••••••"
                    aria-describedby="clave-error"
                    aria-invalid={!!fieldErrors.clave}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    disabled={isLoading}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
                <AnimatePresence>
                  {fieldErrors.clave && (
                    <motion.p
                      key="clave-error"
                      id="clave-error"
                      initial={{opacity: 0, y: -5}}
                      animate={{opacity: 1, y: 0}}
                      exit={{opacity: 0, y: -5}}
                      className="mt-2 text-sm text-red-600 flex items-center gap-1"
                      role="alert"
                    >
                      <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      {fieldErrors.clave}
                    </motion.p>
                  )}
                </AnimatePresence>

                {/* Indicador de fortaleza de contraseña */}
                {formData.clave && (
                  <motion.div
                    initial={{opacity: 0, height: 0}}
                    animate={{opacity: 1, height: "auto"}}
                    exit={{opacity: 0, height: 0}}
                    className="mt-3"
                  >
                    <div className="flex gap-1 h-2" role="progressbar" aria-valuenow={passwordStrength} aria-valuemin={0} aria-valuemax={5} aria-label="Fortaleza de contraseña">
                      {[1, 2, 3, 4, 5].map((level) => (
                        <motion.div
                          key={level}
                          className="flex-1 rounded transition-all duration-300"
                          style={{
                            backgroundColor:
                              level <= passwordStrength
                                ? strengthInfo.bg
                                : "#e5e7eb",
                          }}
                          animate={{scaleX: level <= passwordStrength ? 1 : 0}}
                          transition={{duration: 0.3, delay: level * 0.05}}
                        />
                      ))}
                    </div>
                    <p className={`mt-1 text-xs ${strengthInfo.color} font-medium`}>
                      Fortaleza: {strengthInfo.label}
                    </p>
                  </motion.div>
                )}
              </motion.div>

              {/* Campo Confirmar Contraseña */}
              <motion.div
                {...(prefersReducedMotion ? {} : { variants: itemVariants })}
                className="relative"
              >
                <label
                  htmlFor="confirmarClave"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Confirmar contraseña
                </label>
                <div className="relative">
                  <Lock
                    className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200 ${focusedField === "confirmarClave" ? "text-teal-500" : "text-gray-400"}`}
                    aria-hidden="true" />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    id="confirmarClave"
                    name="confirmarClave"
                    required
                    autoComplete="new-password"
                    value={formData.confirmarClave}
                    onChange={handleChange}
                    onFocus={() => setFocusedField("confirmarClave")}
                    onBlur={() => setFocusedField(null)}
                    disabled={isLoading}
                    className={`w-full pl-10 pr-12 py-3.5 rounded-xl border appearance-none cursor-pointer transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 ${fieldErrors.confirmarClave ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                    placeholder="••••••••"
                    aria-describedby="confirmarClave-error"
                    aria-invalid={!!fieldErrors.confirmarClave}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                    aria-label={showConfirmPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    disabled={isLoading}
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="h-5 w-5" aria-hidden="true" />
                    ) : (
                      <Eye className="h-5 w-5" aria-hidden="true" />
                    )}
                  </button>
                </div>
                <AnimatePresence>
                  {fieldErrors.confirmarClave && (
                    <motion.p
                      key="confirmarClave-error"
                      id="confirmarClave-error"
                      initial={{opacity: 0, y: -5}}
                      animate={{opacity: 1, y: 0}}
                      exit={{opacity: 0, y: -5}}
                      className="mt-2 text-sm text-red-600 flex items-center gap-1"
                      role="alert"
                    >
                      <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      {fieldErrors.confirmarClave}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </motion.div>

          {/* Sección 3: Documentos y Contacto */}
          <motion.div
            {...(prefersReducedMotion ? {} : { variants: itemVariants, transition: { duration: 0.3 } })}
            className="w-full"
          >
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <IdCard className="h-5 w-5 text-teal-500" aria-hidden="true" />
              Documentos y Contacto
            </h3>
            <div className="grid grid-cols-2 gap-4">
              {/* Campo Documento */}
              <motion.div
                {...(prefersReducedMotion ? {} : { variants: itemVariants })}
                className="relative"
              >
                <label
                  htmlFor="documento"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Documento de identidad
                </label>
                <div className="relative">
                  <IdCard
                    className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200 ${focusedField === "documento" ? "text-teal-500" : "text-gray-400"}`}
                    aria-hidden="true" />
                  <input
                    type="text"
                    id="documento"
                    name="documento"
                    required
                    value={formData.documento}
                    onChange={handleChange}
                    onFocus={() => setFocusedField("documento")}
                    onBlur={() => setFocusedField(null)}
                    disabled={isLoading}
                    className={`w-full pl-10 pr-4 py-3.5 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 ${fieldErrors.documento ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                    placeholder="12345678"
                    aria-describedby="documento-error"
                    aria-invalid={!!fieldErrors.documento}
                  />
                </div>
                <AnimatePresence>
                  {fieldErrors.documento && (
                    <motion.p
                      key="documento-error"
                      id="documento-error"
                      initial={{opacity: 0, y: -5}}
                      animate={{opacity: 1, y: 0}}
                      exit={{opacity: 0, y: -5}}
                      className="mt-2 text-sm text-red-600 flex items-center gap-1"
                      role="alert"
                    >
                      <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      {fieldErrors.documento}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>

              {/* Campo Teléfono */}
              <motion.div
                {...(prefersReducedMotion ? {} : { variants: itemVariants })}
                className="relative"
              >
                <label
                  htmlFor="telefono"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Teléfono/WhatsApp
                </label>
                <div className="relative">
                  <Phone
                    className={`absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 transition-colors duration-200 ${focusedField === "telefono" ? "text-teal-500" : "text-gray-400"}`}
                    aria-hidden="true" />
                  <input
                    type="tel"
                    id="telefono"
                    name="telefono"
                    required
                    value={formData.telefono}
                    onChange={handleChange}
                    onFocus={() => setFocusedField("telefono")}
                    onBlur={() => setFocusedField(null)}
                    disabled={isLoading}
                    className={`w-full pl-10 pr-4 py-3.5 rounded-xl border transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 ${fieldErrors.telefono ? "border-red-300 bg-red-50" : "border-gray-200 bg-gray-50"}`}
                    placeholder="3001234567"
                    aria-describedby="telefono-error"
                    aria-invalid={!!fieldErrors.telefono}
                  />
                </div>
                <AnimatePresence>
                  {fieldErrors.telefono && (
                    <motion.p
                      key="telefono-error"
                      id="telefono-error"
                      initial={{opacity: 0, y: -5}}
                      animate={{opacity: 1, y: 0}}
                      exit={{opacity: 0, y: -5}}
                      className="mt-2 text-sm text-red-600 flex items-center gap-1"
                      role="alert"
                    >
                      <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                      {fieldErrors.telefono}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </motion.div>

          {/* Sección 4: Autorizaciones */}
          <motion.div
            {...(prefersReducedMotion ? {} : { variants: itemVariants, transition: { duration: 0.3 } })}
            className="w-full"
          >
            <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Shield className="h-5 w-5 text-teal-500" aria-hidden="true" />
              Autorizaciones Legales
            </h3>
            <motion.div
              {...(prefersReducedMotion ? {} : { variants: itemVariants })}
              className="relative"
            >
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  name="habeas"
                  checked={formData.habeas}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className="mt-1 h-5 w-5 rounded border-gray-300 focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 accent-teal-600 transition-colors"
                  required
                  disabled={isLoading}
                  aria-describedby="habeas-error"
                  aria-invalid={!!fieldErrors.habeas}
                />
                <div className="text-sm text-gray-600 leading-relaxed">
                  Acepto la{" "}
                  <Link
                    to="/privacidad"
                    className="text-teal-600 hover:text-teal-700 font-medium transition-colors underline"
                  >
                    Política de Privacidad
                  </Link>{" "}
                  y autorizo el tratamiento de mis datos personales según la{" "}
                  <Link
                    to="/terminos"
                    className="text-teal-600 hover:text-teal-700 font-medium transition-colors underline"
                  >
                    Ley 1581 de 2012
                  </Link>{" "}
                  <span className="text-red-500" aria-hidden="true">*</span>
                </div>
              </label>
              <AnimatePresence>
                {fieldErrors.habeas && (
                  <motion.p
                    key="habeas-error"
                    id="habeas-error"
                    initial={{opacity: 0, y: -5}}
                    animate={{opacity: 1, y: 0}}
                    exit={{opacity: 0, y: -5}}
                    className="mt-2 text-sm text-red-600 flex items-center gap-1"
                    role="alert"
                  >
                    <AlertCircle className="h-4 w-4 flex-shrink-0" aria-hidden="true" />
                    {fieldErrors.habeas}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
          </motion.div>

          {/* Botón de envío mejorado */}
          <motion.button
            type="submit"
            disabled={isLoading}
            {...(prefersReducedMotion
              ? {}
              : {
                  whileHover: { scale: 1.01 },
                  whileTap: { scale: 0.98 },
                })}
            className="relative w-full py-4 bg-gradient-to-r from-teal-600 to-teal-700 text-white font-semibold rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 overflow-hidden"
            aria-busy={isLoading}
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" aria-hidden="true" />
                <span>Creando cuenta...</span>
                <motion.div
                  className="absolute inset-0 bg-white/20"
                  initial={{ width: 0 }}
                  animate={{ width: "100%" }}
                  transition={{ duration: 3, ease: "linear" }}
                  aria-hidden="true"
                />
              </>
            ) : (
              "Crear cuenta"
            )}
          </motion.button>
        </form>

        {/* Footer con enlaces animados */}
        <motion.div
          {...(prefersReducedMotion
            ? {}
            : {
                initial: { opacity: 0, y: 10 },
                animate: { opacity: 1, y: 0 },
                transition: { duration: 0.5, delay: 0.4 },
              })}
          className="mt-8 text-center"
        >
          <p className="text-sm text-gray-500">
            ¿Ya tienes cuenta?{" "}
            <motion.a
              {...(prefersReducedMotion
                ? {}
                : { whileHover: { x: 3 }, whileTap: { scale: 0.98 } })}
              to="/login"
              className="text-teal-600 hover:text-teal-800 font-medium transition-colors inline-block"
            >
              Inicia sesión
            </motion.a>
          </p>
          <motion.p
            {...(prefersReducedMotion
              ? {}
              : {
                  initial: { opacity: 0 },
                  animate: { opacity: 1 },
                  transition: { duration: 0.5, delay: 0.6 },
                })}
            className="mt-4 text-xs text-gray-400"
          >
            © 2024 Clinicita. Todos los derechos reservados.
          </motion.p>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default RegisterPage;
