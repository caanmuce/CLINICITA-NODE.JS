# Implementation Plan — Tareas Prioridad Baja (10, 11, 12)

Persistir el estado conversacional del bot en MySQL con TTL, añadir Circuit Breaker liviano en ml-client.js y crear un módulo SMS multi-proveedor (`mock`, `android_gateway`, `twilio`).

---

## [Overview]

Las tres tareas eliminan puntos únicos de fallo y comportamientos efímeros en CliniCita. La **Tarea 10** sustituye los `Map()` en memoria de `whatsapp.js` por la tabla MySQL `whatsapp_sesiones`, con TTL por fila y limpieza en el cron existente (sin Redis). La **Tarea 11** añade un Circuit Breaker de tres estados (`CLOSED → OPEN → HALF_OPEN`) en `ml-client.js` sin dependencias externas: tras 3 fallos de red/5xx abre durante 30 s, retornando fallback inmediato; `HALF_OPEN` permite una petición de prueba. La **Tarea 12** mueve `enviarSMS` fuera de `whatsapp.js` hacia `server/servicios/sms.js` con tres proveedores configurables por env var.

Contexto técnico (inspección):
- `whatsapp.js`: 1 036 líneas, exporta `{ iniciarWhatsApp, clasificarConFallback, normalizarClasificacion }`. `conversaciones` y `autorizacionesRecordatorio` son Map globales del módulo. `guardarConversacion`/`obtenerConversacion` síncronos. Cron `"* * * * *"` llama a `enviarRecordatorios`. `enviarSMS` es función interna.
- `ml-client.js`: singleton `mlClient`, usa axios con timeout 5 000 ms sin `AbortSignal`. Sin circuit breaker.
- `server.js`: `initializeAuth()` ejecuta DDL idempotente `CREATE TABLE IF NOT EXISTS`.
- Node.js 24.20.0: `fetch` global nativo, `AbortSignal.timeout` nativo.


## [Types]

- **Sesiones MySQL**: tabla `whatsapp_sesiones` con `chat_id VARCHAR(255)` como clave primaria, `tipo ENUM('conversacion','autorizacion')`, `payload JSON`, `expira_en DATETIME NOT NULL`, y `actualizado_en TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`.
- **Circuit Breaker**: estados internos `CLOSED`, `OPEN`, `HALF_OPEN`; umbral 3 fallos consecutivos de red/5xx, cooldown de 30 000 ms. HTTP 404 y 409 no incrementan el contador.
- **Resultado SMS**: `{ enviado: boolean, proveedor: 'mock'|'android_gateway'|'twilio', id: string|null, error: string|null }`. `whatsapp.js` consume `resultado.enviado` para determinar éxito/fallo del recordatorio.

---

## [Files]

### Nuevo
- `server/servicios/sms.js`: módulo asíncrono multi-proveedor; exporta `enviarSMS({ pacienteId, citaId, telefono, mensaje })`, normalizador de teléfono y adaptadores `mock`, `android_gateway`, `twilio`; sin dependencias adicionales.

### Modificaciones
1. `database/bd.sql`: crear `whatsapp_sesiones` en el esquema inicial y añadir al final el `CREATE TABLE IF NOT EXISTS` ejecutable en bases desplegadas.
2. `server/server.js`: añadir DDL idempotente dentro de `initializeAuth()`; las migraciones existentes se ejecutan ahí en el arranque.
3. `server/servicios/whatsapp.js`: reemplazar persistencia de ambos Maps por helpers MySQL TTL; convertir las funciones de sesión/autorización en async y propagar `query`; limpiar expiradas desde el cron de recordatorios; delegar SMS al módulo nuevo. Mantener las exportaciones públicas existentes sin cambios.
4. `server/services/ml-client.js`: añadir estado/contadores/timestamp del circuito, wrapper para apertura/cooldown/half-open, fallbacks inmediatos y `AbortSignal.timeout` en todas las llamadas HTTP.
5. `docker-compose.yml`: añadir al servicio `backend` `SMS_PROVIDER`, `SMS_GATEWAY_URL`, `SMS_GATEWAY_USER`, `SMS_GATEWAY_PASSWORD` con los defaults solicitados.
6. `.env.example` y `.env.docker.example`: documentar variables SMS sin credenciales reales.
7. `package.json`: añadir `server\\servicios\\sms.js` al script `check:node`.


---

## [Functions]

