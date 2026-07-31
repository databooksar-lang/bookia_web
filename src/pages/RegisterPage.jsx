import { useEffect, useState, useTransition } from "react";

import { apiFetch } from "../api";
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
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bookstoreName, setBookstoreName] = useState("");
  const [catalogLimit, setCatalogLimit] = useState("50");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [error, setError] = useState("");
  const [pricingState, setPricingState] = useState({ loading: true, prices: null });
  const [busy, startTransition] = useTransition();
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
    if (profileType === "bookstore" && getRegisterStep({ profileType, email, password }) === "details" && bookstoreStep === "account") {
      setBookstoreStep("details");
      return;
    }

    const { path, body } = buildRegistrationRequest({ profileType, email, password, displayName, bookstoreName, planCode, catalogLimit, privacyAccepted });
    startTransition(() => {
      apiFetch(path, { method: "POST", body: JSON.stringify(body) })
        .then(() => {
          if (isReader) {
            return onRegister().then((sessionData) => {
              if (!sessionData) throw new Error("El registro fue aceptado, pero no pudimos recuperar tu sesion.");
              navigate("/");
            });
          }
          return apiFetch("/billing/subscription/checkout", { method: "POST" })
            .then((checkout) => {
              if (!checkout?.checkout_url) throw new Error("Mercado Pago no devolvió el enlace de autorización.");
              window.location.assign(checkout.checkout_url);
            });
        })
        .catch((registrationError) => {
          setError(registrationError.message);
          if (!isReader) onRegister({ preserveOnError: true }).then(() => navigate("/dashboard?section=subscription&registered=pending"));
        });
    });
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
          {!isReader ? <p className="register-progress"><span className={bookstoreStep === "account" ? "is-current" : "is-complete"}>1. Tu cuenta</span><span className={isBookstoreDetails ? "is-current" : ""}>2. Tu libreria y catalogo</span></p> : null}
          <h1 id="register-form-title">{isReader ? "Empeza a descubrir" : isBookstoreDetails ? "Contanos sobre tu libreria" : "Crea tu cuenta"}</h1>
          <p>{isReader ? "Guarda tus proximos libros y segui explorando." : isBookstoreDetails ? "Elegi si queres ampliar el catalogo incluido en tu plan." : "Primero, defini los datos para ingresar a Bookia."}</p>
          <form className="register-form" onSubmit={submit}>
            {isReader ? <label>Como queres que te llamemos?<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" /></label> : null}
            {!isBookstoreDetails ? <><label>Correo electronico<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label><div className="register-password-group">
                <label htmlFor="register-password">Contrasena</label>
                <div className="register-password-field">
                  <input id="register-password" type={passwordVisible ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength="8" required />
                  <button type="button" className="register-password-toggle" aria-label={passwordVisible ? "Ocultar contrase\u00f1a" : "Mostrar contrase\u00f1a"} aria-pressed={passwordVisible} onClick={() => setPasswordVisible((visible) => !visible)}>
                    {passwordVisible ? <EyeOffIcon /> : <EyeIcon />}
                  </button>
                </div>
              </div></> : <>
              <label>Nombre de la libreria<input value={bookstoreName} onChange={(event) => setBookstoreName(event.target.value)} autoComplete="organization" required /></label>
              <fieldset className="register-catalog-options"><legend>Queres ampliar tu catalogo?</legend>
                {CATALOG_OPTIONS.map((option) => <label className={`register-catalog-option${catalogLimit === option.limit ? " is-selected" : ""}`} key={option.limit}>
                  <input type="radio" name="catalog_limit" value={option.limit} checked={catalogLimit === option.limit} onChange={(event) => setCatalogLimit(event.target.value)} />
                  <span><strong>{option.title}</strong><small>{option.description}</small></span>
                  <em>{catalogOptionPrice(option.offeringCode)}</em>
                </label>)}
              </fieldset>
            </>}
            {(isReader || isBookstoreDetails) ? <label className="register-legal"><input type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} required />Acepto los <AppLink href="/terms">Terminos y Condiciones</AppLink> y la <AppLink href="/privacy">Politica de Privacidad</AppLink>.</label> : null}
            {error ? <p className="feedback error">{error}</p> : null}
            <button className="register-submit" type="submit" disabled={busy}>{busy ? "Creando cuenta..." : profileType === "bookstore" && !isBookstoreDetails ? "Continuar" : "Crear cuenta"} <ArrowIcon /></button>
          </form>
        </div>
      </section>
    </main>
  );
}
