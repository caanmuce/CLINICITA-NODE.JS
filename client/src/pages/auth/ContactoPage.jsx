// src/pages/LandingPage.jsx - Página pública de Clinicita (tema teal #0D9488 + animaciones Framer Motion)

import React, { useState, useEffect } from "react";

import { Link } from "react-router-dom";

import { motion, AnimatePresence } from "framer-motion";

import {
  HeartPulse,
  Shield,
  Calendar,
  Users,
  MapPin,
  Clock,
  ChevronRight,
  Menu,
  X,
  Phone,
  Mail,
  ArrowRight,
  CheckCircle,
  Stethoscope,
  Building2,
  UserCheck,
  BarChart2,
  Zap,
  Globe,
  Lock,
  MousePointer,
  LayoutDashboard,
  ShieldCheck,
  Sparkles,
  Target,
  Award,
  Users2,
  Activity,
  TrendingUp,
  Cpu,
  Cloud,
  RefreshCw,
  Star,
  Search,
  Bell,
  User,
  ExternalLink,
  MessageSquare,
  Send,
} from "lucide-react";

const COLORS = {
  teal: "#0D9488",

  tealDark: "#0A7A70",

  tealSoft: "#E0F7F5",

  tealBg: "#F4FFFE",

  dark: "#0F2027",

  mid: "#1B4F72",

  accent: "#F59E0B",
};

const scrollToSection = (id) => {
  const element = document.getElementById(id);

  if (element) {
    const navHeight = 80;

    const elementPosition =
      element.getBoundingClientRect().top + window.pageYOffset;

    window.scrollTo({
      top: elementPosition - navHeight,

      behavior: "smooth",
    });
  }
};

