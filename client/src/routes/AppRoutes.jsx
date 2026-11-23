// src/routes/AppRoutes.jsx

import React, { Suspense } from "react";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { ProtectedRoute } from "../components/layout/ProtectedRoute";
import { RoleLayout } from "../components/layout/RoleLayout";
import LoginPage from "../pages/LoginPage";
import RegisterPage from "../pages/auth/RegisterPage";
import RecuperarPage from "../pages/auth/RecuperarPage";
import PrivacidadPage from "../pages/auth/PrivacidadPage";
import TerminosPage from "../pages/auth/TerminosPage";
import AyudaPage from "../pages/auth/AyudaPage";
import ContactoPage, { LandingPage } from "../pages/auth/ContactoPage";

// Page components (static imports)
import { PacienteDashboard } from "../pages/paciente/Dashboard";
import { PacienteCitas } from "../pages/paciente/Citas";
import { PacienteAgendarCita } from "../pages/paciente/AgendarCita";
import { PacienteListaEspera } from "../pages/paciente/ListaEspera";
import { PacientePreconsulta } from "../pages/paciente/Preconsulta";
import { PacientePerfil } from "../pages/paciente/Perfil";
import { MedicoDashboard } from "../pages/medico/Dashboard";
import { MedicoAgenda } from "../pages/medico/Agenda";
import MedicoCitas from "../pages/medico/Citas";
import { MedicoPacientes } from "../pages/medico/Pacientes";
import { RecepcionistaDashboard } from "../pages/recepcionista/Dashboard";
import { RecepcionistaCitas } from "../pages/recepcionista/Citas";
import { RecepcionistaPacientes } from "../pages/recepcionista/Pacientes";
import { RecepcionistaHorarios } from "../pages/recepcionista/Horarios";
import { AdminDashboard } from "../pages/admin/Dashboard";
import { AdminUsuarios } from "../pages/admin/Usuarios";
import { AdminMedicos } from "../pages/admin/Medicos";
import { AdminSedes } from "../pages/admin/Sedes";
import { AdminReportes } from "../pages/admin/Reportes";
function AppRoutes() {
  const { user, loading, isAuthenticated } = useAuth();

  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/registro" element={<RegisterPage />} />
        <Route path="/recuperar" element={<RecuperarPage />} />
        <Route path="/privacidad" element={<PrivacidadPage />} />
        <Route path="/terminos" element={<TerminosPage />} />
        <Route path="/ayuda" element={<AyudaPage />} />
        <Route path="/contacto" element={<ContactoPage />} />

        {/* PACIENTE routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["paciente"]}>
              <RoleLayout />
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

        {/* MEDICO routes */}
        <Route
          element={
            <ProtectedRoute allowedRoles={["medico"]}>
              <RoleLayout />
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
            <ProtectedRoute allowedRoles={["recepcionista"]}>
              <RoleLayout />
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
            <ProtectedRoute allowedRoles={["administrador"]}>
              <RoleLayout />
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

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default AppRoutes;
