/**
 * CliniCita — capa de frontend
 *
 * Maneja la sesión (token y usuario en localStorage), los formularios con
 * data-form y las llamadas a la API del servidor (server/server.js).
 *
 * ── Endpoints que el frontend usa hoy ─────────────────────────────────────
 *
 * Autenticación
 *   POST   /api/auth/login              Inicia sesión y devuelve token + usuario
 *   POST   /api/auth/registro           Registra un paciente nuevo
 *
 * Paciente
 *   GET    /api/citas                   Lista las citas del paciente
 *   POST   /api/citas                   Agenda una cita
 *   DELETE /api/citas/:id               Cancela la cita (estado = Cancelada)
 *   GET    /api/citas/:estado/count     Cuenta citas por estado (KPIs del panel)
 *   GET    /api/especialidades          Lista las especialidades disponibles
 *   GET    /api/medicos                 Lista médicos (filtra por especialidad)
 *   GET    /api/horarios                Horas libres de un médico en una fecha
 *
 * Recepcionista
 *   GET    /api/citas/admin             Lista de citas con filtros (fecha, estado, q)
 *   GET    /api/lista-espera            Lista las entradas activas de la lista de espera
 *   POST   /api/lista-espera            Inscribe un paciente (por documento)
 *   PUT    /api/lista-espera/:id        Cambia prioridad o estado de una entrada
 *   DELETE /api/lista-espera/:id        Elimina una entrada
 *
 * Médico
 *   GET    /api/citas/medico            Agenda del médico por fecha
 *
 * Riesgo de inasistencia (ML)
 *   POST   /api/pacientes/riesgo/batch  Riesgo de varios pacientes en una sola petición
 *   GET    /api/pacientes/:id/riesgo    Riesgo de un paciente
 *
 * ── Listos en el backend, falta conectarlos al frontend ───────────────────
 *
 *   GET    /api/pacientes?q=            Busca pacientes por nombre o documento
 *   POST   /api/citas/admin             Agenda una cita a nombre de un paciente
 *   PUT    /api/citas/:id/reprogramar   Reprograma una cita (paciente)
 *   PUT    /api/citas/admin/:id         Edita una cita (recepción)
 *   PUT    /api/citas/:id/estado        Cambia el estado de una cita
 *   POST   /api/auth/recuperar          Envía el enlace para recuperar la clave
 *   POST   /api/auth/reset              Restablece la clave con el token
 *   GET    /api/usuarios/me             Datos del perfil
 *   PUT    /api/usuarios/me             Actualiza el perfil
 *   GET    /api/usuarios                Lista de usuarios (administrador)
 *
 * ── Pendientes en el backend ──────────────────────────────────────────────
 *
 *   GET    /api/reportes/ausentismo     Inasistencias por mes, médico y especialidad
 *   GET    /api/lista-espera/me         Estado del paciente en la lista de espera
 *   POST   /api/lista-espera/me         El paciente se inscribe a una especialidad
 *   GET    /api/lista-espera/me/count   KPI "En lista de espera" del panel del paciente
 *   PUT    /api/citas/:id/confirmar     El paciente confirma su cita desde el portal
 *   GET    /api/recordatorios           Estado de los recordatorios enviados
 */

const API_BASE = "/api";

// A dónde va cada rol después de iniciar sesión y al dar clic en "Mi panel".
// Rutas absolutas (con "/" al inicio) para que funcionen desde cualquier carpeta.
const DESTINO_POR_ROL = {
    paciente: "/roles/paciente/dashboard.html",
    medico: "/roles/medico/agenda.html",
    recepcionista: "/roles/recepcionista/citas.html",
    administrador: "/roles/admin/dashboard.html"
};

// Estados de una cita que todavía "cuentan" como próximas.
// Se excluyen Cancelada, Completada y No-Asistio.
const ESTADOS_PROXIMOS = ["Pendiente", "Confirmada"];

async function api(ruta, opciones = {}) {
    // Token guardado en el navegador desde el login (null si no hay sesión).
    const token = localStorage.getItem("clinicita_token");

    const respuesta = await fetch(`${API_BASE}${ruta}`, {
        // "...opciones" va primero para que no pise los headers combinados de abajo.
        ...opciones,
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}), ...opciones.headers }
    });

    // 401 en rutas protegidas = sesión vencida → se limpia todo y se manda al login.
    // 401 en /auth/* (el propio login) = credenciales incorrectas: NO se redirige,
    // para que el mensaje del servidor llegue hasta mostrarAlerta().
    if (respuesta.status === 401 && !ruta.startsWith("/auth/")) {
        localStorage.removeItem("clinicita_token");
        localStorage.removeItem("clinicita_usuario");
        window.location.href = "/pages/login.html";
        // Promesa que nunca termina: el "await" de quien llamó se queda esperando
        // mientras el navegador cambia de página.
        return new Promise(() => {});
    }

    // Si el servidor respondió algo que no es JSON (ej. el HTML de un 404), json()
    // lanzaría un error; con el catch devolvemos un objeto vacío.
    const datos = await respuesta.json().catch(() => ({}));

    if (!respuesta.ok) {
        console.error(`[Error API] Status: ${respuesta.status}`, datos);
        // Si el servidor mandó el detalle de la validación (zod), se agrega al mensaje.
        const detalle = datos.errores ? `: ${datos.errores}` : "";
        throw new Error(`${datos.mensaje || `Error de red o servidor (Status: ${respuesta.status})`}${detalle}`);
    }
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
                    window.location.href = DESTINO_POR_ROL[respuesta.usuario.rol];
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
        case "reprogramar": {
            if (!datos.cita_id) {
                mostrarAlerta("Selecciona la cita a reprogramar", "warning");
                break;
            }
            const cuerpo = {
                fecha: datos.fecha,
                hora: datos.hora,
                motivo_cambio: datos.motivo_cambio
            };
            if (datos.medico_id) cuerpo.medico_id = Number(datos.medico_id);
            if (datos.observaciones) cuerpo.observaciones = datos.observaciones;
 
            api(`/citas/${encodeURIComponent(datos.cita_id)}/reprogramar`, {
                method: "PUT",
                body: JSON.stringify(cuerpo)
            })
                .then((respuesta) => {
                    mostrarAlerta(respuesta.mensaje, "success");
                    formulario.reset();
                    cargarHorarios();
                    setTimeout(() => { window.location.href = "mis-citas.html"; }, 1500);
                })
                .catch((error) => mostrarAlerta(error.message, "danger"));
            break;
        }
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
            inscribirEnListaEspera(formulario, datos);
            break;
        case "horario":
            mostrarAlerta("Horarios listos para conectar con el backend.", "warning");
            break;
        default:
            mostrarAlerta("Formulario enviado. Conectar con base de datos.", "warning");
    }
});
 // Refresca la información de la página cada cierto tiempo (ms), pero solo si
 //  el usuario tiene la pestaña visible.
 //  Evita que se acumulen peticiones mientras el usuario está en otra pestaña.
