// src/pages/paciente/Dashboard.jsx

import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Calendar, Clock, User, AlertCircle, PlusCircle, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { citasApi } from '../../api/citas';
import { listaEsperaApi } from '../../api/listaEspera';
// No UI components needed - using standard elements
// import { } from '../../components/ui';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-PE', { 
    weekday: 'short', 
    day: 'numeric', 
    month: 'short',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const getEstadoColor = (estado) => {
  switch (estado) {
    case 'confirmada': return 'bg-green-100 text-green-800';
    case 'pendiente': return 'bg-yellow-100 text-yellow-800';
    case 'completada': return 'bg-blue-100 text-blue-800';
    case 'cancelada': return 'bg-red-100 text-red-800';
    default: return 'bg-gray-100 text-gray-800';
  }
};

const getEstadoLabel = (estado) => {
  switch (estado) {
    case 'confirmada': return 'Confirmada';
    case 'pendiente': return 'Pendiente';
    case 'completada': return 'Completada';
    case 'cancelada': return 'Cancelada';
    default: return estado;
  }
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
        const citas = citasResponse.data || citasResponse || [];
        
        // Filtrar citas futuras (pendiente, confirmada) y ordenar por fecha
        const ahora = new Date();
        const citasFuturas = citas
          .filter(c => ['pendiente', 'confirmada'].includes(c.estado) && new Date(c.fecha_hora) >= ahora)
          .sort((a, b) => new Date(a.fecha_hora) - new Date(b.fecha_hora));
        
        setProximasCitas(citasFuturas.slice(0, 3));

        // Contar citas de este mes
        const inicioMes = new Date();
        inicioMes.setDate(1);
        inicioMes.setHours(0, 0, 0, 0);
        const finMes = new Date(inicioMes);
        finMes.setMonth(finMes.getMonth() + 1);
        
        const citasEsteMes = citas.filter(c => {
          const fecha = new Date(c.fecha_hora);
          return fecha >= inicioMes && fecha < finMes && c.estado !== 'cancelada';
        }).length;

        // Cargar lista de espera
        let enListaEspera = 0;
        try {
          const listaResponse = await listaEsperaApi.listarMiLista();
          const lista = listaResponse.data || listaResponse || [];
          enListaEspera = lista.filter(item => item.estado === 'pendiente').length;
        } catch (listaError) {
          console.warn('No se pudo cargar lista de espera:', listaError);
        }

        setStats({
          proximaCita: citasFuturas[0] || null,
          citasEsteMes,
          enListaEspera,
        });
      } catch (err) {onsole.error('Error cargando dashboard:', err);
        setError('No se pudo cargar la información del dashboard');
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
          <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
        </div>
      </div>
    );
  }

  const statCards = [
    { 
      title: 'Próxima cita', 
      value: stats.proximaCita ? formatDate(stats.proximaCita.fecha_hora) : '—', 
      subtitle: stats.proximaCita ? `${stats.proximaCita.medico_nombre || 'Médico'} • ${stats.proximaCita.especialidad_nombre || ''}` : 'Sin citas programadas', 
      icon: Calendar, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50', 
      href: '/paciente/citas' 
    },
    { 
      title: 'Citas este mes', 
      value: stats.citasEsteMes.toString(), 
      subtitle: 'Programadas', 
      icon: Clock, 
      color: 'text-green-600', 
      bg: 'bg-green-50', 
      href: '/paciente/citas' 
    },
    { 
      title: 'En lista de espera', 
      value: stats.enListaEspera.toString(), 
      subtitle: stats.enListaEspera > 0 ? 'Pendientes' : 'Sin solicitudes', 
      icon: AlertCircle, 
      color: 'text-yellow-600', 
      bg: 'bg-yellow-50', 
      href: '/paciente/lista-espera' 
    },
    { 
      title: 'Pre-consultas', 
      value: '—', 
      subtitle: 'No disponible', 
      icon: User, 
      color: 'text-purple-600', 
      bg: 'bg-purple-50', 
      href: '/paciente/preconsulta' 
    },
  ];

  const quickActions = [
    { label: 'Agendar nueva cita', href: '/paciente/agendar', icon: PlusCircle, color: 'bg-indigo-600 hover:bg-indigo-700' },
    { label: 'Ver mis citas', href: '/paciente/citas', icon: Calendar, color: 'bg-blue-600 hover:bg-blue-700' },
    { label: 'Lista de espera', href: '/paciente/lista-espera', icon: AlertCircle, color: 'bg-yellow-600 hover:bg-yellow-700' },
    { label: 'Completar pre-consulta', href: '/paciente/preconsulta', icon: User, color: 'bg-purple-600 hover:bg-purple-700' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bienvenido, {user?.nombre?.split(' ')[0] || 'Paciente'}</h1>
          <p className="text-gray-500 mt-1">Gestiona tus citas médicas y historial desde aquí</p>
        </div>
        <Link to="/paciente/agendar" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors">
          <PlusCircle className="h-5 w-5" />
          Agendar cita
        </Link>
      </div>

      {/* Error display */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((stat, index) => (
          <Link key={index} to={stat.href} className={`p-5 rounded-xl border ${stat.bg} hover:border-indigo-200 transition-colors`}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500">{stat.title}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{stat.value}</p>
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
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Accesos rápidos</h2>
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
          <h2 className="text-lg font-semibold text-gray-900">Próximas citas</h2>
          <Link to="/paciente/citas" className="text-sm text-indigo-600 hover:text-indigo-800 font-medium">Ver todas</Link>
        </div>
        {proximasCitas.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No tienes citas programadas</p>
            <p className="text-sm text-gray-400 mt-1">Haz clic en "Agendar cita" para programar una</p>
          </div>
        ) : (
          <div className="space-y-3">
            {proximasCitas.map((cita) => (
              <div key={cita.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-indigo-100 rounded-lg">
                    <Calendar className="h-6 w-6 text-indigo-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {cita.medico_nombre || 'Médico'} • {cita.especialidad_nombre || 'Especialidad'}
                    </p>
                    <p className="text-sm text-gray-500">
                      {formatDate(cita.fecha_hora)} • {cita.sede_nombre || 'Sede'}
                    </p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${getEstadoColor(cita.estado)}`}>
                  {getEstadoLabel(cita.estado)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Notices */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
          <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Recordatorio
          </h3>
          <p className="text-sm text-blue-700">Llega 15 minutos antes de tu cita. Trae tu documento de identidad y orden médica si aplica.</p>
        </div>
        <div className="bg-green-50 border border-green-200 rounded-xl p-4">
          <h3 className="font-medium text-green-900 mb-2 flex items-center gap-2">
            <User className="h-5 w-5" />
            Pre-consulta disponible
          </h3>
          <p className="text-sm text-green-700">Completa tu ficha de pre-consulta antes de tu cita para agilizar la atención.</p>
        </div>
      </div>
    </div>
  );
};