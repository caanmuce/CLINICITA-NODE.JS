# Implementation Plan

[Overview]
Restore and correct the WhatsApp chatbot response flow and session management by enforcing strict reminder session isolation and ignoring messages from external numbers/users without active pending reminders.

[Types]
N/A (JavaScript/Node.js codebase without TypeScript types).

[Files]
- `c:\Users\caanm\Downloads\CLINICITA NODE.JS\server\servicios\whatsapp.js`:
  - Update `puedeResponderEnPruebas` (or validation logic) to strictly require an active pending reminder associated with the sender's phone number or LID, removing overly permissive fallbacks unless configured or required for valid sessions.
  - Ensure `autorizacionesRecordatorio` or active reminder checks query the database for pending/recent reminders correctly and validate session isolation.
  - Verify event handlers (`client.on("message", ...)`) properly filter out unauthorized/external numbers and isolate conversation state per patient.
  - Ensure bidirectional responses (Confirm, Cancel, Symptoms) correctly map back to the exact appointment and patient ID.

[Functions]
- `puedeResponderEnPruebas(query, telefono, lid, consulta)`: Modify to strictly check active pending reminders in database / authorization map, ignoring unassociated messages unless explicitly permitted by configuration.
- `obtenerCitaDelUltimoRecordatorio(query, telefono, lid)`: Ensure robust matching against active pending reminders (`estado_entrega IN ('Enviado', 'Entregado')` and pending appointment state).
- `procesarMensaje(...)`: Ensure conversation state and message routing are strictly isolated per session/patient.

[Classes]
N/A

[Dependencies]
No new dependencies. Uses existing `whatsapp-web.js`, `node-cron`, MySQL connection.

[Testing]
- Run smoke tests (`npm test` / `node test_server.js`).
- Validate script syntax (`npm run check:node`).

[Implementation Order]
1. Update `c:\Users\caanm\Downloads\CLINICITA NODE.JS\server\servicios\whatsapp.js` to strictly enforce session isolation by reminder and ignore external messages without active reminders.
2. Verify syntax and logic using `npm run check:node`.
3. Review changes and confirm completion.
