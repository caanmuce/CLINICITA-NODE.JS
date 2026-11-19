# Implementation Plan - Correcciones de Prioridad Media (Tareas 6, 7, 8 y 9)

Eliminar el target data leakage migrando el modelo predictivo a granularidad nivel cita con manejo de cold start, unificar zonas horarias a `America/Bogota` (-05:00), activar el clasificador LLM con fallback resiliente en WhatsApp, y blindar los endpoints del servicio ML con autenticación `X-API-Key` y bloqueos de concurrencia `asyncio.Lock`.

---

## [Overview]
Este plan aborda cuatro componentes críticos de la arquitectura del sistema CliniCita. En primer lugar, se unificará la zona horaria en el pool MySQL de Node.js, en la base de datos de Docker Compose y en los cronjobs de WhatsApp para evitar desfases de 5 horas entre citas y recordatorios. En segundo lugar, se conectará el clasificador LLM (`OmniRoute`) en el pipeline de mensajería de WhatsApp mediante un patrón LLM-first con timeout acotado (5s) y degradación elegante hacia regex local. En tercer lugar, se asegurará la comunicación interna entre Node.js y FastAPI mediante un header `X-API-Key` con secretos sincronizados en Docker Compose y se implementarán bloqueos asíncronos (`asyncio.Lock`) en FastAPI para retornar `409 Conflict` ante peticiones concurrentes de reentrenamiento o recálculo masivo. Finalmente, se refactorizará el feature engineering y entrenamiento en `ml-service` para estructurar el dataset a nivel de cita histórica (`Completada`=0 vs `No-Asistio`=1) con filtrado temporal estricto que elimina el AUC artificial de 1.0, e introduciendo `LEFT JOIN` con valores base para resolver el problema de Cold Start para pacientes nuevos.

---

## [Types]
- **FastAPI / Pydantic (`ml-service/app/schemas.py`)**:
  - `RiskResponse`: Mantiene la firma actual de respuesta (`paciente_id`, `score`, `percentil`, `nivel_riesgo`, `features_principales`, `model_version`, `calculado_en`) asegurando retrocompatibilidad total con el frontend y `ml-client.js`.
  - Códigos de error HTTP tipados:
    - `401 Unauthorized`: API Key ausente o inválida en endpoints protegidos.
    - `404 Not Found`: Solo cuando el `paciente_id` no existe en la tabla `pacientes` (no para pacientes sin historial).
    - `409 Conflict`: Cuando `/train` o `/recalcular-todos` se invocan mientras ya existe una tarea activa en ejecución.
- **Node.js / WhatsApp (`server/servicios/whatsapp.js`)**:
  - Estructura normalizada de clasificación:
    ```javascript
    {
      intencion: "CONFIRMAR" | "CANCELAR" | "SINTOMAS" | "OTRO",
      sintomas_detalles: string
    }
    ```

---

## [Files]

### Archivos a Modificar:
1. `docker-compose.yml`:
   - Añadir `TZ: ${TZ:-America/Bogota}` en los servicios `mysql`, `ml-service` y `backend`.
   - Añadir `ML_SERVICE_SECRET_KEY: ${ML_SERVICE_SECRET_KEY:-clinicita-ml-secret-key}` en los servicios `ml-service` y `backend`.
2. `.env.example` y `.env.docker.example`:
   - Documentar `ML_SERVICE_SECRET_KEY` y `TZ`.
3. `server/conexion.js`:
   - Configurar `timezone: process.env.CLINIC_UTC_OFFSET || "-05:00"` en las opciones del pool `mysql.createPool`.
   - Ejecutar `SET time_zone = '-05:00'` en el evento `"connection"` del pool para garantizar que `NOW()`, `CURDATE()` y funciones temporales evalúen siempre en la hora local de Bogotá.
