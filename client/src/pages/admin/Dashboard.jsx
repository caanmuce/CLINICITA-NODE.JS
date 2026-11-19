// src/pages/admin/Dashboard.jsx

import React, { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Users, Calendar, DollarSign, TrendingUp, AlertCircle, UserPlus, Building2 } from 'lucide-react';
import { 
  AnimatedCard, 
  StaggerContainer, 
  StaggerItem,
  SlideUp,
  FadeIn,
  StatCard,
  QuickAction
} from '../../components/ui';
import { getColombiaDate } from '../../utils/dateUtils';
import { usuariosApi, citasApi, medicosApi } from '../../api';

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

  useEffect(() => {
    const fetchTotalPacientes = async () => {
      try {
        setLoadingPacientes(true);
        const data = await usuariosApi.listar({ rol: 'paciente' });
        setTotalPacientes(data?.total || data?.length || 0);
        setErrorPacientes(false);
      } catch (err) {
        console.error('Error fetching total pacientes:', err);
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
        console.error('Error fetching citas hoy:', err);
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
        console.error('Error fetching medicos:', err);
        setErrorMedicos(true);
      } finally {
        setLoadingMedicos(false);
      }
    };
    fetchMedicos();
  }, []);

  const statCards = [
    { 
      title: 'Total pacientes', 
      value: totalPacientes, 
      subtitle: 'Registrados', 
      icon: Users, 
      color: 'text-blue-600', 
      bg: 'bg-blue-50', 
      href: '/admin/usuarios',
      loading: loadingPacientes,
      error: errorPacientes,
      notAvailable: false
    },
    { 
      title: 'Citas hoy', 
      value: citasHoy, 
      subtitle: 'Programadas', 
      icon: Calendar, 
      color: 'text-green-600', 
      bg: 'bg-green-50', 
      href: '/admin/reportes',
      loading: loadingCitas,
      error: errorCitas,
      notAvailable: false
    },
    { 
      title: 'Ingresos mes', 
      value: '$0', 
      subtitle: 'Facturacion', 
      icon: DollarSign, 
      color: 'text-yellow-600', 
      bg: 'bg-yellow-50', 
      href: '/admin/reportes',
      loading: false,
      error: false,
      notAvailable: true
    },
    { 
      title: 'Medicos activos', 
      value: medicosActivos, 
      subtitle: 'En plantilla', 
      icon: UserPlus, 
      color: 'text-purple-600', 
      bg: 'bg-purple-50', 
      href: '/admin/medicos',
      loading: loadingMedicos,
      error: errorMedicos,
      notAvailable: false
    },
  ];

  const quickActions = [
    { label: 'Usuarios', href: '/admin/usuarios', icon: Users, color: 'bg-blue-600' },
    { label: 'Medicos', href: '/admin/medicos', icon: UserPlus, color: 'bg-green-600' },
    { label: 'Reportes', href: '/admin/reportes', icon: TrendingUp, color: 'bg-indigo-600' },
    { label: 'Sedes', href: '/admin/sedes', icon: Building2, color: 'bg-orange-600' },
  ];

  return (
    <SlideUp>
      <div className="space-y-6">
        <FadeIn>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Panel de Administracion</h1>
              <p className="text-gray-500 mt-1">Gestion completa del centro medico - {user?.nombre || 'Administrador'}</p>
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
                <TrendingUp className="h-5 w-5 text-indigo-600" />
                Resumen rapido
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-3xl font-bold text-indigo-600">0</p>
                <p className="text-sm text-gray-500">Nuevos pacientes esta semana</p>
              </div>
              <div className="text-center p-4 bg-gray-50 rounded-xl">
                <p className="text-3xl font-bold text-green-600">0%</p>
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
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Accesos rapidos</h2>
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

        <FadeIn delay={0.4}>
          <AnimatedCard className="bg-yellow-50 border border-yellow-200 p-4">
            <h3 className="font-medium text-yellow-900 mb-2 flex items-center gap-2">
              <AlertCircle className="h-5 w-5" />
              Funcionalidad parcial
            </h3>
            <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
              <li>Conectado: Total pacientes, Citas hoy, Medicos activos (endpoints admin)</li>
              <li>Pendiente backend: Ingresos mes (requiere modulo facturacion)</li>
              <li>Sin ruta: Configuracion (/admin/configuracion no existe)</li>
            </ul>
          </AnimatedCard>
        </FadeIn>
      </div>
    </SlideUp>
  );
};