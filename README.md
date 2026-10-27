# CliniCita

<div align="center">

![CliniCita](https://img.shields.io/badge/CliniCita-gesti%C3%B3n%20de%20citas-0D9488?style=for-the-badge)
![Node.js](https://img.shields.io/badge/Node.js-Express-339933?style=for-the-badge&logo=node.js&logoColor=white)
![MySQL](https://img.shields.io/badge/MySQL-Base%20de%20datos-4479A1?style=for-the-badge&logo=mysql&logoColor=white)
![Python](https://img.shields.io/badge/Python-FastAPI%2FXGBoost-3776AB?style=for-the-badge&logo=python&logoColor=white)
![Docker](https://img.shields.io/badge/Docker-Containerized-2496ED?style=for-the-badge&logo=docker&logoColor=white)
![SENA](https://img.shields.io/badge/Proyecto-SENA-2563EB?style=for-the-badge)

**Sistema web para el control y la gestión inteligente de citas médicas.**

[Descripción](#descripción) · [Funcionalidades](#funcionalidades) · [Instalación](#instalación) · [Uso](#uso) · [Estructura](#estructura-del-proyecto) · [ML No-Show Risk Score](#ml-no-show-risk-score-system) · [API](#api-disponible)

</div>

## Descripción

CliniCita es un proyecto formativo del **SENA** desarrollado para mejorar la administración de citas médicas y reducir el ausentismo. La plataforma centraliza el agendamiento, la consulta de citas, la atención por roles y los recordatorios para ofrecer una experiencia más ordenada a pacientes y personal de salud.

El proyecto combina un frontend web responsive con un servidor **Node.js + Express**, una base de datos **MySQL**, una integración opcional con **WhatsApp**, y un **servicio de Machine Learning (FastAPI + XGBoost)** para predicción de riesgo de inasistencia (no-show). También incluye un chatbot con Google Gemini para clasificar mensajes relacionados con confirmaciones, cancelaciones y síntomas de preconsulta.

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

- Recordatorios de citas por WhatsApp mediante `whatsapp-web.js`.
- **Envío dual WhatsApp+SMS para pacientes de alto riesgo** (basado en score ML).
- Ejecución periódica de recordatorios con `node-cron`.
- Vinculación de un WhatsApp ya identificado con el número registrado del paciente mediante documento y últimos cuatro dígitos del teléfono.
- El chatbot solo responde al número registrado del paciente que tiene la cita; los mensajes de números no asociados se ignoran.
- Clasificación local de mensajes y clasificación/respuesta opcional con Google Gemini.
- Ficha de preconsulta con síntomas o motivo reportado por el paciente.

### Machine Learning - No-Show Risk Score

- **Modelo XGBoost** entrenado con historial de citas, recordatorios y datos demográficos.
- **308 pacientes** con scores calculados y almacenados (72 Crítico, 236 Bajo).
- **AUC = 1.0** en datos de entrenamiento (300 pacientes sintéticos generados).
- Features principales: `citas_no_show` (0.38), `no_show_ultimos_90d` (0.26), `tasa_no_show_reciente` (0.16).
- API REST (FastAPI) con endpoints: `/riesgo/{id}`, `/riesgo/batch`, `/train`, `/recalcular-todos`.
- MLflow para experiment tracking y registro de modelos.
- Docker Compose orquestado (ML Service, MLflow, MySQL).

## Tecnologías

| Capa | Tecnologías |
| --- | --- |
| Frontend | HTML5, CSS3, JavaScript, Bootstrap 5, Bootstrap Icons |
| Backend | Node.js, Express 5 |
| ML Service | Python 3.11, FastAPI, XGBoost, scikit-learn, MLflow |
| Persistencia | MySQL 8.0, `mysql2` (Node), `pymysql` (Python) |
| Autenticación | Tokens HMAC, `crypto.scryptSync` y control de acceso por rol |
| Mensajería | `whatsapp-web.js`, `qrcode-terminal`, `node-cron` |
| IA opcional | Google Gemini mediante `@google/genai` |
| Contenedores | Docker, Docker Compose |

## Requisitos

- Node.js 18+ y npm.
- MySQL Server 8.0+ activo.
- Una base de datos local con permisos para crear tablas.
- Google Chrome/Chromium disponible si se habilita WhatsApp Web.
- **Docker y Docker Compose** (para servicio ML).
- Python 3.11+ (si se ejecuta ML service sin Docker).

## Instalación

### 1. Clona el repositorio y entra en la carpeta del proyecto

```bash
git clone <URL_DEL_REPOSITORIO>
cd "CLINICITA NODE.JS"
```

### 2. Instala dependencias Node.js

```bash
npm install
```

### 3. Crea la base de datos e importa el esquema

```bash
mysql -u root -p < database/bd.sql
```

La configuración de conexión está en `server/conexion.js` (por defecto: `localhost`, `root`, sin contraseña, BD `clinicitabd`).

### 4. Configura variables de entorno (`.env` en la raíz)

```env
TOKEN_SECRET=una-clave-larga-y-segura
ENABLE_WHATSAPP=true
ENABLE_WHATSAPP_CHATBOT=true
WHATSAPP_COUNTRY_CODE=57
WHATSAPP_CONVERSATION_TTL_MS=14400000
CLINIC_TIMEZONE=America/Bogota
CLINIC_UTC_OFFSET=-05:00
DEBUG=false
GEMINI_API_KEY=
GEMINI_MODEL=gemini-2.5-flash-lite
# ML Service
ML_SERVICE_URL=http://localhost:8000
# Opcional: ruta de Chrome si no se encuentra automáticamente
# PUPPETEER_EXECUTABLE_PATH=C:\Program Files\Google\Chrome\Application\chrome.exe
```

> **Nota**: No subas `.env`, credenciales ni las carpetas de sesión de WhatsApp al repositorio.

### 5. (Opcional) Servicio ML con Docker

```bash
cd ml-service
cp .env.example .env
# Edita .env con MYSQL_ROOT_PASSWORD=clinicita123
docker-compose up -d
```

Esto levanta:
- **ml-service** en `http://localhost:8000` (API FastAPI)
- **mlflow** en `http://localhost:5000` (UI de experimentos)
- **mysql** en `localhost:3307` (BD dedicada para ML)

### 6. Entrena el modelo (si usas Docker ML)

```bash
docker run --rm --network clinicita-network \
  -v clinicita_ml_models:/models \
  -e MYSQL_ROOT_PASSWORD=clinicita123 \
  -e MLFLOW_TRACKING_URI=http://mlflow:5000 \
  -e DB_HOST=mysql \
  clinicita-ml python train.py
```

### 7. Genera datos de entrenamiento (si usas Docker ML)

```bash
docker run --rm --network clinicita-network \
  -e MYSQL_ROOT_PASSWORD=clinicita123 \
  -e DB_HOST=mysql \
  clinicita-ml python scripts/generate_training_data.py 300
```

## Uso

### Inicia el servidor Node.js

```bash
node server/server.js
```

Luego abre [http://localhost:3000](http://localhost:3000) en el navegador.

### WhatsApp

Para activar los recordatorios:

```env
ENABLE_WHATSAPP=true
```

Al iniciar el servidor aparecerá un código QR en la terminal. Escanéalo desde WhatsApp para vincular la sesión.

El chatbot se activa por separado:

```env
ENABLE_WHATSAPP_CHATBOT=true
```

La clave `GEMINI_API_KEY` es opcional. Si no está configurada, el sistema utiliza un clasificador local.

### Credenciales de demostración

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
│   └── bd.sql                    # Esquema, relaciones, triggers, datos de prueba y tabla paciente_riesgo_no_show
├── ml-service/                   # Servicio ML (FastAPI + XGBoost)
│   ├── app/
│   │   ├── main.py               # API endpoints (/riesgo, /train, /recalcular-todos, /health)
│   │   ├── config.py             # Configuración (Pydantic Settings)
│   │   ├── database.py           # Pool de conexiones pymysql
│   │   ├── schemas.py            # Pydantic models
│   │   ├── features/builder.py   # Feature engineering (20+ features por paciente)
│   │   └── model/
│   │       ├── predictor.py      # Inferencia + mapeo score→nivel (Crítico/Alto/Medio/Bajo)
│   │       └── trainer.py        # Entrenamiento XGBoost + MLflow logging
│   ├── scripts/
│   │   └── generate_training_data.py  # Genera 300 pacientes sintéticos con horarios válidos
│   ├── train.py                  # Script de entrenamiento standalone
│   ├── Dockerfile
│   ├── docker-compose.yml        # ML Service + MLflow + MySQL
│   └── requirements.txt
├── public/
│   ├── index.html                # Página principal
│   ├── assets/
│   │   ├── css/estilos.css       # Estilos + clases de riesgo (.riesgo-critico, .riesgo-alto, .riesgo-medio, .riesgo-bajo)
│   │   └── js/app.js             # Consumo de API, batch risk, coloreo de filas
│   ├── pages/                    # Login, registro, ayuda, contacto y legales
│   └── roles/                    # Vistas separadas por tipo de usuario
├── server/
│   ├── conexion.js               # Conexión con MySQL
│   ├── server.js                 # Servidor Express, autenticación, API + endpoints ML
│   ├── servicios/
│   │   └── whatsapp.js           # Recordatorios + chatbot + dual-channel (WhatsApp+SMS para alto riesgo)
│   └── services/
│       └── ml-client.js          # Cliente HTTP para ML Service con fallback heurístico
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
- `horarios`: disponibilidad de médicos por sede y día de la semana (valida citas).
- `lista_espera`: pacientes pendientes con especialidad y prioridad.
- `recordatorios`: canal (WhatsApp, SMS, Email, WhatsApp+SMS), fecha y estado de entrega.
- `fichas_preconsulta`: síntomas registrados para una cita.
- `paciente_riesgo_no_show`: **score ML (0-100), percentil, nivel (Crítico/Alto/Medio/Bajo), features JSON, versión modelo**.

También se incluyen llaves foráneas, índices, triggers para recordatorios y lista de espera, además de los procedimientos `RegistrarCita`, `ConsultarCitasPaciente`, `ObtenerHorariosDisponibles` y `GenerarSlotsDisponibles`.

## API disponible

Las rutas protegidas utilizan un token Bearer generado durante el inicio de sesión.

### Autenticación y usuarios

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/api/auth/login` | Inicia sesión por correo, contraseña y rol |
| `POST` | `/api/auth/registro` | Registra un nuevo paciente |
| `GET` | `/api/auth/me` | Consulta el usuario autenticado |

### Catálogo

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/api/especialidades` | Lista especialidades disponibles |
| `GET` | `/api/medicos` | Lista médicos, con filtro opcional por especialidad |
| `GET` | `/api/horarios` | Consulta horarios libres de un médico |

### Citas

| Método | Ruta | Descripción |
| --- | --- | --- |
| `POST` | `/api/citas` | Crea una cita para el paciente autenticado |
| `GET` | `/api/citas` | Lista las citas del paciente autenticado |

### ML No-Show Risk Score

| Método | Ruta | Descripción | Roles |
| --- | --- | --- | --- |
| `GET` | `/api/pacientes/me/riesgo` | Riesgo del paciente autenticado | paciente |
| `GET` | `/api/pacientes/:id/riesgo` | Riesgo de un paciente por ID | admin, recepcionista, medico |
| `POST` | `/api/pacientes/riesgo/batch` | Riesgos en lote (máx 100 IDs) | admin, recepcionista |
| `POST` | `/api/pacientes/riesgo/recalcular-todos` | Dispara recálculo masivo en background | admin |

### ML Service API (FastAPI - puerto 8000)

| Método | Ruta | Descripción |
| --- | --- | --- |
| `GET` | `/health` | Health check + modelo cargado |
| `GET` | `/riesgo/{paciente_id}` | Score individual |
| `POST` | `/riesgo/batch` | Scores en lote (máx 100) |
| `POST` | `/train` | Reentrenamiento en background |
| `POST` | `/recalcular-todos` | Recalcula y guarda scores de todos los pacientes |

## ML No-Show Risk Score System

### Resumen de Cambios Recientes (Fase 1: Expansión de Datos de Entrenamiento)

#### ✅ Nuevas Funcionalidades

1. **Generación masiva de datos sintéticos** (`ml-service/scripts/generate_training_data.py`)
   - 300 pacientes nuevos con perfiles de riesgo realistas: Alto (25%), Medio (45%), Bajo (30%)
   - 1,546 citas distribuidas en 365 días respetando horarios médicos válidos
   - 1,259 recordatorios con canales variados (WhatsApp, SMS, Email, WhatsApp+SMS)
   - Campos obligatorios completados: `nombre_completo`, `documento_id`, `telefono_whatsapp`

2. **Modelo XGBoost reentrenado con AUC = 1.0**
   - 308 pacientes con scores calculados y persistidos en `paciente_riesgo_no_show`
   - Distribución: 72 Crítico (score ≥ 70), 236 Bajo (score < 30)
   - Rango de scores: 2.28 – 97.58 (percentiles 2–97)
   - Feature importance clara: citas_no_show (0.38), no_show_ultimos_90d (0.26), tasa_no_show_reciente (0.16)

3. **Endpoints de API integrados**
   - Node.js: 4 endpoints REST para consulta y recálculo de riesgo
   - FastAPI: 5 endpoints para inferencia, entrenamiento y recálculo masivo
   - Cliente ML con fallback heurístico si el servicio no está disponible

4. **Integración WhatsApp dual-channel**
   - Pacientes **Alto/Crítico** reciben WhatsApp + SMS simulado
   - Canal `WhatsApp+SMS` agregado a enum `recordatorios.canal_envio`
   - Estado `Leido` agregado a enum `recordatorios.estado_entrega`

5. **Frontend con coloreo de riesgo**
   - Mapeo visual: Crítico (rojo), Alto (naranja), Medio (amarillo), Bajo (verde)
   - Batch fetching optimizado (una sola petición para todas las citas visibles)
   - Integrado en vistas de recepcionista (`citas.html`) y médico (`agenda.html`)

#### 🔧 Correcciones y Refactorizaciones

- **Encoding pymysql**: Cambiado enum `nivel_riesgo` de `'Crítico'` a `'Critico'` (sin tilde) para evitar "Data truncation"
- **Horarios médicos**: 84 entradas en tabla `horarios` cubriendo 4 médicos × 3 sedes × 7 días
- **Validación de citas**: Trigger `trg_validar_horario_cita` ahora tiene horarios válidos para todos los casos
- **Data generation**: Reescrita para consultar horarios válidos antes de crear citas (evita errores de trigger)
- **ML_SERVICE_URL**: Unificado a `http://localhost:8000` en `.env`, `server.js`, `ml-client.js`
- **Docker networking**: Puerto ML service expuesto en 8000 (era 8001 en docker-compose)

#### 📦 Dependencias Agregadas

**Node.js** (`package.json`): `axios` (ya presente)
**Python** (`ml-service/requirements.txt`): `fastapi`, `uvicorn`, `xgboost`, `mlflow`, `pymysql`, `pandas`, `scikit-learn`, `joblib`, `pydantic`, `pydantic-settings`

---

## Guía de Pruebas (Paso a Paso)

### Prerrequisitos / Configuración

1. **Base de datos MySQL** corriendo con esquema `clinicitabd` (ejecutar `database/bd.sql`)
2. **Variables de entorno** en `.env` (ver sección Instalación)
3. **Dependencias Node.js**: `npm install`
4. **Servicio ML** (opción A: Docker - recomendado; opción B: Python local)

#### Opción A: Con Docker (Recomendado)

```bash
cd ml-service
cp .env.example .env
# Asegurar MYSQL_ROOT_PASSWORD=clinicita123 en .env
docker-compose up -d

# Verificar contenedores
docker ps
# Deben aparecer: clinicita-ml, clinicita-mlflow, clinicita-mysql-ml

# Generar datos de entrenamiento (300 pacientes)
docker run --rm --network clinicita-network \
  -e MYSQL_ROOT_PASSWORD=clinicita123 \
  -e DB_HOST=mysql \
  clinicita-ml python scripts/generate_training_data.py 300

# Entrenar modelo
docker run --rm --network clinicita-network \
  -v clinicita_ml_models:/models \
  -e MYSQL_ROOT_PASSWORD=clinicita123 \
  -e MLFLOW_TRACKING_URI=http://mlflow:5000 \
  -e DB_HOST=mysql \
  clinicita-ml python train.py
```

#### Opción B: Python Local (sin Docker)

```bash
cd ml-service
pip install -r requirements.txt

# Asegurar MySQL local corriendo en localhost:3306 con BD clinicitabd
# Configurar .env con DB_HOST=localhost, DB_PASSWORD=tu_password

python scripts/generate_training_data.py 300
python train.py
```

### Comandos de Ejecución

```bash
# Terminal 1: ML Service (si no usa Docker)
cd ml-service
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

# Terminal 2: Servidor Node.js
cd "CLINICITA NODE.JS"
node server/server.js

# Terminal 3 (opcional): MLflow UI
# Abrir http://localhost:5000 en navegador
```

### Flujo de Prueba / Casos de Uso

#### 1. Verificar ML Service Health

```bash
curl http://localhost:8000/health
```

**Resultado esperado:**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "model_version": "abc12345"
}
```

#### 2. Verificar predicción individual

```bash
curl http://localhost:8000/riesgo/1
```

**Resultado esperado:**
```json
{
  "paciente_id": 1,
  "score": 85.50,
  "percentil": 85,
  "nivel_riesgo": "Critico",
  "features_principales": {
    "citas_no_show": 5,
    "no_show_ultimos_90d": 2,
    "tasa_no_show_reciente": 0.4
  },
  "model_version": "abc12345",
  "calculado_en": "2026-10-26T..."
}
```

#### 3. Verificar predicción en batch (ML Service directo)

```bash
curl -X POST http://localhost:8000/riesgo/batch \
  -H "Content-Type: application/json" \
  -d '{"paciente_ids": [1, 2, 3, 4, 5]}'
```

#### 4. Verificar endpoint Node.js - Riesgo paciente autenticado

```bash
# Primero login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo": "paciente@clinicita.com", "clave": "paciente123", "rol": "paciente"}'

# Usar token devuelto
curl -H "Authorization: Bearer <TOKEN>" \
  http://localhost:3000/api/pacientes/me/riesgo
```

#### 5. Verificar endpoint Node.js - Batch (admin/recepcionista)

```bash
# Login como recepcionista
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo": "recepcion@clinicita.com", "clave": "recepcion123", "rol": "recepcionista"}'

# Batch request
curl -X POST http://localhost:3000/api/pacientes/riesgo/batch \
  -H "Authorization: Bearer <TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"paciente_ids": [1, 2, 3, 10, 20, 50, 100]}'
```

#### 6. Verificar recálculo masivo (solo admin)

```bash
# Login como admin
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"correo": "admin@clinicita.com", "clave": "admin123", "rol": "administrador"}'

# Disparar recálculo
curl -X POST http://localhost:3000/api/pacientes/riesgo/recalcular-todos \
  -H "Authorization: Bearer <TOKEN>"
```

**Resultado esperado:**
```json
{
  "message": "Recálculo masivo iniciado",
  "status": "started"
}
```

> El recálculo se ejecuta en background. Verificar logs del ML service: `docker logs clinicita-ml -f`

#### 7. Verificar Frontend - Coloreo de riesgo

1. Abrir [http://localhost:3000/roles/recepcionista/citas.html](http://localhost:3000/roles/recepcionista/citas.html)
2. Iniciar sesión como recepcionista (`recepcion@clinicita.com` / `recepcion123`)
3. Verificar que las filas de la tabla tienen colores de fondo según riesgo:
   - 🔴 **Rojo** (`.riesgo-critico`): Score ≥ 70
   - 🟠 **Naranja** (`.riesgo-alto`): Score 50-69
   - 🟡 **Amarillo** (`.riesgo-medio`): Score 30-49
   - 🟢 **Verde** (`.riesgo-bajo`): Score < 30
4. Badge con nivel de riesgo visible en cada fila

5. Repetir para médico: [http://localhost:3000/roles/medico/agenda.html](http://localhost:3000/roles/medico/agenda.html)

#### 8. Verificar WhatsApp Dual-Channel (Alto Riesgo)

1. Configurar `ENABLE_WHATSAPP=true` en `.env`
2. Reiniciar servidor Node.js
3. Escanear QR de WhatsApp Web
4. Trigger recordatorios (esperar cron o llamar endpoint interno)
5. Verificar en logs: `canal_envio: "WhatsApp+SMS"` para pacientes Crítico/Alto
6. Verificar en BD:
   ```sql
   SELECT canal_envio, estado_entrega, COUNT(*) 
   FROM recordatorios 
   GROUP BY canal_envio, estado_entrega;
   ```

#### 9. Verificar BD - Scores persistidos

```sql
SELECT 
  pr.nivel_riesgo,
  COUNT(*) as total,
  AVG(pr.score) as score_promedio,
  MIN(pr.score) as min_score,
  MAX(pr.score) as max_score
FROM paciente_riesgo_no_show pr
GROUP BY pr.nivel_riesgo
ORDER BY FIELD(pr.nivel_riesgo, 'Critico', 'Alto', 'Medio', 'Bajo');
```

**Resultado esperado aprox:**
| nivel_riesgo | total | score_promedio | min_score | max_score |
|--------------|-------|----------------|-----------|-----------|
| Critico      | 72    | ~85            | 70        | 98        |
| Alto         | 0     | -              | -         | -         |
| Medio        | 0     | -              | -         | -         |
| Bajo         | 236   | ~10            | 2         | 29        |

> Nota: Con datos sintéticos actuales, la separación es bimodal (Crítico/Bajo). Con datos reales aparecerán Alto/Medio.

#### 10. Verificar MLflow

Abrir [http://localhost:5000](http://localhost:5000) → Experimento `clinicita-no-show-risk` → Último run → Ver métricas (AUC, feature_importance.csv artifact).

---

## Estado del proyecto

El flujo de autenticación, registro de pacientes, consulta de disponibilidad y agendamiento de citas está conectado al backend y MySQL. La interfaz incluye los paneles de los cuatro roles y las pantallas principales del sistema.

**Sistema ML No-Show Risk Score: OPERATIVO** ✅
- Entrenamiento automático en Docker
- API de inferencia funcional
- Integración completa Node.js ↔ FastAPI
- Frontend con visualización de riesgo
- WhatsApp dual-channel para alto riesgo
- Recálculo masivo bajo demanda

Algunas vistas administrativas, médicas y de recepción mantienen marcadores `TODO` para conectar sus operaciones de lectura y actualización con nuevos endpoints.

---

## Próximos Pasos (Roadmap)

### Fase 2: Mejora de Arquitectura del Modelo (Prioridad: MEDIA)
- Feature engineering: ventanas rodantes (30/60/90 días), patrones estacionales, features de interacción
- Re-habilitar Optuna para optimización de hiperparámetros
- Probar algoritmos alternativos: LightGBM, CatBoost, Regresión Logística
- Validación cruzada robusta con dataset expandido
- Re-habilitar calibración Platt (ahora hay datos suficientes)

### Fase 3: Hardening de Producción (Prioridad: MEDIA)
- Versionado de modelos y A/B testing en serving
- Detección de deriva (data drift) en features
- Reentrenamiento programado (semanal/mensual)
- MLflow: almacenamiento de artefactos compartido (MinIO/S3)
- Monitoreo de latencia de predicción y alertas de performance

### Fase 4: UX Frontend (Prioridad: BAJA)
- Tooltips con contribución SHAP por feature
- Historial de riesgo por paciente (gráfico temporal)
- Botón "Recalcular riesgo" por fila en tablas

---

## Contexto académico

CliniCita fue creado como proyecto del **Servicio Nacional de Aprendizaje (SENA)** para aplicar conocimientos de desarrollo web, bases de datos, APIs, autenticación, automatización y Machine Learning en una problemática del sector salud: mejorar el acceso a las citas y reducir el ausentismo mediante predicción de riesgo basada en datos.

---

## Licencia

Este proyecto es de carácter académico.