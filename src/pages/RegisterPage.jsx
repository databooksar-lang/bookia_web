import { useEffect, useState } from "react";

import { apiFetch } from "../api";
import { buildBillingCheckoutRequest, getTrustedMercadoPagoCheckoutUrl } from "../billingState";
import { formatCommercialPrice, getCommercialPrices } from "../plansPricingState";
import { AppLink, navigate } from "../navigation";
import { Redirect } from "../components/Redirect";
import { ArrowIcon, EyeIcon, EyeOffIcon } from "../components/Icons";
import { buildRegisterPath, buildRegistrationRequest, getRegisterQueryState, getRegisterStep, isSupportedBookstorePlan } from "../registerState";

const CATALOG_OPTIONS = [
  { limit: "50", title: "Sin adicional", description: "Hasta 50 libros", offeringCode: null },
  { limit: "100", title: "Hasta 100 libros", description: "Amplia tu catalogo", offeringCode: "catalog_100" },
  { limit: "200", title: "Hasta 200 libros", description: "Amplia tu catalogo", offeringCode: "catalog_200" },
];
function RegistrationChoice({ type, title, description, image, onChoose }) {
  return (
    <button type="button" className={`register-choice register-choice-${type}`} onClick={onChoose}>
      <img src={image} alt="" />
      <strong>{title}</strong>
      <span>{description}</span>
      <span className="register-choice-action">Registrarme como {type === "reader" ? "lector/a" : "libreria"} <ArrowIcon size={15} /></span>
    </button>
  );
}