function refrescarCada(funcion, ms = 60000) {
    window.setInterval(() => {
        if (!document.hidden) funcion();
    }, ms);
}
document.addEventListener("DOMContentLoaded", () => {
    // El orden importa: pintarSesion() crea el botón de logout en el navbar
    // y configurarLogout() lo busca para conectarle el clic, así que tiene
    // que ir después.
    if (document.getElementById("tabla-espera")) {
        llenarEspecialidadesListaEspera();
        cargarListaEspera();
    }

    pintarSesion();
    configurarLogout();

    // Protección de rutas por rol: si la página actual está dentro de la
    // carpeta de un rol, el usuario guardado debe ser de ese mismo rol.
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
        window.location.href = "/pages/login.html";
        // El return corta la función aquí. Sin él, el resto del código seguía
        // ejecutándose (y haciendo peticiones a la API) con un usuario que no
        // debería estar viendo este panel, mientras el navegador redirigía.
        return;
    }

    // Preview de citas en el mock del landing (solo actúa si existe #mock-cal-body).
    cargarCitasHero();

    // Página de agendar: carga especialidades y conecta los selects.
    if (document.querySelector('[data-form="agendar"]')) cargarFormularioCita();

    // Página de reprogramar: mismos selects que agendar, más el select con las citas del paciente.
    if (document.querySelector('[data-form="reprogramar"]')) {
        cargarFormularioCita();
        cargarCitasParaReprogramar();
    }

    // Página "Mis citas": las tres tablas por estado, refrescadas cada 60 s.
    if (document.getElementById("tabla-pendientes")) {
        cargarMisCitas();
        refrescarCada(cargarMisCitas);
    }

    // Dashboard: tarjeta de "Próxima cita", refrescada cada 60 s.
    if (document.getElementById("empty-proxima")) {
        cargarProximaCita();
        refrescarCada(cargarProximaCita);
    }

    // Dashboard: tarjetas KPI (próximas, pendientes, canceladas), cada 60 s.
    if (document.getElementById("kpi-proximas")) {
        numerosDelKpi();
        refrescarCada(numerosDelKpi);
    }

    // Recepcionista: citas con filtros y coloreo de riesgo, cada 60 s.
    if (document.getElementById("tabla-citas")) {
        cargarCitasRecepcionista();
        refrescarCada(cargarCitasRecepcionista);
    }

    // Médico: agenda del día con coloreo de riesgo, cada 60 s.
    if (document.getElementById("tabla-agenda")) {
        cargarAgendaMedico();
        refrescarCada(cargarAgendaMedico);
    }

});

async function cargarFormularioCita() {
    const especialidad = document.getElementById("especialidad");
    const medico = document.getElementById("medico");
    const fecha = document.getElementById("fecha");
 
    // No se pueden elegir fechas pasadas (el servidor igual lo valida).
    // "sv-SE" da el formato AAAA-MM-DD en hora local.
    if (fecha) fecha.min = new Date().toLocaleDateString("sv-SE");
 
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
        cargarHorarios(); // al cambiar de especialidad, el médico anterior ya no aplica
        if (!especialidad.value) return;
        try {
            const respuesta = await api(`/medicos?especialidad=${encodeURIComponent(especialidad.value)}`);
            respuesta.medicos.forEach((item) => {
                const opcion = document.createElement("option");
                opcion.value = item.medico_id;
                opcion.textContent = item.nombre_completo;
                medico.appendChild(opcion);
            });
        } catch (error) {
            mostrarAlerta(error.message, "danger");
        }
    });
 
    medico.addEventListener("change", cargarHorarios);
    fecha.addEventListener("change", cargarHorarios);
}

/**
 * Llena el select "hora" con las horas libres del médico en la fecha elegida
 * (GET /api/horarios?medico=&fecha=). Queda deshabilitado hasta que haya médico y fecha.
 */
async function cargarHorarios() {
    const medico = document.getElementById("medico");
    const fecha = document.getElementById("fecha");
    const hora = document.getElementById("hora");
    if (!medico || !fecha || !hora) return;
 
    hora.innerHTML = '<option value="">Selecciona médico y fecha primero...</option>';
    hora.disabled = !medico.value || !fecha.value;
    if (hora.disabled) return;
 
    // Si el usuario cambia de médico o fecha mientras llega la respuesta, se descarta la vieja.
    const consulta = `${medico.value}|${fecha.value}`;
 
    try {
        const respuesta = await api(`/horarios?medico=${encodeURIComponent(medico.value)}&fecha=${encodeURIComponent(fecha.value)}`);
        if (consulta !== `${medico.value}|${fecha.value}`) return;
 
        const horas = respuesta.horarios || [];
        hora.innerHTML = horas.length
            ? '<option value="">Selecciona...</option>'
            : '<option value="">Sin horarios disponibles ese día</option>';
        horas.forEach((h) => {
            const opcion = document.createElement("option");
            opcion.value = h;
            opcion.textContent = h;
            hora.appendChild(opcion);
        });
    } catch (error) {
        mostrarAlerta(error.message, "danger");
    }
}
/**
 * Carga las citas del paciente autenticado y las distribuye en TRES
 * tablas separadas según su estado (Pendiente, Confirmada, Cancelada),
 * cada una con su propio mensaje de "vacío" independiente.
 *
 * Requiere que la página tenga, para cada uno de los tres estados:
 *   - un <tbody> con id "tabla-pendientes" / "tabla-confirmadas" / "tabla-canceladas"
 *   - un elemento con id "empty-pendientes" / "empty-confirmadas" / "empty-canceladas"
 */
