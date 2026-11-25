// src/utils/dateUtils.js
// Utilidades de fecha compartidas

// Utilidad para obtener fecha actual en zona horaria Colombia (America/Bogota)
export function getColombiaDate() {
  const ahora = new Date();
  const offset = -5; // Colombia UTC-5 (sin horario de verano)
  const utc = ahora.getTime() + ahora.getTimezoneOffset() * 60000;
  const colombia = new Date(utc + offset * 3600000);
  return colombia.toISOString().split("T")[0];
}
