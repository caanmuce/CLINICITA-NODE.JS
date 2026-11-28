// src/pages/paciente/Configuracion.jsx
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { usuariosApi } from "../../api/usuarios";
import { authApi } from "../../api/auth";
import { User, Mail, Phone, Shield, Save, Eye, EyeOff, Loader2, AlertCircle, CheckCircle, Bell } from "lucide-react";

export const PacienteConfiguracion = () => {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState("perfil");
  const [formData, setFormData] = useState({ nombres: "", apellidos: "", correo: "", telefono: "", direccion: "", fecha_nacimiento: "", genero: "" });
  const [passwordData, setPasswordData] = useState({ password_actual: "", nueva_clave: "", confirmar_clave: "" });
  const [notifications, setNotifications] = useState({ email: true, sms: false, push: true });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState(null);
  const [passwordSuccess, setPasswordSuccess] = useState(null);
  const [showCP, setShowCP] = useState(false);
  const [showNP, setShowNP] = useState(false);
  const [showCNP, setShowCNP] = useState(false);

  const tabs = [
    { key: "perfil", label: "Perfil", icon: User },
    { key: "notificaciones", label: "Notificaciones", icon: Bell },
    { key: "cuenta", label: "Cuenta y Seguridad", icon: Shield },
  ];

  const loadProfile = useCallback(async () => {
    try {
      setLoading(true);
      const usuario = await usuariosApi.obtenerPerfil();
      if (usuario) {
        const parts = (usuario.nombre_completo || "").split(" ");
        setFormData({
          nombres: parts[0] || "",
          apellidos: parts.slice(1).join(" ") || "",
          correo: usuario.correo || "",
          telefono: usuario.telefono_whatsapp || "",
          direccion: usuario.direccion || "",
          fecha_nacimiento: usuario.fecha_nacimiento ? usuario.fecha_nacimiento.split("T")[0] : "",
          genero: usuario.genero || "",
        });
      }
    } catch (e) {
      setErrors({ general: "No se pudo cargar el perfil" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { setTimeout(loadProfile, 0); }, [loadProfile]);

  const handleProfileChange = (e) => {
    const { name, value } = e.target;
    setFormData((p) => ({ ...p, [name]: value }));
    if (errors[name]) setErrors((p) => ({ ...p, [name]: null }));
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData((p) => ({ ...p, [name]: value }));
    if (passwordErrors[name]) setPasswordErrors((p) => ({ ...p, [name]: null }));
  };

  const handleNotifChange = (key, checked) => setNotifications((p) => ({ ...p, [key]: checked }));

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!formData.nombres.trim() || !formData.apellidos.trim() || !formData.correo.trim()) {
      setErrors({ general: "Nombres, apellidos y correo son obligatorios" });
      return;
    }
    setSaving(true);
    setSuccessMessage(null);
    setErrors({});
    try {
      await usuariosApi.actualizarPerfil({
        nombres: formData.nombres.trim(),
        apellidos: formData.apellidos.trim(),
        telefono: formData.telefono.trim(),
        direccion: formData.direccion.trim(),
      });
      setSuccessMessage("Perfil actualizado correctamente");
      await refreshUser();
    } catch (error) {
      if (error.response?.data?.mensaje) setErrors({ general: error.response.data.mensaje });
      else if (error.response?.data?.errors) setErrors(error.response.data.errors);
      else setErrors({ general: "No se pudo actualizar el perfil" });
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (!passwordData.password_actual || !passwordData.nueva_clave || !passwordData.confirmar_clave) {
      setPasswordErrors({ general: "Todos los campos son obligatorios" });
      return;
    }
    if (passwordData.nueva_clave.length < 8) {
      setPasswordErrors({ nueva_clave: "Mínimo 8 caracteres" });
      return;
    }
    if (passwordData.nueva_clave !== passwordData.confirmar_clave) {
      setPasswordErrors({ confirmar_clave: "Las contraseñas no coinciden" });
      return;
    }
    setChangingPassword(true);
    setPasswordSuccess(null);
    setPasswordErrors({});
    try {
      await authApi.cambiarClave(passwordData.password_actual, passwordData.nueva_clave);
      setPasswordSuccess("Contraseña actualizada correctamente");
      setPasswordData({ password_actual: "", nueva_clave: "", confirmar_clave: "" });
    } catch (error) {
      if (error.response?.data?.mensaje) setPasswordErrors({ general: error.response.data.mensaje });
      else setPasswordErrors({ general: "No se pudo cambiar la contraseña" });
    } finally {
      setChangingPassword(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center min-h-[400px]"><Loader2 className="animate-spin h-12 w-12 text-teal-600" /></div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuración</h1>
        <p className="text-gray-500 mt-1">Administra tu perfil, notificaciones y seguridad de cuenta</p>
      </div>

      <div className="flex gap-1 border-b border-gray-200 mb-6">
        {tabs.map((t) => (
          <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex items-center gap-2 px-4 py-3 mb-2 border-b-2 text-sm font-medium transition-colors ${activeTab === t.key ? "border-teal-600 text-teal-600" : "border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50"}`}>
            <t.icon className="h-5 w-5" aria-hidden="true" />
            {t.label}
          </button>
        ))}
      </div>

      {activeTab === "perfil" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <User className="h-5 w-5 text-teal-600" /> Información personal
          </h2>
          <form onSubmit={handleSaveProfile} className="space-y-6">
            {(successMessage || errors.general) && (
              <div className={`p-4 rounded-lg flex items-center gap-3 ${successMessage ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                {successMessage ? (<><CheckCircle className="h-5 w-5" /><span>{successMessage}</span></>) : (<><AlertCircle className="h-5 w-5" /><span>{errors.general}</span></>)}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nombres *</label>
                <input type="text" name="nombres" value={formData.nombres} onChange={handleProfileChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Juan" />
                {errors.nombres && <p className="mt-1 text-sm text-red-600">{errors.nombres}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos *</label>
                <input type="text" name="apellidos" value={formData.apellidos} onChange={handleProfileChange} className="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Pérez García" />
                {errors.apellidos && <p className="mt-1 text-sm text-red-600">{errors.apellidos}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Correo electrónico *</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input type="email" name="correo" value={formData.correo} onChange={handleProfileChange} className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="juan@ejemplo.com" />
                </div>
                {errors.correo && <p className="mt-1 text-sm text-red-600">{errors.correo}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono (WhatsApp)</label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input type="tel" name="telefono" value={formData.telefono} onChange={handleProfileChange} className="w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="+591 7XXXXXXX" />
                </div>
                {errors.telefono && <p className="mt-1 text-sm text-red-600">{errors.telefono}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                <textarea name="direccion" value={formData.direccion} onChange={handleProfileChange} rows={2} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="Av. Principal #123, Zona Norte" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de nacimiento</label>
                <input type="date" name="fecha_nacimiento" value={formData.fecha_nacimiento} onChange={handleProfileChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Género</label>
                <select name="genero" value={formData.genero} onChange={handleProfileChange} className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent">
                  <option value="">Seleccionar</option>
                  <option value="M">Masculino</option>
                  <option value="F">Femenino</option>
                  <option value="Otro">Otro</option>
                </select>
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <button type="submit" disabled={saving} className="w-full md:w-auto px-6 py-2.5 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {saving ? (<><Loader2 className="animate-spin h-5 w-5" /> Guardando...</>) : (<><Save className="h-5 w-5" /> Guardar cambios</>)}
              </button>
            </div>
          </form>
        </div>
      )}

      {activeTab === "notificaciones" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Bell className="h-5 w-5 text-teal-600" /> Preferencias de notificación
          </h2>
          <div className="space-y-5">
            {[
              { key: "email", label: "Correo electrónico", desc: "Recibe recordatorios de citas por correo" },
              { key: "sms", label: "SMS / WhatsApp", desc: "Recibe confirmaciones por mensaje de texto" },
              { key: "push", label: "Notificaciones push", desc: "Alertas en tiempo real en el navegador" },
            ].map((n) => (
              <div key={n.key} className="flex items-center justify-between p-4 rounded-lg border border-gray-200 bg-gray-50">
                <div>
                  <h3 className="font-medium text-gray-900">{n.label}</h3>
                  <p className="text-sm text-gray-500">{n.desc}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={notifications[n.key]} onChange={(ev) => handleNotifChange(n.key, ev.target.checked)} className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-600"></div>
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      {activeTab === "cuenta" && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-6 flex items-center gap-2">
            <Shield className="h-5 w-5 text-teal-600" /> Cambiar contraseña
          </h2>
          <form onSubmit={handleChangePassword} className="space-y-6">
            {(passwordSuccess || passwordErrors.general) && (
              <div className={`p-4 rounded-lg flex items-center gap-3 ${passwordSuccess ? "bg-green-50 text-green-800 border border-green-200" : "bg-red-50 text-red-800 border border-red-200"}`}>
                {passwordSuccess ? (<><CheckCircle className="h-5 w-5" /><span>{passwordSuccess}</span></>) : (<><AlertCircle className="h-5 w-5" /><span>{passwordErrors.general}</span></>)}
              </div>
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña actual *</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input type={showCP ? "text" : "password"} name="password_actual" value={passwordData.password_actual} onChange={handlePasswordChange} className="w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowCP(!showCP)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showCP ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
                </div>
                {passwordErrors.password_actual && <p className="mt-1 text-sm text-red-600">{passwordErrors.password_actual}</p>}
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nueva contraseña *</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input type={showNP ? "text" : "password"} name="nueva_clave" value={passwordData.nueva_clave} onChange={handlePasswordChange} className="w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowNP(!showNP)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showNP ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
                </div>
                {passwordErrors.nueva_clave && <p className="mt-1 text-sm text-red-600">{passwordErrors.nueva_clave}</p>}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Confirmar nueva contraseña *</label>
                <div className="relative">
                  <Shield className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input type={showCNP ? "text" : "password"} name="confirmar_clave" value={passwordData.confirmar_clave} onChange={handlePasswordChange} className="w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent" placeholder="••••••••" />
                  <button type="button" onClick={() => setShowCNP(!showCNP)} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">{showCNP ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button>
                </div>
                {passwordErrors.confirmar_clave && <p className="mt-1 text-sm text-red-600">{passwordErrors.confirmar_clave}</p>}
              </div>
            </div>
            <div className="pt-4 border-t border-gray-200">
              <button type="submit" disabled={changingPassword} className="w-full md:w-auto px-6 py-2.5 bg-teal-600 text-white font-medium rounded-lg hover:bg-teal-700 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2">
                {changingPassword ? (<><Loader2 className="animate-spin h-5 w-5" /> Cambiando...</>) : (<><Shield className="h-5 w-5" /> Cambiar contraseña</>)}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default PacienteConfiguracion;