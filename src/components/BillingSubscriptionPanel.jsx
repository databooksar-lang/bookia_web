import { useEffect, useState } from "react";

import { apiFetch } from "../api";
import {
  buildBillingChangeRequest,
  formatBillingAmount,
  formatBillingDate,
  getBillingStatusLabel,
  getTrustedMercadoPagoCheckoutUrl,
} from "../billingState";

function redirectToMercadoPago(data) {
  if (!data.checkout_url) {
    throw new Error("La autorización ya fue iniciada. Comprobá el estado del pago.");
  }
  window.location.assign(getTrustedMercadoPagoCheckoutUrl(data.checkout_url));
}

function getBillingDateDetails(billing, isReactivationPending) {
  let label = "Próximo vencimiento";
  if ((billing.status === "payment_pending" && billing.trial_ends_at) || billing.status === "trialing") {
    label = "Fin de la prueba gratis";
  } else if (billing.status === "canceled") {
    label = "Finalizó el";
  } else if (isReactivationPending) {
    label = "Inicio de facturación";
  }

  return {
    label,
    value: isReactivationPending
      ? "Al autorizar"
      : formatBillingDate(billing.current_period_end || billing.trial_ends_at),
  };
}

export function BillingSubscriptionPanel({ initialBilling = null, onBillingChange }) {
  const [billing, setBilling] = useState(initialBilling);
  const [planCode, setPlanCode] = useState(initialBilling?.plan_code || "base");
  const [catalogLimit, setCatalogLimit] = useState(String(initialBilling?.catalog_limit || 50));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  function runAction(action) {
    setBusy(true);
    return action().finally(() => setBusy(false));
  }

  function acceptBilling(nextBilling) {
    setBilling(nextBilling);
    setPlanCode(nextBilling.plan_code);
    setCatalogLimit(String(nextBilling.catalog_limit));
    onBillingChange?.(nextBilling);
    return nextBilling;
  }

  function loadBilling() {
    return apiFetch("/billing/subscription").then(acceptBilling).catch((fetchError) => setError(fetchError.message));
  }

  useEffect(() => { loadBilling(); }, []);

  function authorizePayment() {
    setError("");
    runAction(() => apiFetch("/billing/subscription/checkout", { method: "POST" })
        .then(redirectToMercadoPago)
        .catch((actionError) => setError(actionError.message)));
  }

  function reactivateSubscription(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    runAction(() => {
      let body;
      try {
        body = buildBillingChangeRequest(planCode, catalogLimit);
      } catch (validationError) {
        setError(validationError.message);
        return Promise.resolve();
      }
      return apiFetch("/billing/subscription/reactivate", { method: "POST", body: JSON.stringify(body) })
        .then(acceptBilling)
        .then(() => apiFetch("/billing/subscription/checkout", { method: "POST" }))
        .then(redirectToMercadoPago)
        .catch((actionError) => setError(actionError.message));
    });
  }

  function syncPayment() {
    setError("");
    setMessage("");
    runAction(() => apiFetch("/billing/subscription/sync", { method: "POST" })
        .then(acceptBilling)
        .then(() => setMessage("Actualizamos el estado con Mercado Pago."))
        .catch((actionError) => setError(actionError.message)));
  }

  function scheduleChange(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    runAction(() => {
      let body;
      try {
        body = buildBillingChangeRequest(planCode, catalogLimit);
      } catch (validationError) {
        setError(validationError.message);
        return Promise.resolve();
      }
      return apiFetch("/billing/subscription/change", { method: "POST", body: JSON.stringify(body) })
        .then(acceptBilling)
        .then(() => setMessage("El cambio se aplicará en la próxima renovación, sin prorrateo."))
        .catch((actionError) => setError(actionError.message));
    });
  }

  function cancelRenewal() {
    if (!window.confirm("¿Querés cancelar la renovación? Tu librería seguirá pública hasta el fin del período actual y luego se ocultará.")) return;
    setError("");
    runAction(() => apiFetch("/billing/subscription/cancel", { method: "POST" })
        .then(acceptBilling)
        .then(() => setMessage("La renovación quedó cancelada. Tu librería seguirá pública hasta el fin del período y luego se ocultará."))
        .catch((actionError) => setError(actionError.message)));
  }

  if (!billing) return <p>Cargando suscripción...</p>;
  const canChange = ["trialing", "active", "grace_period"].includes(billing.status);
  const changeIsNoop = planCode === billing.plan_code && Number(catalogLimit) === billing.catalog_limit;
  const isReactivationPending = billing.status === "payment_pending" && !billing.trial_ends_at;
  const billingDate = getBillingDateDetails(billing, isReactivationPending);

  return (
    <div className="billing-panel">
      <div className="billing-summary">
        <div><span>Estado</span><strong>{getBillingStatusLabel(billing.status)}</strong></div>
        <div><span>Plan</span><strong>{billing.plan_code === "plus_ai" ? "Plus AI" : "Base"}</strong></div>
        <div><span>Catálogo</span><strong>Hasta {billing.catalog_limit} libros</strong></div>
        <div><span>Total mensual</span><strong>{formatBillingAmount(billing.total_amount_ars, billing.currency)}</strong></div>
        <div><span>{billingDate.label}</span><strong>{billingDate.value}</strong></div>
      </div>

      {billing.status === "payment_pending" ? <button className="primary-button" type="button" onClick={authorizePayment} disabled={busy}>Confirmar medio de pago</button> : null}
      {isReactivationPending ? <p className="billing-notice">Tu librería sigue oculta. Volverá a publicarse cuando Mercado Pago confirme la autorización.</p> : null}
      {["grace_period", "restricted"].includes(billing.status) ? <button className="secondary-button" type="button" onClick={syncPayment} disabled={busy}>Comprobar pago</button> : null}

      {billing.scheduled_change ? <p className="billing-notice">Próximo cambio: {billing.scheduled_change.plan_code === "plus_ai" ? "Plus AI" : "Base"}, hasta {billing.scheduled_change.catalog_limit} libros, desde el {formatBillingDate(billing.scheduled_change.effective_at)}.</p> : null}

      {canChange ? <form className="billing-change-form" onSubmit={scheduleChange}>
        <h3>Cambiar desde la próxima renovación</h3>
        <label>Plan<select value={planCode} onChange={(event) => setPlanCode(event.target.value)}><option value="base">Base</option><option value="plus_ai">Plus AI</option></select></label>
        <label>Capacidad<select value={catalogLimit} onChange={(event) => setCatalogLimit(event.target.value)}><option value="50">50 libros</option><option value="100">100 libros</option><option value="200">200 libros</option></select></label>
        <button className="secondary-button" type="submit" disabled={busy || changeIsNoop}>Programar cambio</button>
      </form> : null}

      {canChange ? <button className="text-button billing-cancel" type="button" onClick={cancelRenewal} disabled={busy}>Cancelar renovación</button> : null}

      {billing.status === "canceled" ? <form className="billing-change-form" onSubmit={reactivateSubscription}>
        <h3>Reactivar librería</h3>
        <p className="billing-notice">Elegí el plan y la capacidad. La reactivación es paga, sin una nueva prueba gratis, y tu librería volverá a publicarse cuando Mercado Pago confirme la autorización.</p>
        <label>Plan<select value={planCode} onChange={(event) => setPlanCode(event.target.value)}><option value="base">Base</option><option value="plus_ai">Plus AI</option></select></label>
        <label>Capacidad<select value={catalogLimit} onChange={(event) => setCatalogLimit(event.target.value)}><option value="50">50 libros</option><option value="100">100 libros</option><option value="200">200 libros</option></select></label>
        <button className="primary-button" type="submit" disabled={busy}>Reactivar librería</button>
      </form> : null}
      {message ? <p className="feedback success">{message}</p> : null}
      {error ? <p className="feedback error">{error}</p> : null}
    </div>
  );
}
