/**
 * public/assets/js/medico.js
 * ---------------------------------------------------------------------------
 * Lógica de la pantalla del MÉDICO (roles/medico/agenda.html).
 *
 * Qué hace:
 *   1. Pide al servidor la agenda del médico conectado  -> GET /api/citas/medico?fecha=
 *   2. Dibuja las tarjetas de resumen y la tabla de citas.
 *   3. Permite marcar cada cita como "Asistió" o "No asistió"
 *                                                       -> PUT /api/citas/:id/estado
 *   4. Se actualiza sola cada 60 s (un paciente puede cancelar mientras tanto).
 *
 * Depende de (cargados antes en el HTML):
 *   - app.js         -> función api() (agrega el token y maneja la sesión vencida)
 *   - panel-comun.js -> objeto PanelUI (crear elementos, avisos, confirmaciones)
 *
 * IMPORTANTE: el servidor es quien decide qué se puede hacer. Cada cita llega
 * con el campo `puede_marcar`; este archivo solo muestra u oculta los botones.
 * Aunque alguien los activara desde la consola, el servidor rechazaría la petición.
 */
(() => {
    "use strict";

    // Si esta no es la página de la agenda, no hacemos nada.
    if (document.body.dataset.pagina !== "medico-agenda") return;

    const { el, icono, avisar, confirmar, cargando, formatearFecha, sumarDias } = PanelUI;

    // --- Referencias a elementos de la página ---
    const inputFecha = document.getElementById("fecha-agenda");
    const tbody = document.getElementById("tabla-agenda");
    const vacio = document.getElementById("vacio-agenda");

    // --- Estado de la pantalla ---
    let hoyServidor = null;  // "hoy" según el servidor (zona horaria de la clínica)
    let turno = 0;           // contador de peticiones: sirve para descartar respuestas viejas

    /** Texto de cada estado tal como lo ve el médico. */
    const ETIQUETA_ESTADO = {
        Pendiente: "Pendiente",
        Confirmada: "Confirmada",
        Completada: "Atendida",
        "No-Asistio": "No asistió",
        Cancelada: "Cancelada"
    };
    const ICONO_ESTADO = {
        Pendiente: "hourglass-split",
        Confirmada: "calendar2-check",
        Completada: "check2-circle",
        "No-Asistio": "person-x",
        Cancelada: "x-circle"
    };

    // =====================================================================
    // CARGA DE DATOS
    // =====================================================================

    /**
     * Pide la agenda al servidor y repinta la pantalla.
     *
     * @param {boolean} [silencioso=false] - true en las actualizaciones
     *        automáticas: no muestra "Cargando..." ni avisos de error.
     *
     * Problema que resuelve `turno`: si el médico cambia de día rápido, pueden
     * volver respuestas en desorden. Cada petición recibe un número; al llegar
     * la respuesta, si ya hay una petición más nueva, se descarta.
     */
    async function cargarAgenda(silencioso = false) {
        const miTurno = ++turno;
        if (!silencioso) cargando(tbody, 6);

        try {
            const fecha = inputFecha.value;
            const datos = await api(`/citas/medico${fecha ? `?fecha=${encodeURIComponent(fecha)}` : ""}`);
            console.log("respuesta agenda:", datos);
            if (!datos || miTurno !== turno) return;

            const hoyLocal = new Date().toLocaleDateString("en-CA"); // yyyy-MM-dd
            const kpis = datos.kpis || {};
            const normalizado = {
                hoy: datos.hoy || hoyLocal,
                fecha: datos.fecha || fecha || hoyLocal,
                medico: datos.medico || { nombre_completo: "Médico", especialidad: "" },
                citas: datos.citas || [],
                resumen: datos.resumen || {
                    Confirmada: kpis.confirmadas,
                    Pendiente: kpis.pendientes,
                    Cancelada: kpis.canceladas,
                    Completada: kpis.atendidas,
                    "No-Asistio": kpis.inasistencias
                }
            };

            hoyServidor = normalizado.hoy;
            inputFecha.value = normalizado.fecha;

            pintarEncabezado(normalizado);
            pintarResumen(normalizado.resumen);
            pintarTabla(normalizado.citas);
            document.getElementById("ultima-actualizacion").textContent =
                `Actualizado a las ${new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`;
            `Actualizado a las ${new Date().toLocaleTimeString("es-CO", { hour: "2-digit", minute: "2-digit" })}`;
        } catch (error) {
            if (miTurno !== turno) return;
            if (!silencioso) {
                tbody.replaceChildren();
                avisar(error.message, "danger");
            }
        }
    }

    // =====================================================================
    // DIBUJO DE LA PANTALLA
    // =====================================================================

    /** Nombre del médico, especialidad y fecha en letras. */
        function pintarEncabezado({ medico, fecha, hoy }) {
            document.getElementById("medico-info").textContent =
                [medico.nombre_completo, medico.especialidad].filter(Boolean).join(" · ");
            const titulo = document.getElementById("titulo-fecha");
            titulo.replaceChildren(formatearFecha(fecha));
            if (fecha === hoy) {
                titulo.append(" ", el("span", { clase: "insignia estado-confirmada ms-1", texto: "Hoy" }));
            }
        }

    /** Las cinco tarjetas de arriba. */
    function pintarResumen(resumen) {
        const ponerNumero = (id, valor) => { document.getElementById(id).textContent = valor || 0; };
        ponerNumero("kpi-confirmadas", resumen.Confirmada);
        ponerNumero("kpi-pendientes", resumen.Pendiente);
        ponerNumero("kpi-canceladas", resumen.Cancelada);
        ponerNumero("kpi-atendidas", resumen.Completada);
        ponerNumero("kpi-inasistencias", resumen["No-Asistio"]);
    }

    /** Tabla de citas del día (o el mensaje de "agenda vacía"). */
    function pintarTabla(citas) {
        tbody.replaceChildren(...citas.map(filaCita));
        vacio.classList.toggle("d-none", citas.length > 0);
    }

    /** Insignia de color con el estado de la cita. */
    function insigniaEstado(estado) {
        const clase = `insignia estado-${estado.toLowerCase()}`; // p. ej. "estado-no-asistio"
        return el("span", { clase }, icono(ICONO_ESTADO[estado] || "circle"), ETIQUETA_ESTADO[estado] || estado);
    }

    /** Una fila de la tabla por cada cita. */
    function filaCita(cita) {
        // Motivo de consulta + (si existen) los síntomas que el paciente reportó por WhatsApp.
        // Los hijos van envueltos en un <div> para que, en celular (tabla apilada),
        // el contenido quede junto como un bloque a la derecha del título.
        const celdaMotivo = el("td", { attrs: { "data-label": "Motivo" } }, el("div", {},
            cita.motivo ? el("span", { texto: cita.motivo }) : el("span", { clase: "text-muted", texto: "Sin motivo" }),
            cita.sintomas
                ? el("span", { clase: "texto-sintomas" }, icono("chat-left-text", "me-1"), `Síntomas reportados: ${cita.sintomas}`)
                : null
        ));

        // data-label = título de cada celda; solo se ve en celular (ver .tabla-apilable en panel.css).
        return el("tr", { clase: cita.estado === "Cancelada" ? "fila-apagada" : "" },
            // Bajo la hora se muestra la sede (si la cita tiene una): un médico puede atender en varias.
            el("td", { attrs: { "data-label": "Hora" } }, el("div", {},
                el("strong", { texto: cita.hora }),
                cita.sede ? el("div", { clase: "small text-muted", texto: cita.sede }) : null
            )),
            el("td", { texto: cita.paciente, attrs: { "data-label": "Paciente" } }),
            el("td", { texto: cita.documento_id, attrs: { "data-label": "Documento" } }), // nombre de campo del equipo
            celdaMotivo,
            el("td", { attrs: { "data-label": "Estado" } }, insigniaEstado(cita.estado)),
            celdaAsistencia(cita)
        );
    }

    /**
     * Columna "Asistencia": dos botones (Asistió / No asistió).
     *  - El botón del estado ACTUAL aparece relleno y deshabilitado.
     *  - Si la cita no se puede marcar, se explica por qué en lugar de mostrar botones.
     */
    function celdaAsistencia(cita) {
        if (!cita.puede_marcar) {
            const razon = cita.estado === "Cancelada" ? "Cita cancelada" : "Aún no es la fecha";
            return el("td", { clase: "text-muted small", texto: razon, attrs: { "data-label": "Asistencia" } });
        }
        return el("td", { clase: "celda-acciones", attrs: { "data-label": "Asistencia" } }, el("div", {},
            botonAsistencia(cita, "Completada", "Asistió", "check-circle", "success"),
            botonAsistencia(cita, "No-Asistio", "No asistió", "person-x", "danger")
        ));
    }

    /** Un botón de asistencia. `color` es la variante de Bootstrap (success / danger). */
    function botonAsistencia(cita, estadoDestino, texto, nombreIcono, color) {
        const esActual = cita.estado === estadoDestino;
        return el("button", {
            clase: `btn btn-sm btn-asistencia ${esActual ? `btn-${color}` : `btn-outline-${color}`}`,
            attrs: { type: "button", disabled: esActual, title: esActual ? "Estado actual" : `Marcar: ${texto}` },
            on: { click: () => alMarcar(cita, estadoDestino, texto) }
        }, icono(nombreIcono, "me-1"), texto);
    }

    // =====================================================================
    // ACCIONES
    // =====================================================================

    /**
     * Se ejecuta al pulsar un botón de asistencia.
     * Si la cita ya tenía un resultado (Atendida / No asistió), es una
     * CORRECCIÓN y se pide confirmación. Si estaba pendiente, se marca directo.
     */
    async function alMarcar(cita, estadoDestino, texto) {
        const esCorreccion = cita.estado === "Completada" || cita.estado === "No-Asistio";
        if (esCorreccion) {
            const acepto = await confirmar({
                titulo: "Corregir asistencia",
                mensaje: `La cita de ${cita.paciente} (${cita.hora}) está como "${ETIQUETA_ESTADO[cita.estado]}". ¿Cambiarla a "${texto}"?`,
                textoConfirmar: "Sí, cambiar"
            });
            if (!acepto) return;
        }

        try {
            const respuesta = await api(`/citas/${cita.cita_id}/estado`, { // CAMBIO (Opción A): ruta del equipo
                method: "PUT",
                body: JSON.stringify({ estado: estadoDestino })
            });
            if (!respuesta) return;
            avisar(`${cita.paciente}: ${respuesta.mensaje.toLowerCase()}`, "success");
        } catch (error) {
            avisar(error.message, "danger");
        }
        // En ambos casos recargamos: refleja el cambio, o el estado real si hubo conflicto.
        cargarAgenda(true);
    }

    // =====================================================================
    // NAVEGACIÓN ENTRE DÍAS
    // =====================================================================

    /** Mueve la fecha `dias` hacia adelante (o atrás si es negativo) y recarga. */
    function moverDia(dias) {
        if (!inputFecha.value) return;
        inputFecha.value = sumarDias(inputFecha.value, dias);
        cargarAgenda();
    }

    document.getElementById("btn-dia-anterior").addEventListener("click", () => moverDia(-1));
    document.getElementById("btn-dia-siguiente").addEventListener("click", () => moverDia(1));
    document.getElementById("btn-hoy").addEventListener("click", () => {
        inputFecha.value = hoyServidor || ""; // vacío => el servidor responde con la agenda de hoy
        cargarAgenda();
    });
    inputFecha.addEventListener("change", () => { if (inputFecha.value) cargarAgenda(); });
    // Evita que Enter dentro del formulario recargue la página completa.
    document.getElementById("filtro-fecha").addEventListener("submit", (e) => e.preventDefault());

    // =====================================================================
    // ARRANQUE
    // =====================================================================
    cargarAgenda();
    // Actualización automática cada 60 s, solo si la pestaña está visible.
    // (Antes 30 s. server.js limita cada IP a 100 peticiones /api cada 15 min; con 60 s
    // la agenda abierta gasta 15 de esas 100 y deja margen para trabajar.)
    setInterval(() => { if (!document.hidden) cargarAgenda(true); }, 60000);
})();