4. `server/servicios/whatsapp.js`:
   - En `enviarRecordatorios`: asegurar que la ventana horaria `TIMESTAMP(c.fecha_cita, c.hora_cita) BETWEEN NOW() AND DATE_ADD(NOW(), INTERVAL 24 HOUR)` opere de manera consistente con la zona horaria unificada.
   - En `procesarMensaje`: implementar clasificador LLM-first con timeout controlado (5000 ms) vía `Promise.race` invocando `omniRoute.clasificar(consulta)`.
   - Degradar a `clasificarLocal(consulta)` ante timeout, error de red o intención `"OTRO"`.
   - Enrutar intenciones (`CONFIRMAR`, `CANCELAR`, `SINTOMAS`) a sus respectivos flujos.
5. `server/services/ml-client.js`:
   - Inyectar el header `X-API-Key: process.env.ML_SERVICE_SECRET_KEY || "clinicita-ml-secret-key"` en la instancia de `axios.create`.
6. `ml-service/app/config.py`:
   - Agregar el campo `ml_service_secret_key: Optional[str] = "clinicita-ml-secret-key"` a la clase `Settings`.
7. `ml-service/app/main.py`:
   - Crear dependencia FastAPI `verify_api_key` utilizando `APIKeyHeader(name="X-API-Key")`.
   - Aplicar `dependencies=[Depends(verify_api_key)]` en `/train`, `/recalcular-todos`, `/riesgo/{paciente_id}` y `/riesgo/batch`. Dejar `/health` público.
   - Definir `training_lock = asyncio.Lock()` y `recalculate_lock = asyncio.Lock()`.
   - En `/train`: verificar `if training_lock.locked(): raise HTTPException(409, "Ya hay un entrenamiento en curso")`. Ejecutar tarea en background adquiriendo `async with training_lock`.
   - En `/recalcular-todos`: verificar `if recalculate_lock.locked(): raise HTTPException(409, "Ya hay un recálculo en curso")`. Ejecutar tarea en background adquiriendo `async with recalculate_lock`.
   - En `/riesgo/{paciente_id}`: verificar existencia del paciente; si existe pero no tiene citas previas, retornar predicción cold-start con score base sin lanzar 404. Solo lanzar 404 si el paciente no existe en la base de datos.
8. `ml-service/app/features/builder.py`:
   - Reescribir consulta SQL base con `pacientes p LEFT JOIN citas c ... LEFT JOIN recordatorios r` para resolver Cold Start.
   - Implementar método `build_training_dataset()` a nivel cita:
     - Selección de citas con resultado conocido: `c.estado IN ('Completada', 'No-Asistio')`.
     - Para cada cita $C_i$ del paciente $P$, calcular métricas históricas de $P$ considerando **únicamente** registros anteriores a la fecha y hora de $C_i$ (`fecha_cita < C_i.fecha_cita`).
     - Features históricas: `total_citas_previas`, `citas_completadas_previas`, `citas_no_show_previas`, `citas_canceladas_previas`, `tasa_no_show_historica`, `tasa_cancelacion_historica`, `tasa_completada_historica`, `racha_no_show_actual`, `dias_desde_ultima_cita`, `wa_tasa_confirmacion_historica`.
     - Features propias de la cita: `antelacion_dias` (`(fecha_cita - fecha_creacion).days`), `dia_semana`, `es_fin_de_semana`, `hora_cita_num`, `es_manana`, `especialidad`, `medico_id`, `sede_id`.
     - Features de paciente: `edad`, `genero`, `tiene_lid`, `es_paciente_nuevo`.
   - Implementar método `build_patient_features(paciente_ids)` para inferencia:
     - Si el paciente tiene citas previas, calcula su historial hasta `now`.
     - Si el paciente tiene una próxima cita agendada, utiliza las características de esa cita.
     - Si el paciente es nuevo (0 citas) o no tiene cita futura agendada, asigna valores por defecto (`es_paciente_nuevo = 1`, `antelacion_dias = 7.0`, `dia_semana = 2`, `hora_cita_num = 10.0`, tasas = 0).
