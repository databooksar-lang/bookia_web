import { useState, useTransition } from "react";

import { apiFetch } from "../api";
import { AppLink, navigate } from "../navigation";
import { ArrowIcon } from "../components/Icons";
import { buildRegistrationRequest, getRegisterStep } from "../registerState";

const TRUST_ITEMS = [
  ["*", "Tu informacion esta segura", "Protegemos tus datos y tu privacidad."],
  ["o", "Comunidad confiable", "Lectores y librerias reales como vos."],
  ["+", "Apoyamos lo independiente", "Conectamos historias, lectores y librerias."],
];

function RegistrationTrust() {
  return (
    <div className="register-trust" aria-label="Compromisos de Bookia">
      {TRUST_ITEMS.map(([icon, title, description]) => (
        <div className="register-trust-item" key={title}>
          <span aria-hidden="true">{icon}</span>
          <div><strong>{title}</strong><p>{description}</p></div>
        </div>
      ))}
    </div>
  );
}

function RegistrationChoice({ type, title, description, image, onChoose }) {
  return (
    <button type="button" className={`register-choice register-choice-${type}`} onClick={onChoose}>
      <img src={image} alt="" />
      <span className="register-choice-icon" aria-hidden="true">{type === "reader" ? "O" : "M"}</span>
      <strong>{title}</strong>
      <span>{description}</span>
      <span className="register-choice-action">Registrarme como {type === "reader" ? "lector/a" : "libreria"} <ArrowIcon size={15} /></span>
    </button>
  );
}

export function RegisterPage({ onRegister, me }) {
  const [profileType, setProfileType] = useState("");
  const [bookstoreStep, setBookstoreStep] = useState("account");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bookstoreName, setBookstoreName] = useState("");
  const [planCode, setPlanCode] = useState("base");
  const [catalogLimit, setCatalogLimit] = useState("50");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  if (me) {
    navigate(me.bookstore ? "/dashboard" : "/");
    return null;
  }

  const isReader = profileType === "reader";
  const isBookstoreDetails = profileType === "bookstore" && bookstoreStep === "details";

  function selectProfile(type) {
    setProfileType(type);
    setBookstoreStep("account");
    setError("");
  }

  function submit(event) {
    event.preventDefault();
    setError("");

    if (profileType === "bookstore" && getRegisterStep({ profileType, email, password }) === "details" && bookstoreStep === "account") {
      setBookstoreStep("details");
      return;
    }

    const { path, body } = buildRegistrationRequest({ profileType, email, password, displayName, bookstoreName, planCode, catalogLimit, privacyAccepted });
    startTransition(() => {
      apiFetch(path, { method: "POST", body: JSON.stringify(body) })
        .then(() => onRegister())
        .then((sessionData) => {
          if (!sessionData) throw new Error("El registro fue aceptado, pero no pudimos recuperar tu sesion.");
          navigate(isReader ? "/" : "/dashboard?registered=pending");
        })
        .catch((registrationError) => setError(registrationError.message));
    });
  }

  if (!profileType) {
    return (
      <main className="register-page">
        <section className="register-hero" aria-labelledby="register-title">
          <div className="register-heading"><span className="register-flourish" aria-hidden="true">*</span><h1 id="register-title">Crea tu cuenta en Bookia</h1><p>Unite a la comunidad que conecta lectores y librerias independientes.</p></div>
          <p className="register-question">Como queres unirte a Bookia?</p>
          <div className="register-choice-grid">
            <RegistrationChoice type="reader" title="Soy lector/a" description="Crea tu cuenta para descubrir libros, seguir tus lecturas y guardar favoritos." image="/images/register/reader-books.png" onChoose={() => selectProfile("reader")} />
            <RegistrationChoice type="bookstore" title="Tengo una libreria" description="Unite a Bookia para visibilizar tu libreria, llegar a mas lectores y formar parte de nuestra red." image="/images/register/bookstore-front.png" onChoose={() => selectProfile("bookstore")} />
          </div>
          <p className="register-login">Ya tenes una cuenta? <AppLink href="/login">Ingresar</AppLink></p>
        </section>
        <RegistrationTrust />
      </main>
    );
  }

  return (
    <main className="register-page register-page-form">
      <section className="register-form-shell" aria-labelledby="register-form-title">
        <button type="button" className="register-back" onClick={() => isBookstoreDetails ? setBookstoreStep("account") : selectProfile("")}>&larr; Volver</button>
        <div className="register-form-art" aria-hidden="true"><img src={isReader ? "/images/register/reader-books.png" : "/images/register/bookstore-front.png"} alt="" /></div>
        <div className="register-form-panel">
          {!isReader ? <p className="register-progress"><span className={bookstoreStep === "account" ? "is-current" : "is-complete"}>1. Tu cuenta</span><span className={isBookstoreDetails ? "is-current" : ""}>2. Tu libreria</span></p> : null}
          <h1 id="register-form-title">{isReader ? "Empeza a descubrir" : isBookstoreDetails ? "Contanos sobre tu libreria" : "Crea tu cuenta"}</h1>
          <p>{isReader ? "Guarda tus proximos libros y segui explorando." : isBookstoreDetails ? "Elegi tu plan inicial y el tamano de tu catalogo." : "Primero, defini los datos para ingresar a Bookia."}</p>
          <form className="register-form" onSubmit={submit}>
            {isReader ? <label>Como queres que te llamemos?<input value={displayName} onChange={(event) => setDisplayName(event.target.value)} autoComplete="name" /></label> : null}
            {!isBookstoreDetails ? <><label>Correo electronico<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label><label>Contrasena<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" minLength="8" required /></label></> : <><label>Nombre de la libreria<input value={bookstoreName} onChange={(event) => setBookstoreName(event.target.value)} autoComplete="organization" required /></label><label>Plan inicial<select value={planCode} onChange={(event) => setPlanCode(event.target.value)}><option value="base">Base</option><option value="plus_ai">Plus IA</option></select></label><label>Limite de catalogo<select value={catalogLimit} onChange={(event) => setCatalogLimit(event.target.value)}><option value="50">Hasta 50 libros</option><option value="100">Hasta 100 libros</option><option value="200">Hasta 200 libros</option></select></label></>}
            {(isReader || isBookstoreDetails) ? <label className="register-legal"><input type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} required />Acepto los <AppLink href="/terms">Terminos y Condiciones</AppLink> y la <AppLink href="/privacy">Politica de Privacidad</AppLink>.</label> : null}
            {error ? <p className="feedback error">{error}</p> : null}
            <button className="register-submit" type="submit" disabled={busy}>{busy ? "Creando cuenta..." : profileType === "bookstore" && !isBookstoreDetails ? "Continuar" : "Crear cuenta"} <ArrowIcon /></button>
          </form>
        </div>
      </section>
      <RegistrationTrust />
    </main>
  );
}
