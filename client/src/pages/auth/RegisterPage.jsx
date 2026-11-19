// src/pages/auth/RegisterPage.jsx

import React, { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authApi } from '../../api/auth';
import { Loader2, Mail, Lock, User, Shield, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';

const RegisterPage = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    nombres: '',
    apellidos: '',
    correo: '',
    clave: '',
    confirmarClave: '',
    documento: '',
    telefono: '',
    habeas: false,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordStrength, setPasswordStrength] = useState(0);

const validateField = useCallback((name, value) => {
    const errors = { ...fieldErrors };
    
    switch (name) {
      case 'nombres':
        if (!value.trim()) errors.nombres = 'Los nombres son obligatorios';
        else if (value.trim().length < 2) errors.nombres = 'Mínimo 2 caracteres';
        else delete errors.nombres;
        break;
      case 'apellidos':
        if (!value.trim()) errors.apellidos = 'Los apellidos son obligatorios';
        else if (value.trim().length < 2) errors.apellidos = 'Mínimo 2 caracteres';
        else delete errors.apellidos;
        break;
      case 'correo':
        if (!value.trim()) errors.correo = 'El correo es obligatorio';
        else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errors.correo = 'Correo inválido';
        else delete errors.correo;
        break;
      case 'clave':
        if (!value) errors.clave = 'La contraseña es obligatoria';
        else if (value.length < 8) errors.clave = 'Mínimo 8 caracteres';
        else delete errors.clave;
        let strength = 0;
        if (value.length >= 8) strength++;
        if (/[A-Z]/.test(value)) strength++;
        if (/[a-z]/.test(value)) strength++;
        if (/[0-9]/.test(value)) strength++;
        if (/[^A-Za-z0-9]/.test(value)) strength++;
        setPasswordStrength(strength);
        break;
      case 'confirmarClave':
        if (!value) errors.confirmarClave = 'Confirma tu contraseña';
        else if (value !== formData.clave) errors.confirmarClave = 'Las contraseñas no coinciden';
        else delete errors.confirmarClave;
        break;
      case 'documento':
        if (!value.trim()) errors.documento = 'El documento es obligatorio';
        else if (value.trim().length < 6) errors.documento = 'Documento inválido';
        else delete errors.documento;
        break;
      case 'telefono':
        if (!value.trim()) errors.telefono = 'El teléfono es obligatorio';
        else if (!/^[+]?[\d\s\-\(\)]{7,}$/.test(value)) errors.telefono = 'Teléfono inválido';
        else delete errors.telefono;
        break;
      case 'habeas':
        if (!value) errors.habeas = 'Debes aceptar la política de datos';
        else delete errors.habeas;
        break;
      default:
        break;
    }
    
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }, [fieldErrors, formData.clave]);
const handleChange = useCallback((e) => {
    const { name, value, type, checked } = e.target;
    const newValue = type === 'checkbox' ? checked : value;
    setFormData(prev => ({ ...prev, [name]: newValue }));
    
    if (name !== 'habeas') {
      validateField(name, newValue);
    }
  }, [validateField]);

  const handleBlur = useCallback((e) => {
    const { name, value } = e.target;
    validateField(name, value);
  }, [validateField]);

  const validateForm = useCallback(() => {
    let isValid = true;
    const fields = ['nombres', 'apellidos', 'correo', 'clave', 'confirmarClave', 'documento', 'telefono', 'habeas'];
    
    fields.forEach(field => {
      const value = formData[field];
      if (!validateField(field, value)) {
        isValid = false;
      }
    });
    
    return isValid;
  }, [formData, validateField]);

  const getStrengthLabel = () => {
    if (passwordStrength <= 1) return { label: 'Muy débil', color: 'text-red-600', bg: 'bg-red-500' };
    if (passwordStrength === 2) return { label: 'Débil', color: 'text-orange-600', bg: 'bg-orange-500' };
    if (passwordStrength === 3) return { label: 'Media', color: 'text-yellow-600', bg: 'bg-yellow-500' };
    if (passwordStrength === 4) return { label: 'Fuerte', color: 'text-green-600', bg: 'bg-green-500' };
    return { label: 'Muy fuerte', color: 'text-emerald-600', bg: 'bg-emerald-500' };
  };

  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      setError('Por favor, corrige los errores en el formulario');
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const response = await authApi.registro({
        nombres: formData.nombres.trim(),
        apellidos: formData.apellidos.trim(),
        correo: formData.correo.trim().toLowerCase(),
        clave: formData.clave,
        documento: formData.documento.trim(),
        telefono: formData.telefono.trim(),
        habeas: formData.habeas,
      });

      setSuccess(response.mensaje || 'Cuenta creada correctamente. Redirigiendo al login...');
      
      setTimeout(() => {
        navigate('/login', { replace: true });
      }, 2000);

    } catch (err) {
      console.error('Error en registro:', err);
      if (err.response?.data?.mensaje) {
        setError(err.response.data.mensaje);
      } else if (err.response?.status === 409) {
        setError('Ya existe una cuenta con ese correo o documento');
      } else {
        setError('No fue posible crear la cuenta. Intenta de nuevo.');
      }
    } finally {
      setIsLoading(false);
    }
  }, [formData, validateForm, navigate]);

  const strengthInfo = getStrengthLabel();

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 py-12 px-4">
      <div className="bg-white p-8 rounded-xl shadow-2xl w-full max-w-md">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold text-indigo-600">Crear Cuenta</h2>
          <p className="text-gray-500 mt-2">Regístrate como paciente en CliniCita</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2" role="alert">
            <AlertCircle className="h-5 w-5 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {success && (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg mb-6 flex items-center gap-2" role="alert">
            <CheckCircle className="h-5 w-5 flex-shrink-0" />
            <span>{success}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
