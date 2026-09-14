/**
 * CliniCita — capa de frontend (esqueleto)
 *
 * Este archivo NO conecta aún a base de datos.
 * Completar las funciones marcadas con TODO cuando exista el backend.
 *
 * Endpoints sugeridos:
 * POST   /api/auth/login
 * POST   /api/auth/registro
 * POST   /api/auth/recuperar
 * GET    /api/citas
 * POST   /api/citas
 * PUT    /api/citas/:id
 * DELETE /api/citas/:id
 * GET    /api/especialidades
 * GET    /api/medicos
 * GET    /api/usuarios
 * GET    /api/lista-espera
 * GET    /api/reportes/ausentismo
*/

const API_BASE = "/api";

async function api(ruta, opciones = {}) {
    const token = localStorage.getItem("clinicita_token");
    const respuesta = await fetch(`${API_BASE}${ruta}`, {
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opciones.headers },
        ...opciones
    });
    const datos = await respuesta.json();
    if (!respuesta.ok) throw new Error(datos.mensaje || "Error de red o servidor");
    return datos;
}

function mostrarAlerta(mensaje, tipo = "info") {
    const caja = document.getElementById("alerta-sistema");
    if (!caja) {
        alert(mensaje);
        return;
    }
    caja.className = `alert alert-${tipo}`;
    caja.textContent = mensaje;
    caja.classList.remove("d-none");
}

document.addEventListener("submit", (evento) => {
    const formulario = evento.target;
    if (!formulario.matches("[data-form]")) return;
    evento.preventDefault();

    const accion = formulario.getAttribute("data-form");
    const datos = Object.fromEntries(new FormData(formulario));

    switch (accion) {
        case "login":
            api("/auth/login", { method: "POST", body: JSON.stringify(datos) })
                .then((respuesta) => {
                    localStorage.setItem("clinicita_token", respuesta.token);
                    localStorage.setItem("clinicita_usuario", JSON.stringify(respuesta.usuario));
                    const destinos = {
                        paciente: "../roles/paciente/dashboard.html",
                        medico: "../roles/medico/agenda.html",
                        recepcionista: "../roles/recepcionista/citas.html",
                        administrador: "../roles/admin/dashboard.html"
                    };
                    window.location.href = destinos[respuesta.usuario.rol];
                })
                .catch((error) => mostrarAlerta(error.message, "danger"));
            break;
        case "registro":
            api("/auth/registro", { method: "POST", body: JSON.stringify(datos) })
                .then((respuesta) => {
                    mostrarAlerta(respuesta.mensaje, "success");
                    formulario.reset();
                })
                .catch((error) => mostrarAlerta(error.message, "danger"));
            break;
        case "recuperar":
            mostrarAlerta("Recuperación de contraseña lista para conectar con el backend.", "warning");
            break;
        case "contacto":
            mostrarAlerta("Formulario de contacto listo para conectar con el backend.", "warning");
            break;
        case "newsletter":
            mostrarAlerta("Suscripción lista para conectar con el backend.", "warning");
            break;
        case "agendar":
            api("/citas", { method: "POST", body: JSON.stringify(datos) })
                .then((respuesta) => {
                    mostrarAlerta(respuesta.mensaje, "success");
                    formulario.reset();
                    cargarHorarios();
                })
                .catch((error) => mostrarAlerta(error.message, "danger"));
            break;
        case "perfil":
            mostrarAlerta("Actualización de perfil lista para conectar con el backend.", "warning");
            break;
        case "especialidad":
            mostrarAlerta("Alta de especialidad lista para conectar con el backend.", "warning");
            break;
        case "usuario":
            mostrarAlerta("Alta de usuario lista para conectar con el backend.", "warning");
            break;
        case "lista-espera":
            mostrarAlerta("Lista de espera lista para conectar con el backend.", "warning");
            break;
        case "horario":
            mostrarAlerta("Horarios listos para conectar con el backend.", "warning");
            break;
        default:
            mostrarAlerta("Formulario enviado. Conectar con base de datos.", "warning");
    }
});

