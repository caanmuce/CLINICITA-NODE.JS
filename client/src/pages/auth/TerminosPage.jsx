import React from 'react';
import { Link } from 'react-router-dom';

const CLINICITA_COLORS = {
  dark: '#1B2A4A',
  mid: '#2E5090',
  light: '#E8F0FE',
  accent: '#00B4D8',
  white: '#FFFFFF',
  grayBg: '#F8FAFC',
  textDark: '#1E293B',
  textMuted: '#64748B',
};

const TerminosPage = () => {
  return (
    <div className="min-h-screen" style={{ backgroundColor: CLINICITA_COLORS.grayBg }}>
      <nav className="px-6 py-4" style={{ backgroundColor: CLINICITA_COLORS.dark }}>
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <Link to="/" className="text-xl font-bold text-white flex items-center gap-2" aria-label="CliniCita - Inicio">
            <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true">
              <path d="M8 1.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0V2a.5.5 0 0 1 .5-.5zM3.5 4a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5zM14.5 4a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5zM2.146 5.646a.5.5 0 0 1 .708 0L4 7.293l1.146-1.147a.5.5 0 1 1 .708.708L4.707 8l1.147 1.146a.5.5 0 0 1-.708.708L4 8.707l-1.146 1.147a.5.5 0 0 1-.708-.708L3.293 8 2.146 6.854a.5.5 0 0 1 0-.708zM13.854 5.646a.5.5 0 0 1 .708 0l1.147 1.147a.5.5 0 0 1-.708.708L13.293 8l1.146 1.147a.5.5 0 0 1-.708.708l-1.147-1.147a.5.5 0 0 1 0-.708z" />
            </svg>
            <span>Clini<span style={{ color: CLINICITA_COLORS.accent }}>Cita</span></span>
          </Link>
          <Link to="/" className="px-4 py-2 text-sm font-medium text-white border rounded-lg hover:bg-white/10 transition-colors" style={{ borderColor: CLINICITA_COLORS.mid }}>
            Volver
          </Link>
        </div>
      </nav>

      <header className="px-6 py-8" style={{ backgroundColor: CLINICITA_COLORS.mid }}>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white">Términos de uso</h1>
        </div>
      </header>

      <main className="px-6 py-10">
        <div className="max-w-4xl mx-auto">
          <div className="bg-white rounded-2xl shadow-sm p-8" style={{ border: '1px solid #E2E8F0' }}>
            <h2 className="text-xl font-semibold mb-4" style={{ color: CLINICITA_COLORS.textDark }}>Uso de la plataforma</h2>
            <p className="mb-6 text-gray-700 leading-relaxed">
              El usuario se compromete a suministrar información veraz, respetar los horarios agendados y notificar cancelaciones con la antelación definida por la IPS.
            </p>
            <h2 className="text-lg font-semibold mt-8 mb-4" style={{ color: CLINICITA_COLORS.textDark }}>Cuentas y roles</h2>
            <p className="mb-6 text-gray-700 leading-relaxed">
              El acceso está restringido al rol asignado: paciente, médico, recepcionista o administrador. Está prohibido compartir credenciales.
            </p>
            <p className="text-sm text-gray-500">
              Plantilla para completar con las políticas internas de la institución.
            </p>
          </div>
        </div>
      </main>

      <footer className="px-6 py-4 border-t" style={{ borderColor: '#E2E8F0', backgroundColor: CLINICITA_COLORS.white }}>
        <p className="text-center text-sm" style={{ color: CLINICITA_COLORS.textMuted }}>© 2026 CliniCita</p>
      </footer>
    </div>
  );
};

export default TerminosPage;