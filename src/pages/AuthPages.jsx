import { useEffect, useRef, useState, useTransition } from "react";

import { apiFetch } from "../api";
import { getAccountDestination } from "../accountDestination";
import { AppLink, navigate } from "../navigation";
import { ArrowIcon, BookIcon, EyeIcon, EyeOffIcon, GoogleIcon } from "../components/Icons";
import { buildGoogleOAuthStartPayload, canStartGoogleOAuth, getGoogleOAuthCallback, getGoogleOAuthError, getGoogleOAuthLinkMessage } from "../googleOAuthState";
import { trackReaderFunnelEvent } from "../analyticsState";
import { getPendingReaderActionCopy } from "../pendingReaderAction";
import { buildRegisterPath } from "../registerState";

export function GoogleButton({ intent, privacyAccepted = false, isAuthor = false, authorRightsDeclarationAccepted = false, pendingAction, onError }) {
  const [enabled, setEnabled] = useState(false);
  const [busy, setBusy] = useState(false);
  useEffect(() => { apiFetch("/auth/providers").then((data) => setEnabled(Boolean(data.google))).catch(() => setEnabled(false)); }, []);
  if (!enabled) return null;
  function start() {
    setBusy(true);
    if (pendingAction) trackReaderFunnelEvent({ eventType: "reader_auth_started", actionType: pendingAction.type, bookstoreId: pendingAction.bookstore_id, attemptId: pendingAction.attempt_id });
    apiFetch("/auth/google/start", { method: "POST", body: JSON.stringify(buildGoogleOAuthStartPayload({ intent, privacyAccepted, isAuthor, authorRightsDeclarationAccepted })) })
      .then((data) => window.location.assign(data.authorization_url))
      .catch((error) => { setBusy(false); onError(error.message); });
  }
  return <button type="button" className="primary-button auth-submit reader-auth-google" onClick={start} disabled={busy || !canStartGoogleOAuth({ intent, privacyAccepted, isAuthor, authorRightsDeclarationAccepted })}><span className="reader-auth-google-icon"><GoogleIcon /></span>{busy ? "Conectando..." : "Continuar con Google"}</button>;
}

function AuthLayout({ label, title, description, children }) {
  return (
    <section className="auth-shell">
      <aside className="auth-intro">
        <div className="auth-book-mark" aria-hidden="true"><BookIcon size={42} /></div>
        <p className="section-label">Bookia, para quienes viven los libros.</p>
        <h1>Tu próxima historia empieza acá.</h1>
        <p>Ingresá para seguir explorando, compartiendo y conectando alrededor de las historias que te gustan.</p>
        <AppLink href="/about">Conocé Bookia <ArrowIcon size={16} /></AppLink>
      </aside>
      <div className="auth-card-wrap">
        <div className="auth-card">
          <p className="section-label">{label}</p>
          <h2>{title}</h2>
          {description ? <p className="auth-description">{description}</p> : null}
          {children}
        </div>
      </div>
    </section>
  );
}

function GoogleOwnerLinkForm({ onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  function submit(event) {
    event.preventDefault();
    startTransition(() => {
      apiFetch("/auth/google/link-owner", { method: "POST", body: JSON.stringify({ password }) })
        .then(() => onLogin())
        .then((sessionData) => {
          if (!sessionData) throw new Error("No pudimos recuperar tu sesion. Intenta ingresar nuevamente.");
          navigate(getAccountDestination(sessionData));
        })
        .catch((linkError) => setError(linkError.message));
    });
  }

  return <form className="auth-form" onSubmit={submit}>
    <label>Contraseña actual<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required autoFocus /></label>
    {error ? <p className="feedback error">{error}</p> : null}
    <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? "Vinculando..." : "Vincular Google"} <ArrowIcon /></button>
    <button type="button" className="text-link auth-link-button" onClick={() => navigate("/login")}>Cancelar</button>
  </form>;
}