export const LandingPage = () => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setIsScrolled(window.scrollY > 20);

    window.addEventListener("scroll", handleScroll, { passive: true });

    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { href: "#inicio", label: "Inicio" },

    { href: "#el-proyecto", label: "El Proyecto" },

    { href: "#funcionalidades", label: "Funcionalidades" },

    { href: "#usuarios", label: "Usuarios" },

    { href: "#sedes", label: "Sedes" },

    { href: "#contacto", label: "Contacto" },
  ];

  const HandleNavClick =
    (href, external = false) =>
    (e) => {
      if (external || href.startsWith("/")) return;

      e.preventDefault();

      scrollToSection(href.replace("#", ""));

      setIsMobileMenuOpen(false);
    };

  return (
    <div
      className="min-h-screen flex flex-col font-sans antialiased"
      style={{ color: "#0F2027" }}
    >
      {/* Navbar */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}

        animate={{ y: 0, opacity: 1 }}

        transition={{ duration: 0.6, ease: "easeOut" }}

        className={
          "sticky top-0 z-50 transition-all duration-300 " +
          (isScrolled
            ? "bg-white/95 backdrop-blur-md border-b border-teal-200/60 shadow-lg"
            : "bg-transparent border-b border-transparent")
        }

        style={{
          backgroundColor: isScrolled
            ? "rgba(255, 255, 255, 0.95)"
            : "transparent",
        }}

        role="navigation"

        aria-label="Navegación principal"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-20">
            <Link
              to="/"

              className="flex items-center gap-2 shrink-0"

              aria-label="Clinicita - Inicio"

              onClick={(e) => {
                e.preventDefault();
                scrollToSection("inicio");
              }}
            >
              <motion.div
                whileHover={{ scale: 1.1, rotate: 5 }}

                whileTap={{ scale: 0.95 }}

                className="p-2 rounded-xl"

                style={{ backgroundColor: COLORS.teal }}
              >
                <HeartPulse className="h-6 w-6 text-white" aria-hidden="true" />
              </motion.div>

              <span className="font-serif font-bold text-xl tracking-tight text-[#0F2027]">
                Clini<span style={{ color: COLORS.teal }}>Cita</span>
              </span>
            </Link>{" "}
            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-1">
              {navLinks.map((link, i) =>
                link.external ? (
                  <motion.a
                    key={link.href}

                    href={link.href}

                    onClick={HandleNavClick(link.href, true)}

                    initial={{ opacity: 0, y: -20 }}

                    animate={{ opacity: 1, y: 0 }}

                    transition={{ delay: 0.1 + i * 0.05 }}

                    className="px-4 py-2.5 text-sm font-medium text-[#0F2027]/80 hover:text-teal-700 transition-colors rounded-lg hover:bg-teal-50 relative overflow-hidden"
                  >
                    <span className="relative z-10">{link.label}</span>

                    <motion.div
                      layoutId="nav-underline"

                      className="absolute bottom-0 left-0 h-0.5 rounded-full"

                      style={{ backgroundColor: COLORS.teal, width: "100%" }}

                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  </motion.a>
                ) : (
                  <motion.a
                    key={link.href}

                    href={link.href}

                    onClick={HandleNavClick(link.href, false)}

                    initial={{ opacity: 0, y: -20 }}

                    animate={{ opacity: 1, y: 0 }}

                    transition={{ delay: 0.1 + i * 0.05 }}

                    className="px-4 py-2.5 text-sm font-medium text-[#0F2027]/80 hover:text-teal-700 transition-colors rounded-lg hover:bg-teal-50 relative overflow-hidden"
                  >
                    <span className="relative z-10">{link.label}</span>

                    <motion.div
                      layoutId="nav-underline"

                      className="absolute bottom-0 left-0 h-0.5 rounded-full"

                      style={{ backgroundColor: COLORS.teal, width: "100%" }}

                      transition={{
                        type: "spring",
                        stiffness: 500,
                        damping: 30,
                      }}
                    />
                  </motion.a>
                ),
              )}
            </div>{" "}
            {/* Desktop Actions */}
            <div className="hidden md:flex items-center gap-3">
              <Link
                to="/login"

                onClick={() => setIsMobileMenuOpen(false)}

                className="px-4 py-2.5 text-sm font-medium text-teal-700 border border-teal-300 rounded-lg hover:bg-teal-50 transition-all active:scale-[0.98] flex items-center gap-2"

                whileHover={{ scale: 1.02 }}

                whileTap={{ scale: 0.98 }}
              >
                <User className="h-4 w-4" aria-hidden="true" />
                Iniciar Sesión
              </Link>

              <motion.a
                as={Link}

                to="/registro"

                onClick={() => setIsMobileMenuOpen(false)}

                whileHover={{
                  scale: 1.02,
                  boxShadow: "0 10px 30px -10px rgba(13, 148, 136, 0.5)",
                }}

                whileTap={{ scale: 0.98 }}

                className="px-5 py-2.5 text-sm font-semibold text-white rounded-lg transition-all shadow-lg shadow-teal-500/30 flex items-center gap-2"

                style={{ backgroundColor: COLORS.teal }}
              >
                Registrarse Gratis
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </motion.a>
            </div>
            {/* Mobile Menu Button */}
            <motion.button
              className="md:hidden p-2 rounded-lg text-[#0F2027]/80 hover:text-teal-700 hover:bg-teal-50 transition-colors"

              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}

              aria-expanded={isMobileMenuOpen}

              aria-controls="mobile-menu"

              aria-label={isMobileMenuOpen ? "Cerrar menú" : "Abrir menú"}

              whileHover={{ scale: 1.1 }}

              whileTap={{ scale: 0.95 }}
            >
              {isMobileMenuOpen ? (
                <X className="h-6 w-6" />
              ) : (
                <Menu className="h-6 w-6" />
              )}
            </motion.button>
          </div>{" "}
          {/* Mobile Menu */}
          <AnimatePresence>
            {isMobileMenuOpen && (
              <motion.div
                id="mobile-menu"

                initial={{ opacity: 0, height: 0 }}

                animate={{ opacity: 1, height: "auto" }}

                exit={{ opacity: 0, height: 0 }}

                transition={{ duration: 0.2, ease: "easeInOut" }}

                className="md:hidden overflow-hidden bg-white border-t border-teal-100 py-4"
              >
                <div className="flex flex-col gap-2 px-2">
                  {navLinks.map((link, i) => (
                    <motion.a
                      key={link.href}

                      href={link.href}

                      onClick={HandleNavClick(link.href, false)}

                      initial={{ opacity: 0, x: -20 }}

                      animate={{ opacity: 1, x: 0 }}

                      transition={{ delay: 0.05 + i * 0.05 }}

                      className="px-4 py-3 text-base font-medium text-[#0F2027]/80 hover:text-teal-700 hover:bg-teal-50 rounded-lg transition-colors"
                    >
                      {link.label}
                    </motion.a>
                  ))}

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}

                    animate={{ opacity: 1, y: 0 }}

                    transition={{ delay: 0.2 }}

                    className="pt-2 border-t border-teal-100 flex flex-col gap-2"
                  >
                    <Link
                      to="/login"

                      onClick={() => setIsMobileMenuOpen(false)}

                      className="px-4 py-3 text-base font-medium text-teal-700 border border-teal-300 rounded-lg text-center hover:bg-teal-50 transition-colors flex items-center justify-center gap-2"
                    >
                      <User className="h-4 w-4" aria-hidden="true" />
                      Iniciar Sesión
                    </Link>

                    <motion.a
                      as={Link}

                      to="/registro"

                      onClick={() => setIsMobileMenuOpen(false)}

                      whileHover={{ scale: 1.01 }}

                      whileTap={{ scale: 0.99 }}

                      className="px-4 py-3 text-base font-semibold text-white rounded-lg text-center transition-colors shadow-lg shadow-teal-500/30 flex items-center justify-center gap-2"

                      style={{ backgroundColor: COLORS.teal }}
                    >
                      Registrarse Gratis
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </motion.a>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.nav>{" "}
      {/* Hero Section */}
      <section
        id="inicio"

        className="relative min-h-[calc(100vh-80px)] flex items-center justify-center overflow-hidden pt-20"

        style={{
          background:
            "linear-gradient(135deg, " +
            COLORS.dark +
            " 0%, " +
            COLORS.mid +
            " 100%)",
        }}

        aria-labelledby="hero-title"
      >
        <div className="absolute inset-0 overflow-hidden" aria-hidden="true">
          <div
            className="absolute -top-40 -right-40 w-80 h-80 rounded-full opacity-10 blur-3xl"
            style={{ backgroundColor: COLORS.teal }}
          />

          <div
            className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-10 blur-3xl"
            style={{ backgroundColor: COLORS.accent }}
          />

          <div
            className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full opacity-5 blur-3xl"
            style={{ backgroundColor: COLORS.teal }}
          />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            <div className="text-center lg:text-left">
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full mb-6"
                style={{
                  backgroundColor: "rgba(13, 148, 136, 0.15)",
                  border: "1px solid rgba(13, 148, 136, 0.3)",
                }}
              >
                <span
                  className="text-xs font-semibold uppercase tracking-wider"
                  style={{ color: COLORS.teal }}
                >
                  Nuevo
                </span>

                <span className="text-sm font-medium text-white/90">
                  Clinicita v2.0 — Ahora con IA
                </span>
              </motion.div>
              <motion.h1
                id="hero-title"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.1, ease: "easeOut" }}
                className="font-serif font-bold tracking-tight mb-6"
                style={{
                  fontSize: "clamp(2.5rem, 6vw, 4.5rem)",
                  lineHeight: 1.1,
                  color: "#FFFFFF",
                }}
              >
                Gestión de Citas Médicas
                <br />
                <span style={{ color: COLORS.teal }}>
                  Inteligente, Segura y Rápida
                </span>
              </motion.h1>{" "}
              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
                className="mb-8 max-w-xl text-lg leading-relaxed"
                style={{ color: "rgba(255, 255, 255, 0.85)" }}
              >
                La plataforma completa para clínicas e IPS: agenda en tiempo
                real, multi-rol, cumplimiento Ley 1581/2012, analytics y más.
                Diseñada para equipos de salud modernos.
              </motion.p>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.3, ease: "easeOut" }}
                className="flex flex-col sm:flex-row items-center sm:items-center justify-center lg:justify-start gap-4 mb-12"
              >
                <Link
                  to="/registro"
                  className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white rounded-xl transition-all active:scale-[0.98] shadow-xl shadow-teal-500/40 flex items-center justify-center gap-2"
                  style={{ backgroundColor: COLORS.teal }}
                >
                  <HeartPulse className="h-5 w-5" aria-hidden="true" /> Comenzar
                  Gratis <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>

                <Link
                  to="#funcionalidades"
                  className="w-full sm:w-auto px-8 py-4 text-base font-semibold text-white/90 border border-white/20 rounded-xl hover:bg-white/10 transition-all active:scale-[0.98] flex items-center justify-center gap-2"
                >
                  Ver Funcionalidades{" "}
                  <ArrowRight className="h-5 w-5" aria-hidden="true" />
                </Link>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.4, ease: "easeOut" }}
                className="flex flex-wrap items-center justify-center lg:justify-start gap-6 text-sm"
                style={{ color: "rgba(255, 255, 255, 0.6)" }}
              >
                <div className="flex items-center gap-1.5">
                  <ShieldCheck
                    className="h-4 w-4"
                    style={{ color: COLORS.teal }}
                    aria-hidden="true"
                  />
                  <span>Ley 1581/2012</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Lock
                    className="h-4 w-4"
                    style={{ color: COLORS.teal }}
                    aria-hidden="true"
                  />
                  <span>AES-256</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Cloud
                    className="h-4 w-4"
                    style={{ color: COLORS.teal }}
                    aria-hidden="true"
                  />
                  <span>99.9% Uptime</span>
                </div>

                <div className="flex items-center gap-1.5">
                  <Award
                    className="h-4 w-4"
                    style={{ color: COLORS.accent }}
                    aria-hidden="true"
                  />
                  <span>Equipo ADSO · SENA</span>
                </div>
              </motion.div>
            </div>{" "}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
              className="relative"
            >
              <div
                className="relative rounded-2xl overflow-hidden shadow-2xl border border-white/10"
                style={{ backgroundColor: "rgba(15, 32, 39, 0.9)" }}
              >
                <div className="p-4 border-b border-white/10 flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                  </div>

                  <div className="flex-1 text-center text-xs font-mono text-white/40">
                    clinicita.app/dashboard
                  </div>
                </div>

                <div className="p-6 space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      {
                        label: "Citas Hoy",
                        value: "24",
                        change: "+12%",
                        trend: "up",
                        icon: Calendar,
                        color: "text-teal-400",
                      },

                      {
                        label: "En Sala",
                        value: "8",
                        change: "3 en espera",
                        trend: "neutral",
                        icon: Users,
                        color: "text-amber-400",
                      },

                      {
                        label: "Atendidas",
                        value: "16",
                        change: "+8 vs ayer",
                        trend: "up",
                        icon: CheckCircle,
                        color: "text-emerald-400",
                      },

                      {
                        label: "No-Show",
                        value: "2%",
                        change: "-0.5%",
                        trend: "up",
                        icon: TrendingUp,
                        color: "text-red-400",
                      },
                    ].map((stat, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.4, delay: 0.3 + i * 0.1 }}
                        className="rounded-xl p-4"
                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.03)",
                          border: "1px solid rgba(255, 255, 255, 0.05)",
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <stat.icon
                            className="h-4 w-4"
                            style={{ color: stat.color }}
                            aria-hidden="true"
                          />
                          <span
                            className="text-xs font-medium"
                            style={{
                              color:
                                stat.trend === "up"
                                  ? "#22c55e"
                                  : stat.trend === "down"
                                    ? "#ef4444"
                                    : "#94a3b8",
                            }}
                          >
                            {stat.change}
                          </span>
                        </div>

                        <p className="text-2xl font-bold text-white">
                          {stat.value}
                        </p>
                        <p className="text-xs text-white/50">{stat.label}</p>
                      </motion.div>
                    ))}
                  </div>

                  <div className="border-t border-white/10 pt-4">
                    <h4 className="text-sm font-semibold text-white/70 mb-3 flex items-center gap-2">
                      <Activity
                        className="h-4 w-4"
                        style={{ color: COLORS.teal }}
                        aria-hidden="true"
                      />
                      Próximas Citas
                    </h4>

                    <div className="space-y-3 max-h-64 overflow-y-auto">
                      {[
                        {
                          time: "08:30",
                          patient: "María González",
                          type: "Consulta Gral.",
                          status: "En sala",
                          statusColor: "text-amber-400",
                          bgColor: "bg-amber-500/20",
                        },

                        {
                          time: "09:15",
                          patient: "Carlos Ruiz",
                          type: "Cardiología",
                          status: "Confirmada",
                          statusColor: "text-teal-400",
                          bgColor: "bg-teal-500/20",
                        },

                        {
                          time: "10:00",
                          patient: "Ana Martínez",
                          type: "Pediatría",
                          status: "En espera",
                          statusColor: "text-blue-400",
                          bgColor: "bg-blue-500/20",
                        },

                        {
                          time: "10:45",
                          patient: "Luis Herrera",
                          type: "Dermatología",
                          status: "Confirmada",
                          statusColor: "text-teal-400",
                          bgColor: "bg-teal-500/20",
                        },

                        {
                          time: "11:30",
                          patient: "Sofía Vargas",
                          type: "Medicina Int.",
                          status: "Completada",
                          statusColor: "text-emerald-400",
                          bgColor: "bg-emerald-500/20",
                        },
                      ].map((apt, i) => (
                        <motion.div
                          key={i}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ duration: 0.3, delay: 0.5 + i * 0.08 }}
                          className="flex items-center gap-3 p-3 rounded-lg transition-colors"
                          style={{
                            backgroundColor: "rgba(255, 255, 255, 0.02)",
                            border: "1px solid rgba(255, 255, 255, 0.03)",
                          }}
                        >
                          <div className="w-16 text-right text-sm font-mono text-white/60">
                            {apt.time}
                          </div>

                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-white truncate">
                              {apt.patient}
                            </p>
                            <p className="text-xs text-white/50">{apt.type}</p>
                          </div>

                          <span
                            className={
                              "px-2.5 py-1 text-xs font-medium rounded-full " +
                              apt.bgColor +
                              " whitespace-nowrap"
                            }
                            style={{ color: apt.statusColor }}
                          >
                            {apt.status}
                          </span>
                        </motion.div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>{" "}
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.6 }}
                className="absolute -bottom-6 -left-6 lg:-left-8 p-4 rounded-xl shadow-2xl border"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  borderColor: "rgba(13, 148, 136, 0.2)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: COLORS.teal }}
                  >
                    <Zap
                      className="h-5 w-5"
                      style={{ color: COLORS.teal }}
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-[#0F2027]">
                      Notificaciones Inteligentes
                    </p>
                    <p className="text-sm text-[#0F2027]/60">
                      Recordatorios automáticos por WhatsApp y Email
                    </p>
                  </div>
                </div>
              </motion.div>
              <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: 0.7 }}
                className="absolute -top-6 -right-6 lg:-right-8 p-4 rounded-xl shadow-2xl border"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.95)",
                  borderColor: "rgba(13, 148, 136, 0.2)",
                }}
              >
                <div className="flex items-center gap-3">
                  <div
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: "rgba(245, 158, 11, 0.15)" }}
                  >
                    <Sparkles
                      className="h-5 w-5"
                      style={{ color: COLORS.accent }}
                      aria-hidden="true"
                    />
                  </div>
                  <div>
                    <p className="font-semibold text-[#0F2027]">
                      IA Predictiva
                    </p>
                    <p className="text-sm text-[#0F2027]/60">
                      Detección de no-shows y optimización de agenda
                    </p>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        <motion.div
          animate={{ y: [0, 10, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50"
          aria-hidden="true"
        >
          <span className="text-xs uppercase tracking-wider font-medium">
            Explorar
          </span>
          <MousePointer className="h-6 w-6" />
        </motion.div>
      </section>{" "}
      {/* ========== EL PROYECTO ========== */}
      <section
        id="el-proyecto"

        className="py-24 lg:py-32"

        style={{ backgroundColor: COLORS.tealBg }}

        aria-labelledby="proyecto-title"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}

            whileInView={{ opacity: 1, y: 0 }}

            viewport={{ once: true, margin: "-100px" }}

            transition={{ duration: 0.6, ease: "easeOut" }}

            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span
              className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
              style={{ backgroundColor: COLORS.tealSoft, color: COLORS.teal }}
            >
              El Proyecto
            </span>

            <h2
              id="proyecto-title"
              className="font-serif font-bold text-3xl lg:text-4xl mb-4"
              style={{ color: COLORS.dark, lineHeight: 1.2 }}
            >
              Una solución integral para la gestión de citas médicas en Colombia
            </h2>

            <p
              className="text-lg leading-relaxed"
              style={{ color: "#0F2027/70" }}
            >
              Clinicita nace como proyecto académico del programa ADSO del SENA,
              evolucionando hacia una plataforma robusta que conecta pacientes,
              profesionales de la salud y administradores en un ecosistema
              digital seguro y eficiente.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                icon: Target,
                title: "Misión",
                desc: "Democratizar el acceso a la salud digital mediante tecnología accesible, segura y centrada en el paciente colombiano.",
                color: "text-teal-600",
                bg: "bg-teal-50",
              },

              {
                icon: Award,
                title: "Visión",
                desc: "Ser la plataforma de referencia en gestión de citas médicas para IPS y clínicas en Latinoamérica para 2027.",
                color: "text-amber-600",
                bg: "bg-amber-50",
              },

              {
                icon: Users2,
                title: "Valores",
                desc: "Ética médica, privacidad de datos (Ley 1581), inclusión digital, innovación continua y excelencia en el servicio.",
                color: "text-emerald-600",
                bg: "bg-emerald-50",
              },

              {
                icon: Sparkles,
                title: "Innovación",
                desc: "IA predictiva, telemedicina integrada, interoperabilidad HL7/FHIR y analytics en tiempo real para toma de decisiones.",
                color: "text-purple-600",
                bg: "bg-purple-50",
              },
            ].map((item, i) => (
              <motion.div
                key={i}

                initial={{ opacity: 0, y: 30 }}

                whileInView={{ opacity: 1, y: 0 }}

                viewport={{ once: true, margin: "-50px" }}

                transition={{
                  duration: 0.5,
                  delay: 0.1 + i * 0.1,
                  ease: "easeOut",
                }}

                className="p-6 rounded-2xl transition-all hover:shadow-xl"

                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid rgba(13, 148, 136, 0.1)",
                }}
              >
                <div className={"p-3 rounded-xl " + item.bg + " w-fit mb-4"}>
                  <item.icon
                    className="h-6 w-6"
                    style={{ color: item.color }}
                    aria-hidden="true"
                  />
                </div>

                <h3
                  className="font-semibold text-xl mb-2"
                  style={{ color: COLORS.dark }}
                >
                  {item.title}
                </h3>

                <p className="leading-relaxed" style={{ color: "#0F2027/70" }}>
                  {item.desc}
                </p>
              </motion.div>
            ))}
          </div>

          {/* Stats Bar */}

          <motion.div
            initial={{ opacity: 0, y: 30 }}

            whileInView={{ opacity: 1, y: 0 }}

            viewport={{ once: true, margin: "-100px" }}

            transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}

            className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-8 text-center"
          >
            {[
              {
                value: "15+",
                label: "Módulos Funcionales",
                icon: LayoutDashboard,
              },

              { value: "99.9%", label: "Disponibilidad", icon: Cloud },

              { value: "AES-256", label: "Cifrado de Datos", icon: Lock },

              {
                value: "Ley 1581",
                label: "Cumplimiento Legal",
                icon: ShieldCheck,
              },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center gap-2">
                <div
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: COLORS.tealSoft }}
                >
                  <stat.icon
                    className="h-6 w-6"
                    style={{ color: COLORS.teal }}
                    aria-hidden="true"
                  />
                </div>

                <div
                  className="font-bold text-2xl lg:text-3xl"
                  style={{ color: COLORS.dark }}
                >
                  {stat.value}
                </div>

                <div
                  className="text-sm font-medium"
                  style={{ color: "#0F2027/70" }}
                >
                  {stat.label}
                </div>
              </div>
            ))}
          </motion.div>
        </div>
      </section>{" "}
      {/* ========== FUNCIONALIDADES ========== */}
      <section
        id="funcionalidades"

        className="py-24 lg:py-32"

        aria-labelledby="funcionalidades-title"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}

            whileInView={{ opacity: 1, y: 0 }}

            viewport={{ once: true, margin: "-100px" }}

            transition={{ duration: 0.6, ease: "easeOut" }}

            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span
              className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
              style={{ backgroundColor: COLORS.tealSoft, color: COLORS.teal }}
            >
              Funcionalidades
            </span>

            <h2
              id="funcionalidades-title"
              className="font-serif font-bold text-3xl lg:text-4xl mb-4"
              style={{ color: COLORS.dark, lineHeight: 1.2 }}
            >
              Todo lo que tu clínica necesita en una sola plataforma
            </h2>

            <p
              className="text-lg leading-relaxed"
              style={{ color: "#0F2027/70" }}
            >
              Módulos diseñados para cubrir el ciclo completo de atención: desde
              la solicitud de cita hasta la historia clínica, facturación y
              analítica avanzada.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: Calendar,
                title: "Agenda Inteligente",
                desc: "Calendario multi-recurso en tiempo real, detección de conflictos, bloques de tiempo, recurrencia y vista día/semana/mes.",
                features: [
                  "Multi-sede y multi-especialidad",
                  "Drag & drop intuitivo",
                  "Bloques personalizables",
                  "Sincronización Google/Outlook",
                ],
              },

              {
                icon: Users,
                title: "Gestión de Pacientes",
                desc: "Historia clínica digital completa, consentimientos informados, antecedentes, alergias, documentos adjuntos y timeline de atenciones.",
                features: [
                  "Ley 1581/2012 compliant",
                  "Firma digital de consentimientos",
                  "Portal del paciente",
                  "Importación masiva",
                ],
              },

              {
                icon: Stethoscope,
                title: "Módulo Clínico",
                desc: "Órdenes médicas, recetas digitales, remisiones, incapacidades, certificados y plantillas por especialidad con firma digital.",
                features: [
                  "Recetas con validación RIPS",
                  "Plantillas por especialidad",
                  "Firma digital ICP-Brasil",
                  "Envío automático por email",
                ],
              },

              {
                icon: Building2,
                title: "Administración IPS",
                desc: "Gestión de sedes, profesionales, horarios, contratos, tarifarios, convenios EPS y configuración de reglas de negocio.",
                features: [
                  "Multi-sede y multi-empresa",
                  "Tarifarios por convenio",
                  "Reglas de agendamiento",
                  "Reportes gerenciales",
                ],
              },

              {
                icon: BarChart2,
                title: "Analytics & BI",
                desc: "Dashboards ejecutivos, KPIs operacionales, análisis de no-shows, ocupación, tiempos de espera y rentabilidad por servicio.",
                features: [
                  "KPIs en tiempo real",
                  "Predicción de demanda",
                  "Exportación PDF/Excel",
                  "Alertas automatizadas",
                ],
              },

              {
                icon: Zap,
                title: "Automatizaciones",
                desc: "Recordatorios WhatsApp/Email/SMS, confirmación automática, lista de espera inteligente, reagendamiento masivo y workflows personalizados.",
                features: [
                  "Motor de reglas visual",
                  "Integración Twilio/Meta",
                  "Plantillas de mensajes",
                  "Logs de auditoría",
                ],
              },
            ].map((feature, i) => (
              <motion.div
                key={i}

                initial={{ opacity: 0, y: 30 }}

                whileInView={{ opacity: 1, y: 0 }}

                viewport={{ once: true, margin: "-50px" }}

                transition={{
                  duration: 0.5,
                  delay: 0.1 + i * 0.08,
                  ease: "easeOut",
                }}

                className="p-6 rounded-2xl transition-all hover:shadow-xl group"

                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid rgba(13, 148, 136, 0.1)",
                }}
              >
                <div
                  className="p-3 rounded-xl"
                  style={{ backgroundColor: COLORS.tealSoft }}
                >
                  <feature.icon
                    className="h-6 w-6"
                    style={{ color: COLORS.teal }}
                    aria-hidden="true"
                  />
                </div>

                <h3
                  className="font-semibold text-xl mb-2"
                  style={{ color: COLORS.dark }}
                >
                  {feature.title}
                </h3>

                <p
                  className="mb-4 leading-relaxed"
                  style={{ color: "#0F2027/70" }}
                >
                  {feature.desc}
                </p>

                <ul className="space-y-2">
                  {feature.features.map((f, j) => (
                    <li
                      key={j}
                      className="flex items-center gap-2 text-sm"
                      style={{ color: "#0F2027/70" }}
                    >
                      <CheckCircle
                        className="h-4 w-4 flex-shrink-0"
                        style={{ color: COLORS.teal }}
                        aria-hidden="true"
                      />

                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}

            whileInView={{ opacity: 1, y: 0 }}

            viewport={{ once: true, margin: "-100px" }}

            transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}

            className="mt-12 text-center"
          >
            <Link
              to="/registro"

              className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-white rounded-xl transition-all active:scale-[0.98] shadow-xl shadow-teal-500/40"

              style={{ backgroundColor: COLORS.teal }}
            >
              Ver Demo Interactiva
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </motion.div>
        </div>
      </section>{" "}
      {/* ========== USUARIOS / ROLES ========== */}
      <section
        id="usuarios"

        className="py-24 lg:py-32"

        style={{ backgroundColor: COLORS.tealBg }}

        aria-labelledby="usuarios-title"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}

            whileInView={{ opacity: 1, y: 0 }}

            viewport={{ once: true, margin: "-100px" }}

            transition={{ duration: 0.6, ease: "easeOut" }}

            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span
              className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
              style={{ backgroundColor: COLORS.tealSoft, color: COLORS.teal }}
            >
              Roles de Usuario
            </span>

            <h2
              id="usuarios-title"
              className="font-serif font-bold text-3xl lg:text-4xl mb-4"
              style={{ color: COLORS.dark, lineHeight: 1.2 }}
            >
              Experiencia personalizada para cada actor del ecosistema de salud
            </h2>

            <p
              className="text-lg leading-relaxed"
              style={{ color: "#0F2027/70" }}
            >
              Control de acceso basado en roles (RBAC) con permisos granulares,
              auditoría completa y separación de responsabilidades clínicas y
              administrativas.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon: UserCheck,
                title: "Paciente",
                color: "text-teal-600",
                bg: "bg-teal-50",
                desc: "Portal de autoservicio para agendar, reprogramar, ver historial, recetas y recibir recordatorios.",
                features: [
                  "Agendamiento 24/7",
                  "Historial clínico personal",
                  "Recetas y resultados",
                  "Notificaciones multicanal",
                  "Teleconsulta integrada",
                  "Pagos en línea",
                ],
              },

              {
                icon: Stethoscope,
                title: "Profesional de Salud",
                color: "text-emerald-600",
                bg: "bg-emerald-50",
                desc: "Escritorio clínico con agenda, historia clínica, órdenes, recetas y herramientas de decisión.",
                features: [
                  "Agenda personalizada",
                  "Historia clínica completa",
                  "Órdenes y recetas digitales",
                  "Plantillas por especialidad",
                  "Firma digital",
                  "Interconsultas",
                ],
              },

              {
                icon: Building2,
                title: "Administrador IPS",
                color: "text-amber-600",
                bg: "bg-amber-50",
                desc: "Panel de control operacional y estratégico: recursos, financieros, calidad y cumplimiento.",
                features: [
                  "Gestión de sedes y personal",
                  "Tarifarios y convenios",
                  "Analytics y BI",
                  "Auditoría y compliance",
                  "Configuración de reglas",
                  "Reportes RIPS/MinSalud",
                ],
              },
            ].map((role, i) => (
              <motion.div
                key={i}

                initial={{ opacity: 0, y: 30 }}

                whileInView={{ opacity: 1, y: 0 }}

                viewport={{ once: true, margin: "-50px" }}

                transition={{
                  duration: 0.5,
                  delay: 0.1 + i * 0.1,
                  ease: "easeOut",
                }}

                className="p-6 rounded-2xl relative overflow-hidden transition-all hover:shadow-2xl group"

                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid rgba(13, 148, 136, 0.1)",
                }}
              >
                <div
                  className="absolute top-0 right-0 w-32 h-32 rounded-full opacity-10 blur-2xl"
                  style={{
                    backgroundColor: role.color
                      .replace("text-", "")
                      .replace("-600", ""),
                    transform: "translate(40%, -40%)",
                  }}
                />

                <div className="relative z-10">
                  <div className={"p-3 rounded-xl " + role.bg + " w-fit mb-4"}>
                    <role.icon
                      className="h-7 w-7"
                      style={{ color: role.color }}
                      aria-hidden="true"
                    />
                  </div>

                  <h3
                    className="font-semibold text-2xl mb-2"
                    style={{ color: COLORS.dark }}
                  >
                    {role.title}
                  </h3>

                  <p
                    className="mb-4 leading-relaxed"
                    style={{ color: "#0F2027/70" }}
                  >
                    {role.desc}
                  </p>

                  <ul className="space-y-2">
                    {role.features.map((f, j) => (
                      <li
                        key={j}
                        className="flex items-center gap-2 text-sm"
                        style={{ color: "#0F2027/70" }}
                      >
                        <CheckCircle
                          className="h-4 w-4 flex-shrink-0"
                          style={{ color: role.color }}
                          aria-hidden="true"
                        />

                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>{" "}
      {/* ========== SEDES ========== */}
      <section
        id="sedes"

        className="py-24 lg:py-32"

        aria-labelledby="sedes-title"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 30 }}

            whileInView={{ opacity: 1, y: 0 }}

            viewport={{ once: true, margin: "-100px" }}

            transition={{ duration: 0.6, ease: "easeOut" }}

            className="text-center max-w-3xl mx-auto mb-16"
          >
            <span
              className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
              style={{ backgroundColor: COLORS.tealSoft, color: COLORS.teal }}
            >
              Sedes
            </span>

            <h2
              id="sedes-title"
              className="font-serif font-bold text-3xl lg:text-4xl mb-4"
              style={{ color: COLORS.dark, lineHeight: 1.2 }}
            >
              Presencia nacional con gestión centralizada
            </h2>

            <p
              className="text-lg leading-relaxed"
              style={{ color: "#0F2027/70" }}
            >
              Arquitectura multi-sede nativa: cada sede opera de forma autónoma
              compartiendo configuración global, tarifarios y reportes
              consolidados en tiempo real.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              {
                city: "Bogotá",
                neighborhood: "Chapinero",
                specialty: "Sede Principal · Multi-especialidad",
                icon: MapPin,
                color: "text-teal-600",
              },

              {
                city: "Medellín",
                neighborhood: "El Poblado",
                specialty: "Cardiología · Neurología",
                icon: MapPin,
                color: "text-emerald-600",
              },

              {
                city: "Cali",
                neighborhood: "San Fernando",
                specialty: "Pediatría · Ginecología",
                icon: MapPin,
                color: "text-amber-600",
              },

              {
                city: "Barranquilla",
                neighborhood: "Riomar",
                specialty: "Medicina General · Odontología",
                icon: MapPin,
                color: "text-purple-600",
              },
            ].map((sede, i) => (
              <motion.div
                key={i}

                initial={{ opacity: 0, y: 30 }}

                whileInView={{ opacity: 1, y: 0 }}

                viewport={{ once: true, margin: "-50px" }}

                transition={{
                  duration: 0.5,
                  delay: 0.1 + i * 0.1,
                  ease: "easeOut",
                }}

                className="p-6 rounded-2xl transition-all hover:shadow-xl group"

                style={{
                  backgroundColor: "#FFFFFF",
                  border: "1px solid rgba(13, 148, 136, 0.1)",
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="p-3 rounded-xl"
                    style={{ backgroundColor: COLORS.tealSoft }}
                  >
                    <sede.icon
                      className="h-6 w-6"
                      style={{ color: sede.color }}
                      aria-hidden="true"
                    />
                  </div>

                  <div className="flex-1">
                    <h3
                      className="font-semibold text-xl"
                      style={{ color: COLORS.dark }}
                    >
                      {sede.city}
                    </h3>

                    <p
                      className="text-sm font-medium"
                      style={{ color: sede.color }}
                    >
                      {sede.neighborhood}
                    </p>

                    <p className="text-sm mt-1" style={{ color: "#0F2027/70" }}>
                      {sede.specialty}
                    </p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          <motion.div
            initial={{ opacity: 0, y: 30 }}

            whileInView={{ opacity: 1, y: 0 }}

            viewport={{ once: true, margin: "-100px" }}

            transition={{ duration: 0.6, delay: 0.5, ease: "easeOut" }}

            className="mt-12 text-center"
          >
            <Link
              to="/contacto"

              className="inline-flex items-center gap-2 px-8 py-4 text-base font-semibold text-teal-700 border border-teal-300 rounded-xl hover:bg-teal-50 transition-all active:scale-[0.98]"
            >
              Solicitar Nueva Sede
              <ArrowRight className="h-5 w-5" aria-hidden="true" />
            </Link>
          </motion.div>
        </div>
      </section>{" "}
      {/* ========== CONTACTO ========== */}
      <section
        id="contacto"

        className="py-24 lg:py-32"

        style={{ backgroundColor: COLORS.dark }}

        aria-labelledby="contacto-title"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16 items-start">
            <motion.div
              initial={{ opacity: 0, y: 30 }}

              whileInView={{ opacity: 1, y: 0 }}

              viewport={{ once: true, margin: "-100px" }}

              transition={{ duration: 0.6, ease: "easeOut" }}
            >
              <span
                className="inline-block px-4 py-1.5 rounded-full text-sm font-semibold mb-4"
                style={{
                  backgroundColor: "rgba(13, 148, 136, 0.2)",
                  color: COLORS.teal,
                  border: "1px solid rgba(13, 148, 136, 0.3)",
                }}
              >
                Contacto
              </span>
              <h2
                id="contacto-title"
                className="font-serif font-bold text-3xl lg:text-4xl mb-4"
                style={{ color: "#FFFFFF", lineHeight: 1.2 }}
              >
                ¿Listo para transformar tu clínica?
              </h2>
              <p
                className="text-lg leading-relaxed mb-8"
                style={{ color: "rgba(255, 255, 255, 0.8)" }}
              >
                Agenda una demo personalizada, resuelve tus dudas técnicas o
                solicita una propuesta a medida. Nuestro equipo te responderá en
                menos de 24 horas.
              </p>{" "}
              <div className="space-y-6">
                {[
                  {
                    icon: Mail,
                    label: "Email",
                    value: "hola@clinicita.co",
                    href: "mailto:hola@clinicita.co",
                  },

                  {
                    icon: Phone,
                    label: "Teléfono",
                    value: "+57 1 234 5678",
                    href: "tel:+5712345678",
                  },

                  {
                    icon: MapPin,
                    label: "Oficina",
                    value: "Calle 72 # 10-34, Bogotá, Colombia",
                    href: "https://maps.google.com",
                  },
                ].map((contact, i) => (
                  <motion.div
                    key={i}

                    initial={{ opacity: 0, x: -20 }}

                    animate={{ opacity: 1, x: 0 }}

                    transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}

                    className="flex items-center gap-4 p-4 rounded-xl transition-colors group"

                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.03)",
                      border: "1px solid rgba(255, 255, 255, 0.05)",
                    }}
                  >
                    <div
                      className="p-3 rounded-xl"
                      style={{ backgroundColor: "rgba(13, 148, 136, 0.15)" }}
                    >
                      <contact.icon
                        className="h-5 w-5"
                        style={{ color: COLORS.teal }}
                        aria-hidden="true"
                      />
                    </div>

                    <div>
                      <p className="text-sm font-medium text-white/60">
                        {contact.label}
                      </p>

                      <a
                        href={contact.href}
                        className="text-white hover:text-teal-300 transition-colors"
                      >
                        {contact.value}
                      </a>
                    </div>
                  </motion.div>
                ))}
              </div>{" "}
              {/* Social Links */}
              <div className="mt-10 flex gap-4">
                {[
                  { icon: ExternalLink, href: "https://github.com/clinicita" },

                  {
                    icon: MessageSquare,
                    href: "https://linkedin.com/company/clinicita",
                  },

                  { icon: Send, href: "https://twitter.com/clinicita" },

                  {
                    icon: ExternalLink,
                    href: "https://facebook.com/clinicita",
                  },
                ].map((social, i) => (
                  <motion.a
                    key={i}

                    href={social.href}

                    target="_blank"

                    rel="noopener noreferrer"

                    initial={{ opacity: 0, y: 20 }}

                    animate={{ opacity: 1, y: 0 }}

                    transition={{ duration: 0.3, delay: 0.5 + i * 0.05 }}

                    whileHover={{ scale: 1.1 }}

                    whileTap={{ scale: 0.95 }}

                    className="p-3 rounded-xl transition-colors"

                    style={{
                      backgroundColor: "rgba(255, 255, 255, 0.05)",
                      border: "1px solid rgba(255, 255, 255, 0.1)",
                    }}

                    aria-label={social.icon.displayName || "Red social"}
                  >
                    <social.icon
                      className="h-5 w-5 text-white/70 hover:text-teal-300 transition-colors"
                      aria-hidden="true"
                    />
                  </motion.a>
                ))}
              </div>
            </motion.div>{" "}
            {/* Contact Form */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}

              whileInView={{ opacity: 1, y: 0 }}

              viewport={{ once: true, margin: "-100px" }}

              transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}

              className="relative"
            >
              <div
                className="rounded-2xl p-8"
                style={{
                  backgroundColor: "rgba(255, 255, 255, 0.03)",
                  border: "1px solid rgba(13, 148, 136, 0.2)",
                }}
              >
                <h3 className="font-semibold text-xl mb-6 text-white">
                  Envíanos un mensaje
                </h3>

                <form className="space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="nombre"
                        className="block text-sm font-medium text-white/80 mb-1.5"
                      >
                        Nombre completo
                      </label>

                      <input
                        type="text"

                        id="nombre"

                        name="nombre"

                        required

                        className="w-full px-4 py-3 rounded-lg text-white placeholder-white/40 transition-all"

                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                        }}

                        placeholder="Juan Pérez"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="email"
                        className="block text-sm font-medium text-white/80 mb-1.5"
                      >
                        Correo electrónico
                      </label>

                      <input
                        type="email"

                        id="email"

                        name="email"

                        required

                        className="w-full px-4 py-3 rounded-lg text-white placeholder-white/40 transition-all"

                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                        }}

                        placeholder="juan@clinica.com"
                      />
                    </div>
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <label
                        htmlFor="telefono"
                        className="block text-sm font-medium text-white/80 mb-1.5"
                      >
                        Teléfono
                      </label>

                      <input
                        type="tel"

                        id="telefono"

                        name="telefono"

                        className="w-full px-4 py-3 rounded-lg text-white placeholder-white/40 transition-all"

                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                        }}

                        placeholder="+57 300 123 4567"
                      />
                    </div>

                    <div>
                      <label
                        htmlFor="tipo"
                        className="block text-sm font-medium text-white/80 mb-1.5"
                      >
                        Tipo de consulta
                      </label>

                      <select
                        id="tipo"

                        name="tipo"

                        required

                        className="w-full px-4 py-3 rounded-lg text-white transition-all appearance-none"

                        style={{
                          backgroundColor: "rgba(255, 255, 255, 0.05)",
                          border: "1px solid rgba(255, 255, 255, 0.1)",
                        }}
                      >
                        <option value="" disabled>
                          Selecciona una opción
                        </option>

                        <option value="demo">Solicitar Demo</option>

                        <option value="technical">Consulta Técnica</option>

                        <option value="commercial">Propuesta Comercial</option>

                        <option value="partnership">
                          Alianza / Partnership
                        </option>

                        <option value="other">Otro</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label
                      htmlFor="mensaje"
                      className="block text-sm font-medium text-white/80 mb-1.5"
                    >
                      Mensaje
                    </label>

                    <textarea
                      id="mensaje"

                      name="mensaje"

                      rows={4}

                      required

                      className="w-full px-4 py-3 rounded-lg text-white placeholder-white/40 transition-all resize-none"

                      style={{
                        backgroundColor: "rgba(255, 255, 255, 0.05)",
                        border: "1px solid rgba(255, 255, 255, 0.1)",
                      }}

                      placeholder="Cuéntanos sobre tu clínica, número de sedes, especialidades y qué necesitas..."
                    />
                  </div>

                  <button
                    type="submit"

                    className="w-full px-6 py-3.5 text-base font-semibold text-white rounded-xl transition-all active:scale-[0.98] shadow-lg shadow-teal-500/40 flex items-center justify-center gap-2"

                    style={{ backgroundColor: COLORS.teal }}
                  >
                    Enviar Mensaje
                    <ArrowRight className="h-5 w-5" aria-hidden="true" />
                  </button>
                </form>
              </div>
            </motion.div>
          </div>
        </div>
      </section>{" "}
      {/* ========== FOOTER ========== */}
      <footer
        className="py-16 lg:py-24"

        style={{ backgroundColor: "#081419" }}

        role="contentinfo"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 mb-12">
            {/* Brand */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}

              whileInView={{ opacity: 1, y: 0 }}

              viewport={{ once: true }}

              transition={{ duration: 0.5, ease: "easeOut" }}

              className="lg:col-span-1"
            >
              <Link
                to="/"
                className="flex items-center gap-2 mb-4"
                aria-label="Clinicita - Inicio"
              >
                <div
                  className="p-2 rounded-xl"
                  style={{ backgroundColor: COLORS.teal }}
                >
                  <HeartPulse
                    className="h-6 w-6 text-white"
                    aria-hidden="true"
                  />
                </div>

                <span
                  className="font-bold text-xl text-white"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  Clinicita
                </span>
              </Link>

              <p
                className="text-sm leading-relaxed mb-6"
                style={{ color: "rgba(255, 255, 255, 0.6)" }}
              >
                Plataforma integral de gestión de citas médicas para IPS y
                clínicas en Colombia. Tecnología segura, accesible y centrada en
                el paciente.
              </p>

              <div className="flex gap-4">
                {[
                  { icon: ExternalLink, href: "https://github.com/clinicita" },

                  {
                    icon: MessageSquare,
                    href: "https://linkedin.com/company/clinicita",
                  },

                  { icon: Send, href: "https://twitter.com/clinicita" },
                ].map((social, i) => (
                  <motion.a
                    key={i}

                    href={social.href}

                    target="_blank"

                    rel="noopener noreferrer"

                    initial={{ opacity: 0, y: 20 }}

                    animate={{ opacity: 1, y: 0 }}

                    transition={{ duration: 0.3, delay: 0.3 + i * 0.05 }}

                    whileHover={{ scale: 1.1, rotate: 3 }}

                    className="p-2 rounded-lg transition-colors"

                    style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}

                    aria-label={social.icon.displayName || "Red social"}
                  >
                    <social.icon
                      className="h-5 w-5 text-white/60 hover:text-teal-300 transition-colors"
                      aria-hidden="true"
                    />
                  </motion.a>
                ))}
              </div>
            </motion.div>
            {/* Product */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}

              whileInView={{ opacity: 1, y: 0 }}

              viewport={{ once: true }}

              transition={{ duration: 0.5, delay: 0.1, ease: "easeOut" }}
            >
              <h4 className="font-semibold text-white mb-4">Producto</h4>

              <nav aria-label="Enlaces de producto">
                <ul className="space-y-3">
                  {[
                    "Funcionalidades",
                    "Precios",
                    "Integraciones",
                    "API Docs",
                    "Changelog",
                    "Roadmap",
                  ].map((item, i) => (
                    <li key={i}>
                      <Link
                        to="#"
                        className="text-sm transition-colors hover:text-teal-300"
                        style={{ color: "rgba(255, 255, 255, 0.7)" }}
                      >
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </motion.div>{" "}
            {/* Company */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}

              whileInView={{ opacity: 1, y: 0 }}

              viewport={{ once: true }}

              transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
            >
              <h4 className="font-semibold text-white mb-4">Empresa</h4>

              <nav aria-label="Enlaces de empresa">
                <ul className="space-y-3">
                  {[
                    "Nosotros",
                    "Blog",
                    "Carreras",
                    "Prensa",
                    "Aliados",
                    "Contacto",
                  ].map((item, i) => (
                    <li key={i}>
                      <Link
                        to="#"
                        className="text-sm transition-colors hover:text-teal-300"
                        style={{ color: "rgba(255, 255, 255, 0.7)" }}
                      >
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </motion.div>
            {/* Legal & Compliance */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}

              whileInView={{ opacity: 1, y: 0 }}

              viewport={{ once: true }}

              transition={{ duration: 0.5, delay: 0.3, ease: "easeOut" }}
            >
              <h4 className="font-semibold text-white mb-4">
                Legal y Cumplimiento
              </h4>

              <nav aria-label="Enlaces legales">
                <ul className="space-y-3">
                  {[
                    "Política de Privacidad",
                    "Términos de Uso",
                    "Ley 1581/2012",
                    "Aviso de Cookies",
                    "Seguridad AES-256",
                    "Certificaciones",
                  ].map((item, i) => (
                    <li key={i}>
                      <Link
                        to="#"
                        className="text-sm transition-colors hover:text-teal-300"
                        style={{ color: "rgba(255, 255, 255, 0.7)" }}
                      >
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </nav>
            </motion.div>
          </div>{" "}
          {/* Bottom Bar */}
          <motion.div
            initial={{ opacity: 0 }}

            whileInView={{ opacity: 1 }}

            viewport={{ once: true }}

            transition={{ duration: 0.5, delay: 0.5, ease: "easeOut" }}

            className="pt-8 border-t flex flex-col md:flex-row justify-between items-center gap-4"

            style={{ borderColor: "rgba(255, 255, 255, 0.1)" }}
          >
            <p
              className="text-sm"
              style={{ color: "rgba(255, 255, 255, 0.5)" }}
            >
              Â© {new Date().getFullYear()} Clinicita. Todos los derechos
              reservados. Desarrollado con â¤ï¸ en Colombia para el sector
              salud.
            </p>

            <div
              className="flex items-center gap-6 text-sm"
              style={{ color: "rgba(255, 255, 255, 0.5)" }}
            >
              <span>
                Hecho por{" "}
                <span className="font-medium text-white">ADSO SENA</span>
              </span>

              <span>·</span>

              <span>Versión 2.1.0</span>
            </div>
          </motion.div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