document.addEventListener("DOMContentLoaded", () => {
    pintarSesion();
    cargarCitasHero();

    const usuario = JSON.parse(localStorage.getItem("clinicita_usuario") || "null");
    const ruta = window.location.pathname;
    const paneles = {
        "/roles/paciente/": "paciente",
        "/roles/medico/": "medico",
        "/roles/recepcionista/": "recepcionista",
        "/roles/admin/": "administrador"
    };
    const panel = Object.entries(paneles).find(([prefijo]) => ruta.includes(prefijo));
    if (panel && (!usuario || usuario.rol !== panel[1])) {
        window.location.href = "../../pages/login.html";
    }

    if (document.querySelector('[data-form="agendar"]')) cargarFormularioCita();
            if (document.getElementById("tabla-citas")) {
                cargarMisCitas();
                window.setInterval(cargarMisCitas, 15000);
            }

            if (document.getElementById("empty-proxima")) {
                cargarProximaCita();
                window.setInterval(cargarProximaCita, 15000);
            }
});

async function cargarFormularioCita() {
    const especialidad = document.getElementById("especialidad");
    const medico = document.getElementById("medico");
    const fecha = document.getElementById("fecha");

    try {
        const respuesta = await api("/especialidades");
        respuesta.especialidades.forEach((item) => {
            const opcion = document.createElement("option");
            opcion.value = item.nombre;
            opcion.textContent = item.nombre;
            especialidad.appendChild(opcion);
        });
    } catch (error) {
        mostrarAlerta(error.message, "danger");
    }

    especialidad.addEventListener("change", async () => {
        medico.innerHTML = '<option value="">Selecciona...</option>';
        if (!especialidad.value) return;
        const respuesta = await api(`/medicos?especialidad=${encodeURIComponent(especialidad.value)}`);
        respuesta.medicos.forEach((item) => {
            const opcion = document.createElement("option");
            opcion.value = item.medico_id;
            opcion.textContent = item.nombre_completo;
            medico.appendChild(opcion);
        });
    });

    medico.addEventListener("change", cargarHorarios);
    fecha.addEventListener("change", cargarHorarios);
}

async function cargarHorarios() {
    const medico = document.getElementById("medico");
    const fecha = document.getElementById("fecha");
    const hora = document.getElementById("hora");
    if (!medico || !fecha || !hora) return;

    hora.disabled = !medico.value || !fecha.value;
}

async function cargarMisCitas() {
    const tabla = document.getElementById("tabla-citas");
    const vacio = document.getElementById("empty-citas");
    try {
        const respuesta = await api("/citas");
        tabla.innerHTML = "";
        respuesta.citas.forEach((cita) => {
            const fila = document.createElement("tr");
            [cita.fecha, cita.hora, cita.especialidad, cita.medico, cita.estado].forEach((valor) => {
                const celda = document.createElement("td");
                celda.textContent = valor;
                fila.appendChild(celda);
            });
            const acciones = document.createElement("td");
            acciones.textContent = "-";
            fila.appendChild(acciones);
            tabla.appendChild(fila);
        });
        vacio.classList.toggle("d-none", respuesta.citas.length > 0);
    } catch (error) {
        mostrarAlerta(error.message, "danger");
    }
}

const coloresEspecialidad = {}; // caché para que la misma especialidad siempre tenga el mismo color
const paletaColores = [
    "#0D9488", // teal
    "#2563EB", // azul
    "#D97706", // ámbar
    "#DB2777", // rosa
    "#7C3AED", // violeta
    "#059669", // verde
    "#DC2626", // rojo
    "#4F46E5"  // índigo
];

function colorPorEspecialidad(especialidad) {
    if (!coloresEspecialidad[especialidad]) {
        const indice = Object.keys(coloresEspecialidad).length % paletaColores.length;
        coloresEspecialidad[especialidad] = paletaColores[indice];
    }
    return coloresEspecialidad[especialidad];
}