async function cargarMisCitas() {
    // Mapa de configuración: por cada estado posible de una cita, define
    // a qué tabla va, qué elemento mostrar si esa tabla queda vacía, y si
    // esa categoría debe mostrar los botones de Cancelar/Reprogramar.
    // (Las citas canceladas no necesitan esos botones, por eso acciones: false).
    const grupos = {
        Pendiente: { tabla: document.getElementById("tabla-pendientes"), vacio: document.getElementById("empty-pendientes"), acciones: true },
        Confirmada: { tabla: document.getElementById("tabla-confirmadas"), vacio: document.getElementById("empty-confirmadas"), acciones: true },
        Cancelada: { tabla: document.getElementById("tabla-canceladas"), vacio: document.getElementById("empty-canceladas"), acciones: false }
    };

    // Guarda de seguridad: si esta página no tiene ni siquiera la primera
    // tabla (tabla-pendientes), asumimos que ninguna de las tres existe
    // aquí, y no tiene sentido seguir ejecutando el resto de la función.
    if (!grupos.Pendiente.tabla) return;

    try {
        // Le pregunta al servidor por las citas del usuario logueado.
        // api() ya agrega el token de sesión automáticamente.
        const respuesta = await api("/citas");

        // Ordena todas las citas de la más próxima a la más lejana en
        // el tiempo, combinando fecha+hora en un objeto Date para
        // poder compararlas correctamente.
        const citasOrdenadas = [...respuesta.citas].sort(
            (a, b) => new Date(`${a.fecha}T${a.hora}`) - new Date(`${b.fecha}T${b.hora}`)
        );

        // Vacía las tres tablas antes de rellenarlas. Necesario porque
        // esta función se llama repetidamente (setInterval) — sin esto,
        // cada actualización iría acumulando filas duplicadas.
        Object.values(grupos).forEach((grupo) => { grupo.tabla.innerHTML = ""; });

        // Lleva la cuenta de cuántas citas terminaron en cada categoría.
        // Se usa al final para decidir qué mensajes de "vacío" mostrar.
        const conteo = { Pendiente: 0, Confirmada: 0, Cancelada: 0 };

        // Recorre cada cita YA ordenada y la enruta a su tabla correcta
        // según el valor de cita.estado.
        citasOrdenadas.forEach((cita) => {
            // Busca en "grupos" la configuración correspondiente al
            // estado de esta cita en particular.
            const grupo = grupos[cita.estado];

            // Si el estado de la cita no tiene una tabla asociada aquí
            // (por ejemplo "Completada" o "No-Asistio", que existen en
            // la base de datos pero no tienen sección en esta página),
            // simplemente se ignora esa cita y se sigue con la siguiente.
            if (!grupo) return;

            // Suma uno al contador de esa categoría específica.
            conteo[cita.estado]++;

            // Crea la fila <tr> con los datos básicos de la cita.
            const fila = document.createElement("tr");
            [cita.fecha, cita.hora, cita.especialidad, cita.medico].forEach((valor) => {
                const celda = document.createElement("td");
                celda.textContent = valor;
                fila.appendChild(celda);
            });

            // Solo agrega la columna de botones si esta categoría los
            // necesita (grupo.acciones === true). Las citas canceladas
            // no entran aquí porque su grupo tiene acciones: false.
            if (grupo.acciones) {
                const acciones = document.createElement("td");
                acciones.innerHTML = `
                    <button class="btn btn-outline-danger btn-sm me-1" data-accion="cancelar" data-cita-id="${cita.cita_id}">
                        <i class="bi bi-x-circle"></i>
                    </button>
                    <button class="btn btn-outline-clinicita btn-sm" data-accion="reprogramar" data-cita-id="${cita.cita_id}">
                        <i class="bi bi-arrow-repeat"></i>
                    </button>
                `;
                fila.appendChild(acciones);
            }

            // Inserta la fila ya armada en la tabla que le corresponde
            // según su estado (Pendiente, Confirmada o Cancelada).
            grupo.tabla.appendChild(fila);
        });

        // Recorre cada uno de los tres grupos y muestra/oculta su
        // mensaje de "vacío" según si esa categoría recibió alguna
        // cita o no. classList.toggle(clase, condicion) agrega la
        // clase "d-none" (oculta) cuando la condición es true, y la
        // quita (muestra) cuando es false.
        Object.entries(grupos).forEach(([estado, grupo]) => {
            grupo.vacio.classList.toggle("d-none", conteo[estado] > 0);
        });

    } catch (error) {
        // Si api() falló (sesión inválida, error de red, error del
        // servidor), se muestra el mensaje en la alerta del sistema
        // en vez de dejar la página rota o sin respuesta visual.
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

// Guarda temporalmente el id de la cita que se está intentando
// cancelar, mientras el modal espera la confirmación del usuario.
let citaPendienteDeCancelar = null;

function cancelarCita(citaId) {
    // Si la página no cargó el script de Bootstrap JS, "bootstrap" no existe
    // y abrir el modal lanzaría un ReferenceError.
    if (typeof bootstrap === "undefined") {
        mostrarAlerta("No se pudo abrir la confirmación: falta cargar Bootstrap JS en esta página.", "danger");
        return;
    }

    citaPendienteDeCancelar = citaId;

    const modalElemento = document.getElementById("modalConfirmar");
    const modal = bootstrap.Modal.getOrCreateInstance(modalElemento);
    modal.show();
}

// Este listener se conecta UNA sola vez, no cada vez que se abre el
// modal (por eso va fuera de cancelarCita, en el nivel principal
// del archivo, junto a tus otros listeners globales).
document.addEventListener("DOMContentLoaded", () => {
    const btnConfirmar = document.getElementById("btn-confirmar-cancelacion");
    if (!btnConfirmar) return;

    btnConfirmar.addEventListener("click", async () => {
        const citaId = citaPendienteDeCancelar;
        if (!citaId) return;

        const modalElemento = document.getElementById("modalConfirmar");
        bootstrap.Modal.getInstance(modalElemento).hide();

        try {
            const respuesta = await api(`/citas/${citaId}`, { method: "DELETE" });
            mostrarAlerta(respuesta.mensaje, "success");
            cargarMisCitas();
        } catch (error) {
            mostrarAlerta(error.message, "danger");
        }
    });
});

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

async function numerosDelKpi() {
    const kpiProximas = document.getElementById("kpi-proximas");
    const kpiPendientes = document.getElementById("kpi-pendientes");
    const kpiCanceladas = document.getElementById("kpi-canceladas");
    const kpiEspera = document.getElementById("kpi-espera");
 
    if (!kpiProximas && !kpiPendientes && !kpiCanceladas && !kpiEspera) return;
 
    try {
        const [pendientes, confirmadas, canceladas, espera] = await Promise.all([
            api("/citas/Pendiente/count"),
            api("/citas/Confirmada/count"),
            api("/citas/Cancelada/count"),
            api("/lista-espera/Activo/count").catch(() => ({ total_espera: "—" }))
        ]);
 
        if (kpiProximas) kpiProximas.textContent = pendientes.total_citas + confirmadas.total_citas;
        if (kpiPendientes) kpiPendientes.textContent = pendientes.total_citas;
        if (kpiCanceladas) kpiCanceladas.textContent = canceladas.total_citas;
        if (kpiEspera) kpiEspera.textContent = espera.total_espera;
    } catch (error) {
        mostrarAlerta(error.message, "danger");
    }
}
function pintarSesion() {
    // Lee el usuario guardado en el navegador (localStorage) desde el login.
    // Si no existe nada guardado, "usuario" queda en null en vez de dar error.
    const usuario = JSON.parse(localStorage.getItem("clinicita_usuario") || "null");

    // Busca el contenedor del navbar donde van los botones de sesión (login/registro
    // o el saludo, según corresponda).
    const zona = document.getElementById("zona-sesion");

    // Si esta página no tiene ese contenedor (por ejemplo, una página sin navbar),
    // no hay nada que pintar: se sale de la función sin hacer nada.
    if (!zona) return;

    // Si no hay usuario logueado, no se toca el HTML: se quedan los botones
    // de "Iniciar sesión" / "Registrarse" que ya vienen puestos por defecto.
    if (!usuario) return;

    // Reemplaza el contenido del navbar: quita los botones de login/registro
    // y en su lugar pone el saludo, un acceso directo al panel del rol
    // correspondiente (según DESTINO_POR_ROL), y el botón de cerrar sesión.
    // El span del saludo se deja vacío a propósito: el nombre se escribe abajo
    // con textContent para que, si alguien registró un nombre con etiquetas
    // HTML, se muestre como texto y no se ejecute.
    zona.innerHTML = `
        <span class="text-white small me-2" id="saludo-usuario"></span>
        <a class="btn btn-clinicita btn-sm" href="${DESTINO_POR_ROL[usuario.rol] || '#'}">Mi panel</a>
        <button class="btn btn-outline-clinicita btn-sm" id="btn-logout">Cerrar sesión</button>
    `;
    // El "|| '#'" es un respaldo: si el rol guardado no coincide con ninguna
    // clave de DESTINO_POR_ROL (dato corrupto o rol nuevo no contemplado),
    // el link no rompe la página, solo no lleva a ningún lado (href="#").

    document.getElementById("saludo-usuario").textContent = `Bienvenido, ${usuario.nombre}`;

    // OJO: aquí ya no se conecta el clic del botón de logout. De eso se encarga
    // configurarLogout(), que se llama justo después de pintarSesion() en el
    // DOMContentLoaded (cuando el botón ya existe). Si se conectara en las dos
    // funciones, el botón tendría dos listeners y se ejecutarían ambos.
}

function configurarLogout(idBoton = "btn-logout") {
    // Busca el botón por su id. Sirve tanto para el que crea pintarSesion()
    // en el navbar como para los botones "Salir" de los dashboards.
    const boton = document.getElementById(idBoton);

    // Si esta página no tiene ese botón, no hay nada que conectar.
    if (!boton) return;

    boton.addEventListener("click", (evento) => {
        // En los dashboards el botón es un <a href="...login.html">; el
        // preventDefault evita que navegue antes de borrar la sesión.
        evento.preventDefault();

        // Borra el "carnet" (token) — sin él, la función api() ya no puede
        // autenticar ninguna petición futura al servidor.
        localStorage.removeItem("clinicita_token");

        // Borra los datos del usuario (nombre, rol) que se usan para pintar
        // el saludo y decidir a qué panel redirigir.
        localStorage.removeItem("clinicita_usuario");

        // Ruta absoluta (con "/" al inicio) para que funcione sin importar
        // desde qué carpeta se haga clic (index, pages/, roles/paciente/...).
        window.location.href = "/pages/login.html";
    });
}

async function cargarCitasHero() {
    const contenedor = document.getElementById("mock-cal-body");
    const usuario = JSON.parse(localStorage.getItem("clinicita_usuario") || "null");
    if (!contenedor || !usuario) return; // no logueado: se queda el mensaje original

    try {
        const respuesta = await api("/citas");

        // Solo citas activas (Pendiente/Confirmada) que todavía no han pasado,
        // de la más cercana a la más lejana, máximo 5.
        const ahora = new Date();
        const proximas = respuesta.citas
            .filter((cita) => ESTADOS_PROXIMOS.includes(cita.estado) && new Date(`${cita.fecha}T${cita.hora}`) >= ahora)
            .sort((a, b) => new Date(`${a.fecha}T${a.hora}`) - new Date(`${b.fecha}T${b.hora}`))
            .slice(0, 5);

        // Sin próximas citas: se queda el mensaje original.
        // Se revisa ANTES de vaciar el contenedor, para no borrar el mensaje.
        if (!proximas.length) return;

        contenedor.innerHTML = "";

        proximas.forEach((cita) => {
            const item = document.createElement("div");
            item.className = "d-flex justify-content-between align-items-center py-2 border-bottom border-secondary";

            // textContent en vez de innerHTML: el texto se muestra tal cual,
            // aunque traiga etiquetas HTML.
            const cuando = document.createElement("span");
            cuando.textContent = `${cita.fecha} · ${cita.hora}`;

            const badge = document.createElement("span");
            badge.className = "badge";
            badge.style.background = colorPorEspecialidad(cita.especialidad);
            badge.style.color = "#fff";
            badge.textContent = cita.especialidad;

            item.append(cuando, badge);
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
            .filter((cita) => ESTADOS_PROXIMOS.includes(cita.estado) && new Date(`${cita.fecha}T${cita.hora}`) >= ahora)
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
/**
 * Reprogramar cita (rol paciente).
 * Llena el select "Cita a reprogramar" con las citas del paciente y muestra los
 * datos de la cita elegida en el resumen de reprogramar.html.
 */
async function cargarCitasParaReprogramar() {
    const selectCita = document.getElementById("cita");
    if (!selectCita) return;

    try {
        const respuesta = await api("/citas");
        respuesta.citas.forEach((cita) => {
            const opcion = document.createElement("option");
            opcion.value = cita.cita_id;
            opcion.textContent = `${cita.fecha} · ${cita.hora} · ${cita.especialidad} (${cita.estado})`;
            opcion.dataset.fecha = cita.fecha;
            opcion.dataset.hora = cita.hora;
            opcion.dataset.especialidad = cita.especialidad;
            opcion.dataset.medico = cita.medico;
            opcion.dataset.estado = cita.estado;
            selectCita.appendChild(opcion);
        });
    } catch (error) {
        mostrarAlerta(error.message, "danger");
    }

    selectCita.addEventListener("change", () => {
        const opcion = selectCita.selectedOptions[0];
        const resumen = {
            "resumen-fecha": opcion?.dataset.fecha,
            "resumen-hora": opcion?.dataset.hora,
            "resumen-especialidad": opcion?.dataset.especialidad,
            "resumen-medico": opcion?.dataset.medico,
            "resumen-estado": opcion?.dataset.estado
        };
        Object.entries(resumen).forEach(([id, valor]) => {
            const elemento = document.getElementById(id);
            if (elemento) elemento.textContent = valor || "--";
        });
    });
}

/**
 * Carga citas para el panel de recepcionista con filtros y coloreo de riesgo
 */
async function cargarCitasRecepcionista() {
    const tbody = document.getElementById("tabla-citas");
    const emptyState = document.querySelector(".empty-state");
    if (!tbody) return;

    try {
        const fecha = document.querySelector('[name="fecha"]')?.value || "";
        const estado = document.querySelector('[name="estado"]')?.value || "";
        const q = document.querySelector('[name="q"]')?.value || "";

        const params = new URLSearchParams();
        if (fecha) params.append("fecha", fecha);
        if (estado) params.append("estado", estado);
        if (q) params.append("q", q);
        params.append("page", "1");
        params.append("limit", "50");

        const respuesta = await api(`/citas/admin?${params.toString()}`);
        
        // CAMBIO 1: Asegurar que 'respuesta' exista antes de buscar '.citas'
        const citas = (respuesta && respuesta.citas) ? respuesta.citas : [];

        tbody.innerHTML = "";

        if (citas.length === 0) {
            if (emptyState) emptyState.classList.remove("d-none");
            return;
        }

        if (emptyState) emptyState.classList.add("d-none");

        citas.forEach(cita => {
            const fila = document.createElement("tr");
            fila.setAttribute("data-paciente-id", cita.paciente_id);

            const estadoBadge = getEstadoBadge(cita.estado);
            fila.innerHTML = `
                <td>${cita.fecha}</td>
                <td>${cita.hora}</td>
                <td>${cita.paciente} ${cita.documento_id ? `<br><small class="text-muted">${cita.documento_id}</small>` : ""}</td>
                <td>${cita.medico}</td>
                <td>${cita.especialidad || ""}</td>
                <td>${estadoBadge}</td>
                <td>
                    <button class="btn btn-outline-clinicita btn-sm" data-accion="editar" data-cita-id="${cita.cita_id}" data-paciente-id="${cita.paciente_id}">
                        <i class="bi bi-pencil"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(fila);
        });

        // CAMBIO 2: Solo intentar colorear si realmente pudimos listar citas
        if (citas.length > 0) {
            await cargarYColorearRiesgos(tbody);
        }

    } catch (error) {
        console.error("Error cargando citas recepcionista:", error);
        // Si el estado está vacío o falla, limpiamos la tabla y mostramos el aviso visual
        if (tbody) tbody.innerHTML = "";
        if (emptyState) emptyState.classList.remove("d-none");
        
        mostrarAlerta(error.message || "No fue posible listar las citas", "danger");
    }
}
/**
 * Carga agenda para el panel de médico con coloreo de riesgo
 */
async function cargarAgendaMedico() {
    const tbody = document.getElementById("tabla-agenda");
    const emptyState = document.querySelector(".empty-state");
    const fechaInput = document.querySelector('#filtro-fecha [name="fecha"]');

    if (!tbody || !fechaInput) return;

    const fecha = fechaInput.value;
    if (!fecha) {
        tbody.innerHTML = "";
        if (emptyState) emptyState.classList.remove("d-none");
        return;
    }

    try {
        const respuesta = await api(`/citas/medico?fecha=${fecha}`);
        const citas = respuesta.citas || [];
        const kpis = respuesta.kpis || {};

        // Actualizar KPIs
        actualizarKPIs(kpis);

        tbody.innerHTML = "";

        if (citas.length === 0) {
            if (emptyState) emptyState.classList.remove("d-none");
            return;
        }

        if (emptyState) emptyState.classList.add("d-none");

        // Poblar tabla con data-paciente-id para coloreo de riesgo
        citas.forEach(cita => {
            const fila = document.createElement("tr");
            fila.setAttribute("data-paciente-id", cita.paciente_id);

            const estadoBadge = getEstadoBadge(cita.estado);
            fila.innerHTML = `
                <td>${cita.hora}</td>
                <td>${cita.paciente} ${cita.documento_id ? `<br><small class="text-muted">${cita.documento_id}</small>` : ""}</td>
                <td>${cita.documento_id || ""}</td>
                <td>${cita.motivo || ""}</td>
                <td>${estadoBadge}</td>
                <td>
                    <button class="btn btn-outline-clinicita btn-sm" data-accion="cambiar-estado" data-cita-id="${cita.cita_id}" data-paciente-id="${cita.paciente_id}">
                        <i class="bi bi-check-circle"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(fila);
        });

        // Aplicar coloreo de riesgo
        await cargarYColorearRiesgos(tbody);

    } catch (error) {
        console.error("Error cargando agenda médico:", error);
        mostrarAlerta(error.message, "danger");
    }
}

/**
 * Genera badge HTML para el estado de la cita
 */
function getEstadoBadge(estado) {
    const badges = {
        "Pendiente": '<span class="badge bg-warning text-dark">Pendiente</span>',
        "Confirmada": '<span class="badge bg-success">Confirmada</span>',
        "Cancelada": '<span class="badge bg-danger">Cancelada</span>',
        "No-Asistio": '<span class="badge bg-dark">No asistió</span>',
        "Completada": '<span class="badge bg-primary">Completada</span>'
    };
    return badges[estado] || `<span class="badge bg-secondary">${estado}</span>`;
}

/**
 * Actualiza los KPIs del médico
 */
function actualizarKPIs(kpis) {
    const elementos = {
        "Confirmada": document.querySelector(".kpi-card:nth-child(1) .kpi-value"),
        "Pendiente": document.querySelector(".kpi-card:nth-child(2) .kpi-value"),
        "Cancelada": document.querySelector(".kpi-card:nth-child(3) .kpi-value"),
        "Completada": document.querySelector(".kpi-card:nth-child(4) .kpi-value")
    };
    Object.entries(elementos).forEach(([estado, el]) => {
        if (el) el.textContent = kpis[estado.toLowerCase()] || kpis[estado] || 0;
    });
}

// ============================================================
// 1.6.2 FRONTEND: GESTIÓN DE RIESGO NO-SHOW
// ============================================================

/**
 * Mapeo de niveles de riesgo a colores y clases CSS
 */
const RIESGO_COLORES = {
    "Crítico": { bg: "#fee2e2", border: "#ef4444", texto: "#991b1b", badge: "bg-danger" },      // rojo
    "Alto":    { bg: "#ffedd5", border: "#f97316", texto: "#9a3412", badge: "bg-warning" },      // naranja
    "Medio":   { bg: "#fef9c3", border: "#eab308", texto: "#854d0e", badge: "bg-warning" },       // amarillo
    "Bajo":    { bg: "#dcfce7", border: "#22c55e", texto: "#166534", badge: "bg-success" },       // verde
    "Desconocido": { bg: "#f3f4f6", border: "#9ca3af", texto: "#374151", badge: "bg-secondary" } // gris
};

/**
 * Obtiene el nivel de riesgo para una lista de pacientes (batch)
 * @param {number[]} pacienteIds - Array de IDs de pacientes
 * @returns {Promise<Object[]>} Array de objetos {paciente_id, nivel_riesgo, score, ...}
 */
async function obtenerRiesgosBatch(pacienteIds) {
    if (!Array.isArray(pacienteIds) || pacienteIds.length === 0) return [];
    try {
        const respuesta = await api("/pacientes/riesgo/batch", {
            method: "POST",
            body: JSON.stringify({ paciente_ids: pacienteIds })
        });
        return respuesta.riesgos || [];
    } catch (error) {
        console.warn("[Riesgo] No se pudieron obtener riesgos en batch:", error.message);
        return [];
    }
}

/**
 * Obtiene el nivel de riesgo para un solo paciente
 * @param {number} pacienteId - ID del paciente
 * @returns {Promise<Object|null>} Objeto con riesgo o null si error
 */
async function obtenerRiesgoPaciente(pacienteId) {
    try {
        const respuesta = await api(`/pacientes/${pacienteId}/riesgo`);
        return respuesta.riesgo || null;
    } catch (error) {
        console.warn(`[Riesgo] No se pudo obtener riesgo para paciente ${pacienteId}:`, error.message);
        return null;
    }
}

/**
 * Devuelve la configuración de color para un nivel de riesgo
 * @param {string} nivelRiesgo - Nivel de riesgo (Crítico, Alto, Medio, Bajo)
 * @returns {Object} Configuración de colores
 */
function getColorRiesgo(nivelRiesgo) {
    return RIESGO_COLORES[nivelRiesgo] || RIESGO_COLORES["Desconocido"];
}

/**
 * Aplica coloreo de riesgo a una fila de tabla
 * @param {HTMLTableRowElement} fila - Elemento <tr> a colorear
 * @param {string} nivelRiesgo - Nivel de riesgo del paciente
 * @param {boolean} soloBadge - Si true, solo agrega badge en la primera celda; si false, colorea toda la fila
 */
function aplicarColorRiesgoFila(fila, nivelRiesgo, soloBadge = false) {
    const color = getColorRiesgo(nivelRiesgo);

    if (soloBadge) {
        // Solo agregar badge en la primera celda (o en una celda específica)
        const primeraCelda = fila.cells[0];
        if (primeraCelda) {
            const badge = document.createElement("span");
            badge.className = `badge ${color.badge} ms-2`;
            badge.textContent = nivelRiesgo;
            badge.style.fontSize = "0.7rem";
            primeraCelda.appendChild(badge);
        }
    } else {
        // Colorear toda la fila
        fila.style.backgroundColor = color.bg;
        fila.style.borderLeft = `4px solid ${color.border}`;

        // También agregar badge en la primera celda
        const primeraCelda = fila.cells[0];
        if (primeraCelda) {
            const badge = document.createElement("span");
            badge.className = `badge ${color.badge} ms-2`;
            badge.textContent = nivelRiesgo;
            badge.style.fontSize = "0.7rem";
            primeraCelda.appendChild(badge);
        }
    }
}

/**
 * Carga riesgos para las citas de una tabla y aplica coloreo
 * @param {HTMLTableSectionElement} tbody - Elemento <tbody> de la tabla
 * @param {string} columnaPacienteId - Nombre del atributo data- que contiene el paciente_id en cada fila
 */
async function cargarYColorearRiesgos(tbody, columnaPacienteId = "data-paciente-id") {
    if (!tbody) return;

    const filas = Array.from(tbody.querySelectorAll("tr"));
    if (filas.length === 0) return;

    // Extraer IDs únicos de pacientes
    const pacienteIds = [...new Set(filas
        .map(fila => parseInt(fila.getAttribute(columnaPacienteId)))
        .filter(id => !isNaN(id))
    )];

    if (pacienteIds.length === 0) return;

    // Obtener riesgos en batch
    const riesgos = await obtenerRiesgosBatch(pacienteIds);

    // Crear mapa para búsqueda rápida
    const riesgoMap = new Map(riesgos.map(r => [r.paciente_id, r]));

    // Aplicar colores a cada fila
    filas.forEach(fila => {
        const pacienteId = parseInt(fila.getAttribute(columnaPacienteId));
        if (isNaN(pacienteId)) return;

        const riesgo = riesgoMap.get(pacienteId);
        if (riesgo && riesgo.nivel_riesgo) {
            aplicarColorRiesgoFila(fila, riesgo.nivel_riesgo);
        }
    });
}

/**
 * Función helper para que las páginas de recepcionista y médico
 * puedan llamar fácilmente tras cargar sus tablas
 * @param {string} tbodyId - ID del elemento tbody
 */
async function inicializarColoreoRiesgo(tbodyId) {
    const tbody = document.getElementById(tbodyId);
    if (!tbody) return;

    // Esperar un poco a que la tabla se haya poblado (si se usa setInterval)
    await new Promise(r => setTimeout(r, 100));
    await cargarYColorearRiesgos(tbody);
}


// ============================================================
// LISTA DE ESPERA (recepcionista) — adaptado a lista-espera.html
// Pegar al final de assets/js/app.js
// (si ya habías pegado la versión anterior, bórrala primero)
//
// Endpoints (ya existen en server.js):
//   GET    /api/lista-espera?estado=Activo
//   POST   /api/lista-espera
//   PUT    /api/lista-espera/:id
//   DELETE /api/lista-espera/:id
//   GET    /api/especialidades
//
// ============================================================
// Escapa texto antes de meterlo en innerHTML (evita XSS con nombres/observaciones).
function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, (c) => (
        { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
    ));
}

// El <select name="prioridad"> del HTML usa "alta"/"media"/"baja";
// el backend usa "Alta" | "Media" | "Baja". ("normal" se deja como alias de media.)
const PRIORIDAD_FORM_A_API = { alta: "Alta", media: "Media", normal: "Media", baja: "Baja" };
const PRIORIDAD_ETIQUETA = { Alta: "Alta", Media: "Media", Baja: "Baja" };

/**
 * Llena el select de especialidad del formulario (name="especialidad_id").
 * OJO: el backend no tiene tabla de especialidades; /api/especialidades devuelve
 * nombres, así que el value de cada opción es el NOMBRE de la especialidad.
 */
async function llenarEspecialidadesListaEspera() {
    const select = document.querySelector('[data-form="lista-espera"] [name="especialidad_id"]');
    if (!select) return;

    try {
        const { especialidades } = await api("/especialidades");
        especialidades.forEach((e) => {
            const opcion = document.createElement("option");
            opcion.value = e.nombre;
            opcion.textContent = e.nombre;
            select.appendChild(opcion);
        });
    } catch (error) {
        mostrarAlerta(error.message, "danger");
    }
}

/**
 * Pinta la cola de espera ACTIVA. El backend ya la devuelve ordenada por
 * prioridad (Alta primero) y luego por fecha de ingreso, así que "Orden" es
 * simplemente la posición en la lista.
 */
async function cargarListaEspera() {
    const tbody = document.getElementById("tabla-espera");
    if (!tbody) return;
    const vacio = document.querySelector(".empty-state");

    try {
        const params = new URLSearchParams({ estado: "Activo", page: "1", limit: "50" });
        const { lista_espera = [] } = await api(`/lista-espera?${params}`);

        tbody.innerHTML = "";
        if (vacio) vacio.classList.toggle("d-none", lista_espera.length > 0);

        lista_espera.forEach((item, indice) => {
            const id = Number(item.espera_id);
            const fecha = item.fecha_inscripcion
                ? new Date(item.fecha_inscripcion).toLocaleString("es-CO", { dateStyle: "short", timeStyle: "short" })
                : "";

            const fila = document.createElement("tr");
            fila.innerHTML = `
                <td>${indice + 1}</td>
                <td>
                    ${escaparHTML(item.nombre_completo)}
                    <br><small class="text-muted">${escaparHTML(item.documento_id)}${item.telefono_whatsapp ? " · " + escaparHTML(item.telefono_whatsapp) : ""}</small>
                </td>
                <td>
                    ${escaparHTML(item.especialidad_requerida || "Cualquiera")}
                    ${item.sede_nombre ? `<br><small class="text-muted">${escaparHTML(item.sede_nombre)}</small>` : ""}
                    ${item.observaciones ? `<br><small class="text-muted">${escaparHTML(item.observaciones)}</small>` : ""}
                </td>
                <td>
                    <select class="form-select form-select-sm" data-espera-prioridad data-espera-id="${id}">
                        ${["Alta", "Media", "Baja"].map((p) =>
                            `<option value="${p}" ${p === item.prioridad ? "selected" : ""}>${PRIORIDAD_ETIQUETA[p]}</option>`
                        ).join("")}
                    </select>
                </td>
                <td>${escaparHTML(fecha)}</td>
                <td class="text-nowrap">
                    <button class="btn btn-outline-success btn-sm" data-accion="espera-asignar" data-espera-id="${id}" title="Marcar como asignado">
                        <i class="bi bi-check-circle"></i>
                    </button>
                    <button class="btn btn-outline-secondary btn-sm" data-accion="espera-expirar" data-espera-id="${id}" title="Marcar como expirado">
                        <i class="bi bi-clock-history"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm" data-accion="espera-eliminar" data-espera-id="${id}" title="Eliminar">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(fila);
        });
    } catch (error) {
        tbody.innerHTML = "";
        if (vacio) vacio.classList.remove("d-none");
        mostrarAlerta(error.message, "danger");
    }
}

/**
 * Inscribe a un paciente (buscado por documento) en la lista de espera.
 * Campos del form: documento, especialidad_id (nombre), prioridad.
 */
async function inscribirEnListaEspera(formulario, datos) {
    const documento = (datos.documento || "").trim();
    if (!documento) {
        mostrarAlerta("Ingresa el documento del paciente", "warning");
        return;
    }

    const cuerpo = {
        documento,
        prioridad: PRIORIDAD_FORM_A_API[datos.prioridad] || "Media"
    };
    // En el HTML el select se llama especialidad_id, pero el backend espera especialidad_requerida.
    if (datos.especialidad_id) cuerpo.especialidad_requerida = datos.especialidad_id;

    try {
        const respuesta = await api("/lista-espera", { method: "POST", body: JSON.stringify(cuerpo) });
        mostrarAlerta(respuesta.mensaje, "success");
        formulario.reset();
        cargarListaEspera();
    } catch (error) {
        mostrarAlerta(error.message, "danger");
    }
}

/**
 * PUT genérico: cambia prioridad o estado de una entrada y recarga la tabla.
 */
async function actualizarListaEspera(id, cambios) {
    try {
        const respuesta = await api(`/lista-espera/${encodeURIComponent(id)}`, {
            method: "PUT",
            body: JSON.stringify(cambios)
        });
        mostrarAlerta(respuesta.mensaje, "success");
    } catch (error) {
        mostrarAlerta(error.message, "danger");
    }
    cargarListaEspera();
}

// Botones de la tabla. Es un listener aparte: el de app.js ignora acciones que no conoce.
document.addEventListener("click", async (evento) => {
    const boton = evento.target.closest("button[data-accion^='espera-']");
    if (!boton) return;
    const id = boton.dataset.esperaId;

    switch (boton.dataset.accion) {
        case "espera-asignar":
            actualizarListaEspera(id, { estado_espera: "Asignado" });
            break;
        case "espera-expirar":
            actualizarListaEspera(id, { estado_espera: "Expirado" });
            break;
        case "espera-eliminar":
            if (!window.confirm("¿Eliminar esta entrada de la lista de espera?")) return;
            try {
                const respuesta = await api(`/lista-espera/${encodeURIComponent(id)}`, { method: "DELETE" });
                mostrarAlerta(respuesta.mensaje, "success");
            } catch (error) {
                mostrarAlerta(error.message, "danger");
            }
            cargarListaEspera();
            break;
    }
});

// Cambio de prioridad desde la fila.
document.addEventListener("change", (evento) => {
    const select = evento.target.closest("select[data-espera-prioridad]");
    if (select) actualizarListaEspera(select.dataset.esperaId, { prioridad: select.value });
});

// Arranque: solo actúa en la página que tiene #tabla-espera.
// Sin setInterval a propósito (el rate limit del servidor no lo aguanta):
// la tabla se recarga tras cada acción.
document.addEventListener("DOMContentLoaded", () => {
    if (!document.getElementById("tabla-espera")) return;
    llenarEspecialidadesListaEspera();
    cargarListaEspera();
});

document.addEventListener("DOMContentLoaded", () => {
    const filtros = document.getElementById("filtros-citas");
    if (!filtros) return;

    // Botón Buscar
    filtros.querySelector('button[type="button"]')?.addEventListener("click", cargarCitasRecepcionista);

    // Enter dentro de los campos de texto
    filtros.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && e.target.matches("input")) {
            e.preventDefault();
            cargarCitasRecepcionista();
        }
    });

    // Al cambiar la fecha o el estado, la tabla se recarga sola
    filtros.querySelectorAll("select, input[type='date']").forEach((el) =>
        el.addEventListener("change", cargarCitasRecepcionista));
});
