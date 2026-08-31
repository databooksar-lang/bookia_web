const CALLBACK_MESSAGES = {
  success: "Google Sheets quedó conectada y el catálogo se sincronizó.",
  invalid: "No pudimos validar la conexión con Google Sheets. Intentá nuevamente.",
  failed: "Google Sheets quedó conectada, pero no pudimos importar la hoja Catalogo. Revisá su formato.",
  reconnect: "La autorización dejó de ser válida. Volvé a conectar Google Sheets.",
  billing_required: "Regularizá la suscripción para conectar Google Sheets y administrar el catálogo.",
};


export function getGoogleSheetsCallbackMessage(result) {
  return CALLBACK_MESSAGES[result] || "";
}


export function getGoogleSheetsViewState(status) {
  if (!status?.connected) return { kind: "disconnected", label: "Sin conectar" };
  if (status.status === "reconnect_required") return { kind: "reconnect_required", label: "Requiere conexión" };
  if (status.last_sync_status === "failed") return { kind: "partial", label: "Revisar sincronización" };
  return { kind: "connected", label: "Conectada" };
}


export function formatGoogleSheetsDate(value) {
  if (!value) return "Todavía no realizada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-AR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}


export function formatNextGoogleSheetsSync(value) {
  if (!value) return "Todavía no programada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: "America/Argentina/Buenos_Aires",
  }).format(date);
}