function pintarSesion() {
    const usuario = JSON.parse(localStorage.getItem("clinicita_usuario") || "null");
    const zona = document.getElementById("zona-sesion");
    if (!zona) return;

    if (!usuario) return;

    const destinos = {
        paciente: "roles/paciente/dashboard.html",
        medico: "roles/medico/agenda.html",
        recepcionista: "roles/recepcionista/citas.html",
        administrador: "roles/admin/dashboard.html"
    };

    zona.innerHTML = `
        <span class="text-white small me-2">Bienvenido, ${usuario.nombre}</span>
        <a class="btn btn-clinicita btn-sm" href="${destinos[usuario.rol] || '#'}">Mi panel</a>
        <button class="btn btn-outline-clinicita btn-sm" id="btn-logout">Cerrar sesión</button>
    `;

    document.getElementById("btn-logout").addEventListener("click", () => {
        localStorage.removeItem("clinicita_token");
        localStorage.removeItem("clinicita_usuario");
        window.location.reload();
    });
}

async function cargarCitasHero() {
    const contenedor = document.getElementById("mock-cal-body");
    const usuario = JSON.parse(localStorage.getItem("clinicita_usuario") || "null");
    if (!contenedor || !usuario) return; // no logueado: se queda el mensaje original

    try {
        const respuesta = await api("/citas");
        if (!respuesta.citas.length) return; // sin citas: se queda el mensaje original

        contenedor.innerHTML = "";

const ahora = new Date();
const proximas = respuesta.citas
    .filter((cita) => new Date(`${cita.fecha}T${cita.hora}`) >= ahora)
    .sort((a, b) => new Date(`${a.fecha}T${a.hora}`) - new Date(`${b.fecha}T${b.hora}`))
    .slice(0, 5);

if (!proximas.length) return; // no hay próximas citas: se queda el mensaje original

proximas.forEach((cita) => {
    const color = colorPorEspecialidad(cita.especialidad);
    const item = document.createElement("div");
    item.className = "d-flex justify-content-between align-items-center py-2 border-bottom border-secondary";
    item.innerHTML = `
        <span>${cita.fecha} · ${cita.hora}</span>
        <span class="badge" style="background:${color};color:#fff;">${cita.especialidad}</span>
    `;
    contenedor.appendChild(item);
});
    } catch (error) {
        console.warn("No se pudieron cargar citas en el hero:", error.message);
        // no mostramos alerta aquí: es solo un preview decorativo, no crítico
    }
}

async function cargarProximaCita() {
    const vacio = document.getElementById("empty-proxima");
    const contenido = document.getElementById("contenido-proxima");
    if (!vacio || !contenido) return;

    try {
        const respuesta = await api("/citas");

        const ahora = new Date();
        const proximas = respuesta.citas
            .filter((cita) => cita.estado !== "Cancelada" && new Date(`${cita.fecha}T${cita.hora}`) >= ahora)
            .sort((a, b) => new Date(`${a.fecha}T${a.hora}`) - new Date(`${b.fecha}T${b.hora}`));

        if (!proximas.length) {
            vacio.classList.remove("d-none");
            contenido.classList.add("d-none");
            return;
        }

        const cita = proximas[0];
        document.getElementById("proxima-fecha").textContent = cita.fecha;
        document.getElementById("proxima-hora").textContent = cita.hora;
        document.getElementById("proxima-medico").textContent = cita.medico;
        document.getElementById("proxima-estado").textContent = cita.estado;

        const badge = document.getElementById("proxima-especialidad");
        badge.textContent = cita.especialidad;
        badge.style.background = colorPorEspecialidad(cita.especialidad);
        badge.style.color = "#fff";

        vacio.classList.add("d-none");
        contenido.classList.remove("d-none");
    } catch (error) {
        mostrarAlerta(error.message, "danger");
    }
}