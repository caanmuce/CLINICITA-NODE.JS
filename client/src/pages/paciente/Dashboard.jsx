// src/pages/paciente/Dashboard.jsx - Estilo Clinicita Teal
import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  Calendar,
  Clock,
  User,
  AlertCircle,
  PlusCircle,
  Loader2,
  HeartPulse,
  ShieldAlert,
  TrendingUp,
} from "lucide-react";
import { Link } from "react-router-dom";
import { citasApi } from "../../api/citas";
import { listaEsperaApi } from "../../api/listaEspera";
import { pacientesApi } from "../../api/pacientes";

const CLINICITA = {
  teal: "#0D9488",
  tealDark: "#0A7A70",
  tealSoft: "#E0F7F5",
  dark: "#0F2027",
  mid: "#1B4F72",
};

const formatDate = (dateStr) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-CO", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  });
};

const formatTime = (timeStr) => {
  if (!timeStr) return "—";
  const [hours, minutes] = timeStr.split(":");
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return date.toLocaleTimeString("es-CO", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Bogota",
  });
};

const getRiesgoColor = (nivel) => {
  switch (nivel) {
    case "Crítico":
      return "bg-red-100 text-red-800 border border-red-200";
    case "Alto":
      return "bg-orange-100 text-orange-800 border border-orange-200";
    case "Medio":
      return "bg-yellow-100 text-yellow-800 border border-yellow-200";
    case "Bajo":
      return "bg-green-100 text-green-800 border border-green-200";
    default:
      return "bg-gray-100 text-gray-800 border border-gray-200";
  }
};

const getRiesgoIcon = (nivel) => {
  switch (nivel) {
    case "Crítico":
      return <ShieldAlert className="h-4 w-4" />;
    case "Alto":
      return <AlertCircle className="h-4 w-4" />;
    case "Medio":
      return <TrendingUp className="h-4 w-4" />;
    case "Bajo":
      return <HeartPulse className="h-4 w-4" />;
    default:
      return <ShieldAlert className="h-4 w-4" />;
  }
};

// Backend devuelve estados en Title Case: 'Confirmada', 'Pendiente', 'Completada', 'Cancelada', 'No-Asistio'
const getEstadoColor = (estado) => {
  switch (estado) {
    case "Confirmada":
      return "bg-teal-100 text-teal-800 border border-teal-200";
    case "Pendiente":
      return "bg-yellow-100 text-yellow-800 border border-yellow-200";
    case "Completada":
      return "bg-teal-100 text-teal-800 border border-teal-200";
    case "Cancelada":
      return "bg-red-100 text-red-800 border border-red-200";
    case "No-Asistio":
      return "bg-gray-100 text-gray-800 border border-gray-200";
    default:
      return "bg-teal-100 text-teal-800 border border-teal-200";
  }
};

const getEstadoLabel = (estado) => {
  switch (estado) {
    case "Confirmada":
      return "Confirmada";
    case "Pendiente":
      return "Pendiente";
    case "Completada":
      return "Completada";
    case "Cancelada":
      return "Cancelada";
    case "No-Asistio":
      return "No asistió";
    default:
      return estado;
  }
};

// Helper to combine fecha and hora into a Date for comparison
const getCitaDateTime = (cita) => {
  if (cita.fecha_hora) return new Date(cita.fecha_hora).getTime();
  if (cita.fecha && cita.hora)
    return new Date(`${cita.fecha}T${cita.hora}:00`).getTime();
  return 0;
};

