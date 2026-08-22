import { useEffect, useRef, useState } from "react";

import { apiFetch } from "../api";
import { createLatestBillingRequestGuard, loadBillingSubscription } from "../billingSubscriptionState";
import {
  buildBillingCheckoutRequest,
  buildBillingChangeRequest,
  formatBillingAmount,
  formatBillingDate,
  getBillingStatusLabel,
  getTrustedMercadoPagoCheckoutUrl,
  copyTrustedMercadoPagoCheckoutUrl,
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

function catalogLimitForPlan(planCode, catalogLimit) {
  if (planCode === "initial") return "25";
  return String([40, 100, 200].includes(Number(catalogLimit)) ? catalogLimit : 40);
}

function selectablePlanCode(planCode) {
  return planCode === "initial" ? "initial" : "base";
}

function billingPlanLabel(planCode) {
  if (planCode === "trial") return "Prueba gratis";
  if (planCode === "initial") return "Manual";
  if (planCode === "plus_ai") return "Plus AI (en migración)";
  return "Plus AI";
}

export function BillingSubscriptionPanel({ initialBilling = null, onBillingChange }) {
  const [billing, setBilling] = useState(initialBilling);
  const [planCode, setPlanCode] = useState(selectablePlanCode(initialBilling?.plan_code));
  const [catalogLimit, setCatalogLimit] = useState(catalogLimitForPlan(selectablePlanCode(initialBilling?.plan_code), initialBilling?.catalog_limit));
  const [error, setError] = useState("");
  const [loadError, setLoadError] = useState("");
  const [message, setMessage] = useState("");
  const [checkoutFallbackUrl, setCheckoutFallbackUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(!initialBilling);
  const billingRequestGuardRef = useRef(null);
  if (!billingRequestGuardRef.current) billingRequestGuardRef.current = createLatestBillingRequestGuard();
  const billingRequestGuard = billingRequestGuardRef.current;

  function runAction(action) {
    billingRequestGuard.invalidate();
    setBusy(true);
    return action().finally(() => setBusy(false));
  }

  function acceptBilling(nextBilling) {
    setBilling(nextBilling);
    const nextPlanCode = selectablePlanCode(nextBilling.plan_code);
    setPlanCode(nextPlanCode);
    setCatalogLimit(catalogLimitForPlan(nextPlanCode, nextBilling.catalog_limit));
    onBillingChange?.(nextBilling);
    return nextBilling;
  }

  function loadBilling({ showLoading = true } = {}) {
    const requestId = billingRequestGuard.begin();
    if (showLoading) setLoading(true);
    setLoadError("");
    return loadBillingSubscription((options) => apiFetch("/billing/subscription", options))
      .then((nextBilling) => {
        if (billingRequestGuard.isCurrent(requestId)) acceptBilling(nextBilling);
      })
      .catch((fetchError) => {
        if (billingRequestGuard.isCurrent(requestId)) setLoadError(fetchError.message);
      })
      .finally(() => {
        if (billingRequestGuard.isCurrent(requestId)) setLoading(false);
      });
  }

  useEffect(() => {
    loadBilling({ showLoading: !initialBilling });
    return () => billingRequestGuard.invalidate();
  }, []);

  function authorizePayment(event) {
    event?.preventDefault();
    setError("");
    let body;
    try {
      body = buildBillingCheckoutRequest();
    } catch (validationError) {
      setError(validationError.message);
      return;
    }
    runAction(() => apiFetch("/billing/subscription/checkout", { method: "POST", body: JSON.stringify(body) })
        .then(redirectToMercadoPago)
        .catch((actionError) => setError(actionError.message)));
  }

  function copyCheckoutLink() {
    setError("");
    setMessage("");
    setCheckoutFallbackUrl("");
    let body;
    try {
      body = buildBillingCheckoutRequest();
    } catch (validationError) {
      setError(validationError.message);
      return;
    }
    runAction(() => apiFetch("/billing/subscription/checkout", { method: "POST", body: JSON.stringify(body) })
      .then(async (checkout) => {
        const checkoutUrl = getTrustedMercadoPagoCheckoutUrl(checkout.checkout_url);
        setCheckoutFallbackUrl(checkoutUrl);
        try {
          await copyTrustedMercadoPagoCheckoutUrl(checkoutUrl);
          setMessage("Copiamos el enlace de Mercado Pago. Pegalo en Chrome o abrilo desde otro dispositivo para continuar.");
        } catch {
          setMessage("No pudimos copiar el enlace automáticamente. Copialo manualmente desde el campo.");
        }
      })
      .catch((actionError) => setError(actionError.message)));
  }

  function reactivateSubscription(event) {
    event.preventDefault();
    setError("");
    setMessage("");
    runAction(() => {
      let body;
      let checkoutBody;
      try {
        body = buildBillingChangeRequest(planCode, catalogLimit);
        checkoutBody = buildBillingCheckoutRequest();
      } catch (validationError) {
        setError(validationError.message);
        return Promise.resolve();
      }
      return apiFetch("/billing/subscription/reactivate", { method: "POST", body: JSON.stringify(body) })
        .then(acceptBilling)
        .then(() => apiFetch("/billing/subscription/checkout", { method: "POST", body: JSON.stringify(checkoutBody) }))
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

  if (loading) return <p>Cargando suscripción...</p>;
  if (!billing) return <div className="billing-panel">
    <p className="feedback error">{loadError || "No pudimos cargar la suscripción."}</p>
    <button className="secondary-button" type="button" onClick={() => loadBilling()}>Reintentar</button>
  </div>;
  const canChange = ["active", "grace_period"].includes(billing.status);
  const changeIsNoop = planCode === billing.plan_code && Number(catalogLimit) === billing.catalog_limit;
  const isReactivationPending = billing.status === "payment_pending" && !billing.trial_ends_at;
  const billingDate = getBillingDateDetails(billing, isReactivationPending);

  return (
    <div className="billing-panel">
      <div className="billing-summary">
        <div><span>Estado</span><strong>{getBillingStatusLabel(billing.status)}</strong></div>
        <div><span>Plan</span><strong>{billingPlanLabel(billing.plan_code)}</strong></div>
        <div><span>Catálogo</span><strong>Hasta {billing.catalog_limit} libros</strong></div>
        <div><span>Total mensual</span><strong>{formatBillingAmount(billing.total_amount_ars, billing.currency)}</strong></div>
        <div><span>{billingDate.label}</span><strong>{billingDate.value}</strong></div>
      </div>

      {billing.status === "payment_pending" ? <form className="billing-payer-form" onSubmit={authorizePayment}>
        <p className="billing-notice">Mercado Pago usará la cuenta que tengas activa al continuar. Debe ser distinta de la cuenta cobradora de Bookia.</p>
        <button className="primary-button" type="submit" disabled={busy}>Continuar en Mercado Pago</button>
        <button className="secondary-button" type="button" onClick={copyCheckoutLink} disabled={busy}>Copiar enlace de Mercado Pago</button>
        {checkoutFallbackUrl ? <label>Enlace de Mercado Pago
          <input type="text" value={checkoutFallbackUrl} readOnly onFocus={(event) => event.currentTarget.select()} aria-label="Enlace de Mercado Pago para copiar manualmente" />
        </label> : null}
      </form> : null}
      {isReactivationPending ? <p className="billing-notice">Tu librería sigue oculta. Volverá a publicarse cuando Mercado Pago confirme la autorización.</p> : null}
      {["grace_period", "restricted"].includes(billing.status) ? <button className="secondary-button" type="button" onClick={syncPayment} disabled={busy}>Comprobar pago</button> : null}

      {billing.scheduled_change ? <p className="billing-notice">Próximo cambio: {billingPlanLabel(billing.scheduled_change.plan_code)}, hasta {billing.scheduled_change.catalog_limit} libros, desde el {formatBillingDate(billing.scheduled_change.effective_at)}.</p> : null}

      {canChange ? <form className="billing-change-form" onSubmit={scheduleChange}>
        <h3>Cambiar desde la próxima renovación</h3>
        <label>Plan<select value={planCode} onChange={(event) => { const nextPlan = event.target.value; setPlanCode(nextPlan); setCatalogLimit(catalogLimitForPlan(nextPlan)); }}><option value="initial">Manual</option><option value="base">Plus AI</option></select></label>
        <label>Capacidad<select value={catalogLimit} onChange={(event) => setCatalogLimit(event.target.value)}>{planCode === "initial" ? <option value="25">25 libros</option> : <><option value="40">40 libros</option><option value="100">100 libros</option><option value="200">200 libros</option></>}</select></label>
        <button className="secondary-button" type="submit" disabled={busy || changeIsNoop}>Programar cambio</button>
      </form> : null}

      {canChange ? <button className="text-button billing-cancel" type="button" onClick={cancelRenewal} disabled={busy}>Cancelar renovación</button> : null}

      {["canceled", "restricted"].includes(billing.status) ? <form className="billing-change-form" onSubmit={reactivateSubscription}>
        <h3>{billing.plan_code === "trial" ? "Elegí un plan para continuar" : "Reactivar librería"}</h3>
        <p className="billing-notice">{billing.plan_code === "trial" ? "Tu prueba gratuita terminó. Elegí un plan y autorizalo en Mercado Pago para volver a administrar el catálogo." : "Elegí el plan y la capacidad. La reactivación es paga, sin una nueva prueba gratis, y tu librería volverá a publicarse cuando Mercado Pago confirme la autorización."}</p>
        <label>Plan<select value={planCode} onChange={(event) => { const nextPlan = event.target.value; setPlanCode(nextPlan); setCatalogLimit(catalogLimitForPlan(nextPlan)); }}><option value="initial">Manual</option><option value="base">Plus AI</option></select></label>
        <label>Capacidad<select value={catalogLimit} onChange={(event) => setCatalogLimit(event.target.value)}>{planCode === "initial" ? <option value="25">25 libros</option> : <><option value="40">40 libros</option><option value="100">100 libros</option><option value="200">200 libros</option></>}</select></label>
        <button className="primary-button" type="submit" disabled={busy}>Reactivar y continuar en Mercado Pago</button>
      </form> : null}
      {message ? <p className="feedback success" role="status">{message}</p> : null}
      {loadError ? <><p className="feedback error" role="alert">{loadError}</p><button className="secondary-button" type="button" onClick={() => loadBilling()}>Reintentar</button></> : null}
      {error ? <p className="feedback error" role="alert">{error}</p> : null}
    </div>
  );
}
