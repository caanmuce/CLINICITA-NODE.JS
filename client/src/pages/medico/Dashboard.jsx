// src/pages/medico/Dashboard.jsx - Estilo Clinicita Teal
import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  Calendar,
  Users,
  FileText,
  Clock,
  AlertCircle,
  PlusCircle,
  Loader2,
  XCircle,
  HeartPulse,
} from "lucide-react";

const CLINICITA = {
  teal: "#0D9488",
  tealDark: "#0A7A70",
  tealSoft: "#E0F7F5",
  dark: "#0F2027",
};
import {
  AnimatedCard,
  AnimatedButton,
  StaggerContainer,
  StaggerItem,
  SlideUp,
  FadeIn,
  StatCard,
  QuickAction,
} from "../../components/ui";
import { getColombiaDate } from "../../utils/dateUtils";
import { citasApi } from "../../api/citas";

export const MedicoDashboard = () => {
  const { user } = useAuth();
  const [citasHoy, setCitasHoy] = useState(0);
  const [loadingCitas, setLoadingCitas] = useState(true);
  const [errorCitas, setErrorCitas] = useState(false);
  const today = getColombiaDate();

  useEffect(() => {
    const fetchCitasHoy = async () => {
      try {
        setLoadingCitas(true);
        const data = await citasApi.listarMedico(today);
        // Backend devuelve { citas: [...], kpis: { confirmadas, pendientes, canceladas, atendidas } }
        // No es paginado: devuelve TODAS las citas del día para ese médico
        const total =
          (data?.kpis?.confirmadas || 0) +
          (data?.kpis?.pendientes || 0) +
          (data?.kpis?.canceladas || 0) +
          (data?.kpis?.atendidas || 0);
        setCitasHoy(total);
        setErrorCitas(false);
      } catch (err) {
        console.error("Error fetching citas hoy:", err);
        setErrorCitas(true);
      } finally {
        setLoadingCitas(false);
      }
    };
    fetchCitasHoy();
  }, [today]);

  const statCards = [
    {
      title: "Citas hoy",
      value: citasHoy,
      subtitle: "Programadas",
      icon: Calendar,
      color: "text-teal-600",
      bg: "bg-teal-50",
      href: "/medico/citas",
      loading: loadingCitas,
      error: errorCitas,
      notAvailable: false,
    },
    {
      title: "Pacientes únicos",
      value: "0",
      subtitle: "Este mes",
      icon: Users,
      color: "text-teal-600",
      bg: "bg-teal-50",
      href: "/medico/pacientes",
      loading: false,
      error: false,
      notAvailable: true,
    },
    {
      title: "Pendientes revisión",
      value: "0",
      subtitle: "Fichas pre-consulta",
      icon: FileText,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      href: "/medico/citas",
      loading: false,
      error: false,
      notAvailable: true,
    },
    {
      title: "Horas disponibles",
      value: "0",
      subtitle: "Esta semana",
      icon: Clock,
      color: "text-purple-600",
      bg: "bg-purple-50",
      href: "/medico/agenda",
      loading: false,
      error: false,
      notAvailable: true,
    },
  ];

  const quickActions = [
    {
      label: "Mi agenda",
      href: "/medico/agenda",
      icon: Calendar,
      color: "bg-teal-600",
    },
    {
      label: "Mis citas",
      href: "/medico/citas",
      icon: FileText,
      color: "bg-teal-600",
    },
    {
      label: "Pacientes",
      href: "/medico/pacientes",
      icon: Users,
      color: "bg-teal-600",
    },
  ];

  return (
    <SlideUp>
      <div className="space-y-6">
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Dr. {user?.nombre?.split(" ")[0] || "Medico"}
              </h1>
              <p className="text-gray-500 mt-1">
                Panel de control medico - Citas, pacientes y agenda
              </p>
            </div>
            <AnimatedButton
              as="a"
              href="/medico/citas"
              icon={<PlusCircle className="h-5 w-5" />}
            >
              Nueva cita
            </AnimatedButton>
          </div>
        </FadeIn>

        <FadeIn delay={0.1}>
          <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {statCards.map((stat, index) => (
              <StaggerItem key={index}>
                <StatCard
                  title={stat.title}
                  value={stat.value}
                  subtitle={stat.subtitle}
                  icon={stat.icon}
                  color={stat.color}
                  bg={stat.bg}
                  href={stat.href}
                  loading={stat.loading}
                  error={stat.error}
                  notAvailable={stat.notAvailable}
                />
              </StaggerItem>
            ))}
          </StaggerContainer>
        </FadeIn>

        <FadeIn delay={0.2}>
          <AnimatedCard className="p-6 bg-white">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-teal-600" />
                Agenda de hoy
              </h2>
              <AnimatedButton
                variant="ghost"
                size="sm"
                as="a"
                href="/medico/agenda"
              >
                Ver agenda completa
              </AnimatedButton>
            </div>
            {loadingCitas ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
              </div>
            ) : errorCitas ? (
              <div className="text-center py-8 text-red-500">
                <XCircle className="h-12 w-12 mx-auto text-red-300 mb-3" />
                <p>Error al cargar la agenda</p>
              </div>
            ) : citasHoy === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
                <p className="text-gray-500">
                  No hay citas programadas para hoy
                </p>
              </div>
            ) : (
              <p className="text-center text-gray-600">
                {citasHoy} {citasHoy === 1 ? "cita" : "citas"} programada
                {citasHoy !== 1 ? "s" : ""} para hoy.{" "}
                <a
                  href="/medico/agenda"
                  className="text-teal-600 hover:underline"
                >
                  Ver detalles
                </a>
              </p>
            )}
          </AnimatedCard>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Accesos rapidos
            </h2>
            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {quickActions.map((action, index) => (
                <QuickAction
                  key={index}
                  label={action.label}
                  href={action.href}
                  icon={action.icon}
                  color={action.color}
                  index={index}
                />
              ))}
            </StaggerContainer>
          </div>
        </FadeIn>

        <FadeIn delay={0.4}>
          <AnimatedCard className="bg-yellow-50 border border-yellow-200 p-4">
            <h3 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Funcionalidad parcial
            </h3>
            <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
              <li>Conectado: Citas de hoy (GET /api/citas/medico)</li>
              <li>
                Pendiente backend: Pacientes únicos mes, Fichas pre-consulta,
                Horas disponibles semana
              </li>
            </ul>
          </AnimatedCard>
        </FadeIn>
      </div>
    </SlideUp>
  );
};
