const CALLBACK_MESSAGES = {
  success: "Tiendanube quedó conectada y el catálogo se sincronizó.",
  connected: "Tiendanube quedó conectada y el catálogo se sincronizó.",
  partial: "Tiendanube quedó conectada, pero algunos productos no pudieron importarse.",
  reconnect: "La autorización ya no es válida. Volvé a conectar Tiendanube.",
  failed: "No pudimos completar la conexión con Tiendanube.",
  invalid: "No pudimos validar el intento de conexión. Iniciá el proceso nuevamente.",
  billing_required: "Regularizá la suscripción para conectar Tiendanube y administrar el catálogo.",
};

export function getTiendanubeViewState(status) {
  if (!status?.connected) return { kind: "disconnected", label: "Sin conectar" };
  if (status.status === "reconnect_required") return { kind: "reconnect_required", label: "Requiere reconexión" };
  if (status.status === "partial" || status.last_sync_status === "partial") return { kind: "partial", label: "Sincronización parcial" };
  return { kind: "connected", label: "Conectada" };
}

export function getTiendanubeCallbackMessage(result) {
  return CALLBACK_MESSAGES[result] || "";
}

export function formatIntegrationDate(value) {
  if (!value) return "Todavía no sincronizada";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

export function formatImportedCommerce(item) {
  let price = "Precio no informado";
  if (item?.price !== null && item?.price !== undefined && Number.isFinite(Number(item.price))) {
    price = new Intl.NumberFormat("es-AR", { style: "currency", currency: item.currency || "ARS" }).format(Number(item.price));
  }
  const stock = item?.stock === null || item?.stock === undefined ? "Stock no gestionado" : `${item.stock} en stock`;
  return { price, stock };
}