export function RegisterPage({ onRegister, me, locationSearch }) {
  const [bookstoreStep, setBookstoreStep] = useState("account");
  const [email, setEmail] = useState("");
  const [payerEmail, setPayerEmail] = useState("");
  const [payerEmailTouched, setPayerEmailTouched] = useState(false);
  const [password, setPassword] = useState("");
  const [whatsappPhone, setWhatsAppPhone] = useState("");
  const [bookstoreType, setBookstoreType] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bookstoreName, setBookstoreName] = useState("");
  const [catalogLimit, setCatalogLimit] = useState("50");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [error, setError] = useState("");
  const [pricingState, setPricingState] = useState({ loading: true, prices: null });
  const [busy, setBusy] = useState(false);
  const queryState = getRegisterQueryState(locationSearch);

  useEffect(() => {
    if (queryState.profileType !== "bookstore") return undefined;
    let active = true;
    apiFetch("/commercial-prices")
      .then((data) => {
        const prices = getCommercialPrices(data.items);
        if (!prices) throw new Error("La respuesta de precios esta incompleta.");
        if (active) setPricingState({ loading: false, prices });
      })
      .catch(() => { if (active) setPricingState({ loading: false, prices: null }); });
    return () => { active = false; };
  }, [queryState.profileType]);

  if (me) return <Redirect to={me.bookstore ? "/dashboard" : "/"} />;

  if (queryState.kind === "invalid") return <Redirect to="/register" />;

  const profileType = queryState.profileType;
  const planCode = queryState.planCode;
  const isReader = profileType === "reader";
  const isBookstoreDetails = profileType === "bookstore" && bookstoreStep === "details";
  const isBookstoreSummary = profileType === "bookstore" && bookstoreStep === "summary";
  const addonCode = catalogLimit === "100" ? "catalog_100" : catalogLimit === "200" ? "catalog_200" : null;
  const monthlyTotal = pricingState.prices ? pricingState.prices[planCode] + (addonCode ? pricingState.prices[addonCode] : 0) : null;
  const firstChargeEstimate = new Intl.DateTimeFormat("es-AR", { day: "2-digit", month: "long", year: "numeric" }).format(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));

  function catalogOptionPrice(offeringCode) {
    if (!offeringCode) return "Incluido";
    if (pricingState.loading) return "Cargando...";
    if (!pricingState.prices) return "Precio no disponible";
    return `+ ${formatCommercialPrice(pricingState.prices[offeringCode])}/mes`;
  }

  function selectProfile(type) {
    setBookstoreStep("account");
    setError("");
    if (type === "bookstore") {
      navigate("/plans?register=bookstore");
      return;
    }
    navigate(buildRegisterPath({ profileType: type }));
  }

  function goBack() {
    setError("");
    if (isBookstoreSummary) {
      setBookstoreStep("details");
      return;
    }
    if (isBookstoreDetails) {
      setBookstoreStep("account");
      return;
    }
    if (profileType === "bookstore") {
      navigate("/plans?register=bookstore");
      return;
    }
    navigate("/register");
  }

  function submit(event) {
    event.preventDefault();
    setError("");

    if (profileType === "bookstore" && !isSupportedBookstorePlan(planCode)) {
      setError("Eleg\u00ED un plan v\u00E1lido para continuar.");
      return;
    }
    if (profileType === "bookstore" && getRegisterStep({ profileType, email, password, whatsappPhone, bookstoreType }) === "details" && bookstoreStep === "account") {
      setBookstoreStep("details");
      return;
    }
    if (isBookstoreDetails) {
      if (monthlyTotal === null) {
        setError("No pudimos confirmar el precio vigente. Intentá nuevamente.");
        return;
      }
      setBookstoreStep("summary");
      return;
    }

    let checkoutBody = null;
    try {
      if (!isReader) checkoutBody = buildBillingCheckoutRequest(payerEmail);
    } catch (validationError) {
      setError(validationError.message);
      return;
    }
    const { path, body } = buildRegistrationRequest({ profileType, email, payerEmail, password, whatsappPhone, bookstoreType, displayName, bookstoreName, planCode, catalogLimit, expectedMonthlyTotal: monthlyTotal, privacyAccepted });
    setBusy(true);
    apiFetch(path, { method: "POST", body: JSON.stringify(body) })
        .then(() => {
          if (isReader) {
            return onRegister().then((sessionData) => {
              if (!sessionData) throw new Error("El registro fue aceptado, pero no pudimos recuperar tu sesion.");
              navigate("/");
            });
          }
          return apiFetch("/billing/subscription/checkout", { method: "POST", body: JSON.stringify(checkoutBody) })
            .then((checkout) => {
              if (!checkout?.checkout_url) throw new Error("Mercado Pago no devolvió el enlace de autorización.");
              window.location.assign(getTrustedMercadoPagoCheckoutUrl(checkout.checkout_url));
            });
        })
        .catch((registrationError) => {
          setError(registrationError.message);
          if (!isReader) onRegister({ preserveOnError: true }).then(() => navigate("/dashboard?section=subscription&registered=pending"));
        })
        .finally(() => setBusy(false));
  }

  if (queryState.kind === "choice") {
    return (
      <main className="register-page">
        <section className="register-hero" aria-labelledby="register-title">
          <div className="register-heading"><span className="register-flourish" aria-hidden="true">Registrate</span><h1 id="register-title">Crea tu cuenta en Bookia</h1><p>Unite a la comunidad que conecta lectores y librerias independientes.</p></div>
          <p className="register-question">Como queres unirte a Bookia?</p>
          <div className="register-choice-grid">
            <RegistrationChoice type="reader" title="Soy lector/a" description="Crea tu cuenta para descubrir libros, seguir tus lecturas y guardar favoritos." image="/images/register/reader-books.png" onChoose={() => selectProfile("reader")} />
            <RegistrationChoice type="bookstore" title="Tengo una libreria" description="Unite a Bookia para visibilizar tu libreria, llegar a mas lectores y formar parte de nuestra red." image="/images/register/bookstore-front.png" onChoose={() => selectProfile("bookstore")} />
          </div>
          <p className="register-login">Ya tenes una cuenta? <AppLink href="/login">Ingresar</AppLink></p>
        </section>
      </main>
    );
  }

  return (
    <main className="register-page register-page-form">
      <section className="register-form-shell" aria-labelledby="register-form-title">
        <button type="button" className="register-back" onClick={goBack}>&larr; Volver</button>
        <div className="register-form-art" aria-hidden="true"><img src={isReader ? "/images/register/reader-books.png" : "/images/register/bookstore-front.png"} alt="" /></div>
        <div className="register-form-panel">
          {!isReader ? <p className="register-progress"><span className={bookstoreStep === "account" ? "is-current" : "is-complete"}>1. Tu cuenta</span><span className={isBookstoreDetails ? "is-current" : isBookstoreSummary ? "is-complete" : ""}>2. Plan</span><span className={isBookstoreSummary ? "is-current" : ""}>3. Confirmacion</span></p> : null}
          <h1 id="register-form-title">{isReader ? "Empeza a descubrir" : isBookstoreSummary ? "Confirma tu suscripcion" : isBookstoreDetails ? "Contanos sobre tu libreria" : "Crea tu cuenta"}</h1>
          <p>{isReader ? "Guarda tus proximos libros y segui explorando." : isBookstoreSummary ? "Revisa el importe y la renovacion antes de autorizar Mercado Pago." : isBookstoreDetails ? "Elegi si queres ampliar el catalogo incluido en tu plan." : "Primero, defini los datos para ingresar a Bookia."}</p>
          <form className="register-form" onSubmit={submit}>
            {isReader ? <label>Como queres que te llamemos?<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" /></label> : null}
            {(isReader || bookstoreStep === "account") ? <><label>Correo electronico<input type="email" value={email} onChange={(event) => {
              const nextEmail = event.target.value;
              setEmail(nextEmail);
              if (!payerEmailTouched) setPayerEmail(nextEmail);
            }} autoComplete="email" required /></label><div className="register-password-group">
                <label htmlFor="register-password">Contrasena</label>
                <div className="register-password-field">
                  <input id="register-password" type={passwordVisible ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength="8" required />
                  <button type="button" className="register-password-toggle" aria-label={passwordVisible ? "Ocultar contrase\u00f1a" : "Mostrar contrase\u00f1a"} aria-pressed={passwordVisible} onClick={() => setPasswordVisible((visible) => !visible)}>
                    {passwordVisible ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div>{!isReader ? <><label>Celular con WhatsApp<input type="tel" value={whatsappPhone} onChange={(event) => setWhatsAppPhone(event.target.value)} autoComplete="tel" required placeholder="11 2222-3333" /><small>Podes escribirlo en formato local; lo usaremos para que los lectores te contacten por WhatsApp.</small></label><label>Tipo de libreria<select value={bookstoreType} onChange={(event) => setBookstoreType(event.target.value)} required><option value="">Selecciona una opcion</option><option value="physical">Libreria fisica</option><option value="virtual">Libreria virtual</option><option value="hybrid">Libreria fisica y virtual</option></select></label></> : null}</> : isBookstoreDetails ? <>
              <label>Nombre de la libreria<input value={bookstoreName} onChange={(event) => setBookstoreName(event.target.value)} autoComplete="organization" required /></label>
              <fieldset className="register-catalog-options"><legend>Queres ampliar tu catalogo?</legend>
                {CATALOG_OPTIONS.map((option) => <label className={`register-catalog-option${catalogLimit === option.limit ? " is-selected" : ""}`} key={option.limit}>
                  <input type="radio" name="catalog_limit" value={option.limit} checked={catalogLimit === option.limit} onChange={(event) => setCatalogLimit(event.target.value)} />
                  <span><strong>{option.title}</strong><small>{option.description}</small></span>
                  <em>{catalogOptionPrice(option.offeringCode)}</em>
                </label>)}
              </fieldset>
            </> : <div className="register-subscription-summary">
              <div><span>Plan {planCode === "plus_ai" ? "Plus AI" : "Base"}</span><strong>{formatCommercialPrice(pricingState.prices?.[planCode] || 0)}/mes</strong></div>
              <div><span>Catalogo de hasta {catalogLimit} libros</span><strong>{addonCode ? `+ ${formatCommercialPrice(pricingState.prices?.[addonCode] || 0)}/mes` : "Incluido"}</strong></div>
              <div className="register-subscription-total"><span>Total mensual</span><strong>{formatCommercialPrice(monthlyTotal || 0)}</strong></div>
              <p><strong>Hoy: ARS 0.</strong> Tenes 30 dias de prueba gratis. El primer cobro se estima para el {firstChargeEstimate}, luego se renueva automaticamente cada mes.</p>
              <p>Podes cancelar la renovacion desde Bookia y conservar el acceso hasta el final del periodo vigente.</p>
              <label className="register-payer-email">Correo de la cuenta de Mercado Pago
                <input type="email" value={payerEmail} onChange={(event) => { setPayerEmailTouched(true); setPayerEmail(event.target.value); }} autoComplete="email" required />
                <small>Ingresá el correo de la cuenta que autorizará la suscripción. Puede ser distinto de tu correo de acceso a Bookia.</small>
              </label>
            </div>}
            {(isReader || isBookstoreDetails) ? <label className="register-legal"><input type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} required />Acepto los <AppLink href="/terms">Terminos y Condiciones</AppLink> y la <AppLink href="/privacy">Politica de Privacidad</AppLink>.</label> : null}
            {error ? <p className="feedback error">{error}</p> : null}
            <button className="register-submit" type="submit" disabled={busy}>{busy ? "Creando cuenta..." : isBookstoreSummary ? "Crear cuenta y autorizar Mercado Pago" : profileType === "bookstore" ? "Continuar" : "Crear cuenta"} <ArrowIcon /></button>
          </form>
        </div>
      </section>
    </main>
  );
}
