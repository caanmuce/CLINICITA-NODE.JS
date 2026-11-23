// src/pages/paciente/Preconsulta.jsx - Preconsulta del paciente

import React, { useState, useEffect, useCallback } from "react";
import {
  ClipboardCheck,
  AlertCircle,
  Loader2,
  Calendar,
  ChevronDown,
  ChevronUp,
  Save,
  Heart,
  X,
} from "lucide-react";
import { citasApi } from "../../api/citas";
import { fichasPreconsultaApi } from "../../api/fichasPreconsulta";

const formatDateShort = (dateStr) => {
  if (!dateStr) return "—";
  const date = new Date(dateStr);
  return date.toLocaleDateString("es-CO", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "America/Bogota",
  });
};

const canEditPreconsulta = (fechaCita) => {
  if (!fechaCita) return false;
  const ahora = new Date();
  const cita = new Date(fechaCita);
  const diffHours = (cita - ahora) / (1000 * 60 * 60);
  // Permitir editar hasta 2 horas antes de la cita
  return diffHours > 2;
};

export const PacientePreconsulta = () => {
  const [loading, setLoading] = useState(true);
  const [citas, setCitas] = useState([]);
  const [selectedCita, setSelectedCita] = useState(null);
  const [ficha, setFicha] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formData, setFormData] = useState({
    motivo: "",
    sintomas: "",
    antecedentes: "",
    alergias: "",
    medicamentos: "",
    signos_vitales: {
      presion_arterial: "",
      frecuencia_cardiaca: "",
      temperatura: "",
      saturacion: "",
      peso: "",
      talla: "",
    },
  });
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [showSignosVitales, setShowSignosVitales] = useState(false);

  const cargarCitas = useCallback(async () => {
    setLoading(true);
    try {
      const response = await citasApi.listarMisCitas();
      const data = response.data || response || [];
      // Filtrar citas que requieren preconsulta (confirmadas, pendientes)
      const citasConPreconsulta = Array.isArray(data)
        ? data.filter((c) =>
            ["confirmada", "pendiente", "reprogramada"].includes(
              c.estado?.toLowerCase(),
            ),
          )
        : [];
      setCitas(citasConPreconsulta);

      // Si hay una cita seleccionada pero ya no está en la lista, deseleccionarla
      if (
        selectedCita &&
        !citasConPreconsulta.find((c) => c.id === selectedCita.id)
      ) {
        setSelectedCita(null);
        setFicha(null);
      }
    } catch (err) {
      console.error(err);
      setError("Error cargando citas");
    } finally {
      setLoading(false);
    }
  }, [selectedCita]);

  const cargarFicha = useCallback(async (citaId) => {
    try {
      const response = await fichasPreconsultaApi.obtenerPorCita(citaId);
      const data = response.data || response;
      if (data) {
        setFicha(data);
        setFormData({
          motivo: data.motivo || "",
          sintomas: data.sintomas || "",
          antecedentes: data.antecedentes || "",
          alergias: data.alergias || "",
          medicamentos: data.medicamentos || "",
          signos_vitales: data.signos_vitales || {
            presion_arterial: "",
            frecuencia_cardiaca: "",
            temperatura: "",
            saturacion: "",
            peso: "",
            talla: "",
          },
        });
      } else {
        setFicha(null);
        setFormData({
          motivo: "",
          sintomas: "",
          antecedentes: "",
          alergias: "",
          medicamentos: "",
          signos_vitales: {
            presion_arterial: "",
            frecuencia_cardiaca: "",
            temperatura: "",
            saturacion: "",
            peso: "",
            talla: "",
          },
        });
      }
    } catch (err) {
      console.warn("No se pudo cargar ficha existente:", err);
      setFicha(null);
    }
  }, []);

  useEffect(() => {
    cargarCitas();
  }, [cargarCitas]);

  useEffect(() => {
    if (selectedCita) {
      cargarFicha(selectedCita.id);
    } else {
      setFicha(null);
    }
  }, [selectedCita, cargarFicha]);

  const handleSelectCita = (cita) => {
    if (selectedCita?.id === cita.id) {
      setSelectedCita(null);
      setFicha(null);
    } else {
      setSelectedCita(cita);
      setError(null);
      setSuccess(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith("signos_vitales.")) {
      const key = name.split(".")[1];
      setFormData((prev) => ({
        ...prev,
        signos_vitales: { ...prev.signos_vitales, [key]: value },
      }));
    } else {
      setFormData((prev) => ({ ...prev, [name]: value }));
    }
  };

  const handleSave = async (e, _enviar = false) => {
    e.preventDefault();
    if (!selectedCita) return;

    // Validación básica
    if (!formData.motivo.trim() || !formData.sintomas.trim()) {
      setError("Motivo y síntomas son obligatorios");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await fichasPreconsultaApi.crear({
        cita_id: selectedCita.id,
        motivo: formData.motivo.trim(),
        sintomas: formData.sintomas.trim(),
        antecedentes: formData.antecedentes.trim(),
        alergias: formData.alergias.trim(),
        medicamentos: formData.medicamentos.trim(),
        signos_vitales: formData.signos_vitales,
        enviado: _enviar,
      });
      setSuccess(true);
      setError(null);
      await cargarFicha(selectedCita.id);
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.mensaje || "Error guardando preconsulta");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <Loader2 className="h-8 w-8 text-teal-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Preconsulta</h1>
        <p className="text-gray-500 mt-1">
          Completa la información previa a tu cita médica
        </p>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-red-800 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" /> {error}
          </p>
        </div>
      )}

      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <p className="text-green-800 flex items-center gap-2">
            <ClipboardCheck className="h-5 w-5" /> Preconsulta guardada
            correctamente
          </p>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">
          Selecciona una cita
        </h2>
        {citas.length === 0 ? (
          <div className="text-center py-8">
            <Calendar className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <h3 className="text-lg font-medium text-gray-900">
              No tienes citas programadas
            </h3>
            <p className="text-gray-500 mt-1">
              Cuando tengas una cita confirmada, aparecerá aquí para completar
              la preconsulta
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {citas.map((cita) => {
              const editable = canEditPreconsulta(cita.fecha);
              return (
                <button
                  key={cita.id}
                  onClick={() => handleSelectCita(cita)}
                  disabled={!editable}
                  className={`p-4 border-2 rounded-lg text-left transition-colors ${
                    selectedCita?.id === cita.id
                      ? "border-teal-500 bg-teal-50"
                      : editable
                        ? "border-gray-200 hover:border-gray-300"
                        : "border-gray-200 bg-gray-50 cursor-not-allowed opacity-75"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Calendar className="h-6 w-6 text-teal-600" />
                    <div>
                      <p className="font-medium text-gray-900">
                        {formatDateShort(cita.fecha)}
                      </p>
                      <p className="text-sm text-gray-500">
                        {cita.medico_nombre || cita.medico} -{" "}
                        {cita.especialidad_nombre || cita.especialidad}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span
                      className={`inline-block px-2 py-1 text-xs rounded-full ${
                        cita.estado === "confirmada"
                          ? "bg-green-100 text-green-800"
                          : cita.estado === "pendiente"
                            ? "bg-yellow-100 text-yellow-800"
                            : cita.estado === "reprogramada"
                              ? "bg-blue-100 text-blue-800"
                              : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {cita.estado}
                    </span>
                    {!editable && (
                      <span className="text-xs text-gray-400">
                        No editable (≤2h)
                      </span>
                    )}
                    {ficha && selectedCita?.id === cita.id && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full flex items-center gap-1">
                        <ClipboardCheck className="h-3 w-3" /> Guardada
                      </span>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {selectedCita && (
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">
                Preconsulta para {formatDateShort(selectedCita.fecha)}
              </h2>
              <p className="text-sm text-gray-500 mt-1">
                {selectedCita.medico_nombre || selectedCita.medico} -{" "}
                {selectedCita.especialidad_nombre || selectedCita.especialidad}
              </p>
            </div>
            <button
              onClick={() => setSelectedCita(null)}
              className="p-2 text-gray-400 hover:text-gray-600"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {ficha && (
            <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center gap-2">
              <ClipboardCheck className="h-5 w-5 text-green-600" />
              <span className="text-sm text-green-800">
                Ya existe una preconsulta guardada. Puedes actualizarla.
              </span>
            </div>
          )}

          <form onSubmit={(e) => handleSave(e, true)} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Motivo de la cita *
                </label>
                <textarea
                  name="motivo"
                  value={formData.motivo}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="¿Por qué acudes a la cita?"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Síntomas actuales *
                </label>
                <textarea
                  name="sintomas"
                  value={formData.sintomas}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Describe tus síntomas..."
                  required
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Antecedentes médicos
                </label>
                <textarea
                  name="antecedentes"
                  value={formData.antecedentes}
                  onChange={handleChange}
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Cirugías previas, enfermedades crónicas, antecedentes familiares..."
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alergias conocidas
                </label>
                <input
                  name="alergias"
                  type="text"
                  value={formData.alergias}
                  onChange={handleChange}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                  placeholder="Ej: Penicilina, Ibuprofeno... (Ninguna si no tienes)"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Medicamentos actuales
              </label>
              <textarea
                name="medicamentos"
                value={formData.medicamentos}
                onChange={handleChange}
                rows={2}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                placeholder="Lista los medicamentos que tomas actualmente..."
              />
            </div>

            {/* Signos vitales - colapsable */}
            <div className="border-t border-gray-200 pt-4">
              <button
                type="button"
                onClick={() => setShowSignosVitales(!showSignosVitales)}
                className="flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium"
              >
                {showSignosVitales ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
                <span>Signos vitales (opcional)</span>
                <Heart className="h-5 w-5" />
              </button>

              {showSignosVitales && (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mt-4 pt-4 border-t border-gray-200">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Presión arterial
                    </label>
                    <input
                      name="signos_vitales.presion_arterial"
                      type="text"
                      value={formData.signos_vitales.presion_arterial}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Ej: 120/80"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Frecuencia cardíaca
                    </label>
                    <input
                      name="signos_vitales.frecuencia_cardiaca"
                      type="number"
                      value={formData.signos_vitales.frecuencia_cardiaca}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Ej: 72"
                      min="30"
                      max="200"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Temperatura (°C)
                    </label>
                    <input
                      name="signos_vitales.temperatura"
                      type="number"
                      step="0.1"
                      value={formData.signos_vitales.temperatura}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Ej: 36.5"
                      min="30"
                      max="42"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Saturación O2 (%)
                    </label>
                    <input
                      name="signos_vitales.saturacion"
                      type="number"
                      value={formData.signos_vitales.saturacion}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Ej: 98"
                      min="70"
                      max="100"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Peso (kg)
                    </label>
                    <input
                      name="signos_vitales.peso"
                      type="number"
                      step="0.1"
                      value={formData.signos_vitales.peso}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Ej: 70.5"
                      min="0.5"
                      max="300"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Talla (cm)
                    </label>
                    <input
                      name="signos_vitales.talla"
                      type="number"
                      value={formData.signos_vitales.talla}
                      onChange={handleChange}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500"
                      placeholder="Ej: 170"
                      min="30"
                      max="250"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex gap-3 pt-4 border-t border-gray-200">
              <button
                type="button"
                onClick={(e) => handleSave(e, false)}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                <Save className="h-5 w-5" />
                {saving ? "Guardando..." : "Guardar borrador"}
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
              >
                <ClipboardCheck className="h-5 w-5" />
                {saving ? "Enviando..." : "Guardar y enviar"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};
