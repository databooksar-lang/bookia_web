import { useEffect, useState } from "react";

import { apiFetch } from "../api";
import { getBillingReturnState, getBillingStatusLabel } from "../billingState";
import { navigate } from "../navigation";

export function BillingReturnPage({ locationSearch = "", refreshMe }) {
  const returnState = getBillingReturnState(locationSearch);
  const [state, setState] = useState(returnState.kind);
  const [message, setMessage] = useState(returnState.message);
  const [billing, setBilling] = useState(null);

  useEffect(() => {
    if (returnState.kind === "failure") return;
    apiFetch("/billing/subscription/sync", { method: "POST" })
      .then((data) => {
        setBilling(data);
        setState(["trialing", "active"].includes(data.status) ? "success" : "pending");
        setMessage(["trialing", "active"].includes(data.status) ? "Tu suscripción quedó activa y comenzó la prueba gratis de 30 días." : "Mercado Pago todavía está confirmando la autorización.");
        return refreshMe?.({ preserveOnError: true });
      })
      .catch((error) => { setState("failure"); setMessage(error.message); });
  }, []);

  return <section className="billing-return page-state" aria-live="polite">
    <p className="section-label">Suscripción de Bookia</p>
    <h1>{state === "success" ? "Tu librería ya está activa" : state === "failure" ? "No pudimos confirmar la autorización" : "Confirmando con Mercado Pago"}</h1>
    <p>{message}</p>
    {billing ? <p className="status-pill">{getBillingStatusLabel(billing.status)}</p> : null}
    <div className="billing-return-actions">
      <button className="primary-button" type="button" onClick={() => navigate("/dashboard?section=subscription")}>Ir a mi suscripción</button>
      {state === "failure" ? <button className="secondary-button" type="button" onClick={() => navigate("/dashboard?section=subscription")}>Intentar nuevamente</button> : null}
    </div>
  </section>;
}
