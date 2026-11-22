/**
 * public/assets/js/panel-comun.js
 * ---------------------------------------------------------------------------
 * Herramientas de interfaz que comparten los paneles de MÉDICO y ADMIN.
 * Archivo nuevo. Se carga DESPUÉS de app.js (que ya trae la función api()) y
 * ANTES de medico.js / admin.js.
 *
 * Expone un único objeto global:  PanelUI
 *
 *   PanelUI.el(...)                crear elementos HTML de forma SEGURA
 *   PanelUI.icono(nombre)          icono de Bootstrap Icons
 *   PanelUI.avisar(msg, tipo)      aviso flotante que se cierra solo
 *   PanelUI.confirmar({...})       ventana "¿Estás seguro?" -> Promise<boolean>
 *   PanelUI.formularioModal({...}) ventana con formulario     -> Promise<boolean>
 *   PanelUI.cargando(tbody, n)     fila "Cargando..." en una tabla
 *   PanelUI.formatearFecha(f)      "2026-10-26" -> "lunes, 26 de octubre de 2026"
 *   PanelUI.pintarUsuarioLateral() muestra el nombre del usuario en la barra lateral
 *
 * ¿POR QUÉ NO USAR innerHTML?
 * Si metemos un dato de la base de datos con innerHTML (por ejemplo el motivo
 * de una cita) y alguien escribió "<img src=x onerror=...>", el navegador
 * EJECUTARÍA ese código (ataque XSS). Aquí todo el texto entra con
 * textContent, que lo trata siempre como texto plano, nunca como HTML.
 */
