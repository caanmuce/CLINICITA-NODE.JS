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

    if (respuesta.status === 401) {
        localStorage.removeItem("clinicita_token");
        localStorage.removeItem("clinicita_usuario");
        window.location.href = "/pages/login.html";
        return;
    }

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
    configurarLogout();

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

/**
 * Carga y pinta en pantalla las citas del paciente autenticado,
 * llenando una tabla HTML con una fila por cada cita.
 *
 * Requiere que la página tenga:
 *   - un elemento con id="tabla-citas" (normalmente un <tbody>,
 *     donde se van a insertar las filas <tr>)
 *   - un elemento con id="empty-citas" (un mensaje/estado vacío
 *     que se muestra u oculta según si hay citas o no)
 */
async function cargarMisCitas() {
    // Referencias a los dos elementos del HTML que esta función
    // necesita modificar: el cuerpo de la tabla y el mensaje de
    // "no tienes citas" que se muestra cuando la lista viene vacía.
    const tabla = document.getElementById("tabla-citas");
    const vacio = document.getElementById("empty-citas");

    try {
        // Le pregunta al servidor por las citas del usuario logueado.
        // api() ya se encarga de mandar el token guardado en el
        // header Authorization, así que el backend sabe de quién
        // pedir la información (ver GET /api/citas -> requireAuth).
        const respuesta = await api("/citas");

        // Limpia la tabla antes de rellenarla. Esto es importante
        // porque cargarMisCitas() se llama repetidamente cada 15
        // segundos (setInterval) — sin este paso, cada actualización
        // agregaría filas duplicadas encima de las anteriores en
        // vez de reemplazarlas.
        tabla.innerHTML = "";

        // Ordena las citas de la más próxima a la más lejana en el
        // tiempo, combinando fecha y hora en un solo objeto Date
        // para poder compararlas correctamente.
        const citasOrdenadas = [...respuesta.citas].sort(
            (a, b) => new Date(`${a.fecha}T${a.hora}`) - new Date(`${b.fecha}T${b.hora}`)
        );

        // Por cada cita ya ordenada, arma una fila <tr> nueva.
        citasOrdenadas.forEach((cita) => {
            const fila = document.createElement("tr");

            [cita.fecha, cita.hora, cita.especialidad, cita.medico, cita.estado].forEach((valor) => {
                const celda = document.createElement("td");
                celda.textContent = valor;
                fila.appendChild(celda);
            });

            // Columna extra de "acciones" (pensada para futuros
            // botones de cancelar/reprogramar), que por ahora solo
            // muestra un guion como placeholder.
            const acciones = document.createElement("td");
            acciones.innerHTML = `
                                <button class="btn btn-outline-danger btn-sm me-1" id="cancelar-${cita.cita_id}" data-accion="cancelar" data-cita-id="${cita.cita_id}">
                                    <i class="bi bi-x-circle">Cancelar</i>
                                </button>
                                <button class="btn btn-outline-clinicita btn-sm" id="reprogramar-${cita.cita_id}" data-accion="reprogramar" data-cita-id="${cita.cita_id}">
                                    <i class="bi bi-arrow-repeat">Reprogramar</i>
                                </button>
                            `;;
            fila.appendChild(acciones);

            // Inserta la fila ya armada dentro de la tabla.
            tabla.appendChild(fila);
        });

        // Muestra u oculta el mensaje de "no tienes citas":
        // - Si hay al menos una cita (length > 0), se agrega la
        //   clase "d-none" (Bootstrap) para OCULTAR el mensaje.
        // - Si no hay ninguna cita, se quita esa clase y el
        //   mensaje queda visible.
        // classList.toggle(clase, condicion) agrega la clase cuando
        // la condición es true, y la quita cuando es false.
        vacio.classList.toggle("d-none", respuesta.citas.length > 0);

    } catch (error) {
        // Si api() falló (sesión inválida, error de red, error del
        // servidor), se captura aquí y se muestra el mensaje en la
        // alerta del sistema en vez de romper la página.
        mostrarAlerta(error.message, "danger");
    }
}

