import { useEffect, useRef, useState } from "react";
import { apiFetch, resolveApiUrl } from "../api";
import { AppLink } from "../navigation";
import { Redirect } from "../components/Redirect";
import { BookIcon } from "../components/Icons";
import { buildReaderProfileUrl } from "../readerProfileNavigationState";
import { buildWantedBookPayload, MAX_READER_WANTED_BOOKS, normalizeWantedBooks } from "../readerWantedBooksState";
import { saveOnboardingAuthor } from "../readerOnboardingState";
import "../readerOnboarding.css";

const RIGHTS_DECLARATION = "Declaro que soy autor/a o que cuento con autorización suficiente para publicar en Bookia las obras que incorpore, y acepto ser responsable por la veracidad y los derechos del contenido.";

export function ReaderOnboardingPage({ me, onSession, onContinue, pendingAction }) {
  const step = me?.reader_profile?.onboarding_step;
  const [books, setBooks] = useState([]);
  const [booksReady, setBooksReady] = useState(false);
  const [booksError, setBooksError] = useState("");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [answer, setAnswer] = useState(null);
  const [rightsAccepted, setRightsAccepted] = useState(false);
  const [phone, setPhone] = useState(me?.author_profile?.whatsapp_phone || "");
  const [avatar, setAvatar] = useState(null);
  const [preview, setPreview] = useState("");
  const [optionalErrors, setOptionalErrors] = useState({});
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const busyRef = useRef(false);
  const headingRef = useRef(null);

  useEffect(() => {
    if (step !== "wanted") return undefined;
    let active = true;
    setBooksReady(false);
    apiFetch("/dashboard/wanted-books").then((data) => {
      if (active) { setBooks(normalizeWantedBooks(data)); setBooksReady(true); setBooksError(""); }
    }).catch((loadError) => { if (active) setBooksError(loadError.message); });
    return () => { active = false; };
  }, [step]);

  useEffect(() => {
    if (!avatar) { setPreview(""); return undefined; }
    const url = URL.createObjectURL(avatar);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [avatar]);

  useEffect(() => { headingRef.current?.focus(); }, [step]);

  async function run(action) {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setError("");
    setNotice("");
    try { await action(); }
    catch (actionError) {
      setError(actionError.message);
      // Reconcile after uncertain responses; never replay registration or activation blindly.
      try { onSession?.(await apiFetch("/me")); } catch { /* Session expiry is handled by App. */ }
    } finally { busyRef.current = false; setBusy(false); }
  }

  async function reloadBooks() {
    try {
      const data = await apiFetch("/dashboard/wanted-books");
      setBooks(normalizeWantedBooks(data));
      setBooksReady(true);
      setBooksError("");
      return normalizeWantedBooks(data);
    } catch (loadError) {
      setBooksReady(false);
      setBooksError(loadError.message);
      throw loadError;
    }
  }

  async function addBook() {
    if (!title.trim()) throw new Error("Escribí el título del libro que buscás.");
    // Refresh before a retry. The server owns normalization, duplicates and the limit.
    await reloadBooks();
    try {
      const data = await apiFetch("/dashboard/wanted-books", { method: "POST", body: JSON.stringify(buildWantedBookPayload({ title, author })) });
      setBooks((current) => [data.item, ...current]);
      setTitle("");
      setAuthor("");
      setNotice("Libro guardado en Libros buscados.");
    } catch (saveError) {
      await reloadBooks();
      if (saveError.status === 409) {
        setTitle("");
        setAuthor("");
        setNotice("Ese libro ya está guardado en tu lista.");
        return;
      }
      throw saveError;
    }
  }

  async function changeStep(nextStep) {
    const data = await apiFetch("/dashboard/reader-onboarding", { method: "PATCH", body: JSON.stringify({ step: nextStep }) });
    onSession?.({ ...me, reader_profile: data.reader_profile });
    setNotice("");
  }

  async function finishAuthor(skipOptional = false) {
    const result = await saveOnboardingAuthor({ answer, rightsAccepted, phone, avatar, skipOptional, send: apiFetch, onSession });
    setOptionalErrors(result.errors);
    if (result.saved?.avatar) setAvatar(null);
    if (!result.completed) {
      setNotice("Tu perfil de autor/a está activo. Algunos datos opcionales no pudieron guardarse.");
      // Load successful optional writes without losing the inputs that need retrying.
      onSession?.(await apiFetch("/me"));
    }
  }

  if (me === undefined) return <div className="page-state" role="status">Cargando tu perfil…</div>;
  if (!me) return <Redirect to="/login" />;
  if (!me.reader_profile) return <Redirect to="/dashboard" />;
  if (!step || step === "exempt") return <Redirect to="/profile" />;

  const complete = step === "complete";
  const avatarUrl = preview || (me.author_profile?.avatar_url ? resolveApiUrl(me.author_profile.avatar_url) : "");
  return <section className="reader-onboarding" aria-labelledby="onboarding-title">
    <aside className="reader-onboarding-intro">
      <span className="section-label">TU HISTORIA EN BOOKIA</span>
      <h2>Un lugar para tus próximas lecturas.</h2>
      <p>Contanos un poco de vos y empezá a darle forma a tu biblioteca por descubrir.</p>
      <img src="/images/register/reader-books.png" alt="" />
      <p className="reader-onboarding-account-ready">Tu cuenta ya está creada. Lo que guardes queda en tu perfil.</p>
    </aside>
    <div className="reader-onboarding-panel" aria-busy={busy}>
      {!complete ? <ol className="reader-onboarding-progress" aria-label="Progreso del registro">
        <li aria-current={step === "wanted" ? "step" : undefined}><span>1</span> Tus libros</li>
        <li aria-current={step === "author" ? "step" : undefined}><span>2</span> Sobre vos</li>
      </ol> : <span className="section-label">TODO LISTO</span>}
      {step === "author" ? <button type="button" className="reader-onboarding-back" disabled={busy} onClick={() => run(() => changeStep("wanted"))}>← Volver a tus libros</button> : null}
      <h1 id="onboarding-title" ref={headingRef} tabIndex={-1}>{complete ? "¡Bienvenido/a a Bookia!" : step === "wanted" ? "¿Qué libros te gustaría encontrar en Bookia?" : "¿Sos autor/a?"}</h1>
      {step === "wanted" ? <>
        <p>Los guardamos en <strong>Libros buscados</strong> para que los tengas a mano. Podés agregar títulos aunque todavía no estén en el catálogo.</p>
        <form className="reader-onboarding-form" onSubmit={(event) => { event.preventDefault(); run(addBook); }}>
          <fieldset disabled={busy || !booksReady || books.length >= MAX_READER_WANTED_BOOKS}>
            <label>Título del libro<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength={255} required placeholder="Por ejemplo, Rayuela" /></label>
            <label>Autor/a <small>(opcional)</small><input value={author} onChange={(event) => setAuthor(event.target.value)} maxLength={255} placeholder="Por ejemplo, Julio Cortázar" /></label>
            <button className="secondary-button" type="submit">Agregar a mi lista</button>
          </fieldset>
        </form>
        {booksError ? <div role="alert" className="reader-onboarding-error"><p>{booksError}</p><button type="button" disabled={busy} onClick={() => run(reloadBooks)}>Reintentar carga</button></div> : !booksReady ? <p role="status">Cargando tus libros…</p> : null}
        {books.length ? <ul className="reader-onboarding-books" aria-label="Tus libros buscados">{books.map((book) => <li key={book.id}><BookIcon size={20} /><span><strong>{book.title}</strong>{book.author ? <small>{book.author}</small> : null}</span><button type="button" disabled={busy} aria-label={`Quitar ${book.title}`} onClick={() => run(async () => {
          try { await apiFetch(`/dashboard/wanted-books/${book.id}`, { method: "DELETE" }); }
          catch (deleteError) { if (deleteError.status !== 404) { await reloadBooks(); throw deleteError; } }
          setBooks((current) => current.filter((item) => item.id !== book.id));
          setNotice("Libro eliminado de tu lista.");
        })}>Quitar</button></li>)}</ul> : null}
        <p className="reader-onboarding-hint">{books.length} de {MAX_READER_WANTED_BOOKS} libros. Podés editar esta lista desde tu perfil.</p>
        <div className="reader-onboarding-actions">
          <button className="primary-button" type="button" disabled={busy || (!booksReady && Boolean(title.trim()))} onClick={() => run(async () => { if (title.trim()) await addBook(); await changeStep("author"); })}>Continuar</button>
          <button className="text-link" type="button" disabled={busy} onClick={() => run(() => changeStep("author"))}>Omitir</button>
        </div>
      </> : step === "author" ? <>
        <p>Si escribís, también tenés un espacio para compartir tus obras.</p>
        <form className="reader-onboarding-form" onSubmit={(event) => { event.preventDefault(); run(() => finishAuthor()); }}>
          <fieldset disabled={busy}>
            <legend className="reader-onboarding-hint">Elegí una respuesta para continuar.</legend>
            <div className="reader-onboarding-choices">
              {[true, false].map((value) => <label className={answer === value ? "is-selected" : ""} key={String(value)}><input type="radio" name="is_author" required checked={answer === value} onChange={() => { setAnswer(value); setOptionalErrors({}); setNotice(""); }} />{value ? "Sí, soy autor/a" : "No, soy lector/a"}</label>)}
            </div>
            {answer === true ? <>
              <p className="reader-onboarding-callout">Al finalizar vas a poder cargar tus libros desde la pestaña Autor/a.</p>
              <div className="reader-onboarding-photo">
                {avatarUrl ? <img src={avatarUrl} alt="Tu foto de autor/a" /> : <span aria-hidden="true"><BookIcon size={28} /></span>}
                <label>Foto de perfil <small>(opcional)</small><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => { setAvatar(event.target.files?.[0] || null); setOptionalErrors((current) => ({ ...current, avatar: undefined })); }} /><small>JPG, PNG o WebP. Se mostrará en tu perfil público.</small></label>
              </div>
              {avatar ? <button className="text-link" type="button" onClick={() => setAvatar(null)}>Descartar foto seleccionada</button> : null}
              {optionalErrors.avatar ? <p className="reader-onboarding-error" role="alert">Foto: {optionalErrors.avatar}</p> : null}
              <label>Celular con WhatsApp <small>(opcional)</small><input type="tel" value={phone} autoComplete="tel" maxLength={50} placeholder="11 2222-3333" onChange={(event) => setPhone(event.target.value)} /><small>Solo se comparte con cuentas que hayan iniciado sesión.</small></label>
              {optionalErrors.phone ? <p className="reader-onboarding-error" role="alert">WhatsApp: {optionalErrors.phone}</p> : null}
              <label className="reader-onboarding-legal"><input type="checkbox" required checked={rightsAccepted} onChange={(event) => setRightsAccepted(event.target.checked)} /><span>{RIGHTS_DECLARATION}</span></label>
            </> : null}
            {answer === false && me.author_profile?.is_active ? <p className="reader-onboarding-hint">Al finalizar se desactivará Autor/a. Los datos que ya guardaste se conservarán en tu cuenta.</p> : null}
            <div className="reader-onboarding-actions"><button className="primary-button" type="submit" disabled={answer === null || (answer && !rightsAccepted)}>{Object.values(optionalErrors).some(Boolean) ? "Reintentar y finalizar" : "Finalizar"}</button>
              {Object.values(optionalErrors).some(Boolean) ? <button className="text-link" type="button" onClick={() => run(() => finishAuthor(true))}>Continuar sin los datos pendientes</button> : null}
            </div>
          </fieldset>
        </form>
      </> : <>
        <p>Tu perfil está listo. Podés volver a él cuando quieras para completar o cambiar tus datos.</p>
        <div className="reader-onboarding-next">
          {me.author_profile?.is_active ? <div><h2>Tus obras tienen su lugar</h2><p>Ya podés presentar tus libros a la comunidad.</p><AppLink className="secondary-button" href={buildReaderProfileUrl("author")}>Cargar mis libros</AppLink></div> : null}
          <div><h2>Lecturas para compartir</h2><p>Si gestionás un club de lectura, podés crearlo desde la pestaña Club de lectura de tu perfil.</p><AppLink className="text-link" href={buildReaderProfileUrl("clubs")}>Ir a Club de lectura →</AppLink></div>
        </div>
        <button type="button" className="primary-button" disabled={busy} onClick={() => run(() => onContinue?.(me))}>{pendingAction ? "Continuar con lo que estabas haciendo" : "Explorar Bookia"}</button>
      </>}
      {busy ? <p className="reader-onboarding-hint" role="status">Guardando…</p> : null}
      {notice ? <p className="reader-onboarding-notice" role="status">{notice}</p> : null}
      {error ? <p className="reader-onboarding-error" role="alert">{error}</p> : null}
    </div>
  </section>;
}
