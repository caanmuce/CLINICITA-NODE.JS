// src/pages/recepcionista/Dashboard.jsx - Estilo Clinicita Teal
import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  Calendar,
  Users,
  Clock,
  FileText,
  PlusCircle,
  AlertCircle,
  Loader2,
  XCircle,
  HeartPulse,
  RefreshCw,
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
import { citasApi, listaEsperaApi } from "../../api";
import { pacientesApi } from "../../api/pacientes";

export const RecepcionistaDashboard = () => {
  const { user } = useAuth();
  const [citasHoy, setCitasHoy] = useState(0);
  const [pendientesConfirmar, setPendientesConfirmar] = useState(0);
  const [listaEsperaActiva, setListaEsperaActiva] = useState(0);
  const [loadingCitas, setLoadingCitas] = useState(true);
  const [loadingPendientes, setLoadingPendientes] = useState(true);
  const [loadingLista, setLoadingLista] = useState(true);
  const [errorCitas, setErrorCitas] = useState(false);
  const [errorPendientes, setErrorPendientes] = useState(false);
  const [errorLista, setErrorLista] = useState(false);
  const today = getColombiaDate();

  useEffect(() => {
    const fetchCitasHoy = async () => {
      try {
        setLoadingCitas(true);
        const data = await citasApi.listarAdmin({ fecha: today });
        // Backend devuelve { citas: [...], total: N, page, limit }
        // 'total' es el conteo TOTAL global (sin paginar), no solo la pÃ¡gina actual
        setCitasHoy(data?.total || data?.length || 0);
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

  useEffect(() => {
    const fetchPendientes = async () => {
      try {
        setLoadingPendientes(true);
        const data = await citasApi.listarAdmin({ estado: "Pendiente" });
        // 'total' = total global de citas pendientes (no solo la pÃ¡gina)
        setPendientesConfirmar(data?.total || data?.length || 0);
        setErrorPendientes(false);
      } catch (err) {
        console.error("Error fetching pendientes:", err);
        setErrorPendientes(true);
      } finally {
        setLoadingPendientes(false);
      }
    };
    fetchPendientes();
  }, []);

  useEffect(() => {
    const fetchListaEspera = async () => {
      try {
        setLoadingLista(true);
        const data = await listaEsperaApi.listarAdmin({ estado: "Activo" });
        // 'total' = total global de entradas activas en lista de espera
        setListaEsperaActiva(data?.total || data?.length || 0);
        setErrorLista(false);
      } catch (err) {
        console.error("Error fetching lista de espera:", err);
        setErrorLista(true);
      } finally {
        setLoadingLista(false);
      }
    };
    fetchListaEspera();
  }, []);

  const statCards = [
    {
      title: "Citas hoy",
      value: citasHoy,
      subtitle: "Totales programadas",
      icon: Calendar,
      color: "text-teal-600",
      bg: "bg-teal-50",
      href: "/recepcionista/citas",
      loading: loadingCitas,
      error: errorCitas,
      notAvailable: false,
    },
    {
      title: "Pacientes en sala",
      value: "0",
      subtitle: "En espera de atencion",
      icon: Users,
      color: "text-teal-600",
      bg: "bg-teal-50",
      href: "/recepcionista/citas",
      loading: false,
      error: false,
      notAvailable: true,
    },
    {
      title: "Pendientes confirmar",
      value: pendientesConfirmar,
      subtitle: "Requieren accion",
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      href: "/recepcionista/citas",
      loading: loadingPendientes,
      error: errorPendientes,
      notAvailable: false,
    },
    {
      title: "Lista de espera",
      value: listaEsperaActiva,
      subtitle: "Solicitudes activas",
      icon: FileText,
      color: "text-purple-600",
      bg: "bg-purple-50",
      href: "/recepcionista/citas",
      loading: loadingLista,
      error: errorLista,
      notAvailable: false,
    },
  ];

  const quickActions = [
    {
      label: "Agendar cita",
      href: "/recepcionista/citas",
      icon: PlusCircle,
      color: "bg-teal-600 hover:bg-teal-700",
    },
    {
      label: "Gestion de citas",
      href: "/recepcionista/citas",
      icon: Calendar,
      color: "bg-teal-600 hover:bg-teal-700",
    },
    {
      label: "Pacientes",
      href: "/recepcionista/pacientes",
      icon: Users,
      color: "bg-teal-600 hover:bg-teal-700",
    },
    {
      label: "Horarios",
      href: "/recepcionista/horarios",
      icon: Clock,
      color: "bg-teal-600 hover:bg-teal-700",
    },
  ];

  return (
    <SlideUp>
      <div className="space-y-6">
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Bienvenido, {user?.nombre?.split(" ")[0] || "Recepcionista"}
              </h1>
              <p className="text-gray-500 mt-1">
                Gestion de citas, pacientes y agenda del centro medico
              </p>
            </div>
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
                Citas de hoy
              </h2>
              <AnimatedButton
                variant="ghost"
                size="sm"
                as="a"
                href="/recepcionista/citas"
              >
                Ver todas
              </AnimatedButton>
            </div>
            {loadingCitas ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
              </div>
            ) : errorCitas ? (
              <div className="text-center py-8 text-red-500">
                <XCircle className="h-12 w-12 mx-auto text-red-300 mb-3" />
                <p>Error al cargar las citas</p>
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
                  href="/recepcionista/citas"
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
            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
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
              <li>
                Conectado: Citas hoy, Pendientes confirmar, Lista de espera
                (endpoints admin)
              </li>
              <li>
                Pendiente backend: Pacientes en sala (requiere WebSocket o
                estado cita 'En sala')
              </li>
            </ul>
          </AnimatedCard>
        </FadeIn>
      </div>
    </SlideUp>
  );
};

