/**
 * public/assets/js/admin.js
 * ---------------------------------------------------------------------------
 * Lógica de TODAS las pantallas del ADMINISTRADOR (roles/admin/*.html).
 *
 * Un solo archivo para las cinco pantallas. Cada <body> trae un atributo
 * data-pagina ("admin-usuarios", "admin-horarios"...) y al final de este
 * archivo se ejecuta únicamente la función de la pantalla actual.
 *
 *   admin-dashboard       -> paginaDashboard()       GET  /api/reportes/resumen
 *   admin-usuarios        -> paginaUsuarios()        /api/admin/usuarios...
 *   admin-especialidades  -> paginaEspecialidades()  /api/admin/especialidades...
 *   admin-horarios        -> paginaHorarios()        /api/admin/horarios...
 *   admin-reportes        -> paginaReportes()        GET  /api/admin/reportes/ausentismo
 *
 * Depende de (cargados antes en el HTML):
 *   - app.js         -> api() (agrega el token, maneja la sesión vencida), control de rol y logout
 *   - panel-comun.js -> PanelUI (elementos seguros, avisos, modales)
 *
 * Seguridad: aquí solo se muestra u oculta lo que el servidor ya permite. Todas
 * las reglas (rol, validaciones, "no desactivarte a ti mismo"...) se
 * comprueban en el servidor (server/rutas/admin.js).
 */
