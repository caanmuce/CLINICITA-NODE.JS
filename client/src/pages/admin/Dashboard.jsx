// src/pages/admin/Dashboard.jsx - Estilo Clinicita Teal
import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  Users,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertCircle,
  UserPlus,
  Building2,
  HeartPulse,
  RefreshCw,
  Loader2,
  CheckCircle,
} from "lucide-react";

const CLINICITA = {
  teal: "#0D9488",
  tealDark: "#0A7A70",
  tealSoft: "#E0F7F5",
  dark: "#0F2027",
};
import {
  AnimatedCard,
  StaggerContainer,
  StaggerItem,
  SlideUp,
  FadeIn,
  StatCard,
  QuickAction,
} from "../../components/ui";
import { getColombiaDate } from "../../utils/dateUtils";
import { usuariosApi, citasApi, medicosApi } from "../../api";
import { pacientesApi } from "../../api/pacientes";

export const AdminDashboard = () => {
  const { user } = useAuth();
  const [totalPacientes, setTotalPacientes] = useState(0);
  const [citasHoy, setCitasHoy] = useState(0);
  const [medicosActivos, setMedicosActivos] = useState(0);
  const [loadingPacientes, setLoadingPacientes] = useState(true);
  const [loadingCitas, setLoadingCitas] = useState(true);
  const [loadingMedicos, setLoadingMedicos] = useState(true);
  const [errorPacientes, setErrorPacientes] = useState(false);
  const [errorCitas, setErrorCitas] = useState(false);
  const [errorMedicos, setErrorMedicos] = useState(false);
  const today = getColombiaDate();

  // Riesgo ML recálculo
  const [recalculandoRiesgo, setRecalculandoRiesgo] = useState(false);
  const [riesgoRecalculado, setRiesgoRecalculado] = useState(null);
  const [errorRiesgo, setErrorRiesgo] = useState(null);

  const handleRecalcularRiesgos = async () => {
    setRecalculandoRiesgo(true);
    setErrorRiesgo(null);
    setRiesgoRecalculado(null);
    try {
      const response = await pacientesApi.recalcularTodos();
      setRiesgoRecalculado(response);
    } catch (err) {
      setErrorRiesgo(err.userMessage || "Error al recalcular riesgos");
    } finally {
      setRecalculandoRiesgo(false);
    }
  };

  useEffect(() => {
    const fetchTotalPacientes = async () => {
      try {
        setLoadingPacientes(true);
        const data = await usuariosApi.listar({ rol: "paciente" });
        setTotalPacientes(data?.total || data?.length || 0);
        setErrorPacientes(false);
      } catch (err) {
        console.error("Error fetching total pacientes:", err);
        setErrorPacientes(true);
      } finally {
        setLoadingPacientes(false);
      }
    };
    fetchTotalPacientes();
  }, []);

  useEffect(() => {
    const fetchCitasHoy = async () => {
      try {
        setLoadingCitas(true);
        const data = await citasApi.listarAdmin({ fecha: today });
        // 'total' = total global de citas para hoy (no solo la página)
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
    const fetchMedicos = async () => {
      try {
        setLoadingMedicos(true);
        const data = await medicosApi.listar();
        // Backend devuelve { medicos: [...] } - NO paginado, array completo
        setMedicosActivos(data?.medicos?.length || data?.length || 0);
        setErrorMedicos(false);
      } catch (err) {
        console.error("Error fetching medicos:", err);
        setErrorMedicos(true);
      } finally {
        setLoadingMedicos(false);
      }
    };
    fetchMedicos();
  }, []);

  const statCards = [
    {
      title: "Total pacientes",
      value: totalPacientes,
      subtitle: "Registrados",
      icon: Users,
      color: "text-teal-600",
      bg: "bg-teal-50",
      href: "/admin/usuarios",
      loading: loadingPacientes,
      error: errorPacientes,
      notAvailable: false,
    },
    {
      title: "Citas hoy",
      value: citasHoy,
      subtitle: "Programadas",
      icon: Calendar,
      color: "text-teal-600",
      bg: "bg-teal-50",
      href: "/admin/reportes",
      loading: loadingCitas,
      error: errorCitas,
      notAvailable: false,
    },
    {
      title: "Ingresos mes",
      value: "$0",
      subtitle: "Facturacion",
      icon: DollarSign,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      href: "/admin/reportes",
      loading: false,
      error: false,
      notAvailable: true,
    },
    {
      title: "Medicos activos",
      value: medicosActivos,
      subtitle: "En plantilla",
      icon: UserPlus,
      color: "text-purple-600",
      bg: "bg-purple-50",
      href: "/admin/medicos",
      loading: loadingMedicos,
      error: errorMedicos,
      notAvailable: false,
    },
  ];

  const quickActions = [
    {
      label: "Gestionar usuarios",
      href: "/admin/usuarios",
      icon: Users,
      color: "bg-teal-600 hover:bg-teal-700",
    },
    {
      label: "Ver citas",
      href: "/admin/citas",
      icon: Calendar,
      color: "bg-teal-600 hover:bg-teal-700",
    },
    {
      label: "Médicos",
      href: "/admin/medicos",
      icon: UserPlus,
      color: "bg-teal-600 hover:bg-teal-700",
    },
    {
      label: "Sedes",
      href: "/admin/sedes",
      icon: Building2,
      color: "bg-teal-600 hover:bg-teal-700",
    },
    {
      label: "Lista de espera",
      href: "/admin/lista-espera",
      icon: AlertCircle,
      color: "bg-yellow-600 hover:bg-yellow-700",
    },
    {
      label: "Configuración",
      href: "/admin/configuracion",
      icon: HeartPulse,
      color: "bg-purple-600 hover:bg-purple-700",
    },
  ];

  return (
    <SlideUp>
      <div className="space-y-6">
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">
                Panel de Administracion
              </h1>
              <p className="text-gray-500 mt-1">
                Gestion completa del centro medico -{" "}
                {user?.nombre || "Administrador"}
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
          <AnimatedCard className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-teal-600" />
                Resumen rapido
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-3xl font-bold text-teal-600">0</p>
                <p className="text-sm text-gray-500">
                  Nuevos pacientes esta semana
                </p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-3xl font-bold text-teal-600">0%</p>
                <p className="text-sm text-gray-500">Tasa de ocupacion</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-3xl font-bold text-purple-600">0</p>
                <p className="text-sm text-gray-500">Citas canceladas</p>
              </div>
            </div>
          </AnimatedCard>
        </FadeIn>

        <FadeIn delay={0.3}>
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Accesos rapidos
            </h2>
            <StaggerContainer className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-3">
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

        {/* Recalcular riesgos ML - Admin */}
        <FadeIn delay={0.35}>
          <AnimatedCard className="p-6 bg-purple-50 border border-purple-200">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <div>
                <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                  <HeartPulse className="h-5 w-5" />
                  Recalcular Riesgos No-Show (ML)
                </h3>
                <p className="text-sm text-purple-700 mt-1">
                  Ejecuta el modelo ML para actualizar el riesgo de no-show de
                  todos los pacientes basado en su historial de citas
                </p>
              </div>
              <button
                onClick={handleRecalcularRiesgos}
                disabled={recalculandoRiesgo}
                className="px-6 py-2.5 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center gap-2"
              >
                {recalculandoRiesgo ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Recalculando...
                  </>
                ) : (
                  <>
                    <RefreshCw className="h-4 w-4" />
                    Recalcular ahora
                  </>
                )}
              </button>
            </div>

            {errorRiesgo && (
              <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-red-800 flex items-center gap-2">
                  <AlertCircle className="h-5 w-5" />
                  {errorRiesgo}
                </p>
              </div>
            )}

            {riesgoRecalculado && !recalculandoRiesgo && (
              <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-green-800 font-medium flex items-center gap-2">
                  <CheckCircle className="h-5 w-5" />
                  Recalculo completado:{" "}
                  {riesgoRecalculado.pacientes_actualizados || 0} pacientes
                  actualizados
                </p>
                <p className="text-sm text-green-700 mt-1">
                  Ejecutado el:{" "}
                  {riesgoRecalculado.timestamp
                    ? new Date(riesgoRecalculado.timestamp).toLocaleString(
                        "es-CO",
                      )
                    : "Ahora"}
                </p>
              </div>
            )}
          </AnimatedCard>
        </FadeIn>

        <FadeIn delay={0.4}>
          <AnimatedCard className="bg-yellow-50 border border-yellow-200 p-4">
            <h3 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Funcionalidad parcial
            </h3>
            <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
              <li>
                Conectado: Total pacientes, Citas hoy, Medicos activos
                (endpoints admin)
              </li>
              <li>
                Pendiente backend: Ingresos mes (requiere modulo facturacion)
              </li>
              <li>Sin ruta: Configuracion (/admin/configuracion no existe)</li>
            </ul>
          </AnimatedCard>
        </FadeIn>
      </div>
    </SlideUp>
  );
};
