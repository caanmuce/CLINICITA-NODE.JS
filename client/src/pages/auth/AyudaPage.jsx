import React from "react";
import { Link } from "react-router-dom";

const CLINICITA_COLORS = {
  dark: "#1B2A4A",
  mid: "#2E5090",
  light: "#E8F0FE",
  accent: "#00B4D8",
  white: "#FFFFFF",
  grayBg: "#F8FAFC",
  textDark: "#1E293B",
  textMuted: "#64748B",
};

const AyudaPage = () => {
  const faqs = [
    {
      question: "¿Cómo agendo una cita?",
      answer:
        "Inicia sesión como paciente, entra a <strong>Agendar cita</strong>, elige especialidad, fecha y horario disponible.",
    },
    {
      question: "¿Cómo cancelo o reprogramo?",
      answer:
        "En <strong>Mis citas</strong> usa las acciones de cancelar o reprogramar. El cupo puede pasar a la lista de espera.",
    },
    {
      question: "¿Qué recordatorios recibiré?",
      answer:
        "WhatsApp, SMS y/o correo, según la configuración de la IPS y los datos de contacto registrados.",
    },
  ];

  return (
    <div
      className="min-h-screen"
      style={{ backgroundColor: CLINICITA_COLORS.grayBg }}
    >
      <nav
        className="px-6 py-4"
        style={{ backgroundColor: CLINICITA_COLORS.dark }}
      >
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link
            to="/"
            className="text-xl font-bold text-white flex items-center gap-2"
            aria-label="CliniCita - Inicio"
          >
            <svg
              className="w-7 h-7"
              fill="currentColor"
              viewBox="0 0 16 16"
              aria-hidden="true"
            >
              <path d="M8 1.5a.5.5 0 0 1 .5.5v1a.5.5 0 0 1-1 0V2a.5.5 0 0 1 .5-.5zM3.5 4a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5zM14.5 4a.5.5 0 0 1 .5-.5h1a.5.5 0 0 1 0 1h-1a.5.5 0 0 1-.5-.5zM2.146 5.646a.5.5 0 0 1 .708 0L4 7.293l1.146-1.147a.5.5 0 1 1 .708.708L4.707 8l1.147 1.146a.5.5 0 0 1-.708.708L4 8.707l-1.146 1.147a.5.5 0 0 1-.708-.708L3.293 8 2.146 6.854a.5.5 0 0 1 0-.708zM13.854 5.646a.5.5 0 0 1 .708 0l1.147 1.147a.5.5 0 0 1-.708.708L13.293 8l1.146 1.147a.5.5 0 0 1-.708.708l-1.147-1.147a.5.5 0 0 1 0-.708z" />
            </svg>
            <span>
              Clini<span style={{ color: CLINICITA_COLORS.accent }}>Cita</span>
            </span>
          </Link>
          <Link
            to="/"
            className="px-4 py-2 text-sm font-medium text-white border rounded-lg hover:bg-white/10 transition-colors"
            style={{ borderColor: CLINICITA_COLORS.mid }}
          >
            Volver
          </Link>
        </div>
      </nav>

      <header
        className="px-6 py-8"
        style={{ backgroundColor: CLINICITA_COLORS.mid }}
      >
        <div className="max-w-3xl mx-auto">
          <h1 className="text-3xl font-bold text-white">Centro de ayuda</h1>
        </div>
      </header>

      <main className="px-6 py-10">
        <div className="max-w-3xl mx-auto">
          <div
            className="bg-white rounded-2xl shadow-sm"
            style={{ border: "1px solid #E2E8F0" }}
          >
            <div className="divide-y" style={{ borderColor: "#E2E8F0" }}>
              {faqs.map((faq, index) => (
                <details key={index} className="p-6" open={index === 0}>
                  <summary
                    className="cursor-pointer list-none font-medium text-lg"
                    style={{ color: CLINICITA_COLORS.textDark }}
                  >
                    {faq.question}
                    <span
                      className="float-right"
                      style={{ color: CLINICITA_COLORS.textMuted }}
                    >
                      ▼
                    </span>
                  </summary>
                  <div
                    className="mt-4 text-gray-700 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: faq.answer }}
                  />
                </details>
              ))}
            </div>
          </div>
        </div>
      </main>

      <footer
        className="px-6 py-4 border-t"
        style={{
          borderColor: "#E2E8F0",
          backgroundColor: CLINICITA_COLORS.white,
        }}
      >
        <p
          className="text-center text-sm"
          style={{ color: CLINICITA_COLORS.textMuted }}
        >
          © 2026 CliniCita
        </p>
      </footer>
    </div>
  );
};

export default AyudaPage;