export const PacienteDashboard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [proximasCitas, setProximasCitas] = useState([]);
  const [stats, setStats] = useState({
    proximaCita: null,
    citasEsteMes: 0,
    enListaEspera: 0,
  });
  const [riesgo, setRiesgo] = useState(null);
  const [loadingRiesgo, setLoadingRiesgo] = useState(false);

  useEffect(() => {
    const cargarDashboard = async () => {
      if (!user?.id) {
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);

      try {
        // Cargar citas del paciente
        const citasResponse = await citasApi.listarMisCitas();
        const citasData = citasResponse?.data || citasResponse || [];
        const citas = Array.isArray(citasData) ? citasData : citasData?.citas || [];

        // Filtrar citas futuras (Pendiente, Confirmada) y ordenar por fecha
        const ahora = new Date();
        const citasFuturas = citas
          .filter(
            (c) =>
              ["Pendiente", "Confirmada"].includes(c.estado) &&
              getCitaDateTime(c) >= ahora.getTime(),
          )
          .sort((a, b) => getCitaDateTime(a) - getCitaDateTime(b));

        setProximasCitas(citasFuturas.slice(0, 3));

        // Contar citas de este mes
        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);
        const finMes = new Date(inicioMes);
        finMes.setMonth(finMes.getMonth() + 1);

        const citasEsteMes = citas.filter((c) => {
          const fecha = getCitaDateTime(c);
          return (
            fecha >= inicioMes.getTime() &&
            fecha < finMes.getTime() &&
            c.estado !== "Cancelada"
          );
        }).length;

        // Cargar lista de espera
        let enListaEspera = 0;
        try {
          const listaResponse = await listaEsperaApi.listarMiLista();
          const listaData = listaResponse?.data || listaResponse || [];
          const lista = Array.isArray(listaData) ? listaData : listaData?.listaEspera || [];
          enListaEspera = lista.filter(
            (item) => item.estado === "pendiente",
          ).length;
        } catch (listaError) {
          console.warn("No se pudo cargar lista de espera:", listaError);
        }

        setStats({
          proximaCita: citasFuturas[0] || null,
          citasEsteMes,
          enListaEspera,
        });

        // Cargar riesgo no-show del paciente
        try {
          setLoadingRiesgo(true);
          const riesgoData = await pacientesApi.verMiRiesgo();
          setRiesgo(riesgoData?.riesgo || riesgoData);
        } catch (e) {
          console.warn("No se pudo cargar riesgo:", e);
          setRiesgo(null);
        } finally {
          setLoadingRiesgo(false);
        }
      } catch (err) {
        console.error("Error cargando dashboard:", err);
        setError("No se pudo cargar la información del dashboard");
      } finally {
        setLoading(false);
      }
    };

    cargarDashboard();
  }, [user?.id]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-teal-600" />
        </div>
      </div>
    );
  }

  const statCards = [
    {
      title: "Próxima cita",
      value: stats.proximaCita
        ? `${stats.proximaCita.fecha ? formatDate(stats.proximaCita.fecha) : "—"} ${stats.proximaCita.hora ? formatTime(stats.proximaCita.hora) : ""}`
        : "—",
      subtitle: stats.proximaCita
        ? `${stats.proximaCita.medico || "Médico"} • ${stats.proximaCita.especialidad || ""}`
        : "Sin citas programadas",
      icon: Calendar,
      color: "text-teal-600",
      bg: "bg-teal-50",
      href: "/paciente/citas",
    },
    {
      title: "Citas este mes",
      value: stats.citasEsteMes.toString(),
      subtitle: "Programadas",
      icon: Clock,
      color: "text-teal-600",
      bg: "bg-teal-50",
      href: "/paciente/citas",
    },
    {
      title: "En lista de espera",
      value: stats.enListaEspera.toString(),
      subtitle: stats.enListaEspera > 0 ? "Pendientes" : "Sin solicitudes",
      icon: AlertCircle,
      color: "text-yellow-600",
      bg: "bg-yellow-50",
      href: "/paciente/lista-espera",
    },
    {
      title: "Pre-consultas",
      value: "—",
      subtitle: "No disponible",
      icon: User,
      color: "text-purple-600",
      bg: "bg-purple-50",
      href: "/paciente/preconsulta",
    },
  ];

  const quickActions = [
    {
      label: "Agendar nueva cita",
      href: "/paciente/agendar",
      icon: PlusCircle,
      color: "bg-teal-600 hover:bg-teal-700",
    },
    {
      label: "Ver mis citas",
      href: "/paciente/citas",
      icon: Calendar,
      color: "bg-teal-600 hover:bg-teal-700",
    },
    {
      label: "Lista de espera",
      href: "/paciente/lista-espera",
      icon: AlertCircle,
      color: "bg-teal-600 hover:bg-teal-700",
    },
    {
      label: "Completar pre-consulta",
      href: "/paciente/preconsulta",
      icon: User,
      color: "bg-teal-600 hover:bg-teal-700",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Bienvenido, {user?.nombre?.split(" ")[0] || "Paciente"}
          </h1>
          <p className="text-gray-500 mt-1">
            Gestiona tus citas médicas y historial desde aquí
          </p>
        </div>
        <Link
          to="/paciente/agendar"
          className="inline-flex items-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
        >
          <PlusCircle className="h-5 w-5" />
          Agendar cita
        </Link>
      </div>

      {/* Riesgo No-Show */}
      {riesgo && (
        <div
          className={`bg-white rounded-xl border p-4 ${getRiesgoColor(riesgo.nivel)}`}
        >
          <div className="flex items-center gap-3">
            <div className="p-3 bg-white/50 rounded-lg">
              {getRiesgoIcon(riesgo.nivel)}
            </div>
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900">
                Tu nivel de riesgo de inasistencia
              </h3>
              <p className="text-sm text-gray-600">
                El sistema ha calculado tu perfil basado en tu historial de
                citas.
              </p>
            </div>
            <div className="text-right">
              <span
                className={`inline-flex items-center gap-1 px-4 py-2 rounded-full text-sm font-semibold ${getRiesgoColor(riesgo.nivel).replace("border border-", "border-2 ")}`}
              >
                {getRiesgoIcon(riesgo.nivel)}
                {riesgo.nivel}
              </span>
              {riesgo.score !== undefined && (
                <p className="text-xs text-gray-500 mt-1">
                  Score: {riesgo.score}/100{" "}
                  {riesgo.percentil ? `• Percentil ${riesgo.percentil}` : ""}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Link
            key={index}
            to={stat.href}
            className={`p-5 rounded-xl border ${stat.bg} hover:border-teal-200 transition-colors`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">
                  {stat.title}
                </p>
                <p className="text-2xl font-bold text-gray-900 mt-1">
                  {stat.value}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">{stat.subtitle}</p>
              </div>
              <div className={`p-3 rounded-full ${stat.bg} ${stat.color}`}>
                <stat.icon className="h-6 w-6" />
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Accesos rápidos
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickActions.map((action, index) => (
            <Link
              key={index}
              to={action.href}
              className={`flex items-center gap-3 p-4 rounded-xl text-white ${action.color} transition-colors hover:shadow-lg`}
            >
              <div className="p-2 bg-white/20 rounded-lg">
                <action.icon className="h-5 w-5" />
              </div>
              <span className="font-medium">{action.label}</span>
            </Link>
          ))}
        </div>
      </div>

      {/* Upcoming appointments */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold text-gray-900">
            Próximas citas
          </h2>
          <Link
            to="/paciente/citas"
            className="text-sm text-teal-600 hover:text-teal-800 font-medium"
          >
            Ver todas
          </Link>
        </div>
        {proximasCitas.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No tienes citas programadas</p>
            <p className="text-sm text-gray-400 mt-1">
              Haz clic en "Agendar cita" para programar una
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {proximasCitas.map((cita) => (
              <div
                key={cita.cita_id || cita.id}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-teal-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-teal-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {cita.medico || "Médico"} •{" "}
                      {cita.especialidad || "Especialidad"}
                    </p>
                    <p className="text-sm text-gray-500">
                      {cita.fecha ? formatDate(cita.fecha) : "—"}{" "}
                      {cita.hora ? formatTime(cita.hora) : ""} •{" "}
                      {cita.sede || "Sede por confirmar"}
                    </p>
                  </div>
                </div>
                <span
                  className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(cita.estado)}`}
                >
                  {getEstadoLabel(cita.estado)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
          <h3 className="font-medium text-teal-900 mb-2 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Recordatorio
          </h3>
          <p className="text-sm text-teal-700">
            Llega 15 minutos antes de tu cita. Trae tu documento de identidad y
            orden médica si aplica.
          </p>
        </div>
        <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
          <h3 className="font-medium text-teal-900 mb-2 flex items-center gap-2">
            <User className="h-5 w-5" />
            Pre-consulta disponible
          </h3>
          <p className="text-sm text-teal-700">
            Completa tu ficha de pre-consulta antes de tu cita para agilizar la
            atención.
          </p>
        </div>
      </div>
    </div>
  );
};