export function LoginPage({ onLogin, onAuthenticated, pendingAction, me, sessionExpired = false }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [error, setError] = useState("");
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const [busy, startTransition] = useTransition();
  const googleHandledRef = useRef(false);
  const actionCopy = getPendingReaderActionCopy(pendingAction);
  const googleLinkMessage = getGoogleOAuthLinkMessage(new URLSearchParams(window.location.search).get("google_link"));
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const googleError = getGoogleOAuthError(params.get("google_error"));
    const googleCallback = getGoogleOAuthCallback(window.location.search);
    if (googleError) setError(googleError);
    if (googleError || googleCallback.succeeded) {
      params.delete("google");
      params.delete("google_error");
      const nextSearch = params.toString();
      window.history.replaceState({}, "", `${window.location.pathname}${nextSearch ? `?${nextSearch}` : ""}${window.location.hash}`);
    }
    if (googleCallback.succeeded && !googleHandledRef.current) {
      googleHandledRef.current = true;
      onLogin().then((sessionData) => {
        if (!sessionData) return;
        if (onAuthenticated) return onAuthenticated(sessionData, { registered: googleCallback.registered });
        navigate(getAccountDestination(sessionData));
      });
    }
  }, [onLogin, onAuthenticated]);

  if (me) {
    const destination = getAccountDestination(me);
    const isReader = destination === "/profile";
    return <AuthLayout label="Sesión activa" title="Ya tenés una sesión activa" description="Tu cuenta está lista para continuar."><button className="primary-button auth-submit" onClick={() => navigate(destination)}>{isReader ? "Ir a mi perfil" : "Ir al panel"} <ArrowIcon /></button></AuthLayout>;
  }
  if (googleLinkMessage) {
    return <AuthLayout label="Vincular Google" title="Confirma tu contraseña" description={googleLinkMessage}><GoogleOwnerLinkForm onLogin={onLogin} /></AuthLayout>;
  }
  function submit(event) {
    event.preventDefault();
    if (pendingAction) trackReaderFunnelEvent({ eventType: "reader_auth_started", actionType: pendingAction.type, bookstoreId: pendingAction.bookstore_id, attemptId: pendingAction.attempt_id });
    startTransition(() => {
      apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) })
        .then(() => onLogin())
        .then((sessionData) => {
          if (!sessionData) {
            throw new Error("El ingreso fue aceptado, pero no pudimos recuperar tu sesion. Revisa la configuracion de cookies del backend (SESSION_COOKIE_SECURE, SESSION_COOKIE_SAMESITE, FRONTEND_ORIGINS).");
          }
          if (onAuthenticated) return onAuthenticated(sessionData);
          navigate(getAccountDestination(sessionData));
        })
        .catch((loginError) => setError(loginError.message));
    });
  }

  return (
    <AuthLayout label="Ingresar a Bookia" title={pendingAction ? actionCopy.title : "Qué bueno verte de nuevo"} description={pendingAction ? actionCopy.description : "Ingresá con tu correo y contraseña para continuar."}>
      <form className="auth-form" onSubmit={submit}>
        <label>Correo electronico<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
        <div className="auth-password-group">
          <label htmlFor="login-password">Contrasena</label>
          <div className="auth-password-field">
            <input id="login-password" type={passwordVisible ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required />
            <button type="button" className="auth-password-toggle" aria-label={passwordVisible ? "Ocultar contrase\u00f1a" : "Mostrar contrase\u00f1a"} aria-pressed={passwordVisible} onClick={() => setPasswordVisible((visible) => !visible)}>
              {passwordVisible ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </div>
        <button type="button" className="text-link auth-link-button" onClick={() => navigate("/forgot-password")}>Olvide mi contrasena</button>
        {error ? <p className="feedback error">{error}</p> : null}
        {sessionExpired ? <p className="feedback error">Tu sesion vencio porque se inicio sesion en otro dispositivo.</p> : null}
        <button className="secondary-button auth-submit reader-auth-email" type="submit" disabled={busy}>{busy ? "Ingresando..." : <>Ingresar con correo <ArrowIcon /></>}</button>
        <GoogleButton intent="login" pendingAction={pendingAction} onError={setError} />
        <p className="auth-register-link">¿Todavía no tenés cuenta? <AppLink href={buildRegisterPath({ profileType: "reader" })}>Creá tu perfil lector</AppLink></p>
      </form>
    </AuthLayout>
  );
}

export function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [busy, startTransition] = useTransition();

  function submit(event) {
    event.preventDefault();
    startTransition(() => {
      apiFetch("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }) })
        .then((data) => { setMessage(data.detail || "Revisa tu correo para continuar."); setResetUrl(data.reset_url || ""); setError(""); })
        .catch((requestError) => { setError(requestError.message); setMessage(""); setResetUrl(""); });
    });
  }

  return (
    <AuthLayout label="Recuperacion" title="Recupera el acceso" description="Ingresa tu correo y te enviaremos las instrucciones para restablecer tu contrasena.">
      <form className="auth-form" onSubmit={submit}>
        <label>Correo electronico<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
        {error ? <p className="feedback error">{error}</p> : null}
        {message ? <p className="feedback success">{message}</p> : null}
        {resetUrl ? <button type="button" className="secondary-button" onClick={() => navigate(resetUrl)}>Abrir enlace de restablecimiento</button> : null}
        <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? "Generando enlace..." : "Generar enlace"}</button>
        <button type="button" className="text-link auth-link-button" onClick={() => navigate("/login")}>Volver al ingreso</button>
      </form>
    </AuthLayout>
  );
}

export function ResetPasswordPage({ locationSearch }) {
  const token = new URLSearchParams(locationSearch).get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, startTransition] = useTransition();

  function submit(event) {
    event.preventDefault();
    if (password !== confirmPassword) { setError("Las contrasenas no coinciden."); return; }
    startTransition(() => {
      apiFetch("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, password }) })
        .then((data) => { setMessage(data.detail || "Tu contrasena fue actualizada."); setError(""); setPassword(""); setConfirmPassword(""); })
        .catch((requestError) => { setError(requestError.message); setMessage(""); });
    });
  }

  if (!token) {
    return <AuthLayout label="Recuperacion" title="El enlace no es valido" description="No encontramos un token valido para restablecer la contrasena."><button className="secondary-button" onClick={() => navigate("/forgot-password")}>Solicitar un nuevo enlace</button></AuthLayout>;
  }

  return (
    <AuthLayout label="Recuperacion" title="Defini tu nueva contrasena" description="Elegi una contrasena nueva y repetila para confirmar el cambio.">
      <form className="auth-form" onSubmit={submit}>
        <label>Nueva contrasena<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="new-password" required /></label>
        <label>Confirmar contrasena<input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} autoComplete="new-password" required /></label>
        {error ? <p className="feedback error">{error}</p> : null}
        {message ? <p className="feedback success">{message}</p> : null}
        <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? "Actualizando..." : "Guardar nueva contrasena"}</button>
        <button type="button" className="text-link auth-link-button" onClick={() => navigate("/login")}>Volver al ingreso</button>
      </form>
    </AuthLayout>
  );
}
