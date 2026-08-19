import { useEffect, useState } from "react";

import { apiFetch } from "../api";
import { buildBillingCheckoutRequest, getTrustedMercadoPagoCheckoutUrl } from "../billingState";
import { formatCommercialPrice, getCommercialPrices } from "../plansPricingState";
import { AppLink, navigate } from "../navigation";
import { Redirect } from "../components/Redirect";
import { ArrowIcon, EyeIcon, EyeOffIcon } from "../components/Icons";
import { GoogleButton } from "./AuthPages";
import { buildRegisterPath, buildRegistrationRequest, getRegisterQueryState, getRegisterStep, isSupportedBookstorePlan } from "../registerState";
import { trackReaderFunnelEvent } from "../analyticsState";
import { getPendingReaderActionCopy } from "../pendingReaderAction";

const BASE_CATALOG_OPTIONS = [
  { limit: "50", title: "Sin adicional", description: "Hasta 50 libros", offeringCode: null },
  { limit: "100", title: "Hasta 100 libros", description: "Amplia tu catalogo", offeringCode: "catalog_100" },
  { limit: "200", title: "Hasta 200 libros", description: "Amplia tu catalogo", offeringCode: "catalog_200" },
];
const PLUS_AI_CATALOG_OPTIONS = [
  { limit: "150", title: "Incluido", description: "Hasta 150 libros", offeringCode: null },
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

export function RegisterPage({ onRegister, onAuthenticated, pendingAction, me, locationSearch }) {
  const [bookstoreStep, setBookstoreStep] = useState("account");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [whatsappPhone, setWhatsAppPhone] = useState("");
  const [bookstoreType, setBookstoreType] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [isAuthor, setIsAuthor] = useState(false);
  const [authorRightsDeclarationAccepted, setAuthorRightsDeclarationAccepted] = useState(false);
  const [bookstoreName, setBookstoreName] = useState("");
  const [catalogLimit, setCatalogLimit] = useState("50");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [error, setError] = useState("");
  const [pricingState, setPricingState] = useState({ loading: true, prices: null });
  const [busy, setBusy] = useState(false);
  const queryState = getRegisterQueryState(locationSearch);
  const actionCopy = getPendingReaderActionCopy(pendingAction);

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
  const selectedCatalogLimit = planCode === "initial" ? "25" : planCode === "plus_ai" ? (catalogLimit === "200" ? "200" : "150") : catalogLimit;
  const catalogOptions = planCode === "initial" ? [{ limit: "25", title: "Incluido", description: "Hasta 25 libros", offeringCode: null }] : planCode === "plus_ai" ? PLUS_AI_CATALOG_OPTIONS : BASE_CATALOG_OPTIONS;
  const isReader = profileType === "reader";
  const isBookstoreDetails = profileType === "bookstore" && bookstoreStep === "details";
  const isBookstoreSummary = profileType === "bookstore" && bookstoreStep === "summary";
  const addonCode = selectedCatalogLimit === "100" ? "catalog_100" : selectedCatalogLimit === "200" ? "catalog_200" : null;
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
      if (!isReader) checkoutBody = buildBillingCheckoutRequest();
    } catch (validationError) {
      setError(validationError.message);
      return;
    }
    const { path, body } = buildRegistrationRequest({ profileType, email, password, whatsappPhone, bookstoreType, displayName, bookstoreName, planCode, catalogLimit: selectedCatalogLimit, expectedMonthlyTotal: monthlyTotal, privacyAccepted, isAuthor, authorRightsDeclarationAccepted });
    if (isReader && pendingAction) trackReaderFunnelEvent({ eventType: "reader_auth_started", actionType: pendingAction.type, bookstoreId: pendingAction.bookstore_id, attemptId: pendingAction.attempt_id });
    setBusy(true);
    apiFetch(path, { method: "POST", body: JSON.stringify(body) })
        .then(() => {
          if (isReader) {
            return onRegister().then((sessionData) => {
              if (!sessionData) throw new Error("El registro fue aceptado, pero no pudimos recuperar tu sesion.");
              if (onAuthenticated) return onAuthenticated(sessionData, { registered: true });
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
          <div className="register-heading"><span className="register-flourish" aria-hidden="true">Registrate</span><h1 id="register-title">Creá tu cuenta en Bookia</h1><p>Unite a la comunidad que conecta lectores y librerías independientes.</p></div>
          <p className="register-question">¿Cómo querés unirte a Bookia?</p>
          <div className="register-choice-grid">
            <RegistrationChoice type="reader" title="Soy lector/a" description="Crea tu cuenta para descubrir libros, seguir tus lecturas y guardar favoritos." image="/images/register/reader-books.png" onChoose={() => selectProfile("reader")} />
            <RegistrationChoice type="bookstore" title="Tengo una librería" description="Unite a Bookia para visibilizar tu librería, llegar a más lectores y formar parte de nuestra red." image="/images/register/bookstore-front.png" onChoose={() => selectProfile("bookstore")} />
          </div>
          <p className="register-login">¿Ya tenés una cuenta? <AppLink href="/login">Ingresá</AppLink></p>
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
          <h1 id="register-form-title">{isReader ? (pendingAction ? actionCopy.title : "Empezá a descubrir") : isBookstoreSummary ? "Confirma tu suscripcion" : isBookstoreDetails ? "Contanos sobre tu libreria" : "Crea tu cuenta"}</h1>
          <p>{isReader ? (pendingAction ? actionCopy.description : "Guardá los libros que te interesan y volvé a encontrarlos cuando quieras.") : isBookstoreSummary ? "Revisá el importe y la renovación antes de autorizar Mercado Pago." : isBookstoreDetails ? "Elegí si querés ampliar el catálogo incluido en tu plan." : "Primero, definí los datos para ingresar a Bookia."}</p>
          <form className="register-form" onSubmit={submit}>
            {isReader ? <><label>¿Cómo querés que te llamemos? (opcional)<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" /><small>Podés cambiarlo más adelante.</small></label><label className="register-legal"><input type="checkbox" checked={isAuthor} onChange={(event) => { setIsAuthor(event.target.checked); if (!event.target.checked) setAuthorRightsDeclarationAccepted(false); }} /><span className="register-legal-copy">Soy autor/a</span></label>{isAuthor ? <label className="register-legal"><input type="checkbox" checked={authorRightsDeclarationAccepted} onChange={(event) => setAuthorRightsDeclarationAccepted(event.target.checked)} required /><span className="register-legal-copy">Declaro que soy autor/a o que cuento con autorización suficiente para publicar en Bookia las obras que incorpore, y acepto ser responsable por la veracidad y los derechos del contenido.</span></label> : null}</> : null}
            {(isReader || bookstoreStep === "account") ? <><label>Correo electrónico<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label><div className="register-password-group">
                <label htmlFor="register-password">Contraseña</label>
                <div className="register-password-field">
                  <input id="register-password" type={passwordVisible ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength="8" required />
                  <button type="button" className="register-password-toggle" aria-label={passwordVisible ? "Ocultar contrase\u00f1a" : "Mostrar contrase\u00f1a"} aria-pressed={passwordVisible} onClick={() => setPasswordVisible((visible) => !visible)}>
                    {passwordVisible ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
                <small>Mínimo 8 caracteres.</small>
              </div>{!isReader ? <><label>Celular con WhatsApp<input type="tel" value={whatsappPhone} onChange={(event) => setWhatsAppPhone(event.target.value)} autoComplete="tel" required placeholder="11 2222-3333" /><small>Podes escribirlo en formato local; lo usaremos para que los lectores te contacten por WhatsApp.</small></label><label>Tipo de libreria<select value={bookstoreType} onChange={(event) => setBookstoreType(event.target.value)} required><option value="">Selecciona una opcion</option><option value="physical">Libreria fisica</option><option value="virtual">Libreria virtual</option><option value="hybrid">Libreria fisica y virtual</option></select></label></> : null}</> : isBookstoreDetails ? <>
              <label>Nombre de la libreria<input value={bookstoreName} onChange={(event) => setBookstoreName(event.target.value)} autoComplete="organization" required /></label>
              <fieldset className="register-catalog-options"><legend>Queres ampliar tu catalogo?</legend>
                {catalogOptions.map((option) => <label className={`register-catalog-option${selectedCatalogLimit === option.limit ? " is-selected" : ""}`} key={option.limit}>
                  <input type="radio" name="catalog_limit" value={option.limit} checked={selectedCatalogLimit === option.limit} onChange={(event) => setCatalogLimit(event.target.value)} />
                  <span><strong>{option.title}</strong><small>{option.description}</small></span>
                  <em>{catalogOptionPrice(option.offeringCode)}</em>
                </label>)}
              </fieldset>
            </> : <div className="register-subscription-summary">
              <div><span>Plan {planCode === "plus_ai" ? "Plus AI" : "Base + IA"}</span><strong>{formatCommercialPrice(pricingState.prices?.[planCode] || 0)}/mes</strong></div>
              <div><span>Catalogo de hasta {selectedCatalogLimit} libros</span><strong>{addonCode ? `+ ${formatCommercialPrice(pricingState.prices?.[addonCode] || 0)}/mes` : "Incluido"}</strong></div>
              <div className="register-subscription-total"><span>Total mensual</span><strong>{formatCommercialPrice(monthlyTotal || 0)}</strong></div>
              <p><strong>Hoy: ARS 0.</strong> Tenes 30 dias de prueba gratis. El primer cobro se estima para el {firstChargeEstimate}, luego se renueva automaticamente cada mes.</p>
              <p>Podes cancelar la renovacion desde Bookia y conservar el acceso hasta el final del periodo vigente.</p>
              <p>Mercado Pago usara la cuenta que tengas activa al continuar. Debe ser distinta de la cuenta cobradora de Bookia.</p>
            </div>}
            {(isReader || isBookstoreDetails) ? <label className="register-legal"><input type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} required /><span className="register-legal-copy">Acepto los <AppLink href="/terms">Términos y Condiciones</AppLink> y la <AppLink href="/privacy">Política de Privacidad</AppLink>.</span></label> : null}
            {error ? <p className="feedback error">{error}</p> : null}
            <button className={`register-submit${isReader ? " reader-auth-email" : ""}`} type="submit" disabled={busy}>{busy ? "Creando cuenta..." : isBookstoreSummary ? "Crear cuenta y continuar en Mercado Pago" : profileType === "bookstore" ? "Continuar" : "Crear cuenta con correo"} <ArrowIcon /></button>
            {isReader ? <GoogleButton intent="register" privacyAccepted={privacyAccepted} isAuthor={isAuthor} authorRightsDeclarationAccepted={authorRightsDeclarationAccepted} pendingAction={pendingAction} onError={setError} /> : null}
            {isReader ? <p className="register-form-login">¿Ya tenés una cuenta? <AppLink href="/login">Ingresá</AppLink></p> : null}
          </form>
        </div>
      </section>
    </main>
  );
}
