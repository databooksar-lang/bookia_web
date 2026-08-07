const ACTIVE_MANAGEMENT_STATES = new Set(["trialing", "active", "grace_period", "cancel_at_period_end"]);
const PAYMENT_ATTENTION_STATES = new Set(["payment_pending", "grace_period", "restricted"]);
const PLAN_CODES = new Set(["base", "plus_ai"]);
const CATALOG_LIMITS = new Set([50, 100, 200]);
const MERCADO_PAGO_HOSTS = ["mercadopago.com", "mercadopago.com.ar"];

const STATUS_LABELS = {
  payment_pending: "Autorización pendiente",
  trialing: "Prueba gratis activa",
  active: "Suscripción activa",
  grace_period: "Pago pendiente",
  restricted: "Suscripción restringida",
  cancel_at_period_end: "Finaliza al cierre del período",
  canceled: "Suscripción cancelada",
};

export function getBillingStatusLabel(status) {
  return STATUS_LABELS[status] || "Estado por confirmar";
}

export function getBillingAccessState(billing) {
  if (!billing) return { canManageCatalog: true, needsPayment: false, catalogIsPublic: true };
  const trialEndsAt = billing.trial_ends_at ? new Date(billing.trial_ends_at) : null;
  const trialIsActive = billing.status === "payment_pending"
    && trialEndsAt instanceof Date
    && !Number.isNaN(trialEndsAt.getTime())
    && trialEndsAt.getTime() > Date.now();
  return {
    canManageCatalog: ACTIVE_MANAGEMENT_STATES.has(billing.status) || trialIsActive,
    needsPayment: PAYMENT_ATTENTION_STATES.has(billing.status),
    catalogIsPublic: billing.status !== "canceled" && (billing.status !== "payment_pending" || trialIsActive),
  };
}

export function buildBillingChangeRequest(planCode, catalogLimit) {
  const normalizedLimit = Number(catalogLimit);
  if (!PLAN_CODES.has(planCode)) throw new Error("El plan seleccionado no es válido.");
  if (!CATALOG_LIMITS.has(normalizedLimit)) throw new Error("La capacidad de catálogo no es válida.");
  return { plan_code: planCode, catalog_limit: normalizedLimit };
}

export function buildBillingCheckoutRequest(payerEmail) {
  const normalized = String(payerEmail || "").trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
    throw new Error("Ingresá un correo válido para autorizar la suscripción en Mercado Pago.");
  }
  return { payer_email: normalized };
}

export function getTrustedMercadoPagoCheckoutUrl(value) {
  let checkoutUrl;
  try {
    checkoutUrl = new URL(value);
  } catch {
    throw new Error("Mercado Pago devolvió una URL de autorización no segura.");
  }

  const hostname = checkoutUrl.hostname.toLowerCase();
  const isTrustedHost = MERCADO_PAGO_HOSTS.some(
    (trustedHost) => hostname === trustedHost || hostname.endsWith(`.${trustedHost}`),
  );
  if (
    checkoutUrl.protocol !== "https:"
    || !isTrustedHost
    || checkoutUrl.port !== ""
    || checkoutUrl.username
    || checkoutUrl.password
  ) {
    throw new Error("Mercado Pago devolvió una URL de autorización no segura.");
  }

  return checkoutUrl.href;
}

export function getBillingReturnState(search = "") {
  const status = new URLSearchParams(search).get("status");
  const reportedFailure = ["failure", "rejected", "cancelled", "canceled"].includes(status);
  return {
    kind: "syncing",
    reportedFailure,
    message: reportedFailure
      ? "Mercado Pago informó que la autorización no terminó; igualmente vamos a confirmar el estado definitivo."
      : "Estamos confirmando tu suscripción con Mercado Pago.",
  };
}

export function formatBillingDate(value) {
  if (!value) return "A confirmar";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "A confirmar";
  return new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "long", year: "numeric" }).format(date);
}

export function formatBillingAmount(value, currency = "ARS") {
  return new Intl.NumberFormat("es-AR", { style: "currency", currency, maximumFractionDigits: 0 }).format(Number(value || 0));
}
