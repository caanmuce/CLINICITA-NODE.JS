# CliniCita

<div align="center">

![CliniCita](https://img.shields.io/badge/CliniCita-gesti%C3%B3n%20de%20citas-0D9488?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)
![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=white)
![Vite](https://img.shields.io/badge/Vite-Build-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TailwindCSS](https://img.shields.io/badge/TailwindCSS-4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-Base%20de%20datos-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Python](https://img.shields.io/badge/Python-FastAPI%2FXGBoost-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![SENA](https://img.shields.io/badge/Proyecto-SENA-2563EB?style=for-the-badge)

**Sistema web para el control y la gestión inteligente de citas médicas.**

[Descripción](#descripción) · [Funcionalidades](#funcionalidades) · [Instalación](#instalación) · [Ejecución con Docker](#ejecución-con-docker) · [Uso](#uso) · [Estructura](#estructura-del-proyecto) · [ML No-Show Risk Score](#ml-no-show-risk-score-system) · [API](#api-disponible)

</div>

## Descripción

CliniCita es un proyecto formativo del **SENA** desarrollado para mejorar la administración de citas médicas y reducir el ausentismo. La plataforma centraliza el agendamiento, la consulta de citas, la atención por roles y los recordatorios para ofrecer una experiencia más ordenada a pacientes y personal de salud.

El proyecto combina:
- **Frontend**: React 18 + Vite + TailwindCSS 4 (carpeta `client/`)
- **Backend**: Node.js + Express (carpeta `server/`)
- **Base de datos**: MySQL (scripts en `database/`)
- **Integración opcional**: WhatsApp (chatbot, recordatorios, priorización por riesgo)
- **Machine Learning**: FastAPI + XGBoost para predicción de riesgo de inasistencia (no-show)
- **Chatbot IA**: Google Gemini para clasificar mensajes de confirmaciones, cancelaciones y síntomas de preconsulta

## Objetivos

- Facilitar el agendamiento de citas desde cualquier dispositivo.
- Disminuir las inasistencias mediante recordatorios automáticos y predicción de riesgo ML.
- Organizar la operación de pacientes, médicos, recepción y administración.
- Gestionar cupos liberados a través de una lista de espera con prioridades.
- Registrar información de preconsulta asociada a una cita.
- Proporcionar indicadores de riesgo basados en ML para priorizar recordatorios.

## Funcionalidades

### Para pacientes

- Registro e inicio de sesión con validación de rol.
- Consulta de especialidades, médicos y horarios disponibles.
- Agendamiento de citas futuras con motivo de consulta.
- Consulta de próximas citas y del historial de citas.
- Panel de paciente, perfil y páginas de ayuda, privacidad y términos.
- Confirmación, cancelación y registro de síntomas mediante WhatsApp cuando la integración está habilitada.
- **Visualización de su propio nivel de riesgo de no-show.**

### Para médicos

- Agenda diaria con filtro por fecha.
- Visualización de paciente, documento, motivo, estado de la cita y **nivel de riesgo (coloreado)**.
- Estados de cita: pendiente, confirmada, cancelada, no asistió y completada.

### Para recepción

- Gestión y búsqueda de citas por fecha, estado, paciente o documento.
- **Tabla de citas con coloreo por nivel de riesgo (Crítico/Alto/Medio/Bajo)**.
- Administración de la lista de espera.
- Priorización de pacientes en espera como alta, media o baja.

### Para administración

- Panel general con indicadores de usuarios, citas, ausentismo y lista de espera.
- Gestión de usuarios, especialidades y horarios.
- Reportes de ausentismo.
- **Endpoint para recálculo masivo de scores de riesgo.**

### Automatización y comunicación

- Recordatorios de citas programados (24h y 2h antes) vía WhatsApp.
- Chatbot WhatsApp para confirmar, cancelar o reprogramar citas, y registrar síntomas de preconsulta.
- Detección de palabras clave de urgencia para alertar a recepción.
- Priorización de recordatorios: pacientes con riesgo Crítico/Alto reciben WhatsApp + SMS simulado; Medio/Bajo solo WhatsApp.

### Machine Learning (No-Show Risk Score)

- Entrenamiento automático con XGBoost en pipeline reproducible.
- Variables: historial de no-show, cancelaciones, antigüedad, hora del día, día de la semana, especialidad, lead time, edad, género.
- API de inferencia: score 0–100, percentil, nivel (Crítico/Alto/Medio/Bajo), features principales, versión del modelo.
- Fallback heurístico en Node.js si el servicio ML no está disponible.
- Recálculo masivo bajo demanda desde panel de administración.

## Instalación

### Prerrequisitos

- **Node.js** 18+ y npm
- **MySQL** 8.0+
- **Python** 3.10+ (solo para servicio ML opcional)
- **Docker** y Docker Compose (opcional, para despliegue completo)

### 1. Clonar y configurar variables de entorno

```bash
git clone <url-del-repositorio>
cd CLINICITA-NODE.JS
cp .env.example .env   # Crear .env con tus credenciales (ver sección Configuración)
```

### 2. Base de datos

```bash
# Crear base de datos y tablas (versión oficial versionada)
mysql -u root -p < database/bd.sql

# Opcional: cargar datos de prueba (solo desarrollo local)
mysql -u root -p < database/init_local.sql
# O solo datos de prueba (requiere bd.sql previo)
mysql -u root -p < database/insert_data.sql
```

> **Nota**: `database/init_local.sql` incluye `DROP DATABASE IF EXISTS` — úsalo solo en entorno local de desarrollo. `database/insert_data.sql` solo inserta datos de prueba (sin DROP). Los scripts `write_sql*.py` son auxiliares de migración y no deben ejecutarse directamente en producción.

### 3. Backend (Node.js + Express)

```bash
# Desde la raíz del proyecto
npm install
# Requiere .env con DB_HOST, DB_USER, DB_PASSWORD, DB_NAME, JWT_SECRET, etc.
node server/server.js
# Servidor en http://localhost:3000 (o puerto configurado en .env)
```

### 4. Frontend (React 18 + Vite + TailwindCSS 4)

```bash
cd client
npm install
npm run dev      # Desarrollo en http://localhost:5173 (HMR, Fast Refresh)
npm run build    # Build de producción optimizado en ../public/ (servido por Express)
npm run preview  # Vista previa del build de producción
npm run lint     # Oxlint (0 errores, 1 warning: Fast Refresh en AuthContext.jsx)
```

> **Producción**: `npm run build` genera el build en `../public/` (raíz del proyecto). Express sirve estos archivos estáticos + **SPA fallback** (cualquier ruta no-API devuelve `index.html` para que React Router funcione al recargar).

### 5. Servicio ML (opcional, FastAPI + XGBoost)

```bash
cd ml-service
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8000
# API en http://localhost:8000
# Variables: ML_SERVICE_URL=http://localhost:8000 (en .env del backend)
```

### 6. WhatsApp (opcional)

- Requiere `WHATSAPP_ENABLED=true` en `.env`
- Primera ejecución: escanear código QR en consola para autenticar sesión (`wwebjs_auth/`)
- Ver `server/servicios/whatsapp.js` para configuración de recordatorios y chatbot.

## Producción: servir frontend con Express

Desde la raíz del proyecto:

```bash
# 1. Build del frontend (genera ../public/index.html + ../public/assets/*)
cd client && npm run build && cd ..

# 2. Iniciar backend (sirve API + frontend estático + SPA fallback)
node server/server.js
# http://localhost:3000 → app React
# http://localhost:3000/api/* → API REST
# http://localhost:3000/test-panel.html → Panel de pruebas manuales (Tailwind CDN)
```

**Arquitectura en producción**:
- `public/index.html` (0.5 KB) + `public/assets/*.js/*.css` (hashados) → build de React
- Express `express.static('public')` → sirve assets directamente
- **SPA fallback middleware** (añadido en `server.js:346-356`) → cualquier ruta sin `.` y no `/api/*` ni `/assets/*` ni `/test-panel.html` devuelve `index.html` para que React Router maneje `/dashboard`, `/login`, etc. al recargar

## Configuración necesaria

Crea un archivo `.env` en la raíz con (valores de ejemplo):

```env
# Base de datos
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=clinicitabd
DB_PORT=3306

# JWT
JWT_SECRET=clave_secreta_muy_larga_y_aleatoria
JWT_EXPIRES_IN=8h

# Servidor
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173

# ML Service (opcional)
ML_SERVICE_URL=http://localhost:8000

# WhatsApp (opcional)
WHATSAPP_ENABLED=false
WHATSAPP_SESSION_PATH=.wwebjs_auth

# Recordatorios
REMINDER_HOURS_BEFORE=24
REMINDER_SECOND_HOURS=2

# Zona horaria
TZ=America/Bogota
```

> **Seguridad**: Nunca commitees `.env`, `.wwebjs_auth/`, `.wwebjs_cache/`, `node_modules/`, `client/dist/`, `client/node_modules/`.
## Estructura del proyecto

```
CLINICITA-NODE.JS/
├── client/                      # Frontend React + Vite + TailwindCSS 4
│   ├── src/
│   │   ├── api/                 # Clientes API por dominio (axios)
│   │   ├── components/
│   │   │   ├── layout/          # Header, Sidebar, RoleLayout, ProtectedRoute
│   │   │   └── ui/              # Componentes compartidos (AnimatedComponents, DashboardComponents, Button)
│   │   ├── context/             # AuthContext (login, roles, JWT)
│   │   ├── hooks/               # usePageTransition
│   │   ├── pages/               # Páginas por rol (admin, medico, paciente, recepcionista) + Login
│   │   ├── routes/              # AppRoutes (lazy loading, rutas protegidas por rol)
│   │   ├── utils/               # dateUtils (getColombiaDate, zona horaria UTC-5)
│   │   ├── App.jsx, main.jsx, index.css
│   │   └── .oxlintrc.json       # Configuración lint (1 warning Fast Refresh)
│   ├── index.html, package.json, vite.config.js, tailwind.config.js
│   └── dist/                    # Build de producción (generado, no versionado)
│
├── server/                      # Backend Node.js + Express
│   ├── server.js                # Punto de entrada, rutas API, middlewares
│   ├── conexion.js              # Pool MySQL (mysql2/promise)
│   ├── servicios/               # Lógica de negocio original
│   │   ├── espera.js            # Lista de espera, reasignación de cupos
│   │   └── whatsapp.js          # Recordatorios, chatbot Gemini, priorización riesgo
│   └── services/
│       └── ml-client.js         # Cliente HTTP para ML Service + fallback heurístico
│
├── database/                    # Scripts SQL
│   ├── bd.sql                   # Esquema completo (versión oficial versionada)
│   ├── init_local.sql           # Esquema + datos de prueba + DROP DATABASE (solo local)
│   ├── insert_data.sql          # Solo datos de prueba (sin DROP)
│   └── write_sql*.py            # Scripts auxiliares de migración (no ejecutar en prod)
│
├── ml-service/                  # Servicio ML FastAPI + XGBoost (opcional)
│   ├── app/
│   │   ├── main.py              # API endpoints (/riesgo/, /riesgo/batch, /recalcular-todos)
│   │   └── model/predictor.py   # Carga modelo, predicción, features
│   ├── scripts/                 # Generación datos, entrenamiento
│   ├── train.py                 # Entrenamiento + MLflow
│   └── requirements.txt
│
├── .env.example                 # Plantilla de variables de entorno
├── .gitignore
├── docker-compose.yml           # Orquestación completa (backend, db, ml, mlflow)
├── Dockerfile
├── package.json                 # Scripts raíz (check:node, check:python, test)
└── README.md
```

## Cómo iniciar cada parte

| Componente | Comando | Puerto por defecto |
|------------|---------|-------------------|
| Backend (Node.js) | `node server/server.js` | 3000 |
| Frontend Dev (Vite) | `cd client && npm run dev` | 5173 |
| Frontend Build | `cd client && npm run build` | `client/dist/` |
| ML Service (FastAPI) | `cd ml-service && uvicorn app.main:app --port 8000` | 8000 |
| MLflow UI | `cd ml-service && mlflow ui --port 5000` | 5000 |
| Docker completo | `docker-compose up --build` | 3000, 3306, 8000, 5000 |

## Roles y funcionalidades implementadas en el Frontend

| Rol | Rutas | Páginas principales |
|-----|-------|---------------------|
| **Paciente** | `/paciente/*` | Dashboard, Citas, Agendar, Lista Espera, Preconsulta, Perfil |
| **Médico** | `/medico/*` | Dashboard, Agenda, Citas, Pacientes |
| **Recepcionista** | `/recepcionista/*` | Dashboard, Citas, Pacientes, Horarios |
| **Administrador** | `/admin/*` | Dashboard, Usuarios, Médicos, Sedes, Reportes |

- **Navegación unificada**: `Header.jsx` + `Sidebar.jsx` (responsive, colapsable) dentro de `RoleLayout.jsx`.
- **Componentes compartidos**: `StatCard`, `QuickAction` en `DashboardComponents.jsx`; animaciones en `AnimatedComponents.jsx`.
- **Utilidades compartidas**: `getColombiaDate()` en `dateUtils.js` (zona horaria Colombia UTC-5).
- **Rutas protegidas**: `ProtectedRoute` por rol + lazy loading en `AppRoutes.jsx`.

## Limitaciones conocidas

1. **Frontend**: `client/` está en `.gitignore` (línea 11) — es una aplicación nueva no versionada aún.
2. **Lint**: 1 warning en `AuthContext.jsx` (exporta hook `useAuth` junto al componente `AuthProvider`; rompe Fast Refresh en dev, no afecta build ni producción).
3. **Backend**: `server/services/ml-client.js` usa fallback heurístico si el servicio ML no está disponible (requiere `ML_SERVICE_URL`).
4. **WhatsApp**: Integración opcional; requiere escaneo QR manual en primera ejecución; no funciona en entornos headless sin configuración adicional.
5. **Base de datos**: `database/init_local.sql` contiene `DROP DATABASE IF EXISTS` — **no usar en producción**. Usar `bd.sql` para esquema y `insert_data.sql` solo para datos de prueba.
6. **Scripts auxiliares**: `database/write_sql*.py` son herramientas de migración manual, no forman parte del despliegue automático.
7. **ML Service**: Entrenamiento y serving son opcionales; el backend funciona con fallback heurístico si no está disponible.
8. **Docker**: `docker-compose.yml` orquesta todo, pero requiere `.env` válido y puertos libres.

## API disponible (resumen)

### Autenticación
- `POST /api/auth/login` — Login, retorna JWT
- `POST /api/auth/register` — Registro paciente
- `GET /api/auth/me` — Usuario actual (requiere token)

### Pacientes
- `GET /api/pacientes` — Listar (admin/recepción)
- `GET /api/pacientes/:id` — Detalle
- `POST /api/pacientes` — Crear
- `PUT /api/pacientes/:id` — Actualizar
- `GET /api/pacientes/:id/riesgo` — Score ML no-show

### Médicos
- `GET /api/medicos` — Listar
- `GET /api/medicos/:id/horarios` — Horarios por médico

### Citas
- `GET /api/citas` — Listar con filtros
- `POST /api/citas` — Agendar
- `PUT /api/citas/:id` — Actualizar estado
- `DELETE /api/citas/:id` — Cancelar
- `GET /api/citas/disponibilidad` — Slots libres

### Lista de espera
- `GET /api/lista-espera` — Listar
- `POST /api/lista-espera` — Agregar
- `PUT /api/lista-espera/:id` — Actualizar prioridad/estado
- `POST /api/lista-espera/reasignar/:citaId` — Reasignar cupo liberado

### Recordatorios / WhatsApp
- `POST /api/recordatorios/procesar` — Procesar recordatorios pendientes
- `POST /api/whatsapp/webhook` — Webhook entrante (Twilio/Meta)

### Administración
- `GET /api/admin/estadisticas` — KPIs dashboard
- `POST /api/admin/recalcular-riesgos` — Recálculo masivo scores ML
- `GET /api/reportes/ausentismo` — Reporte ausentismo

### ML Service (FastAPI, puerto 8000)
- `GET /riesgo/:pacienteId` — Score individual
- `POST /riesgo/batch` — Scores en lote
- `POST /recalcular-todos` — Reentrenamiento + recálculo masivo

## ML No-Show Risk Score System

Ver sección detallada en el README original (entrenamiento, features, inferencia, fallback, WhatsApp dual-channel, recálculo masivo, MLflow).

## Ejecución con Docker

```bash
# Requiere .env en la raíz
docker-compose up --build -d
# Servicios: backend:3000, mysql:3306, ml-service:8000, mlflow:5000
docker-compose logs -f backend
docker-compose down -v   # Limpia volúmenes (borra BD)
```

## Contexto académico

CliniCita fue creado como proyecto del **Servicio Nacional de Aprendizaje (SENA)** para aplicar conocimientos de desarrollo web, bases de datos, APIs, autenticación, automatización y Machine Learning en una problemática del sector salud: mejorar el acceso a las citas y reducir el ausentismo mediante predicción de riesgo basada en datos.

## Licencia

Este proyecto es de carácter académico.