9. `ml-service/app/model/trainer.py`:
   - Utilizar el dataset a nivel cita generado por `builder.build_training_dataset()`.
   - Definir `target = 1` si `estado == 'No-Asistio'` y `target = 0` si `estado == 'Completada'`.
   - Entrenar modelo XGBoost sobre el nuevo conjunto de features no sesgado (eliminando features circulares de los últimos 90 días).
   - Persistir en el artefacto `.pkl`: modelo, nombres de features, metadatos y codificadores categóricos necesarios.
10. `ml-service/app/model/predictor.py`:
    - Ajustar la predicción para asegurar que imputa valores por defecto consistentes con el nuevo conjunto de features a nivel cita y maneja `es_paciente_nuevo`.

---

## [Functions]

### Nuevas Funciones:
- `server/servicios/whatsapp.js`:
  - `async function clasificarConFallback(consulta, clasificarLLM)`:
    - Ejecuta `clasificarLLM(consulta)` con timeout de 5000 ms mediante `Promise.race`.
    - Si el LLM retorna intención válida distinta de `OTRO`, la devuelve.
    - Si ocurre timeout, error o intención `OTRO`, ejecuta `clasificarLocal(consulta)`.
- `ml-service/app/main.py`:
  - `async def verify_api_key(api_key: Optional[str] = Security(api_key_header)) -> str`:
    - Valida que `api_key == settings.ml_service_secret_key`. Lanza `HTTPException(401, "API Key inválida o ausente")` si no coincide.
- `ml-service/app/features/builder.py`:
  - `def build_training_dataset(self) -> pd.DataFrame`:
    - Construye el dataset de entrenamiento a nivel de cita histórica con temporalidad estricta y sin filtración de futuro.
  - `def _compute_appointment_features(self, target_cita: pd.Series, prior_citas: pd.DataFrame, paciente_info: pd.Series) -> Dict[str, Any]`:
    - Calcula las features de una cita objetivo usando exclusivamente citas previas.

### Funciones Modificadas:
- `server/conexion.js`:
  - `conexion = mysql.createPool(...)`: añade propiedad `timezone: process.env.CLINIC_UTC_OFFSET || "-05:00"`.
  - `conexion.on("connection", ...)`: ejecuta `SET time_zone = '-05:00'`.
- `server/servicios/whatsapp.js`:
  - `procesarMensaje(...)`: reemplaza la invocación estática de regex por `clasificarConFallback`. Si se detecta intención `CONFIRMAR` o `CANCELAR`, procesa directamente la cita. Si se detecta `SINTOMAS`, enruta a preconsulta.
- `server/services/ml-client.js`:
  - `constructor()`: añade header `X-API-Key` con el valor de `process.env.ML_SERVICE_SECRET_KEY`.
- `ml-service/app/main.py`:
  - `get_riesgo(paciente_id)`: añade dependencia de seguridad `verify_api_key`. Maneja cold start de forma segura sin lanzar 404 para pacientes registrados sin historial.
  - `get_riesgo_batch(request)`: añade dependencia de seguridad `verify_api_key`.
  - `train_model(...)`: añade dependencia de seguridad `verify_api_key` y bloqueo `training_lock` con retorno 409 si está ocupado.
  - `recalcular_todos(...)`: añade dependencia de seguridad `verify_api_key` y bloqueo `recalculate_lock` con retorno 409 si está ocupado.
- `ml-service/app/features/builder.py`:
  - `build_features(self, paciente_ids)`: refactorizada con `LEFT JOIN` para extraer información a nivel paciente utilizando su próxima cita agendada o valores por defecto seguros.
- `ml-service/app/model/trainer.py`:
  - `prepare_training_data(self)`: migra de agregación por paciente con target 90d a citas históricas unitarias con temporalidad estricta.
  - `train(self)`: entrena con las nuevas variables independientes sin target leakage.
- `ml-service/app/model/predictor.py`:
  - `predict(self, features)`: garantiza que las nuevas variables (`es_paciente_nuevo`, `tasa_no_show_historica`, etc.) se mapeen y predigan correctamente.