document.addEventListener("click", async (evento) => {
    const boton = evento.target.closest("button[data-accion]");
    if (!boton) return;
    
    const citaId = boton.dataset.citaId;
    const accion = boton.dataset.accion;

    if (accion === "cancelar"){
        cancelarCita(citaId);
    }
    if (accion === "reprogramar"){
        reprogramarCita(citaId);
    }
});

function cancelarCita(citaId) {
    const confirmacion = confirm("¿Estás seguro de que quieres cancelar esta cita?");
    if (!confirmacion) return;

    try {
        const respuesta = api(`/citas/${citaId}`, { method: "DELETE" });
        mostrarAlerta(respuesta.mensaje, "success");
        cargarMisCitas();

    } catch (error) {
        mostrarAlerta(error.message, "danger");
    }
}

function reprogramarCita(citaId) {
    window.location.href = `agendar.html?reprogramar=${citaId}`;
    //TODO: Crear el formulario de reprogramación de cita con html y que cargue la cita existente y permita cambiar fecha/hora.
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
    // Lee el usuario guardado en el navegador (localStorage) desde el login.
    // Si no existe nada guardado, "usuario" queda en null en vez de dar error.
    const usuario = JSON.parse(localStorage.getItem("clinicita_usuario") || "null");
    if (usuario == null) {
        console.log("No hay usuario logueado.");
    }

    // Busca el contenedor del navbar donde van los botones de sesión (login/registro
    // o el saludo, según corresponda).
    const zona = document.getElementById("zona-sesion");

    // Si esta página no tiene ese contenedor (por ejemplo, una página sin navbar),
    // no hay nada que pintar: se sale de la función sin hacer nada.
    if (!zona) return;

    // Si no hay usuario logueado, no se toca el HTML: se quedan los botones
    // de "Iniciar sesión" / "Registrarse" que ya vienen puestos por defecto.
    if (!usuario) return;

    // Mapa de a dónde debe ir cada rol al hacer clic en "Mi panel".
    // Las rutas son relativas a la página donde vive el navbar (index.html).
    const destinos = {
        paciente: "roles/paciente/dashboard.html",
        medico: "roles/medico/agenda.html",
        recepcionista: "roles/recepcionista/citas.html",
        administrador: "roles/admin/dashboard.html"
    };

    // Reemplaza el contenido del navbar: quita los botones de login/registro
    // y en su lugar pone el saludo con el nombre, un acceso directo al panel
    // del rol correspondiente, y el botón de cerrar sesión.
    zona.innerHTML = `
        <span class="text-white small me-2">Bienvenido, ${usuario.nombre}</span>
        <a class="btn btn-clinicita btn-sm" href="${destinos[usuario.rol] || '#'}">Mi panel</a>
        <button class="btn btn-outline-clinicita btn-sm" id="btn-logout">Cerrar sesión</button>
    `;
    // El "|| '#'" es un respaldo: si el rol guardado no coincide con ninguna
    // clave del mapa "destinos" (dato corrupto o rol nuevo no contemplado),
    // el link no rompe la página, solo no lleva a ningún lado (href="#").

    // Como el botón de logout se acaba de crear con innerHTML (no existía antes
    // en el HTML), hay que buscarlo DESPUÉS de crearlo y conectarle el evento
    // de clic manualmente — innerHTML no trae los listeners de vuelta.
    document.getElementById("btn-logout").addEventListener("click", () => {
        // Borra el "carnet" (token) — sin él, la función api() ya no puede
        // autenticar ninguna petición futura al servidor.
        localStorage.removeItem("clinicita_token");

        // Borra los datos del usuario (nombre, rol) que se usan para pintar
        // el saludo y decidir a qué panel redirigir.
        localStorage.removeItem("clinicita_usuario");

        // Recarga la página actual. Al recargar, pintarSesion() se ejecuta
        // de nuevo, pero esta vez "usuario" será null, así que el "if (!usuario)
        // return;" de arriba deja los botones de login/registro por defecto.
        window.location.reload();
    });
}


function configurarLogout(idBoton = "btn-logout") {
    const boton = document.getElementById(idBoton);
    if (!boton) return;
    boton.addEventListener("click", () => {
        localStorage.removeItem("clinicita_token");
        localStorage.removeItem("clinicita_usuario");
        window.location.href = "../../pages/login.html";
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