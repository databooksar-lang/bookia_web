import { useEffect, useState, useTransition } from "react";

import { apiFetch } from "../api";
import {
  buildBillingChangeRequest,
  formatBillingAmount,
  formatBillingDate,
  getBillingStatusLabel,
} from "../billingState";

export function BillingSubscriptionPanel({ initialBilling = null, onBillingChange }) {
  const [billing, setBilling] = useState(initialBilling);
  const [planCode, setPlanCode] = useState(initialBilling?.plan_code || "base");
  const [catalogLimit, setCatalogLimit] = useState(String(initialBilling?.catalog_limit || 50));
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, startTransition] = useTransition();

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
    startTransition(() => {
      apiFetch("/billing/subscription/checkout", { method: "POST" })
        .then((data) => {
          if (!data.checkout_url) throw new Error("La autorización ya fue iniciada. Comprobá el estado del pago.");
          window.location.assign(data.checkout_url);
        })
        .catch((actionError) => setError(actionError.message));
    });
  }

  function syncPayment() {
    setError("");
    setMessage("");
    startTransition(() => {
      apiFetch("/billing/subscription/sync", { method: "POST" })
        .then(acceptBilling)
        .then(() => setMessage("Actualizamos el estado con Mercado Pago."))
        .catch((actionError) => setError(actionError.message));
    });
  }

  function scheduleChange(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    startTransition(() => {
      let body;
      try {
        body = buildBillingChangeRequest(planCode, catalogLimit);
      } catch (validationError) {
        setError(validationError.message);
        return;
      }
      apiFetch("/billing/subscription/change", { method: "POST", body: JSON.stringify(body) })
        .then(acceptBilling)
        .then(() => setMessage("El cambio se aplicará en la próxima renovación, sin prorrateo."))
        .catch((actionError) => setError(actionError.message));
    });
  }

  function cancelRenewal() {
    if (!window.confirm("¿Querés cancelar la renovación? Vas a conservar el acceso hasta el fin del período actual.")) return;
    setError("");
    startTransition(() => {
      apiFetch("/billing/subscription/cancel", { method: "POST" })
        .then(acceptBilling)
        .then(() => setMessage("La renovación quedó cancelada. Conservás el acceso hasta el fin del período."))
        .catch((actionError) => setError(actionError.message));
    });
  }

  if (!billing) return <p>Cargando suscripción...</p>;
  const canChange = ["trialing", "active", "grace_period"].includes(billing.status);

  return (
    <div className="billing-panel">
      <div className="billing-summary">
        <div><span>Estado</span><strong>{getBillingStatusLabel(billing.status)}</strong></div>
        <div><span>Plan</span><strong>{billing.plan_code === "plus_ai" ? "Plus AI" : "Base"}</strong></div>
        <div><span>Catálogo</span><strong>Hasta {billing.catalog_limit} libros</strong></div>
        <div><span>Total mensual</span><strong>{formatBillingAmount(billing.total_amount_ars, billing.currency)}</strong></div>
        <div><span>Próximo vencimiento</span><strong>{formatBillingDate(billing.current_period_end || billing.trial_ends_at)}</strong></div>
      </div>

      {billing.status === "payment_pending" ? <button className="primary-button" type="button" onClick={authorizePayment} disabled={busy}>Autorizar en Mercado Pago</button> : null}
      {["grace_period", "restricted"].includes(billing.status) ? <button className="secondary-button" type="button" onClick={syncPayment} disabled={busy}>Comprobar pago</button> : null}

      {billing.scheduled_change ? <p className="billing-notice">Próximo cambio: {billing.scheduled_change.plan_code === "plus_ai" ? "Plus AI" : "Base"}, hasta {billing.scheduled_change.catalog_limit} libros, desde el {formatBillingDate(billing.scheduled_change.effective_at)}.</p> : null}

      {canChange ? <form className="billing-change-form" onSubmit={scheduleChange}>
        <h3>Cambiar desde la próxima renovación</h3>
        <label>Plan<select value={planCode} onChange={(event) => setPlanCode(event.target.value)}><option value="base">Base</option><option value="plus_ai">Plus AI</option></select></label>
        <label>Capacidad<select value={catalogLimit} onChange={(event) => setCatalogLimit(event.target.value)}><option value="50">50 libros</option><option value="100">100 libros</option><option value="200">200 libros</option></select></label>
        <button className="secondary-button" type="submit" disabled={busy}>Programar cambio</button>
      </form> : null}

      {canChange ? <button className="text-button billing-cancel" type="button" onClick={cancelRenewal} disabled={busy}>Cancelar renovación</button> : null}
      {message ? <p className="feedback success">{message}</p> : null}
      {error ? <p className="feedback error">{error}</p> : null}
    </div>
  );
}