<div className="grid grid-cols-2 gap-4">
            <div className="text-left">
              <label htmlFor="nombres" className="block text-sm font-medium text-gray-700">Nombres *</label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="nombres"
                  name="nombres"
                  required
                  value={formData.nombres}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    fieldErrors.nombres ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Juan"
                  disabled={isLoading}
                />
              </div>
              {fieldErrors.nombres && <p className="mt-1 text-sm text-red-600">{fieldErrors.nombres}</p>}
            </div>

            <div className="text-left">
              <label htmlFor="apellidos" className="block text-sm font-medium text-gray-700">Apellidos *</label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="apellidos"
                  name="apellidos"
                  required
                  value={formData.apellidos}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    fieldErrors.apellidos ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="Pérez Gómez"
                  disabled={isLoading}
                />
              </div>
              {fieldErrors.apellidos && <p className="mt-1 text-sm text-red-600">{fieldErrors.apellidos}</p>}
            </div>
<div className="text-left">
            <label htmlFor="correo" className="block text-sm font-medium text-gray-700">Correo electrónico *</label>
            <div className="relative mt-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type="email"
                id="correo"
                name="correo"
                required
                autoComplete="email"
                value={formData.correo}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  fieldErrors.correo ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="juan@ejemplo.com"
                disabled={isLoading}
              />
            </div>
            {fieldErrors.correo && <p className="mt-1 text-sm text-red-600">{fieldErrors.correo}</p>}
          </div>

          <div className="text-left">
            <label htmlFor="clave" className="block text-sm font-medium text-gray-700">Contraseña *</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showPassword ? 'text' : 'password'}
                id="clave"
                name="clave"
                required
                autoComplete="new-password"
                value={formData.clave}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full pl-10 pr-12 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  fieldErrors.clave ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="••••••••"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {fieldErrors.clave && <p className="mt-1 text-sm text-red-600">{fieldErrors.clave}</p>}
            
            {formData.clave && (
              <div className="mt-2">
                <div className="flex gap-1 h-2">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className="flex-1 rounded"
                      style={{
                        backgroundColor: level <= passwordStrength ? strengthInfo.bg : '#e5e7eb',
                      }}
                    />
                  ))}
                </div>
                <p className={`mt-1 text-xs ${strengthInfo.color}`}>Fortaleza: {strengthInfo.label}</p>
              </div>
            )}
          </div>

          <div className="text-left">
            <label htmlFor="confirmarClave" className="block text-sm font-medium text-gray-700">Confirmar contraseña *</label>
            <div className="relative mt-1">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                id="confirmarClave"
                name="confirmarClave"
                required
                autoComplete="new-password"
                value={formData.confirmarClave}
                onChange={handleChange}
                onBlur={handleBlur}
                className={`w-full pl-10 pr-12 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                  fieldErrors.confirmarClave ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder="••••••••"
                disabled={isLoading}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {fieldErrors.confirmarClave && <p className="mt-1 text-sm text-red-600">{fieldErrors.confirmarClave}</p>}
          </div>
<div className="grid grid-cols-2 gap-4">
            <div className="text-left">
              <label htmlFor="documento" className="block text-sm font-medium text-gray-700">Documento de identidad *</label>
              <div className="relative mt-1">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="text"
                  id="documento"
                  name="documento"
                  required
                  value={formData.documento}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    fieldErrors.documento ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="12345678"
                  disabled={isLoading}
                />
              </div>
              {fieldErrors.documento && <p className="mt-1 text-sm text-red-600">{fieldErrors.documento}</p>}
            </div>

            <div className="text-left">
              <label htmlFor="telefono" className="block text-sm font-medium text-gray-700">Teléfono/WhatsApp *</label>
              <div className="relative mt-1">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  id="telefono"
                  name="telefono"
                  required
                  value={formData.telefono}
                  onChange={handleChange}
                  onBlur={handleBlur}
                  className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                    fieldErrors.telefono ? 'border-red-500' : 'border-gray-300'
                  }`}
                  placeholder="3001234567"
                  disabled={isLoading}
                />
              </div>
              {fieldErrors.telefono && <p className="mt-1 text-sm text-red-600">{fieldErrors.telefono}</p>}
            </div>
          </div>

          <div className="text-left">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                name="habeas"
                checked={formData.habeas}
                onChange={handleChange}
                onBlur={handleBlur}
                className="mt-1 h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                required
                disabled={isLoading}
              />
              <div className="text-sm text-gray-600">
                Acepto la <Link to="/privacidad" className="text-indigo-600 hover:underline">Política de Privacidad</Link> y autorizo el tratamiento de mis datos personales según la <Link to="/terminos" className="text-indigo-600 hover:underline">Ley 1581 de 2012</Link> * 
              </div>
            </label>
            {fieldErrors.habeas && <p className="mt-1 text-sm text-red-600">{fieldErrors.habeas}</p>}
          </div>
        </div>

        <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 transition-colors"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                Creando cuenta...
              </>
            ) : (
              'Crear cuenta'
            )}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-gray-500">
          <p>¿Ya tienes cuenta? <Link to="/login" className="text-indigo-600 hover:text-indigo-800 font-medium">Inicia sesión</Link></p>
        </div>
      </div>
    </div>
  );
};

export default RegisterPage;