### Nuevas funciones
- `server/servicios/whatsapp.js` — `_sesionLeer(query, chatId, tipo)`: consulta únicamente fila vigente (`expira_en > NOW()`), parsea JSON y devuelve `null` si no existe.
- `server/servicios/whatsapp.js` — `_sesionEscribir(query, chatId, tipo, payload, ttlMs)`: UPSERT en MySQL con expiración calculada desde TTL.
- `server/servicios/whatsapp.js` — `_limpiarSesionesExpiradas(query)`: ejecuta `DELETE FROM whatsapp_sesiones WHERE expira_en <= NOW()`.
- `server/services/ml-client.js` — `_esFalloDeCircuito(error)`: true ante fallo de red/timeout o HTTP 5xx; excluye 404 y 409.
- `server/services/ml-client.js` — `_llamada(fn, fallback)`: controla transición del circuito y retorna inmediatamente fallback al estar OPEN. HALF_OPEN admite una única prueba concurrente.
- `server/servicios/sms.js` — `normalizarTelefonoSMS(telefono)`: elimina `@c.us`, espacios y caracteres de formato; agrega `+57` a un número colombiano de 10 dígitos que empieza por 3.
- `server/servicios/sms.js` — `enviarSMS({ pacienteId, citaId, telefono, mensaje })`: despacha según `SMS_PROVIDER`, captura fallos de proveedores y devuelve el resultado estructurado.
- `server/servicios/sms.js` — `_enviarAndroidGateway(...)`: POST JSON a `${SMS_GATEWAY_URL}/message`, Basic Auth, payload del Android SMS Gateway y `AbortSignal.timeout(8000)`.
- `server/servicios/sms.js` — `_enviarTwilio(...)`: POST form-urlencoded a Twilio Messages API, Basic Auth `SID:AUTH_TOKEN` y timeout 8 000 ms.

### Funciones modificadas
- `whatsapp.js`: `guardarConversacion` y `obtenerConversacion` se vuelven async y aceptan `query`; todo `procesarMensaje` debe esperar (`await`) las lecturas/escrituras de sesión.
- `whatsapp.js`: `puedeResponderEnPruebas` y comprobaciones de autorización migran a sesión MySQL tipo `autorizacion`; ventana de autorización conserva 24 h.
- `whatsapp.js`: `enviarRecordatorios` hace limpieza TTL en el cron y usa `const sms = await enviarSMS(...)`, `enviadoSMS = sms.enviado`.
- `ml-client.js`: `getRiesgo` conserva fallback heurístico; `getRiesgoBatch` conserva fallback individual; `recalcularTodos` conserva firma/exportación y propaga `409` controlado. Todas las peticiones incluirán `signal: AbortSignal.timeout(ML_TIMEOUT)`.

### Funciones eliminadas
- Eliminar los Maps `conversaciones` y `autorizacionesRecordatorio` y la función síncrona `programarLimpiezaConversaciones` (el cron MySQL será el único limpiador TTL).
- Eliminar `enviarSMS` interna de `whatsapp.js`; su implementación y despacho pasan al nuevo módulo `sms.js`.

---

## [Classes]
- `MLClient` (`server/services/ml-client.js`): conserva el contrato público y añade propiedades de circuito (`_cbState`, `_cbFailures`, `_cbOpenedAt`, `_cbProbeInFlight`) y métodos internos de resiliencia.
- No se añaden clases para sesiones ni SMS; se usan los helpers/funciones ya descritos para mantener el estilo actual.


---

## [Dependencies]
No se añaden dependencias externas: se utilizará `fetch` y `AbortSignal.timeout` de Node.js 24, `mysql2` ya instalado y `axios` ya instalado.

---

## [Testing]
1. Ejecutar `npm run check:node` y añadir `node --check server\\servicios\\sms.js` al script.
2. **Sesiones**: comprobar persistencia del flujo tras reinicio del backend; `obtenerConversacion` debe leer desde MySQL; comprobar que `expira_en <= NOW()` se elimina en el siguiente cron.
3. **Circuit Breaker**: simular 3 fallos de red/5xx y confirmar fallback inmediato; tras 30 s confirmar prueba HALF_OPEN y cierre tras éxito. HTTP 404/409 no cuentan como fallos.
4. **SMS**: `mock` retorna `enviado:true`; Android Gateway envía payload correcto y timeout de 8 s; URL inaccesible retorna `enviado:false` sin abortar el cron; validar `3001234567 → +573001234567`. Twilio construye Basic Auth y form data sin loguear credenciales.
5. Ejecutar `docker compose config --quiet` para validar YAML.

---

## [Implementation Order]
1. Añadir tabla `whatsapp_sesiones` a `database/bd.sql` (esquema inicial y `CREATE TABLE IF NOT EXISTS` migratorio) y al arranque `initializeAuth()` en `server/server.js`.
2. Implementar helpers `_sesionLeer`, `_sesionEscribir`, `_limpiarSesionesExpiradas` en `whatsapp.js`.
3. Reemplazar ambos Maps por sesiones MySQL, convertir operaciones a async y propagar `query`; ejecutar limpieza al inicio del cron y retirar limpieza en memoria.
4. Crear `server/servicios/sms.js` para mock, Android Gateway y Twilio; reemplazar `enviarSMS` interna por delegación y validar `resultado.enviado`.
5. Implementar Circuit Breaker en `ml-client.js`, preservar exportaciones/fallbacks existentes y proteger peticiones con `AbortSignal.timeout`.
6. Añadir variables SMS en `docker-compose.yml`, `.env.example`, `.env.docker.example`; actualizar `package.json` para validar `sms.js`.
7. Validar sintaxis Node, casos de integración controlados y `docker compose config --quiet`.

