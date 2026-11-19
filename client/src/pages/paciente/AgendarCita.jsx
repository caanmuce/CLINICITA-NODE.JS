// src/pages/paciente/AgendarCita.jsx - Flujo completo de agendamiento: especialidades, médicos, horarios, confirmación

import React, { useState, useEffect, useMemo } from 'react';
import { Calendar, Clock, User, MapPin, ArrowLeft, ArrowRight, Check, Loader2, AlertCircle, Plus, Stethoscope, AlertTriangle } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { citasApi } from '../../api/citas';
import { medicosApi } from '../../api/medicos';
import { horariosApi } from '../../api/horarios';
import { sedesApi } from '../../api/sedes';

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const date = new Date(dateStr);
  return date.toLocaleDateString('es-CO', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'America/Bogota'
  });
};

const formatTime = (timeStr) => {
  if (!timeStr) return '—';
  const [hours, minutes] = timeStr.split(':');
  const date = new Date();
  date.setHours(parseInt(hours), parseInt(minutes));
  return date.toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Bogota'
  });
};

const formatDateInput = (dateStr) => {
  if (!dateStr) return '';
  const date = new Date(dateStr + 'T00:00:00');
  return date.toISOString().split('T')[0];
};

export const PacienteAgendarCita = () => {
  const navigate = useNavigate();
  
  const [step, setStep] = useState(1);
  
  const [formData, setFormData] = useState({
    especialidad: '',
    medico_id: '',
    fecha: '',
    horario_id: '',
    motivo: '',
    sede_id: '',
  });
  
  const [especialidades, setEspecialidades] = useState([]);
  const [medicos, setMedicos] = useState([]);
  const [horarios, setHorarios] = useState([]);
  const [sedes, setSedes] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [loadingStep, setLoadingStep] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const cargarDatosIniciales = async () => {
    setLoading(true);
    setError(null);
    try {
      const [espResponse, sedesResponse] = await Promise.all([
        medicosApi.listarEspecialidades(),
        sedesApi.listar(),
      ]);
      
      const espData = espResponse.data || espResponse || [];
      const sedesData = sedesResponse.data || sedesResponse || [];
      
      setEspecialidades(Array.isArray(espData) ? espData : []);
      setSedes(Array.isArray(sedesData) ? sedesData : []);
    } catch (err) {
      console.error('Error cargando datos iniciales:', err);
      setError('No se pudieron cargar las especialidades y sedes. Intenta nuevamente.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => cargarDatosIniciales(), 0);
  }, []);

  const cargarMedicos = async (especialidad) => {
    setLoadingStep('medicos');
    try {
      const response = await medicosApi.listar(especialidad);
      const data = response.data || response || [];
      setMedicos(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando médicos:', err);
      setMedicos([]);
    } finally {
      setLoadingStep(null);
    }
  };

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      if (formData.especialidad) {
        cargarMedicos(formData.especialidad);
      } else {
        setMedicos([]);
        setFormData(prev => ({ ...prev, medico_id: '', horario_id: '', fecha: '' }));
        setHorarios([]);
      }
    }, 0);
  }, [formData.especialidad]);

  const cargarHorarios = async (medicoId, fecha) => {
    setLoadingStep('horarios');
    try {
      const response = await horariosApi.obtenerDisponibles(medicoId, fecha);
      const data = response.data || response || [];
      setHorarios(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error cargando horarios:', err);
      setHorarios([]);
    } finally {
      setLoadingStep(null);
    }
  };

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => {
      if (formData.medico_id && formData.fecha) {
        cargarHorarios(formData.medico_id, formData.fecha);
      } else {
        setHorarios([]);
        setFormData(prev => ({ ...prev, horario_id: '' }));
      }
    }, 0);
  }, [formData.medico_id, formData.fecha]);

  const medicoSeleccionado = medicos.find(m => m.id === formData.medico_id);
  const horarioSeleccionado = horarios.find(h => h.id === formData.horario_id);
  const sedeMedico = medicoSeleccionado?.sede_id ? sedes.find(s => s.id === medicoSeleccionado.sede_id) : sedes[0];

  const handleEspecialidadSelect = (especialidad) => {
    setFormData(prev => ({ ...prev, especialidad, medico_id: '', horario_id: '', fecha: '' }));
    setStep(2);
  };

  const handleMedicoSelect = (medicoId) => {
    setFormData(prev => ({ ...prev, medico_id: medicoId, horario_id: '', fecha: '' }));
    setHorarios([]);
    setStep(3);
  };

  const handleFechaChange = (fecha) => {
    setFormData(prev => ({ ...prev, fecha, horario_id: '' }));
    setHorarios([]);
  };

  const handleHorarioSelect = (horarioId) => {
    setFormData(prev => ({ ...prev, horario_id: horarioId }));
    setStep(4);
  };

  const handleMotivoChange = (e) => {
    setFormData(prev => ({ ...prev, motivo: e.target.value }));
  };

  const handleBack = () => {
    if (step > 1) {
      setStep(prev => prev - 1);
      if (step === 2) {
        setFormData(prev => ({ ...prev, medico_id: '', horario_id: '', fecha: '' }));
        setMedicos([]);
      } else if (step === 3) {
        setFormData(prev => ({ ...prev, horario_id: '', fecha: '' }));
        setHorarios([]);
      } else if (step === 4) {
        setFormData(prev => ({ ...prev, horario_id: '' }));
      }
    } else {
      navigate('/paciente/citas');
    }
  };

  // Memoize min/max dates - eslint-disable is needed because useMemo with Date is flagged as impure
  // eslint-disable-next-line react-hooks/purity -- useMemo with Date is acceptable for static date boundaries
  const minDate = useMemo(() => formatDateInput(new Date()), []);
  // eslint-disable-next-line react-hooks/purity -- useMemo with Date is acceptable for static date boundaries
  const maxDate = useMemo(() => formatDateInput(new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)), []);

  const handleSubmit = async () => {
    if (!formData.especialidad || !formData.medico_id || !formData.fecha || !formData.horario_id) {
      setError('Por favor completa todos los pasos requeridos.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const hora = horarioSeleccionado?.hora_inicio || horarioSeleccionado?.hora;

      const citaData = {
        medico_id: formData.medico_id,
        fecha: formData.fecha,
        hora: hora,
        motivo: formData.motivo || 'Consulta médica',
      };

      await citasApi.crear(citaData);
      navigate('/paciente/citas', { state: { success: 'Cita agendada exitosamente' } });
    } catch (err) {
      console.error('Error creando cita:', err);
      const msg = err.response?.data?.message || 'No se pudo agendar la cita. Intenta nuevamente.';
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const canProceed = {
    1: formData.especialidad !== '',
    2: formData.medico_id !== '',
    3: formData.fecha !== '' && formData.horario_id !== '',
    4: true,
  };

  if (loading) {
    return (
      <div className='space-y-6'>
        <div className='flex items-center justify-center py-12'>
          <Loader2 className='h-8 w-8 animate-spin text-indigo-600' />
        </div>
      </div>
    );
  }

  return (
    <div className='space-y-6 max-w-4xl mx-auto'>
      <div className='flex items-center gap-4'>
        <Link to='/paciente/citas' className='p-2 rounded-lg hover:bg-gray-100 transition-colors'>
          <ArrowLeft className='h-5 w-5 text-gray-500' />
        </Link>
        <div>
          <h1 className='text-2xl font-bold text-gray-900'>Agendar nueva cita</h1>
          <p className='text-gray-500 mt-1'>Selecciona especialidad, médico y horario disponible</p>
        </div>
      </div>

      <div className='bg-white rounded-xl border border-gray-200 p-4'>
        <div className='flex items-center justify-between'>
          {[
            { num: 1, label: 'Especialidad', icon: Stethoscope },
            { num: 2, label: 'Médico', icon: User },
            { num: 3, label: 'Fecha y Hora', icon: Calendar },
            { num: 4, label: 'Confirmar', icon: Check },
          ].map((s, i) => (
            <React.Fragment key={s.num}>
              <div className='flex items-center'>
                <div className={'flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold transition-colors ' + (step >= s.num ? 'bg-indigo-600 text-white' : 'bg-gray-200 text-gray-500')}>
                  {step > s.num ? <Check className='h-5 w-5' /> : s.num}
                </div>
                {i < 3 && (
                  <div className={'hidden md:block w-24 mx-2 h-1 rounded transition-colors ' + (step > s.num ? 'bg-indigo-600' : 'bg-gray-200')} />
                )}
              </div>
            </React.Fragment>
          ))}
        </div>
        <div className='mt-4 flex justify-between text-xs text-gray-500'>
          {['Especialidad', 'Médico', 'Fecha y Hora', 'Confirmar'].map((label, i) => (
            <span key={i} className={'w-20 text-center ' + (step === i + 1 ? 'font-medium text-indigo-600' : '')}>
              {label}
            </span>
          ))}
        </div>
      </div>

      {error && (
        <div className='bg-red-50 border border-red-200 rounded-xl p-4 flex items-center gap-3'>
          <AlertCircle className='h-5 w-5 text-red-600 flex-shrink-0' />
          <p className='text-red-700'>{error}</p>
          <button onClick={() => setError(null)} className='ml-auto text-sm text-red-700 hover:text-red-900 underline'>×</button>
        </div>
      )}

      {step === 1 && (
        <div className='bg-white rounded-xl border border-gray-200 p-6 animate-fade-in'>
          <div className='flex items-center gap-2 mb-6'>
            <div className='flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white text-lg font-bold'>1</div>
            <h2 className='text-xl font-semibold text-gray-900'>Selecciona una especialidad</h2>
          </div>
          <p className='text-gray-500 mb-6'>Elige la especialidad médica que necesitas</p>
          
          {especialidades.length === 0 ? (
            <div className='text-center py-12 text-gray-500'>
              <Stethoscope className='h-12 w-12 mx-auto text-gray-300 mb-3' />
              <p>No hay especialidades disponibles</p>
              <button onClick={cargarDatosIniciales} className='mt-3 text-sm text-indigo-600 hover:text-indigo-800 underline'>Reintentar</button>
            </div>
          ) : (
            <div className='grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3'>
              {especialidades.map((esp) => (
                <button
                  key={esp.id || esp}
                  onClick={() => handleEspecialidadSelect(typeof esp === 'string' ? esp : esp.nombre || esp.id)}
                  className='p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-left group'
                >
                  <Stethoscope className='h-8 w-8 text-gray-300 group-hover:text-indigo-600 transition-colors mb-2' />
                  <p className='font-medium text-gray-900'>{typeof esp === 'string' ? esp : esp.nombre || esp.id}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 2 && (
        <div className='bg-white rounded-xl border border-gray-200 p-6 animate-fade-in'>
          <div className='flex items-center gap-2 mb-6'>
            <button onClick={handleBack} className='p-2 rounded-lg hover:bg-gray-100 transition-colors'>
              <ArrowLeft className='h-5 w-5 text-gray-500' />
            </button>
            <div className='flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white text-lg font-bold'>2</div>
            <h2 className='text-xl font-semibold text-gray-900'>Selecciona un médico</h2>
          </div>
          <p className='text-gray-500 mb-6'>Especialidad: <span className='font-medium text-gray-900'>{formData.especialidad}</span></p>
          
          {loadingStep === 'medicos' ? (
            <div className='flex items-center justify-center py-12'>
              <Loader2 className='h-8 w-8 animate-spin text-indigo-600' />
            </div>
          ) : medicos.length === 0 ? (
            <div className='text-center py-12 text-gray-500'>
              <User className='h-12 w-12 mx-auto text-gray-300 mb-3' />
              <p>No hay médicos disponibles para esta especialidad</p>
              <p className='text-sm text-gray-400 mt-1'>Intenta con otra especialidad</p>
            </div>
          ) : (
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              {medicos.map((medico) => (
                <button
                  key={medico.id}
                  onClick={() => handleMedicoSelect(medico.id)}
                  className='p-4 border-2 border-gray-200 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-colors text-left'
                >
                  <div className='flex items-center gap-4'>
                    <div className='w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center'>
                      <User className='h-6 w-6 text-indigo-600' />
                    </div>
                    <div>
                      <p className='font-medium text-gray-900'>Dr. {medico.nombre} {medico.apellido}</p>
                      <p className='text-sm text-gray-500'>{medico.especialidad_nombre || formData.especialidad}</p>
                      {medico.sede_nombre && (
                        <p className='text-xs text-gray-400 flex items-center gap-1 mt-1'>
                          <MapPin className='h-3 w-3' /> {medico.sede_nombre}
                        </p>
                      )}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      {step === 3 && (
        <div className='bg-white rounded-xl border border-gray-200 p-6 animate-fade-in'>
          <div className='flex items-center gap-2 mb-6'>
            <button onClick={handleBack} className='p-2 rounded-lg hover:bg-gray-100 transition-colors'>
              <ArrowLeft className='h-5 w-5 text-gray-500' />
            </button>
            <div className='flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white text-lg font-bold'>3</div>
            <h2 className='text-xl font-semibold text-gray-900'>Selecciona fecha y hora</h2>
          </div>
          <div className='mb-6 p-4 bg-indigo-50 rounded-lg'>
            <p className='font-medium text-gray-900'>Dr. {medicoSeleccionado?.nombre} {medicoSeleccionado?.apellido}</p>
            <p className='text-sm text-gray-600'>{medicoSeleccionado?.especialidad_nombre || formData.especialidad}</p>
            {sedeMedico && (
              <p className='text-sm text-gray-600 flex items-center gap-1 mt-1'>
                <MapPin className='h-4 w-4' /> {sedeMedico.nombre}
              </p>
            )}
          </div>

          <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Fecha</label>
              <input
                type='date'
                value={formData.fecha}
                onChange={(e) => handleFechaChange(e.target.value)}
                min={minDate}
                max={maxDate}
                className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500'
              />
              <p className='text-xs text-gray-500 mt-1'>Disponible hasta 90 días</p>
            </div>

            <div>
              <label className='block text-sm font-medium text-gray-700 mb-2'>Horarios disponibles</label>
              {loadingStep === 'horarios' ? (
                <div className='flex items-center justify-center py-8'>
                  <Loader2 className='h-8 w-8 animate-spin text-indigo-600' />
                </div>
              ) : !formData.fecha ? (
                <div className='p-8 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg'>
                  <Calendar className='h-10 w-10 mx-auto text-gray-300 mb-2' />
                  <p>Selecciona una fecha para ver horarios</p>
                </div>
              ) : horarios.length === 0 ? (
                <div className='p-8 text-center text-gray-500 border-2 border-dashed border-gray-200 rounded-lg'>
                  <Clock className='h-10 w-10 mx-auto text-gray-300 mb-2' />
                  <p>No hay horarios disponibles para esta fecha</p>
                  <p className='text-sm text-gray-400 mt-1'>Intenta con otra fecha</p>
                </div>
              ) : (
                <div className='max-h-60 overflow-y-auto space-y-2 border border-gray-200 rounded-lg p-2'>
                  {horarios.map((horario) => (
                    <button
                      key={horario.id}
                      onClick={() => handleHorarioSelect(horario.id)}
                      className={'w-full p-3 rounded-lg text-left transition-colors ' + (formData.horario_id === horario.id ? 'bg-indigo-600 text-white border border-indigo-600' : 'bg-white hover:bg-gray-50 border border-gray-200')}
                    >
                      <div className='flex items-center justify-between'>
                        <div className='flex items-center gap-3'>
                          <Clock className={'h-5 w-5 ' + (formData.horario_id === horario.id ? 'text-white' : 'text-gray-400')} />
                          <span className='font-medium'>{formatTime(horario.hora_inicio || horario.hora)}</span>
                        </div>
                        {horario.hora_fin && (
                          <span className='text-sm opacity-75'>
                            - {formatTime(horario.hora_fin)}
                          </span>
                        )}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className='mt-6 flex justify-end'>
            <button
              onClick={() => setStep(4)}
              disabled={!canProceed[3]}
              className='px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2'
            >
              Continuar
              <ArrowRight className='h-5 w-5' />
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className='bg-white rounded-xl border border-gray-200 p-6 animate-fade-in'>
          <div className='flex items-center gap-2 mb-6'>
            <button onClick={handleBack} className='p-2 rounded-lg hover:bg-gray-100 transition-colors'>
              <ArrowLeft className='h-5 w-5 text-gray-500' />
            </button>
            <div className='flex items-center justify-center w-10 h-10 rounded-full bg-indigo-600 text-white text-lg font-bold'>4</div>
            <h2 className='text-xl font-semibold text-gray-900'>Confirmar cita</h2>
          </div>
          <p className='text-gray-500 mb-6'>Revisa los detalles y confirma tu cita</p>

          <div className='bg-gray-50 rounded-lg p-5 mb-6'>
            <div className='grid grid-cols-1 md:grid-cols-2 gap-4'>
              <div>
                <p className='text-sm text-gray-500'>Especialidad</p>
                <p className='font-medium text-gray-900'>{formData.especialidad}</p>
              </div>
              <div>
                <p className='text-sm text-gray-500'>Médico</p>
                <p className='font-medium text-gray-900'>Dr. {medicoSeleccionado?.nombre} {medicoSeleccionado?.apellido}</p>
              </div>
              <div>
                <p className='text-sm text-gray-500'>Fecha</p>
                <p className='font-medium text-gray-900'>{formatDate(formData.fecha)}</p>
              </div>
              <div>
                <p className='text-sm text-gray-500'>Hora</p>
                <p className='font-medium text-gray-900'>{formatTime(horarioSeleccionado?.hora_inicio || horarioSeleccionado?.hora)}</p>
              </div>
              <div className='md:col-span-2'>
                <p className='text-sm text-gray-500'>Sede</p>
                <p className='font-medium text-gray-900 flex items-center gap-1'>
                  <MapPin className='h-4 w-4' /> {sedeMedico?.nombre || 'Por confirmar'}
                </p>
              </div>
              <div className='md:col-span-2'>
                <p className='text-sm text-gray-500'>Motivo</p>
                <textarea
                  value={formData.motivo}
                  onChange={handleMotivoChange}
                  placeholder='Motivo de la consulta (opcional)'
                  rows={3}
                  className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 mt-1'
                />
              </div>
            </div>
          </div>

          <div className='bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6'>
            <div className='flex items-start gap-3'>
              <AlertTriangle className='h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5' />
              <div>
                <p className='font-medium text-yellow-900'>Importante</p>
                <ul className='text-sm text-yellow-700 mt-1 list-disc list-inside space-y-1'>
                  <li>Llega 15 minutos antes de tu cita</li>
                  <li>Trae tu documento de identidad y orden médica si aplica</li>
                  <li>Puedes cancelar hasta 2 horas antes sin penalización</li>
                  <li>La cita se confirmará automáticamente al crearla</li>
                </ul>
              </div>
            </div>
          </div>

          <div className='flex flex-col sm:flex-row gap-3 justify-end'>
            <button
              onClick={handleBack}
              className='px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors'
            >
              <ArrowLeft className='h-5 w-5 mr-2' />
              Volver
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting}
              className='px-6 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2'
            >
              {submitting ? (
                <>
                  <Loader2 className='h-5 w-5 animate-spin' />
                  Agendando...
                </>
              ) : (
                <>
                  <Plus className='h-5 w-5' />
                  Confirmar y agendar
                </>)
              }
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
