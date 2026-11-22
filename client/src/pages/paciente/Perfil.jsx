// src/pages/paciente/Perfil.jsx - Perfil del paciente con funcionalidad completa

import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { usuariosApi } from "../../api/usuarios";
import { authApi } from "../../api/auth";
import {
  User,
  Mail,
  Phone,
  Shield,
  Save,
  Eye,
  EyeOff,
  Loader2,
  AlertCircle,
  CheckCircle,
} from "lucide-react";

export const PacientePerfil = () => {
  const { refreshUser } = useAuth();

  // Estado del formulario de perfil
  const [formData, setFormData] = useState({
    nombres: "",
    apellidos: "",
    correo: "",
    telefono: "",
    direccion: "",
    fecha_nacimiento: "",
    genero: "",
  });

  // Estado del formulario de contraseña
  const [passwordData, setPasswordData] = useState({
    password_actual: "",
    nueva_clave: "",
    confirmar_clave: "",
  });

  // Estados de UI
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Cargar perfil al montar
  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const response = await usuariosApi.obtenerPerfil();
      const usuario = response.usuario;

      if (usuario) {
        setFormData({
          nombres: usuario.nombre_completo?.split(" ")[0] || "",
          apellidos:
            usuario.nombre_completo?.split(" ").slice(1).join(" ") || "",
          correo: usuario.correo || "",
          telefono: usuario.telefono_whatsapp || "",
          direccion: usuario.direccion || "",
          fecha_nacimiento: usuario.fecha_nacimiento
            ? usuario.fecha_nacimiento.split("T")[0]
            : "",
          genero: usuario.genero || "",
        });
      }
    } catch (error) {
      console.error("Error cargando perfil:", error);
      setErrors({ general: "No se pudo cargar el perfil" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Use setTimeout to avoid synchronous setState in effect
    setTimeout(() => loadProfile(), 0);
  }, [loadProfile]);

  // Validación del formulario de perfil
  const validateProfile = () => {
    const newErrors = {};
    if (!formData.nombres.trim())
      newErrors.nombres = "Los nombres son obligatorios";
    if (!formData.apellidos.trim())
      newErrors.apellidos = "Los apellidos son obligatorios";
    if (!formData.correo.trim()) newErrors.correo = "El correo es obligatorio";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.correo))
      newErrors.correo = "Correo inválido";
    // eslint-disable-next-line no-useless-escape -- Parentheses in regex character class are literal, escaping is fine
    if (
      formData.telefono &&
      !/^[+]?[\d\s\-()]{7,}$/.test(formData.telefono)
    ) {
      newErrors.telefono = "Teléfono inválido";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Validación del formulario de contraseña
  const validatePassword = () => {
    const newErrors = {};
    if (!passwordData.password_actual)
      newErrors.password_actual = "La contraseña actual es obligatoria";
    if (!passwordData.nueva_clave)
      newErrors.nueva_clave = "La nueva contraseña es obligatoria";
    else if (passwordData.nueva_clave.length < 8)
      newErrors.nueva_clave = "Mínimo 8 caracteres";
    if (!passwordData.confirmar_clave)
      newErrors.confirmar_clave = "Confirme la nueva contraseña";
    else if (passwordData.nueva_clave !== passwordData.confirmar_clave)
      newErrors.confirmar_clave = "Las contraseñas no coinciden";
    setPasswordErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manejar cambios en formulario de perfil
  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors((prev) => ({ ...prev, [name]: null }));
  };

  // Manejar cambios en formulario de contraseña
  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((prev) => ({ ...prev, [name]: value }));
    if (passwordErrors[name])
      setPasswordErrors((prev) => ({ ...prev, [name]: null }));
  };

  // Guardar perfil
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!validateProfile()) return;

    setSaving(true);
    setSuccessMessage(null);
    setErrors({});

    try {
      const payload = {
        nombres: formData.nombres.trim(),
        apellidos: formData.apellidos.trim(),
        telefono: formData.telefono.trim(),
        direccion: formData.direccion.trim(),
      };

      await usuariosApi.actualizarPerfil(payload);
      setSuccessMessage("Perfil actualizado correctamente");
      await refreshUser();
    } catch (error) {
      console.error("Error guardando perfil:", error);
      if (error.response?.data?.mensaje) {
        setErrors({ general: error.response.data.mensaje });
      } else if (error.response?.data?.errors) {
        setErrors(error.response.data.errors);
      } else {
        setErrors({ general: "No se pudo actualizar el perfil" });
      }
    } finally {
      setSaving(false);
    }
  };

  // Cambiar contraseña
  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!validatePassword()) return;

    setChangingPassword(true);
    setPasswordSuccess(null);
    setPasswordErrors({});

    try {
      await authApi.cambiarClave(
        passwordData.password_actual,
        passwordData.nueva_clave,
      );
      setPasswordSuccess("Contraseña actualizada correctamente");
      setPasswordData({
        password_actual: "",
        nueva_clave: "",
        confirmar_clave: "",
      });
    } catch (error) {
      console.error("Error cambiando contraseña:", error);
      if (error.response?.data?.mensaje) {
        setPasswordErrors({ general: error.response.data.mensaje });
      } else {
        setPasswordErrors({ general: "No se pudo cambiar la contraseña" });
      }
    } finally {
      setChangingPassword(false);
    }
  };

  // Renderizado condicional mientras carga
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="animate-spin h-12 w-12 text-teal-600" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mi perfil</h1>
        <p className="text-gray-500 mt-1">
          Gestiona tu información personal y credenciales
        </p>
      </div>

      {/* Sección: Información personal */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <User className="h-5 w-5 text-teal-600" /> Información personal
        </h2>

        <form onSubmit={handleSaveProfile} className="space-y-6">
          {(successMessage || errors.general) && (
            <div
              className={`p-4 rounded-lg flex items-center gap-3 ${
                successMessage
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {successMessage ? (
                <>
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                  <span>{successMessage}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span>{errors.general}</span>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nombres *
              </label>
              <input
                type="text"
                name="nombres"
                value={formData.nombres}
                onChange={handleProfileChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors.nombres ? "border-red-500" : "border-gray-300"}`}
                placeholder="Juan"
              />
              {errors.nombres && (
                <p className="mt-1 text-sm text-red-600">{errors.nombres}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Apellidos *
              </label>
              <input
                type="text"
                name="apellidos"
                value={formData.apellidos}
                onChange={handleProfileChange}
                className={`w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors.apellidos ? "border-red-500" : "border-gray-300"}`}
                placeholder="Pérez García"
              />
              {errors.apellidos && (
                <p className="mt-1 text-sm text-red-600">{errors.apellidos}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico *
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="email"
                  name="correo"
                  value={formData.correo}
                  onChange={handleProfileChange}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors.correo ? "border-red-500" : "border-gray-300"}`}
                  placeholder="juan@ejemplo.com"
                />
              </div>
              {errors.correo && (
                <p className="mt-1 text-sm text-red-600">{errors.correo}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Teléfono (WhatsApp)
              </label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type="tel"
                  name="telefono"
                  value={formData.telefono}
                  onChange={handleProfileChange}
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${errors.telefono ? "border-red-500" : "border-gray-300"}`}
                  placeholder="+591 7XXXXXXX"
                />
              </div>
              {errors.telefono && (
                <p className="mt-1 text-sm text-red-600">{errors.telefono}</p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Dirección
              </label>
              <textarea
                name="direccion"
                value={formData.direccion}
                onChange={handleProfileChange}
                rows={2}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Av. Principal #123, Zona Norte"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Fecha de nacimiento
              </label>
              <input
                type="date"
                name="fecha_nacimiento"
                value={formData.fecha_nacimiento}
                onChange={handleProfileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Género
              </label>
              <select
                name="genero"
                value={formData.genero}
                onChange={handleProfileChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent"
              >
                <option value="">Seleccionar</option>
                <option value="M">Masculino</option>
                <option value="F">Femenino</option>
                <option value="Otro">Otro</option>
              </select>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={saving}
              className="w-full md:w-auto px-6 py-2.5 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {saving ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-5 w-5" />
                  Guardar cambios
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Sección: Cambiar contraseña */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
          <Shield className="h-5 w-5 text-teal-600" /> Cambiar contraseña
        </h2>

        <form onSubmit={handleChangePassword} className="space-y-6">
          {(passwordSuccess || passwordErrors.general) && (
            <div
              className={`p-4 rounded-lg flex items-center gap-3 ${
                passwordSuccess
                  ? "bg-green-50 text-green-800 border border-green-200"
                  : "bg-red-50 text-red-800 border border-red-200"
              }`}
            >
              {passwordSuccess ? (
                <>
                  <CheckCircle className="h-5 w-5 flex-shrink-0" />
                  <span>{passwordSuccess}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="h-5 w-5 flex-shrink-0" />
                  <span>{passwordErrors.general}</span>
                </>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña actual *
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showCurrentPassword ? "text" : "password"}
                  name="password_actual"
                  value={passwordData.password_actual}
                  onChange={handlePasswordChange}
                  className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${passwordErrors.password_actual ? "border-red-500" : "border-gray-300"}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showCurrentPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {passwordErrors.password_actual && (
                <p className="mt-1 text-sm text-red-600">
                  {passwordErrors.password_actual}
                </p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nueva contraseña *
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showNewPassword ? "text" : "password"}
                  name="nueva_clave"
                  value={passwordData.nueva_clave}
                  onChange={handlePasswordChange}
                  className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${passwordErrors.nueva_clave ? "border-red-500" : "border-gray-300"}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showNewPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {passwordErrors.nueva_clave && (
                <p className="mt-1 text-sm text-red-600">
                  {passwordErrors.nueva_clave}
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Confirmar nueva contraseña *
              </label>
              <div className="relative">
                <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmar_clave"
                  value={passwordData.confirmar_clave}
                  onChange={handlePasswordChange}
                  className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent ${passwordErrors.confirmar_clave ? "border-red-500" : "border-gray-300"}`}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
              {passwordErrors.confirmar_clave && (
                <p className="mt-1 text-sm text-red-600">
                  {passwordErrors.confirmar_clave}
                </p>
              )}
            </div>
          </div>

          <div className="pt-4 border-t border-gray-200">
            <button
              type="submit"
              disabled={changingPassword}
              className="w-full md:w-auto px-6 py-2.5 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {changingPassword ? (
                <>
                  <Loader2 className="animate-spin h-5 w-5" />
                  Cambiando contraseña...
                </>
              ) : (
                <>
                  <Shield className="h-5 w-5" />
                  Cambiar contraseña
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
