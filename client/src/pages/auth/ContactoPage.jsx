import React, { useState } from 'react';
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
  errorBg: '#FEF2F2',
  errorBorder: '#FECACA',
  errorText: '#B91C1C',
  successBg: '#F0FDF4',
  successBorder: '#BBF7D0',
  successText: '#166534',
};

const ContactoPage = () => {
  const [formData, setFormData] = useState({
    nombre: '',
    correo: '',
    asunto: '',
    mensaje: ''
  });
  const [isLoading, setIsLoading] = useState(false);
  const [status, setStatus] = useState(null);

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.nombre.trim() || !formData.correo.trim() || !formData.asunto.trim() || !formData.mensaje.trim()) {
      setStatus('error');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo)) {
      setStatus('error');
      return;
    }

    setIsLoading(true);
    setStatus(null);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsLoading(false);
    setStatus('success');
    setFormData({ nombre: '', correo: '', asunto: '', mensaje: '' });
  };

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
          <Link to="/login" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-lg hover:bg-indigo-700 transition-colors">
            Iniciar sesión
          </Link>
        </div>
      </nav>

      <header className="px-6 py-8" style={{ backgroundColor: CLINICITA_COLORS.mid }}>
        <div className="max-w-4xl mx-auto">
          <h1 className="text-3xl font-bold text-white">Contacto</h1>
        </div>
      </header>
<main className="px-6 py-10">
        <div className="max-w-4xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <div className="bg-white rounded-2xl shadow-sm p-6" style={{ border: '1px solid #E2E8F0' }}>
                {status === 'success' && (
                  <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: CLINICITA_COLORS.successBg, border: `1px solid ${CLINICITA_COLORS.successBorder}`, color: CLINICITA_COLORS.successText }}>
                    <p className="font-medium">¡Mensaje enviado correctamente!</p>
                    <p className="text-sm mt-1">Gracias por contactarnos. Te responderemos a la brevedad.</p>
                  </div>
                )}
                {status === 'error' && (
                  <div className="mb-6 p-4 rounded-lg" style={{ backgroundColor: CLINICITA_COLORS.errorBg, border: `1px solid ${CLINICITA_COLORS.errorBorder}`, color: CLINICITA_COLORS.errorText }}>
                    <p className="font-medium">Por favor completa todos los campos correctamente.</p>
                    <p className="text-sm mt-1">El correo debe tener un formato válido.</p>
                  </div>
                )}

                <form onSubmit={handleSubmit} noValidate>
                  <div className="mb-4">
                    <label htmlFor="nombre" className="block text-sm font-medium text-gray-700 mb-1">
                      Nombre
                    </label>
                    <input
                      type="text"
                      id="nombre"
                      name="nombre"
                      required
                      value={formData.nombre}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors disabled:opacity-50"
                      style={{ borderColor: status === 'error' ? CLINICITA_COLORS.errorBorder : '#E2E8F0' }}
                      placeholder="Tu nombre"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="correo" className="block text-sm font-medium text-gray-700 mb-1">
                      Correo
                    </label>
                    <input
                      type="email"
                      id="correo"
                      name="correo"
                      required
                      value={formData.correo}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors disabled:opacity-50"
                      style={{ borderColor: status === 'error' ? CLINICITA_COLORS.errorBorder : '#E2E8F0' }}
                      placeholder="tu@correo.com"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="mb-4">
                    <label htmlFor="asunto" className="block text-sm font-medium text-gray-700 mb-1">
                      Asunto
                    </label>
                    <input
                      type="text"
                      id="asunto"
                      name="asunto"
                      required
                      value={formData.asunto}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors disabled:opacity-50"
                      style={{ borderColor: status === 'error' ? CLINICITA_COLORS.errorBorder : '#E2E8F0' }}
                      placeholder="Asunto del mensaje"
                      disabled={isLoading}
                    />
                  </div>

                  <div className="mb-6">
                    <label htmlFor="mensaje" className="block text-sm font-medium text-gray-700 mb-1">
                      Mensaje
                    </label>
                    <textarea
                      id="mensaje"
                      name="mensaje"
                      rows={5}
                      required
                      value={formData.mensaje}
                      onChange={handleChange}
                      className="w-full px-4 py-2.5 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-0 transition-colors disabled:opacity-50 resize-none"
                      style={{ borderColor: status === 'error' ? CLINICITA_COLORS.errorBorder : '#E2E8F0' }}
                      placeholder="Escribe tu mensaje aquí..."
                      disabled={isLoading}
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3 rounded-lg font-semibold text-base text-white transition-all duration-200 flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: CLINICITA_COLORS.mid,
                      boxShadow: '0 4px 12px rgba(46, 80, 144, 0.3)'
                    }}
                    aria-busy={isLoading}
                  >
                    {isLoading ? (
                      <>
                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24" aria-hidden="true">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                        <span>Enviando...</span>
                      </>
                    ) : (
                      'Enviar'
                    )}
                  </button>