(() => {
    "use strict";

    const { el, icono, avisar, confirmar, formularioModal, cargando } = PanelUI;

    // Nombres de los días: el índice coincide con dia_semana de la base de datos (0 = domingo).
    const DIAS = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
    const ROLES = { paciente: "Paciente", medico: "Médico", recepcionista: "Recepcionista", administrador: "Administrador" };

    // =====================================================================
    // AYUDANTES COMUNES
    // =====================================================================

    /** Atajo para document.getElementById. */
    const $ = (id) => document.getElementById(id);

    /** Convierte el contenido de un <form> en un objeto { nombre: valor }. */
    const datosDe = (formulario) => Object.fromEntries(new FormData(formulario));

    /** Petición con cuerpo JSON (POST, PUT, PATCH). */
    const enviar = (ruta, metodo, cuerpo) => api(ruta, { method: metodo, body: JSON.stringify(cuerpo || {}) });

    /**
     * Ejecuta una acción del usuario (crear, borrar...) y muestra el resultado
     * como aviso. Devuelve true si salió bien. Así cada pantalla no repite el try/catch.
     *
     * @param {Function} accion - función async que hace la petición y devuelve la respuesta del servidor
     */
    async function ejecutar(accion) {
        try {
            const respuesta = await accion();
            if (!respuesta) return false; // sesión vencida: app.js ya redirigió al login
            avisar(respuesta.mensaje || "Listo", "success");
            return true;
        } catch (error) {
            avisar(error.message, "danger");
            return false;
        }
    }

    /** Insignia de rol (de color) para las tablas. */
    const insigniaRol = (rol) => el("span", { clase: `insignia rol-${rol}`, texto: ROLES[rol] || rol });

    /** Insignia activo / inactivo. */
    const insigniaActivo = (activo) => el("span", { clase: `insignia ${activo ? "cuenta-activa" : "cuenta-inactiva"}` },
        icono(activo ? "check-circle-fill" : "dash-circle"), activo ? "Activo" : "Inactivo");

    /** Botón pequeño de icono para la columna de acciones. */
    function botonIcono({ nombreIcono, titulo, color = "clinicita", alHacerClic, deshabilitado = false }) {
        return el("button", {
            clase: `btn btn-sm btn-outline-${color}`,
            attrs: { type: "button", title: titulo, "aria-label": titulo, disabled: deshabilitado },
            on: { click: alHacerClic }
        }, icono(nombreIcono));
    }

    /** Muestra/oculta el mensaje de "sin resultados" según haya filas o no. */
    function alternarVacio(idVacio, hayFilas) {
        $(idVacio).classList.toggle("d-none", hayFilas);
    }

    // =====================================================================
    // PANEL (dashboard.html)
    // =====================================================================
    async function paginaDashboard() {
        try {
            const datos = await api("/reportes/resumen"); // CAMBIO (Opción A): ruta del equipo
            if (!datos) return;
            $("kpi-usuarios").textContent = datos.usuarios;
            $("kpi-citas").textContent = datos.citas_mes;
            $("kpi-ausentismo").textContent = datos.ausentismo; // ya viene con el %
            $("kpi-espera").textContent = datos.lista_espera;
            $("periodo-resumen").textContent = "Resumen del mes en curso";
        } catch (error) {
            avisar(error.message, "danger");
        }
    }

    // =====================================================================
    // USUARIOS (usuarios.html)
    // =====================================================================
    async function paginaUsuarios() {
        const formulario = $("form-usuario");
        const tbody = $("tabla-usuarios");
        let usuarios = [];       // lista completa traída del servidor
        let yo = null;           // id del administrador conectado
        let especialidades = []; // especialidades ACTIVAS (para el selector del médico)

        // ---- Campos que cambian según el rol -----------------------------
        // paciente  -> documento + teléfono ; médico -> especialidad.
        // Además de mostrarlos, se activa/desactiva "required" para que el
        // navegador solo exija los campos del rol elegido.
        function ajustarCamposPorRol() {
            const rol = formulario.elements.rol.value;
            formulario.querySelectorAll("[data-solo-rol]").forEach((caja) => {
                const aplica = caja.dataset.soloRol === rol;
                caja.classList.toggle("d-none", !aplica);
                caja.querySelectorAll("input,select").forEach((campo) => { campo.required = aplica; });
            });
        }
        formulario.elements.rol.addEventListener("change", ajustarCamposPorRol);

        // ---- Carga de datos ------------------------------------------------
        async function cargarEspecialidades() {
            const datos = await api("/admin/especialidades");
            if (!datos) return;
            especialidades = datos.especialidades.filter((e) => e.activo);
            const selector = formulario.elements.especialidad;
            selector.replaceChildren(
                el("option", { texto: "Selecciona...", attrs: { value: "" } }),
                ...especialidades.map((e) => el("option", { texto: e.nombre, attrs: { value: e.nombre } }))
            );
        }

        /**
         * CAMBIO (Opción A): los datos vienen de GET /api/usuarios del servidor del equipo.
         * Sus nombres de campo se adaptan aquí para que el resto de la pantalla no cambie:
         * documento_id -> documento. El id del administrador conectado sale de GET /api/auth/me.
         */
        async function cargarUsuarios() {
            const [datos, quien] = await Promise.all([api("/usuarios?limit=200"), api("/auth/me")]);
            if (!datos || !quien) return;
            usuarios = datos.usuarios.map((u) => ({ ...u, documento: u.documento_id || null }));
            yo = quien.usuario.id;
            pintar();
        }

        // ---- Tabla con búsqueda y filtro (se filtra en el navegador) --------
        function pintar() {
            const texto = $("buscar-usuario").value.trim().toLowerCase();
            const rol = $("filtro-rol").value;
            const filtrados = usuarios.filter((u) =>
                (!rol || u.rol === rol) &&
                (!texto || [u.nombre_completo, u.correo, u.documento || ""].some((campo) => campo.toLowerCase().includes(texto)))
            );
            tbody.replaceChildren(...filtrados.map(filaUsuario));
            alternarVacio("vacio-usuarios", filtrados.length > 0);
            $("contador-usuarios").textContent = `${filtrados.length} de ${usuarios.length} usuarios`;
        }
        $("buscar-usuario").addEventListener("input", pintar);
        $("filtro-rol").addEventListener("change", pintar);

        function filaUsuario(u) {
            const esYo = u.usuario_id === yo;
            return el("tr", { clase: u.activo ? "" : "fila-apagada" },
                el("td", {},
                    el("strong", { texto: u.nombre_completo }),
                    esYo ? el("span", { clase: "insignia rol-administrador ms-2", texto: "Tú" }) : null,
                    u.especialidad ? el("div", { clase: "small text-muted", texto: u.especialidad }) : null
                ),
                el("td", { texto: u.documento || "—" }),
                el("td", { texto: u.correo }),
                el("td", {}, insigniaRol(u.rol)),
                el("td", {}, insigniaActivo(u.activo)),
                el("td", { clase: "celda-acciones text-end" },
                    botonIcono({ nombreIcono: "pencil", titulo: "Editar", alHacerClic: () => editar(u) }),
                    botonIcono({
                        nombreIcono: u.activo ? "person-slash" : "person-check",
                        titulo: esYo ? "No puedes desactivar tu propia cuenta" : (u.activo ? "Desactivar" : "Activar"),
                        color: u.activo ? "danger" : "success",
                        deshabilitado: esYo,
                        alHacerClic: () => cambiarEstado(u)
                    })
                )
            );
        }

        // ---- Acciones ----------------------------------------------------------

        /** Activar o desactivar (pide confirmación solo al desactivar). */
        async function cambiarEstado(u) {
            const desactivar = Boolean(u.activo);
            if (desactivar) {
                const acepto = await confirmar({
                    titulo: "Desactivar usuario",
                    mensaje: `${u.nombre_completo} ya no podrá iniciar sesión${u.rol === "medico" ? " y dejará de aparecer para agendar citas" : ""}. Podrás reactivarlo cuando quieras.`,
                    textoConfirmar: "Desactivar",
                    peligro: true
                });
                if (!acepto) return;
            }
            // Activar o desactivar = PUT con activo. El servidor también oculta/muestra al médico.
            const bien = await ejecutar(() => enviar(`/usuarios/${u.usuario_id}`, "PUT", { activo: !desactivar }));
            if (bien) cargarUsuarios();
        }

        /** Ventana de edición: nombre, contraseña nueva (opcional) y, si es médico, especialidad. */
        async function editar(u) {
            const campos = [
                { nombre: "nombre_completo", etiqueta: "Nombre completo", valor: u.nombre_completo, requerido: true, maxlength: 100 },
                { nombre: "clave", etiqueta: "Nueva contraseña", tipo: "password", minlength: 8, maxlength: 100,
                  ayuda: "Déjala vacía para no cambiarla. Mínimo 8 caracteres." }
            ];
            if (u.rol === "medico") {
                const opciones = especialidades.map((e) => ({ valor: e.nombre, texto: e.nombre }));
                // Si la especialidad actual está inactiva no aparece en la lista; se agrega para no perderla de vista.
                if (u.especialidad && !opciones.some((o) => o.valor === u.especialidad)) {
                    opciones.unshift({ valor: u.especialidad, texto: `${u.especialidad} (inactiva)` });
                }
                campos.push({ nombre: "especialidad", etiqueta: "Especialidad", tipo: "select", valor: u.especialidad, opciones });
            }

            const guardado = await formularioModal({
                titulo: `Editar a ${u.nombre_completo}`,
                campos,
                alGuardar: async (valores) => {
                    // clave vacía => undefined => el JSON no la envía y no se cambia.
                    const cuerpo = { nombre_completo: valores.nombre_completo, clave: valores.clave || undefined };
                    // Solo se envía la especialidad si cambió (la actual podría estar inactiva y el servidor la rechazaría).
                    if (valores.especialidad && valores.especialidad !== u.especialidad) cuerpo.especialidad = valores.especialidad;
                    const respuesta = await enviar(`/usuarios/${u.usuario_id}`, "PUT", cuerpo);
                    if (respuesta) avisar(respuesta.mensaje, "success");
                }
            });
            if (guardado) cargarUsuarios();
        }

        // ---- Crear usuario ----------------------------------------------------------
        formulario.addEventListener("submit", async (evento) => {
            evento.preventDefault(); // evita que el navegador recargue la página
            if (!formulario.checkValidity()) { formulario.reportValidity(); return; }
            const boton = formulario.querySelector("button[type=submit]");
            boton.disabled = true;
            // CAMBIO (Opción A): el formulario tiene nombres y apellidos separados; el servidor
            // del equipo pide un solo nombre_completo. El teléfono se envía sin espacios ni guiones.
            const datos = datosDe(formulario);
            const cuerpo = {
                nombre_completo: `${datos.nombres} ${datos.apellidos}`.trim(),
                correo: datos.correo,
                clave: datos.clave,
                rol: datos.rol
            };
            if (datos.rol === "paciente") {
                // CAMBIO (documento): se recorta antes de enviar; los espacios cuentan como otro documento.
                cuerpo.documento = (datos.documento || "").trim();
                cuerpo.telefono = (datos.telefono || "").replace(/[\s-]/g, "");
            }
            if (datos.rol === "medico") cuerpo.especialidad = datos.especialidad;
            const bien = await ejecutar(() => enviar("/usuarios", "POST", cuerpo));
            boton.disabled = false;
            if (bien) {
                formulario.reset();
                ajustarCamposPorRol();
                cargarUsuarios();
            }
        });

        // ---- Arranque ----------------------------------------------------------------
        cargando(tbody, 6);
        try {
            await Promise.all([cargarEspecialidades(), cargarUsuarios()]);
        } catch (error) {
            tbody.replaceChildren();
            avisar(error.message, "danger");
        }
    }

    // =====================================================================
    // ESPECIALIDADES (especialidades.html)
    // =====================================================================
    async function paginaEspecialidades() {
        const formulario = $("form-especialidad");
        const tbody = $("tabla-especialidades");

        async function cargar() {
            const datos = await api("/admin/especialidades");
            if (!datos) return;
            tbody.replaceChildren(...datos.especialidades.map(fila));
            alternarVacio("vacio-especialidades", datos.especialidades.length > 0);
        }

        function fila(e) {
            const tieneMedicos = e.medicos > 0;
            return el("tr", { clase: e.activo ? "" : "fila-apagada" },
                el("td", {}, el("strong", { texto: e.nombre })),
                el("td", { clase: e.descripcion ? "" : "text-muted", texto: e.descripcion || "Sin descripción" }),
                el("td", { clase: "text-center" }, el("span", { clase: "insignia rol-medico", texto: String(e.medicos) })),
                el("td", {}, insigniaActivo(e.activo)),
                el("td", { clase: "celda-acciones text-end" },
                    botonIcono({ nombreIcono: "pencil", titulo: "Editar descripción", alHacerClic: () => editar(e) }),
                    botonIcono({
                        nombreIcono: e.activo ? "toggle-on" : "toggle-off",
                        titulo: e.activo ? "Desactivar" : "Activar",
                        color: e.activo ? "success" : "secondary",
                        alHacerClic: () => alternarActivo(e)
                    }),
                    botonIcono({
                        nombreIcono: "trash",
                        titulo: tieneMedicos ? "No se puede eliminar: tiene médicos asociados" : "Eliminar",
                        color: "danger",
                        deshabilitado: tieneMedicos,
                        alHacerClic: () => eliminar(e)
                    })
                )
            );
        }

        async function alternarActivo(e) {
            if (e.activo) {
                const acepto = await confirmar({
                    titulo: "Desactivar especialidad",
                    mensaje: `"${e.nombre}" dejará de aparecer a los pacientes al agendar. Las citas ya agendadas no se afectan.`,
                    textoConfirmar: "Desactivar",
                    peligro: true
                });
                if (!acepto) return;
            }
            if (await ejecutar(() => enviar(`/admin/especialidades/${e.especialidad_id}`, "PUT", { activo: !e.activo }))) cargar();
        }

        async function editar(e) {
            const guardado = await formularioModal({
                titulo: `Editar "${e.nombre}"`,
                campos: [{ nombre: "descripcion", etiqueta: "Descripción", tipo: "textarea", valor: e.descripcion || "", maxlength: 255,
                           ayuda: "El nombre no se puede cambiar porque los médicos y la lista de espera lo usan como referencia." }],
                alGuardar: async (valores) => {
                    const respuesta = await enviar(`/admin/especialidades/${e.especialidad_id}`, "PUT", { descripcion: valores.descripcion });
                    if (respuesta) avisar(respuesta.mensaje, "success");
                }
            });
            if (guardado) cargar();
        }

        async function eliminar(e) {
            const acepto = await confirmar({
                titulo: "Eliminar especialidad",
                mensaje: `Se eliminará "${e.nombre}" de forma permanente. Esta acción no se puede deshacer.`,
                textoConfirmar: "Eliminar",
                peligro: true
            });
            if (acepto && await ejecutar(() => api(`/admin/especialidades/${e.especialidad_id}`, { method: "DELETE" }))) cargar();
        }

        formularioEnviar(formulario, async () => {
            const bien = await ejecutar(() => enviar("/admin/especialidades", "POST", datosDe(formulario)));
            if (bien) { formulario.reset(); cargar(); }
        });

        cargando(tbody, 5);
        try { await cargar(); } catch (error) { tbody.replaceChildren(); avisar(error.message, "danger"); }
    }

    /** Conecta el envío de un formulario: valida, bloquea el botón mientras trabaja y evita doble envío. */
    function formularioEnviar(formulario, alEnviar) {
        formulario.addEventListener("submit", async (evento) => {
            evento.preventDefault();
            if (!formulario.checkValidity()) { formulario.reportValidity(); return; }
            const boton = formulario.querySelector("button[type=submit]");
            boton.disabled = true;
            try { await alEnviar(); } finally { boton.disabled = false; }
        });
    }

    // =====================================================================
    // HORARIOS (horarios.html)
    // =====================================================================
    async function paginaHorarios() {
        const formulario = $("form-horario");
        const tbody = $("tabla-horarios");
        const filtro = $("filtro-medico-horario");
        let horarios = [];

        /**
         * Llena el selector de SEDE del formulario con GET /api/sedes (ruta que ya
         * existía en server.js; devuelve solo las sedes activas).
         */
        async function cargarSedes() {
            const datos = await api("/sedes");
            if (!datos) return;
            $("h-sede").replaceChildren(
                el("option", { texto: "Selecciona...", attrs: { value: "" } }),
                ...datos.sedes.map((sd) => el("option", { texto: sd.nombre, attrs: { value: String(sd.sede_id) } }))
            );
        }

        /** Llena los dos selectores de médico (el del formulario y el del filtro). */
        async function cargarMedicos() {
            // /api/medicos ya existía (lo usa el paciente) y permite el rol administrador.
            const datos = await api("/medicos");
            if (!datos) return;
            const opciones = datos.medicos.map((m) => ({ valor: String(m.medico_id), texto: `${m.nombre_completo} · ${m.especialidad}` }));
            $("h-medico").replaceChildren(
                el("option", { texto: "Selecciona...", attrs: { value: "" } }),
                ...opciones.map((o) => el("option", { texto: o.texto, attrs: { value: o.valor } }))
            );
            filtro.replaceChildren(
                el("option", { texto: "Todos los médicos", attrs: { value: "" } }),
                ...opciones.map((o) => el("option", { texto: o.texto, attrs: { value: o.valor } }))
            );
        }

        /**
         * CAMBIO (Opción A): GET /api/horarios/admin del equipo. Adaptamos sus nombres de campo
         * (medico_nombre, sede_nombre, duracion_slot) y quitamos los segundos de la hora (08:00:00 -> 08:00).
         */
        async function cargarHorarios() {
            const datos = await api("/horarios/admin");
            if (!datos) return;
            horarios = datos.horarios.map((h) => ({
                ...h,
                medico: h.medico_nombre,
                sede: h.sede_nombre,
                hora_inicio: h.hora_inicio.slice(0, 5),
                hora_fin: h.hora_fin.slice(0, 5),
                duracion_min: h.duracion_slot
            }));
            pintar();
        }

        function pintar() {
            const medicoId = Number(filtro.value) || null;
            // Orden: médico -> día (lunes primero, domingo al final) -> hora de inicio.
            const ordenDia = (d) => (d + 6) % 7;
            const lista = horarios
                .filter((h) => !medicoId || h.medico_id === medicoId)
                .sort((a, b) => a.medico.localeCompare(b.medico) || ordenDia(a.dia_semana) - ordenDia(b.dia_semana) || a.hora_inicio.localeCompare(b.hora_inicio));
            tbody.replaceChildren(...lista.map(fila));
            alternarVacio("vacio-horarios", lista.length > 0);
        }
        filtro.addEventListener("change", pintar);

        function fila(h) {
            return el("tr", {},
                el("td", {}, el("strong", { texto: h.medico })),
                el("td", { texto: h.sede }),
                el("td", { texto: DIAS[h.dia_semana] }),
                el("td", { texto: h.hora_inicio }),
                el("td", { texto: h.hora_fin }),
                el("td", { texto: `${h.duracion_min} min` }),
                el("td", { clase: "celda-acciones text-end" },
                    botonIcono({ nombreIcono: "trash", titulo: "Eliminar horario", color: "danger", alHacerClic: () => eliminar(h) })
                )
            );
        }

        async function eliminar(h) {
            const acepto = await confirmar({
                titulo: "Eliminar horario",
                mensaje: `Se eliminará el bloque de ${h.medico} en ${h.sede}: ${DIAS[h.dia_semana]} de ${h.hora_inicio} a ${h.hora_fin}. Las citas ya agendadas en ese bloque se conservan; solo se impiden nuevas.`,
                textoConfirmar: "Eliminar",
                peligro: true
            });
            if (acepto && await ejecutar(() => api(`/horarios/admin/${h.horario_id}`, { method: "DELETE" }))) cargarHorarios();
        }

        formularioEnviar(formulario, async () => {
            const datos = datosDe(formulario);
            // Comprobación rápida en el navegador (el servidor valida de nuevo): evita un viaje de ida y vuelta.
            if (datos.hora_inicio >= datos.hora_fin) { avisar("La hora de inicio debe ser menor que la de fin", "warning"); return; }
            // CAMBIO (Opción A): el servidor del equipo pide números y horas con segundos (HH:MM:SS).
            const cuerpo = {
                medico_id: Number(datos.medico_id),
                sede_id: Number(datos.sede_id),
                dia_semana: Number(datos.dia),
                hora_inicio: `${datos.hora_inicio}:00`,
                hora_fin: `${datos.hora_fin}:00`,
                duracion_slot: Number(datos.duracion) || 30 // vacío => 30 min
            };
            const bien = await ejecutar(() => enviar("/horarios/admin", "POST", cuerpo));
            if (bien) {
                // Se conservan el médico y la sede elegidos para agregar varios días seguidos
                // sin volver a buscarlos.
                const medico = formulario.elements.medico_id.value;
                const sede = formulario.elements.sede_id.value;
                formulario.reset();
                formulario.elements.medico_id.value = medico;
                formulario.elements.sede_id.value = sede;
                cargarHorarios();
            }
        });

        cargando(tbody, 7);
        try { await Promise.all([cargarMedicos(), cargarSedes(), cargarHorarios()]); } catch (error) { tbody.replaceChildren(); avisar(error.message, "danger"); }
    }

    // =====================================================================
    // REPORTES (reportes.html)
    // =====================================================================
    async function paginaReportes() {
        const desde = $("rep-desde");
        const hasta = $("rep-hasta");
        const tbody = $("tabla-reportes");
        const pie = $("total-reportes");

        /** Barra roja proporcional a la tasa de ausentismo, con el porcentaje al lado. */
        function celdaTasa(tasa) {
            return el("div", { clase: "barra-tasa" },
                el("div", { clase: "progress", attrs: { role: "progressbar", "aria-valuenow": tasa, "aria-valuemin": 0, "aria-valuemax": 100 } },
                    el("div", { clase: "progress-bar", attrs: { style: `width:${Math.min(tasa, 100)}%` } })),
                el("span", { clase: "valor", texto: `${tasa}%` })
            );
        }

        const celdaNumero = (valor) => el("td", { clase: "text-end", texto: String(valor) });

        async function consultar() {
            cargando(tbody, 7);
            pie.replaceChildren();
            try {
                const params = new URLSearchParams();
                if (desde.value) params.set("desde", desde.value);
                if (hasta.value) params.set("hasta", hasta.value);
                const datos = await api(`/admin/reportes/ausentismo${params.size ? `?${params}` : ""}`);
                if (!datos) return;

                // El servidor devuelve el rango realmente usado (útil en la primera carga, que llega sin fechas).
                desde.value = datos.desde;
                hasta.value = datos.hasta;
                $("rep-periodo").textContent = `Del ${datos.desde} al ${datos.hasta}`;
                $("rep-programadas").textContent = datos.total.programadas;
                $("rep-inasistencias").textContent = datos.total.inasistencias;
                $("rep-tasa").textContent = `${datos.total.tasa}%`;

                tbody.replaceChildren(...datos.detalle.map((f) => el("tr", {},
                    el("td", {}, el("strong", { texto: f.especialidad })),
                    celdaNumero(f.programadas), celdaNumero(f.atendidas), celdaNumero(f.canceladas),
                    celdaNumero(f.por_atender), celdaNumero(f.inasistencias),
                    el("td", {}, celdaTasa(f.tasa))
                )));
                alternarVacio("vacio-reportes", datos.detalle.length > 0);

                if (datos.detalle.length) {
                    const t = datos.total;
                    pie.replaceChildren(el("tr", {},
                        el("td", { texto: "Total" }),
                        celdaNumero(t.programadas), celdaNumero(t.atendidas), celdaNumero(t.canceladas),
                        celdaNumero(t.por_atender), celdaNumero(t.inasistencias),
                        el("td", {}, celdaTasa(t.tasa))
                    ));
                }
            } catch (error) {
                tbody.replaceChildren();
                avisar(error.message, "danger");
            }
        }

        $("form-reporte").addEventListener("submit", (evento) => { evento.preventDefault(); consultar(); });
        consultar(); // primera carga: mes en curso
    }

    // =====================================================================
    // ARRANQUE: ejecuta solo la función de la pantalla actual
    // =====================================================================
    const pantallas = {
        "admin-dashboard": paginaDashboard,
        "admin-usuarios": paginaUsuarios,
        "admin-especialidades": paginaEspecialidades,
        "admin-horarios": paginaHorarios,
        "admin-reportes": paginaReportes
    };
    const iniciar = pantallas[document.body.dataset.pagina];
    if (iniciar) iniciar();
})();
