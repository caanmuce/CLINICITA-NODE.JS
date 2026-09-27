# CliniCita

<div align="center">

![CliniCita](https://img.shields.io/badge/CliniCita-gesti%C3%B3n%20de%20citas-0D9488?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-Base%20de%20datos-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![SENA](https://img.shields.io/badge/Proyecto-SENA-2563EB?style=for-the-badge)

**Sistema web para el control y la gestión inteligente de citas médicas.**

[Descripción](#descripción) · [Funcionalidades](#funcionalidades) · [Instalación](#instalación) · [Uso](#uso) · [Estructura](#estructura-del-proyecto)

</div>

## Descripción

CliniCita es un proyecto formativo del **SENA** desarrollado para mejorar la administración de citas médicas y reducir el ausentismo. La plataforma centraliza el agendamiento, la consulta de citas, la atención por roles y los recordatorios para ofrecer una experiencia más ordenada a pacientes y personal de salud.

El proyecto combina un frontend web responsive con un servidor **Node.js + Express**, una base de datos **MySQL** y una integración opcional con **WhatsApp**. También incluye un chatbot con Google Gemini para clasificar mensajes relacionados con confirmaciones, cancelaciones y síntomas de preconsulta.

## Objetivos

- Facilitar el agendamiento de citas desde cualquier dispositivo.
- Disminuir las inasistencias mediante recordatorios automáticos.
- Organizar la operación de pacientes, médicos, recepción y administración.
- Gestionar cupos liberados a través de una lista de espera con prioridades.
- Registrar información de preconsulta asociada a una cita.

## Funcionalidades

### Para pacientes

- Registro e inicio de sesión con validación de rol.
- Consulta de especialidades, médicos y horarios disponibles.
- Agendamiento de citas futuras con motivo de consulta.
- Consulta de próximas citas y del historial de citas.
- Panel de paciente, perfil y páginas de ayuda, privacidad y términos.
- Confirmación, cancelación y registro de síntomas mediante WhatsApp cuando la integración está habilitada.

### Para médicos

- Agenda diaria con filtro por fecha.
- Visualización de paciente, documento, motivo y estado de la cita.
- Estados de cita: pendiente, confirmada, cancelada, no asistió y completada.

### Para recepción

- Gestión y búsqueda de citas por fecha, estado, paciente o documento.
- Administración de la lista de espera.
- Priorización de pacientes en espera como alta, media o baja.

### Para administración

- Panel general con indicadores de usuarios, citas, ausentismo y lista de espera.
- Gestión de usuarios, especialidades y horarios.
- Reportes de ausentismo.

### Automatización y comunicación

- Recordatorios de citas por WhatsApp mediante `whatsapp-web.js`.
- Ejecución periódica de recordatorios con `node-cron`.
- Vinculación de un número de WhatsApp con un paciente mediante documento y últimos cuatro dígitos del teléfono.
- Clasificación local de mensajes y clasificación/respuesta opcional con Google Gemini.
- Ficha de preconsulta con síntomas o motivo reportado por el paciente.

## Tecnologías

| Capa | Tecnologías |
| --- | --- |
| Frontend | HTML5, CSS3, JavaScript, Bootstrap 5, Bootstrap Icons |
| Backend | Node.js, Express 5 |
| Persistencia | MySQL, `mysql2` |
| Autenticación | Tokens HMAC, `crypto.scryptSync` y control de acceso por rol |
| Mensajería | `whatsapp-web.js`, `qrcode-terminal`, `node-cron` |
| IA opcional | Google Gemini mediante `@google/genai` |

## Requisitos

- Node.js y npm.
- MySQL Server activo.
- Una base de datos local con permisos para crear tablas.
- Google Chrome/Chromium disponible si se habilita WhatsApp Web.

## Instalación

1. Clona el repositorio y entra en la carpeta del proyecto:

   ```bash
   git clone <URL_DEL_REPOSITORIO>
   cd "CLINICITA NODE.JS"
   ```

2. Instala las dependencias:

   ```bash
   npm install
   ```

3. Crea la base de datos e importa el esquema y los datos de prueba:

   ```bash
   mysql -u root -p < database/bd.sql
   ```

   La configuración actual de conexión está en `server/conexion.js` y utiliza por defecto:

   - Host: `localhost`
   - Usuario: `root`
   - Contraseña: vacía
   - Base de datos: `clinicitabd`

   Si tu instalación de MySQL usa otros valores, actualiza ese archivo antes de iniciar el servidor.

4. Opcionalmente crea un archivo `.env` en la raíz para configurar seguridad e integraciones:

   ```env
   TOKEN_SECRET=una-clave-larga-y-segura
   ENABLE_WHATSAPP=false
   ENABLE_WHATSAPP_CHATBOT=false
   WHATSAPP_COUNTRY_CODE=57
   GEMINI_API_KEY=
   GEMINI_MODEL=gemini-2.5-flash-lite
   ```

   No subas `.env`, credenciales ni las carpetas de sesión de WhatsApp al repositorio.

## Uso

Inicia el servidor con:

```bash
node server/server.js
```

Luego abre [http://localhost:3000](http://localhost:3000) en el navegador.

### WhatsApp

Para activar los recordatorios:

```env
ENABLE_WHATSAPP=true
```

Al iniciar el servidor aparecerá un código QR en la terminal. Escanéalo desde WhatsApp para vincular la sesión. El chatbot se activa por separado:

```env
ENABLE_WHATSAPP_CHATBOT=true
```

La clave `GEMINI_API_KEY` es opcional. Si no está configurada, el sistema utiliza un clasificador local para reconocer confirmaciones, cancelaciones y mensajes de síntomas.

## Credenciales de demostración

El servidor crea estos usuarios automáticamente al iniciar, si todavía no existen:

| Rol | Correo | Contraseña |
| --- | --- | --- |
| Paciente | `paciente@clinicita.com` | `paciente123` |
| Médico | `medico@clinicita.com` | `medico123` |
| Recepcionista | `recepcion@clinicita.com` | `recepcion123` |
| Administrador | `admin@clinicita.com` | `admin123` |

Estas cuentas son únicamente para desarrollo y demostración. Deben cambiarse o eliminarse antes de usar el sistema en un entorno real.

## Estructura del proyecto

```text
.
├── database/
│   └── bd.sql                    # Esquema, relaciones, triggers y datos de prueba
├── public/
│   ├── index.html                # Página principal
│   ├── assets/
│   │   ├── css/estilos.css       # Estilos de la interfaz
│   │   └── js/app.js              # Consumo de API y lógica del frontend
│   ├── pages/                    # Login, registro, ayuda, contacto y legales
│   └── roles/                    # Vistas separadas por tipo de usuario
├── server/
│   ├── conexion.js               # Conexión con MySQL
│   ├── server.js                 # Servidor Express, autenticación y API
│   └── servicios/whatsapp.js     # Recordatorios y chatbot de WhatsApp
├── .env                          # Variables locales, no versionar
├── .gitignore
├── package.json
└── README.md
```

## Modelo de datos

La base de datos `clinicitabd` incluye las entidades principales del proceso de atención:

- `usuarios`: cuentas, roles, estado y relación con paciente o médico.
- `pacientes`: datos de contacto, documento y vinculación con WhatsApp.
- `medicos`: profesionales y especialidades.
- `citas`: fecha, hora, motivo y estado de la atención.
- `lista_espera`: pacientes pendientes con especialidad y prioridad.
- `recordatorios`: canal, fecha y estado de entrega.
- `fichas_preconsulta`: síntomas registrados para una cita.

También se incluyen llaves foráneas, índices, triggers para recordatorios y lista de espera, además de los procedimientos `RegistrarCita` y `ConsultarCitasPaciente`.

## API disponible

Las rutas protegidas utilizan un token Bearer generado durante el inicio de sesión.

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Inicia sesión por correo, contraseña y rol |
| `POST` | `/api/auth/registro` | Registra un nuevo paciente |
| `GET` | `/api/auth/me` | Consulta el usuario autenticado |
| `GET` | `/api/especialidades` | Lista especialidades disponibles |
| `GET` | `/api/medicos` | Lista médicos, con filtro opcional por especialidad |
| `GET` | `/api/horarios` | Consulta horarios libres de un médico |
| `POST` | `/api/citas` | Crea una cita para el paciente autenticado |
| `GET` | `/api/citas` | Lista las citas del paciente autenticado |

## Estado del proyecto

El flujo de autenticación, registro de pacientes, consulta de disponibilidad y agendamiento de citas está conectado al backend y MySQL. La interfaz incluye los paneles de los cuatro roles y las pantallas principales del sistema.

Algunas vistas administrativas, médicas y de recepción mantienen marcadores `TODO` para conectar sus operaciones de lectura y actualización con nuevos endpoints. Esta sección permite distinguir la interfaz ya maquetada de las funcionalidades que todavía están en desarrollo.

## Contexto académico

CliniCita fue creado como proyecto del **Servicio Nacional de Aprendizaje (SENA)** para aplicar conocimientos de desarrollo web, bases de datos, APIs, autenticación y automatización en una problemática del sector salud: mejorar el acceso a las citas y reducir el ausentismo.

## Licencia

Este proyecto es de carácter académico. Agrega aquí la licencia que el equipo decida utilizar antes de distribuirlo públicamente.