</form>
              </div>
            </div>

            <div>
              <div className="bg-white rounded-2xl shadow-sm p-6 h-full" style={{ border: '1px solid #E2E8F0' }}>
                <h2 className="text-xl font-semibold mb-6" style={{ color: CLINICITA_COLORS.textDark }}>Datos de la IPS</h2>
                <p className="text-sm text-gray-500 mb-6">Completar con la información real de la institución.</p>
                <ul className="space-y-4">
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true" style={{ color: CLINICITA_COLORS.accent }}>
                      <path d="M8 16s6-5.686 6-10A6 6 0 0 0 2 6c0 4.314 6 10 6 10zm0-7a3 3 0 1 1 0-6 3 3 0 0 1 0 6z" />
                    </svg>
                    <span className="text-gray-700">Dirección (pendiente)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true" style={{ color: CLINICITA_COLORS.accent }}>
                      <path d="M3.654 1.328a.678.678 0 0 0-1.015-.063L1.605 2.3c-.483.484-.661 1.169-.45 1.77a17.6 17.6 0 0 0 4.168 6.608 17.6 17.6 0 0 0 6.608 4.168c.601.211 1.286.033 1.77-.45l1.034-1.034a.678.678 0 0 0-.063-1.015l-2.307-1.794a.68.68 0 0 0-.58-.122l-2.19.547a1.75 1.75 0 0 1-1.657-.459L5.482 8.062a1.75 1.75 0 0 1-.46-1.657l.548-2.19a.68.68 0 0 0-.122-.58L3.654 1.328zM1.884.511a1.745 1.745 0 0 1 2.612.163L6.29 2.98c.329.423.445.974.315 1.494l-.547 2.19a.68.68 0 0 0 .178.643l2.457 2.457a.68.68 0 0 0 .644.178l2.189-.547a1.75 1.75 0 0 1 1.494.315l2.306 1.794c.829.645.905 1.87.163 2.611l-1.034 1.034c-.74.74-1.846 1.065-2.877.702a18.6 18.6 0 0 1-7.01-4.42 18.6 18.6 0 0 1-4.42-7.009c-.362-1.03-.037-2.137.703-2.877L1.885.511z" />
                    </svg>
                    <span className="text-gray-700">Teléfono (pendiente)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true" style={{ color: CLINICITA_COLORS.accent }}>
                      <path d="M0 4a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H2a2 2 0 0 1-2-2V4Zm2-1a1 1 0 0 0-1 1v.217l7 4.2 7-4.2V4a1 1 0 0 0-1-1H2Zm13 2.383-4.708 2.825L15 11.105V5.383Zm-.034 6.876-5.64-3.471L8 9.583l-1.326-.795-5.64 3.47A1 1 0 0 0 2 13h12a1 1 0 0 0 .966-.741ZM1 13.146l.217-1.281 7.485-4.487L13.784 13l-7.485-4.487L1 13.146Z" />
                    </svg>
                    <span className="text-gray-700">Correo (pendiente)</span>
                  </li>
                  <li className="flex items-start gap-3">
                    <svg className="w-5 h-5 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 16 16" aria-hidden="true" style={{ color: CLINICITA_COLORS.accent }}>
                      <path d="M8 3.5a.5.5 0 0 0-1 0V9a.5.5 0 0 0 .252.434l3.5 2a.5.5 0 0 0 .496-.868L8 8.71V3.5z" />
                      <path d="M8 16A8 8 0 1 0 8 0a8 8 0 0 0 0 16zm7-8A7 7 0 1 1 1 8a7 7 0 0 1 14 0z" />
                    </svg>
                    <span className="text-gray-700">Horario de atención (pendiente)</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="px-6 py-4 border-t" style={{ borderColor: '#E2E8F0', backgroundColor: CLINICITA_COLORS.white }}>
        <p className="text-center text-sm" style={{ color: CLINICITA_COLORS.textMuted }}>© 2026 CliniCita · <Link to="/" className="hover:underline" style={{ color: CLINICITA_COLORS.mid }}>Inicio</Link></p>
      </footer>
    </div>
  );
};

export default ContactoPage;