const PanelUI = (() => {
    "use strict";

    /**
     * Crea un elemento HTML.
     *
     * @param {string} etiqueta  - "div", "td", "button"...
     * @param {object} [opciones]
     *   clase   : string con las clases CSS
     *   texto   : texto interno (seguro: se inserta como texto, no como HTML)
     *   attrs   : { atributo: valor } ; con valor false/null/undefined se omite
     *   dataset : { clave: valor } -> data-clave="valor"
     *   on      : { click: funcion, ... } escuchadores de eventos
     * @param {...(Node|string|Array)} hijos - elementos o textos a incluir dentro
     * @returns {HTMLElement}
     *
     * Ejemplo: el("button", { clase: "btn btn-sm", texto: "Guardar", on: { click: guardar } })
     */
    function el(etiqueta, opciones = {}, ...hijos) {
        const nodo = document.createElement(etiqueta);
        const { clase, texto, attrs, dataset, on } = opciones;
        if (clase) nodo.className = clase;
        if (texto !== undefined && texto !== null) nodo.textContent = texto;
        if (attrs) {
            for (const [nombre, valor] of Object.entries(attrs)) {
                if (valor === undefined || valor === null || valor === false) continue;
                nodo.setAttribute(nombre, valor === true ? "" : valor);
            }
        }
        if (dataset) Object.assign(nodo.dataset, dataset);
        if (on) for (const [evento, funcion] of Object.entries(on)) nodo.addEventListener(evento, funcion);
        // .flat() permite pasar arreglos; append() acepta nodos y textos (los textos quedan como texto plano).
        hijos.flat().forEach((hijo) => { if (hijo !== null && hijo !== undefined && hijo !== false) nodo.append(hijo); });
        return nodo;
    }

    /** Icono de Bootstrap Icons: icono("check-circle") -> <i class="bi bi-check-circle"> */
    function icono(nombre, claseExtra = "") {
        return el("i", { clase: `bi bi-${nombre} ${claseExtra}`.trim(), attrs: { "aria-hidden": "true" } });
    }

    // ------------------------------------------------------------------
    // Avisos flotantes
    // ------------------------------------------------------------------
    const ICONOS_AVISO = {
        success: "check-circle-fill",
        danger: "exclamation-octagon-fill",
        warning: "exclamation-triangle-fill",
        info: "info-circle-fill"
    };

    /**
     * Muestra un aviso flotante abajo a la derecha.
     * Los de éxito se cierran a los 4 s; los de error duran más para dar
     * tiempo a leerlos.
     *
     * @param {string} mensaje
     * @param {"success"|"danger"|"warning"|"info"} [tipo="success"]
     */
    function avisar(mensaje, tipo = "success") {
        let contenedor = document.getElementById("panel-avisos");
        if (!contenedor) {
            contenedor = el("div", { attrs: { id: "panel-avisos", "aria-live": "polite" } });
            document.body.append(contenedor);
        }
        const aviso = el("div", {
            clase: `panel-aviso aviso-${tipo}`,
            attrs: { role: tipo === "danger" ? "alert" : "status" }
        }, icono(ICONOS_AVISO[tipo] || ICONOS_AVISO.info), el("div", { texto: mensaje }));
        contenedor.append(aviso);
        setTimeout(() => aviso.remove(), tipo === "danger" ? 7000 : 4000);
    }

    // ------------------------------------------------------------------
    // Ventanas modales (usan el JS de Bootstrap, que debe estar cargado)
    // ------------------------------------------------------------------

    /**
     * Construye la estructura de un modal de Bootstrap y lo muestra.
     * Devuelve { modal, cuerpo, pie, elemento }. Al cerrarse, el elemento se
     * elimina del documento para no acumular modales viejos.
     */
    function crearModal(titulo) {
        const cuerpo = el("div", { clase: "modal-body" });
        const pie = el("div", { clase: "modal-footer" });
        const elemento = el("div", { clase: "modal fade", attrs: { tabindex: "-1", "aria-hidden": "true" } },
            el("div", { clase: "modal-dialog modal-dialog-centered" },
                el("div", { clase: "modal-content" },
                    el("div", { clase: "modal-header" },
                        el("h2", { clase: "modal-title h5", texto: titulo }),
                        el("button", { clase: "btn-close", attrs: { type: "button", "data-bs-dismiss": "modal", "aria-label": "Cerrar" } })
                    ),
                    cuerpo,
                    pie
                )
            )
        );
        document.body.append(elemento);
        const modal = new bootstrap.Modal(elemento);
        elemento.addEventListener("hidden.bs.modal", () => { modal.dispose(); elemento.remove(); });
        return { modal, cuerpo, pie, elemento };
    }

    /**
     * Ventana de confirmación.
     *
     * @param {object} o
     *   titulo, mensaje
     *   textoConfirmar : texto del botón principal (por defecto "Confirmar")
     *   peligro        : true -> botón rojo (para acciones destructivas)
     * @returns {Promise<boolean>} true si el usuario confirmó, false si canceló o cerró
     */
    function confirmar({ titulo, mensaje, textoConfirmar = "Confirmar", peligro = false }) {
        return new Promise((resolver) => {
            const { modal, cuerpo, pie, elemento } = crearModal(titulo);
            let confirmado = false;
            cuerpo.append(el("p", { clase: "mb-0", texto: mensaje }));
            pie.append(
                el("button", { clase: "btn btn-outline-secondary", texto: "Cancelar", attrs: { type: "button", "data-bs-dismiss": "modal" } }),
                el("button", {
                    clase: `btn ${peligro ? "btn-danger" : "btn-clinicita"}`,
                    texto: textoConfirmar,
                    attrs: { type: "button" },
                    on: { click: () => { confirmado = true; modal.hide(); } }
                })
            );
            // Se resuelve la promesa cuando la ventana termina de cerrarse.
            elemento.addEventListener("hidden.bs.modal", () => resolver(confirmado));
            modal.show();
        });
    }

    /**
     * Ventana con un formulario. La validación del navegador (required,
     * minlength, type="email"...) se aplica antes de enviar. Si `alGuardar`
     * lanza un Error (por ejemplo el servidor responde 409), el mensaje se
     * muestra DENTRO de la ventana y esta sigue abierta para corregir.
     *
     * @param {object} o
     *   titulo
     *   campos : [{ nombre, etiqueta, tipo: "text"|"password"|"email"|"textarea"|"select",
     *               valor, requerido, minlength, maxlength, placeholder, ayuda,
     *               opciones: [{ valor, texto }]  (solo para select) }]
     *   textoGuardar : texto del botón (por defecto "Guardar")
     *   alGuardar    : async (valores) => {...}  función que hace la petición al servidor
     * @returns {Promise<boolean>} true si se guardó, false si se canceló
     */
    function formularioModal({ titulo, campos, textoGuardar = "Guardar", alGuardar }) {
        return new Promise((resolver) => {
            const { modal, cuerpo, pie, elemento } = crearModal(titulo);
            let guardado = false;

            const errorCaja = el("div", { clase: "alert alert-danger d-none", attrs: { role: "alert" } });
            const formulario = el("form", { attrs: { novalidate: true, id: `form-modal-${Date.now()}` } }, errorCaja);

            campos.forEach((campo) => {
                const id = `campo-${campo.nombre}-${Math.random().toString(36).slice(2, 7)}`;
                let control;
                if (campo.tipo === "select") {
                    control = el("select", { clase: "form-select", attrs: { id, name: campo.nombre, required: campo.requerido } },
                        (campo.opciones || []).map((op) => el("option", { texto: op.texto, attrs: { value: op.valor, selected: op.valor === campo.valor } })));
                } else if (campo.tipo === "textarea") {
                    control = el("textarea", { clase: "form-control", texto: campo.valor || "", attrs: { id, name: campo.nombre, rows: 3, maxlength: campo.maxlength, placeholder: campo.placeholder } });
                } else {
                    control = el("input", { clase: "form-control", attrs: {
                        id, name: campo.nombre, type: campo.tipo || "text", value: campo.valor || "",
                        required: campo.requerido, minlength: campo.minlength, maxlength: campo.maxlength,
                        placeholder: campo.placeholder, autocomplete: campo.tipo === "password" ? "new-password" : "off"
                    } });
                }
                formulario.append(el("div", { clase: "mb-3" },
                    el("label", { clase: "form-label", texto: campo.etiqueta, attrs: { for: id } }),
                    control,
                    campo.ayuda ? el("div", { clase: "form-text", texto: campo.ayuda }) : null
                ));
            });
            cuerpo.append(formulario);

            const botonGuardar = el("button", { clase: "btn btn-clinicita", texto: textoGuardar, attrs: { type: "submit", form: formulario.id } });
            pie.append(
                el("button", { clase: "btn btn-outline-secondary", texto: "Cancelar", attrs: { type: "button", "data-bs-dismiss": "modal" } }),
                botonGuardar
            );

            formulario.addEventListener("submit", async (evento) => {
                evento.preventDefault();
                errorCaja.classList.add("d-none");
                if (!formulario.checkValidity()) { formulario.reportValidity(); return; }
                botonGuardar.disabled = true; // evita doble clic mientras se guarda
                try {
                    await alGuardar(Object.fromEntries(new FormData(formulario)));
                    guardado = true;
                    modal.hide();
                } catch (error) {
                    errorCaja.textContent = error.message || "No se pudo guardar";
                    errorCaja.classList.remove("d-none");
                    botonGuardar.disabled = false;
                }
            });

            elemento.addEventListener("hidden.bs.modal", () => resolver(guardado));
            elemento.addEventListener("shown.bs.modal", () => formulario.querySelector("input,select,textarea")?.focus());
            modal.show();
        });
    }

    // ------------------------------------------------------------------
    // Utilidades varias
    // ------------------------------------------------------------------

    /** Reemplaza el contenido de un <tbody> por una fila con "Cargando...". */
    function cargando(tbody, columnas) {
        tbody.replaceChildren(el("tr", { clase: "fila-cargando" },
            el("td", { attrs: { colspan: columnas } },
                el("span", { clase: "spinner-border spinner-border-sm me-2", attrs: { role: "status", "aria-hidden": "true" } }),
                "Cargando...")));
    }

    /** "2026-10-26" -> "lunes, 26 de octubre de 2026" (se calcula en UTC para que no se corra un día). */
    function formatearFecha(fecha) {
        return new Date(`${fecha}T00:00:00Z`).toLocaleDateString("es-CO", {
            weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: "UTC"
        });
    }

    /** Suma (o resta) días a una fecha "AAAA-MM-DD" y devuelve otra "AAAA-MM-DD". */
    function sumarDias(fecha, dias) {
        const d = new Date(`${fecha}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() + dias);
        return d.toISOString().slice(0, 10);
    }

    /**
     * Escribe el nombre del usuario conectado (guardado por el login en
     * localStorage) en el elemento #sidebar-usuario de la barra lateral.
     */
    function pintarUsuarioLateral() {
        const caja = document.getElementById("sidebar-usuario");
        if (!caja) return;
        let nombre = "";
        try { nombre = JSON.parse(localStorage.getItem("clinicita_usuario") || "null")?.nombre || ""; } catch { /* dato dañado: se ignora */ }
        if (!nombre) return;
        caja.replaceChildren(
            el("span", { clase: "avatar" }, icono("person-fill")),
            el("span", { clase: "nombre", texto: nombre, attrs: { title: nombre } })
        );
    }

    document.addEventListener("DOMContentLoaded", pintarUsuarioLateral);

    return { el, icono, avisar, confirmar, formularioModal, cargando, formatearFecha, sumarDias, pintarUsuarioLateral };
})();
