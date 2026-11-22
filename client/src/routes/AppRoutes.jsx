// src/routes/AppRoutes.jsx

import React, { Suspense, lazy } from "react";
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

// Lazy-loaded page components
const PacienteDashboard = lazy(() =>
  import("../pages/paciente/Dashboard").then((m) => m.PacienteDashboard),
);
const PacienteCitas = lazy(() =>
  import("../pages/paciente/Citas").then((m) => m.PacienteCitas),
);
const PacienteAgendarCita = lazy(() =>
  import("../pages/paciente/AgendarCita").then((m) => m.PacienteAgendarCita),
);
const PacienteListaEspera = lazy(() =>
  import("../pages/paciente/ListaEspera").then((m) => m.PacienteListaEspera),
);
const PacientePreconsulta = lazy(() =>
  import("../pages/paciente/Preconsulta").then((m) => m.PacientePreconsulta),
);
const PacientePerfil = lazy(() =>
  import("../pages/paciente/Perfil").then((m) => m.PacientePerfil),
);
const MedicoDashboard = lazy(() =>
  import("../pages/medico/Dashboard").then((m) => m.MedicoDashboard),
);
const MedicoAgenda = lazy(() =>
  import("../pages/medico/Agenda").then((m) => m.MedicoAgenda),
);
const MedicoCitas = lazy(() =>
  import("../pages/medico/Citas").then((m) => m.MedicoCitas),
);
const MedicoPacientes = lazy(() =>
  import("../pages/medico/Pacientes").then((m) => m.MedicoPacientes),
);
const RecepcionistaDashboard = lazy(() =>
  import("../pages/recepcionista/Dashboard").then((m) => m.RecepcionistaDashboard),
);
const RecepcionistaCitas = lazy(() =>
  import("../pages/recepcionista/Citas").then((m) => m.RecepcionistaCitas),
);
const RecepcionistaPacientes = lazy(() =>
  import("../pages/recepcionista/Pacientes").then((m) => m.RecepcionistaPacientes),
);
const RecepcionistaHorarios = lazy(() =>
  import("../pages/recepcionista/Horarios").then((m) => m.RecepcionistaHorarios),
);

const AdminDashboard = lazy(() =>
  import("../pages/admin/Dashboard").then((m) => m.AdminDashboard),
);
const AdminUsuarios = lazy(() =>
  import("../pages/admin/Usuarios").then((m) => m.AdminUsuarios),
);
const AdminMedicos = lazy(() =>
  import("../pages/admin/Medicos").then((m) => m.AdminMedicos),
);
const AdminSedes = lazy(() =>
  import("../pages/admin/Sedes").then((m) => m.AdminSedes),
);
const AdminReportes = lazy(() =>
  import("../pages/admin/Reportes").then((m) => m.AdminReportes),
);
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
