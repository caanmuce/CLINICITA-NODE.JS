// src/routes/AppRoutes.jsx

import React, { Suspense, lazy } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ProtectedRoute } from '../components/layout/ProtectedRoute';
import { RoleLayout } from '../components/layout/RoleLayout';
import LoginPage from '../pages/LoginPage';
import RegisterPage from '../pages/auth/RegisterPage';
import RecuperarPage from '../pages/auth/RecuperarPage';
import PrivacidadPage from '../pages/auth/PrivacidadPage';
import TerminosPage from '../pages/auth/TerminosPage';
import AyudaPage from '../pages/auth/AyudaPage';
import ContactoPage from '../pages/auth/ContactoPage';

// Lazy-loaded page components
const PacienteDashboard = lazy(() => import('../pages/paciente/Dashboard').then(m => ({ default: m.PacienteDashboard })));
const PacienteCitas = lazy(() => import('../pages/paciente/Citas').then(m => ({ default: m.PacienteCitas })));
const PacienteAgendarCita = lazy(() => import('../pages/paciente/AgendarCita').then(m => ({ default: m.PacienteAgendarCita })));
const PacienteListaEspera = lazy(() => import('../pages/paciente/ListaEspera').then(m => ({ default: m.PacienteListaEspera })));
const PacientePreconsulta = lazy(() => import('../pages/paciente/Preconsulta').then(m => ({ default: m.PacientePreconsulta })));
const PacientePerfil = lazy(() => import('../pages/paciente/Perfil').then(m => ({ default: m.PacientePerfil })));

const MedicoDashboard = lazy(() => import('../pages/medico/Dashboard').then(m => ({ default: m.MedicoDashboard })));
const MedicoAgenda = lazy(() => import('../pages/medico/Agenda').then(m => ({ default: m.MedicoAgenda })));
const MedicoCitas = lazy(() => import('../pages/medico/Citas').then(m => ({ default: m.MedicoCitas })));
const MedicoPacientes = lazy(() => import('../pages/medico/Pacientes').then(m => ({ default: m.MedicoPacientes })));

const RecepcionistaDashboard = lazy(() => import('../pages/recepcionista/Dashboard').then(m => ({ default: m.RecepcionistaDashboard })));
const RecepcionistaCitas = lazy(() => import('../pages/recepcionista/Citas').then(m => ({ default: m.RecepcionistaCitas })));
const RecepcionistaPacientes = lazy(() => import('../pages/recepcionista/Pacientes').then(m => ({ default: m.RecepcionistaPacientes })));
const RecepcionistaHorarios = lazy(() => import('../pages/recepcionista/Horarios').then(m => ({ default: m.RecepcionistaHorarios })));

const AdminDashboard = lazy(() => import('../pages/admin/Dashboard').then(m => ({ default: m.AdminDashboard })));
const AdminUsuarios = lazy(() => import('../pages/admin/Usuarios').then(m => ({ default: m.AdminUsuarios })));
const AdminMedicos = lazy(() => import('../pages/admin/Medicos').then(m => ({ default: m.AdminMedicos })));
const AdminSedes = lazy(() => import('../pages/admin/Sedes').then(m => ({ default: m.AdminSedes })));
const AdminReportes = lazy(() => import('../pages/admin/Reportes').then(m => ({ default: m.AdminReportes })));

// Loading fallback
const PageLoading = () => (
  <div className="flex items-center justify-center min-h-[400px]">
    <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" />
  </div>
);

const WithLayout = ({ children }) => (
  <Suspense fallback={<PageLoading />}>
    <RoleLayout>{children}</RoleLayout>
  </Suspense>
);

const AppRoutes = () => {
  const { isAuthenticated, user, loading } = useAuth();

  if (loading) {
    return (
      <Router>
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-600 border-t-transparent" />
        </div>
      </Router>
    );
  }

  const getDefaultRoute = () => {
    if (!isAuthenticated) return '/login';
    const role = user?.rol?.toLowerCase();
    const routes = {
      paciente: '/paciente',
      medico: '/medico',
      recepcionista: '/recepcionista',
      administrador: '/admin',
    };
    return routes[role] || '/login';
  };

  return (
    <Router>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/recuperar" element={<RecuperarPage />} />
        <Route path="/privacidad" element={<PrivacidadPage />} />
        <Route path="/terminos" element={<TerminosPage />} />
        <Route path="/ayuda" element={<AyudaPage />} />
        <Route path="/contacto" element={<ContactoPage />} />
        <Route path="/" element={<Navigate to={getDefaultRoute()} replace />} />
        
        {/* PACIENTE routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['paciente']}>
              <WithLayout />
            </ProtectedRoute>
          }
        >
          <Route path="paciente" element={<Navigate to="/paciente/dashboard" replace />} />
          <Route path="paciente/dashboard" element={<PacienteDashboard />} />
          <Route path="paciente/citas" element={<PacienteCitas />} />
          <Route path="paciente/agendar" element={<PacienteAgendarCita />} />
          <Route path="paciente/lista-espera" element={<PacienteListaEspera />} />
          <Route path="paciente/preconsulta" element={<PacientePreconsulta />} />
          <Route path="paciente/perfil" element={<PacientePerfil />} />
        </Route>

        {/* MÉDICO routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['medico']}>
              <WithLayout />
            </ProtectedRoute>
          }
        >
          <Route path="medico" element={<Navigate to="/medico/dashboard" replace />} />
          <Route path="medico/dashboard" element={<MedicoDashboard />} />
          <Route path="medico/agenda" element={<MedicoAgenda />} />
          <Route path="medico/citas" element={<MedicoCitas />} />
          <Route path="medico/pacientes" element={<MedicoPacientes />} />
        </Route>

        {/* RECEPCIONISTA routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['recepcionista']}>
              <WithLayout />
            </ProtectedRoute>
          }
        >
          <Route path="recepcionista" element={<Navigate to="/recepcionista/dashboard" replace />} />
          <Route path="recepcionista/dashboard" element={<RecepcionistaDashboard />} />
          <Route path="recepcionista/citas" element={<RecepcionistaCitas />} />
          <Route path="recepcionista/pacientes" element={<RecepcionistaPacientes />} />
          <Route path="recepcionista/horarios" element={<RecepcionistaHorarios />} />
        </Route>

        {/* ADMINISTRADOR routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={['administrador']}>
              <WithLayout />
            </ProtectedRoute>
          }
        >
          <Route path="admin" element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="admin/dashboard" element={<AdminDashboard />} />
          <Route path="admin/usuarios" element={<AdminUsuarios />} />
          <Route path="admin/medicos" element={<AdminMedicos />} />
          <Route path="admin/sedes" element={<AdminSedes />} />
          <Route path="admin/reportes" element={<AdminReportes />} />
        </Route>

        <Route path="*" element={<Navigate to={getDefaultRoute()} replace />} />
      </Routes>
    </Router>
  );
};

export default AppRoutes;