---

## [Classes]
- `FeatureBuilder` (`ml-service/app/features/builder.py`):
  - Modificada para soportar construcción a nivel cita temporal (`build_training_dataset`) y construcción orientada a inferencia de pacientes (`build_features`).
- `ModelTrainer` (`ml-service/app/model/trainer.py`):
  - Adaptada para consumir dataset a nivel cita histórica (`cita_id`).
- `MLClient` (`server/services/ml-client.js`):
  - Configura el cliente Axios con `headers: { "X-API-Key": process.env.ML_SERVICE_SECRET_KEY }`.

---

## [Dependencies]
- No se requieren librerías externas adicionales. Las dependencias actuales (`fastapi`, `xgboost`, `pandas`, `mysql2`, `axios`, `dotenv`) cubren todos los requerimientos técnicos.

---

## [Testing]
1. **Validación de Sintaxis y Linting**:
   - `npm run check:node` (Node.js syntax check en `server.js`, `conexion.js`, `ml-client.js`, `whatsapp.js`).
   - `npm run check:python` (Python py_compile en todos los módulos de `ml-service`).
2. **Validación de Conectividad y Zona Horaria**:
   - Comprobar que el pool de MySQL aplica `-05:00` y `NOW()` coincide con la hora local.
3. **Validación de Seguridad y Concurrencia**:
   - Verificar rechazo con `401 Unauthorized` si no se envía `X-API-Key` o si es incorrecta en `/riesgo/{id}`, `/train` y `/recalcular-todos`.
   - Verificar que peticiones simultáneas a `/train` o `/recalcular-todos` retornan `409 Conflict`.
4. **Validación de ML (Eliminación de Leakage y Cold Start)**:
   - Paciente nuevo sin citas registrado en `pacientes`: `GET /riesgo/{nuevo_id}` debe responder `200 OK` con score base en lugar de `404 Not Found`.
   - `paciente_id` inexistente en la BD: debe responder `404 Not Found`.
   - Reentrenamiento del modelo: AUC resultante debe ser realista (< 1.0) sin dependencia circular de `no_show_ultimos_90d`.

---

## [Implementation Order]

### Fase 1: Integración, Zona Horaria y Seguridad (Tareas 7, 8 y 9)
1. **Paso 1.1 (Tarea 7):** Unificar zona horaria en `docker-compose.yml`, `server/conexion.js` y verificar cron de recordatorios en `server/servicios/whatsapp.js`.
2. **Paso 1.2 (Tarea 9):** Configurar `ML_SERVICE_SECRET_KEY` en `docker-compose.yml`, `ml-service/app/config.py` y `server/services/ml-client.js`.
3. **Paso 1.3 (Tarea 9):** Implementar dependencia de seguridad `X-API-Key` y bloqueos de concurrencia `asyncio.Lock` en `ml-service/app/main.py`.
4. **Paso 1.4 (Tarea 8):** Implementar clasificador LLM-first con timeout controlado y fallback resiliente en `server/servicios/whatsapp.js`.

### Fase 2: Pipeline ML, Feature Engineering y Eliminación de Leakage (Tarea 6)
5. **Paso 2.1 (Tarea 6):** Refactorizar `ml-service/app/features/builder.py` con `LEFT JOIN` para cold start y método de dataset histórico a nivel cita con ordenamiento temporal estricto.
6. **Paso 2.2 (Tarea 6):** Actualizar `ml-service/app/model/trainer.py` para entrenar sobre citas históricas unitarias y eliminar el target leakage.
7. **Paso 2.3 (Tarea 6):** Actualizar `ml-service/app/model/predictor.py` y endpoints en `ml-service/app/main.py` para alinear inferencia y responder exitosamente ante cold start.
8. **Paso 2.4 (Validación):** Ejecutar scripts de verificación (`check:node`, `check:python`, `docker compose config --quiet`).

