import { useState, useTransition } from "react";

import { apiFetch } from "../api";
import { AppLink, navigate } from "../navigation";
import { ArrowIcon, BookIcon } from "../components/Icons";

function AuthLayout({ label, title, description, children }) {
  return (
    <section className="auth-shell">
      <aside className="auth-intro">
        <div className="auth-book-mark" aria-hidden="true"><BookIcon size={42} /></div>
        <p className="section-label">Herramientas para librerias</p>
        <h1>Tu catalogo tambien puede abrir puertas.</h1>
        <p>Gestiona tus libros y hacelos visibles para personas que ya los estan buscando.</p>
        <AppLink href="/plans">Conoce la propuesta <ArrowIcon size={16} /></AppLink>
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

export function LoginPage({ onLogin, me, sessionExpired = false }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  if (me) {
    return <AuthLayout label="Sesion activa" title="Ya estas dentro" description={`Tu catalogo de ${me.bookstore.name} esta listo para gestionarse.`}><button className="primary-button auth-submit" onClick={() => navigate("/dashboard")}>Ir al panel <ArrowIcon /></button></AuthLayout>;
  }

  function submit(event) {
    event.preventDefault();
    startTransition(() => {
      apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ email, password }) })
        .then(() => onLogin())
        .then((sessionData) => {
          if (!sessionData) {
            throw new Error("El ingreso fue aceptado, pero no pudimos recuperar tu sesion. Revisa la configuracion de cookies del backend (SESSION_COOKIE_SECURE, SESSION_COOKIE_SAMESITE, FRONTEND_ORIGINS).");
          }
          navigate("/dashboard");
        })
        .catch((loginError) => setError(loginError.message));
    });
  }

  return (
    <AuthLayout label="Ingreso de librerias" title="Volve a tu catalogo" description="Ingresa con los datos de tu libreria para administrar publicaciones y disponibilidad.">
      <form className="auth-form" onSubmit={submit}>
        <label>Correo electronico<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" required /></label>
        <label>Contrasena<input type="password" value={password} onChange={(event) => setPassword(event.target.value)} autoComplete="current-password" required /></label>
        <button type="button" className="text-link auth-link-button" onClick={() => navigate("/forgot-password")}>Olvide mi contrasena</button>
        {error ? <p className="feedback error">{error}</p> : null}
        {sessionExpired ? <p className="feedback error">Tu sesion vencio porque se inicio sesion en otro dispositivo.</p> : null}
        <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? "Ingresando..." : <>Entrar al panel <ArrowIcon /></>}</button>
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
