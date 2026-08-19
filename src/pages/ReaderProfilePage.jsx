import { useEffect, useState } from "react";

import { apiFetch, resolveApiUrl } from "../api";
import { READER_TRAIT_GROUPS, toggleReaderTrait } from "../readerIdentityState";
import { buildReaderProfilePayload, createReaderProfileDraft, favoriteGenreSelectionLabel, getReaderFavoriteGenresState, loadReaderFavorites, normalizeReaderFavoriteGenres, toggleReaderFavoriteGenre } from "../readerProfileState";
import { buildReaderProfileUrl, parseReaderProfileNavigation } from "../readerProfileNavigationState";
import { buildWantedBookPayload, createWantedBookDraft, MAX_READER_WANTED_BOOKS, normalizeWantedBooks } from "../readerWantedBooksState";
import { AppLink, navigate } from "../navigation";
import { EmptyState } from "../components/Commerce";
import { RichDescriptionEditor } from "../components/RichDescriptionEditor";
import { ReaderFavoriteBookRow } from "../components/ReaderFavoriteBookRow";
import { AuthorProfileSection } from "../components/AuthorProfileSection";
import { ReadingClubManager } from "../components/ReadingClubManager";
import { activateAuthorProfile, deactivateAuthorProfile, isActiveAuthor } from "../authorProfileState";

const READER_PROFILE_TABS = [
  { section: "info", label: "📝 Mi info" },
  { section: "favorites", label: "❤️ Mis favoritos" },
  { section: "wanted", label: "🔎 Libros buscados" },
  { section: "clubs", label: "📖 Club de lectura" },
];
const READER_SOCIAL_PLATFORM_OPTIONS = [["instagram", "Instagram"], ["tiktok", "TikTok"], ["youtube", "YouTube"], ["goodreads", "Goodreads"], ["website", "Sitio web"]];

function ReaderProfileTabs({ section, showAuthor }) {
  const tabs = showAuthor ? [...READER_PROFILE_TABS, { section: "author", label: "✍️ Autor/a" }] : READER_PROFILE_TABS;
  return <nav className="dashboard-tabs" aria-label="Secciones de mi perfil">{tabs.map((tab) => <AppLink key={tab.section} href={buildReaderProfileUrl(tab.section)} className={`dashboard-tab${section === tab.section ? " is-active" : ""}`} aria-current={section === tab.section ? "page" : undefined}>{tab.label}</AppLink>)}</nav>;
}

function ReaderTraitEditor({ traits, onToggle }) {
  return <fieldset className="bookstore-profile-field-wide reader-passport-editor reader-profile-content-block reader-profile-passport-block"><legend>Pasaporte lector</legend><p>Elegí hasta dos opciones por grupo para contar cómo vivís la lectura.</p><div className="reader-passport-editor-groups">{READER_TRAIT_GROUPS.map((group) => {
    const selected = traits[group.key] || [];
    return <section key={group.key} className="reader-passport-editor-group" aria-labelledby={`reader-trait-${group.key}`}><h3 id={`reader-trait-${group.key}`}>{group.label}</h3><div className="reader-trait-options">{group.options.map(([code, label]) => {
      const isSelected = selected.includes(code);
      return <button key={code} className={`reader-trait-option${isSelected ? " is-selected" : ""}`} type="button" aria-pressed={isSelected} disabled={!isSelected && selected.length >= 2} onClick={() => onToggle(group.key, code)}>{label}</button>;
    })}</div><small>{selected.length} de 2 elegidos</small></section>;
  })}</div></fieldset>;
}

export function ReaderProfilePage({ me, refreshMe, locationSearch = "" }) {
  const { section } = parseReaderProfileNavigation(locationSearch);
  const profile = me?.reader_profile;
  const favoriteGenreIdsKey = (profile?.favorite_genres || []).map((genre) => genre.id).filter(Number.isInteger).join(",");
  const profileTraitsKey = JSON.stringify(profile?.traits || {});
  const [draft, setDraft] = useState(() => createReaderProfileDraft(profile));
  const [favorites, setFavorites] = useState([]);
  const [followedBookstores, setFollowedBookstores] = useState([]);
  const [genres, setGenres] = useState([]);
  const [genresLoading, setGenresLoading] = useState(true);
  const [genresError, setGenresError] = useState("");
  const [profileStatus, setProfileStatus] = useState("");
  const [favoritesLoading, setFavoritesLoading] = useState(Boolean(profile));
  const [wantedBooks, setWantedBooks] = useState([]);
  const [wantedDraft, setWantedDraft] = useState(() => createWantedBookDraft());
  const [wantedLoading, setWantedLoading] = useState(Boolean(profile));
  const [wantedSaving, setWantedSaving] = useState(false);
  const [wantedStatus, setWantedStatus] = useState("");
  const [authorAccepted, setAuthorAccepted] = useState(false);
  const [authorPending, setAuthorPending] = useState(false);
  const [authorFeedback, setAuthorFeedback] = useState("");
  const authorProfile = me?.author_profile;
  const authorIsActive = isActiveAuthor(authorProfile);

  useEffect(() => { setDraft(createReaderProfileDraft(profile)); }, [profile?.display_name, profile?.slug, profile?.description, profile?.is_public, favoriteGenreIdsKey, profileTraitsKey]);

  useEffect(() => {
    if (!profile) { setGenresLoading(false); return undefined; }
    let active = true;
    setGenresLoading(true);
    apiFetch("/genres").then((data) => { if (active) { setGenres(normalizeReaderFavoriteGenres(data)); setGenresError(""); } }).catch((error) => { if (active) setGenresError(error.message || "No pudimos cargar los géneros."); }).finally(() => { if (active) setGenresLoading(false); });
    return () => { active = false; };
  }, [profile]);

  useEffect(() => {
    if (!profile) return undefined;
    setFavoritesLoading(true);
    return loadReaderFavorites({ fetchFavorites: () => apiFetch("/dashboard/favorites"), onFavorites: setFavorites, onBookstores: setFollowedBookstores, onError: (error) => setProfileStatus(error.message), onSettled: () => setFavoritesLoading(false) });
  }, [profile]);

  useEffect(() => {
    if (!profile) return undefined;
    let active = true;
    setWantedLoading(true);
    apiFetch("/dashboard/wanted-books").then((data) => { if (active) { setWantedBooks(normalizeWantedBooks(data)); setWantedStatus(""); } }).catch((error) => { if (active) setWantedStatus(error.message); }).finally(() => { if (active) setWantedLoading(false); });
    return () => { active = false; };
  }, [profile]);

  if (me === undefined) return <div className="page-state"><div className="loading-mark" /><p>Cargando perfil...</p></div>;
  if (!profile) return <div className="page-state"><EmptyState title={me ? "Este perfil es solo para lectores" : "Necesitás iniciar sesión"}>{me ? "Tu cuenta de librería se administra desde el panel." : "Ingresá para ver y editar tu perfil."}</EmptyState><button className="primary-button" onClick={() => navigate(me ? "/dashboard" : "/login")}>{me ? "Ir al panel" : "Ingresar"}</button></div>;

  const favoriteGenresState = getReaderFavoriteGenresState({ loading: genresLoading, error: genresError, genres });
  const atWantedLimit = wantedBooks.length >= MAX_READER_WANTED_BOOKS;
  function update(field, value) { setDraft((current) => ({ ...current, [field]: value })); }
  function updateSocialLink(index, field, value) { setDraft((current) => {
    const links = [...(current.social_links || [])];
    while (links.length <= index) links.push({ platform: "instagram", url: "" });
    links[index] = { ...links[index], [field]: value };
    return { ...current, social_links: links };
  }); }
  function toggleFavoriteGenre(genreId) { update("favorite_genre_ids", toggleReaderFavoriteGenre(draft.favorite_genre_ids, genreId)); }
  function toggleTrait(groupKey, traitCode) { setDraft((current) => ({ ...current, traits: toggleReaderTrait(current.traits, groupKey, traitCode) })); }
  function saveProfile(event) {
    event.preventDefault();
    setProfileStatus("Guardando...");
    apiFetch("/dashboard/reader-profile", { method: "PATCH", body: JSON.stringify(buildReaderProfilePayload(draft)) }).then(() => refreshMe({ preserveOnError: true })).then(() => setProfileStatus("Perfil guardado.")).catch((error) => setProfileStatus(error.message));
  }
  function removeFavorite(itemId) { apiFetch(`/dashboard/favorites/books/${itemId}`, { method: "DELETE" }).then(() => setFavorites((items) => items.filter((item) => item.id !== itemId))).catch((error) => setProfileStatus(error.message)); }
  function changeWanted(field, value) { setWantedDraft((current) => ({ ...current, [field]: value })); }
  function cancelWantedEdit() { setWantedDraft(createWantedBookDraft()); setWantedStatus(""); }
  function saveWanted(event) {
    event.preventDefault();
    const isEditing = Number.isInteger(wantedDraft.id);
    setWantedSaving(true);
    setWantedStatus(isEditing ? "Guardando cambios..." : "Agregando libro...");
    apiFetch(isEditing ? `/dashboard/wanted-books/${wantedDraft.id}` : "/dashboard/wanted-books", { method: isEditing ? "PATCH" : "POST", body: JSON.stringify(buildWantedBookPayload(wantedDraft)) })
      .then((data) => {
        const item = normalizeWantedBooks([data.item])[0];
        if (!item) throw new Error("No pudimos leer el libro guardado.");
        setWantedBooks((current) => isEditing ? current.map((book) => book.id === item.id ? item : book) : [item, ...current]);
        setWantedDraft(createWantedBookDraft());
        setWantedStatus(isEditing ? "Libro actualizado." : "Libro agregado a tu lista.");
      })
      .catch((error) => setWantedStatus(error.message))
      .finally(() => setWantedSaving(false));
  }
  function removeWanted(itemId) {
    setWantedSaving(true);
    apiFetch(`/dashboard/wanted-books/${itemId}`, { method: "DELETE" }).then(() => { setWantedBooks((items) => items.filter((item) => item.id !== itemId)); if (wantedDraft.id === itemId) setWantedDraft(createWantedBookDraft()); setWantedStatus("Libro eliminado de tu lista."); }).catch((error) => setWantedStatus(error.message)).finally(() => setWantedSaving(false));
  }
  function unfollowBookstore(bookstoreId) {
    apiFetch(`/dashboard/favorites/bookstores/${bookstoreId}`, { method: "DELETE" })
      .then(() => setFollowedBookstores((bookstores) => bookstores.filter((bookstore) => bookstore.id !== bookstoreId)))
      .catch((error) => setProfileStatus(error.message));
  }
  function activateAuthor(event) {
    event.preventDefault();
    setAuthorPending(true);
    setAuthorFeedback("");
    activateAuthorProfile(apiFetch)
      .then(() => refreshMe({ preserveOnError: true }))
      .then(() => { setAuthorAccepted(false); setAuthorFeedback("Perfil de autor/a activado."); })
      .catch((error) => setAuthorFeedback(error.message))
      .finally(() => setAuthorPending(false));
  }
  function deactivateAuthor() {
    if (!window.confirm("¿Querés desactivar tu perfil de autor/a? La insignia dejará de mostrarse en tu perfil público.")) return;
    setAuthorPending(true);
    setAuthorFeedback("");
    deactivateAuthorProfile(apiFetch)
      .then(() => refreshMe({ preserveOnError: true }))
      .then(() => setAuthorFeedback("Perfil de autor/a desactivado."))
      .catch((error) => setAuthorFeedback(error.message))
      .finally(() => setAuthorPending(false));
  }

  return <section className="store-page reader-page"><div className="section-heading"><div><p className="section-label">MI PERFIL</p><h1>{draft.display_name || "Tu perfil lector"}</h1><p>Contale a la comunidad quién sos, qué leés y qué te inspira.</p></div><div className="dashboard-actions">{draft.is_public && draft.slug ? <AppLink className="secondary-button reader-public-profile-button" href={`/readers/${draft.slug}`}>🌐 Ver perfil público</AppLink> : null}</div></div>
    <ReaderProfileTabs section={section} showAuthor={authorIsActive} />
    <form className="bookstore-profile-section dashboard-card reader-profile-tab-panel" onSubmit={saveProfile} hidden={section !== "info"}><fieldset className="bookstore-profile-group reader-profile-content-block reader-profile-information-block"><legend>Información pública</legend><div className="bookstore-profile-fields"><label><span>Nombre visible</span><input value={draft.display_name} onChange={(event) => update("display_name", event.target.value)} required /></label><label><span>Alias público</span><input value={draft.slug} onChange={(event) => update("slug", event.target.value)} required={draft.is_public} /></label><label className="bookstore-profile-field-wide"><span>Biografía</span><RichDescriptionEditor value={draft.description} onChange={(value) => update("description", value)} maxLength={5000} placeholder="Tu perfil personal, profesional, gustos y lecturas favoritas." /></label><fieldset className="bookstore-profile-field-wide reader-social-links-editor"><legend>Enlaces sociales <small>(opcionales)</small></legend><p>Sumá hasta dos enlaces que se verán en tu perfil público.</p>{[0, 1].map((index) => { const link = draft.social_links?.[index] || { platform: "instagram", url: "" }; return <div key={index} className="reader-social-link-fields"><label><span>Red</span><select value={link.platform} onChange={(event) => updateSocialLink(index, "platform", event.target.value)}>{READER_SOCIAL_PLATFORM_OPTIONS.map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label><label><span>URL</span><input type="url" value={link.url} onChange={(event) => updateSocialLink(index, "url", event.target.value)} placeholder="https://" /></label></div>; })}</fieldset><fieldset className="bookstore-profile-field-wide reader-favorite-genres-field reader-profile-content-block reader-profile-genres-block"><legend>Géneros que te gustan</legend>{favoriteGenresState.kind === "ready" ? <details className="reader-favorite-genres"><summary><span>Elegí tus géneros</span><span>{favoriteGenreSelectionLabel(draft.favorite_genre_ids)}</span></summary><div className="reader-favorite-genres-options">{genres.map((genre) => <label key={genre.id} className={`reader-favorite-genre-chip${draft.favorite_genre_ids.includes(genre.id) ? " is-selected" : ""}`}><input className="reader-favorite-genre-checkbox" type="checkbox" checked={draft.favorite_genre_ids.includes(genre.id)} onChange={() => toggleFavoriteGenre(genre.id)} /><span>{genre.name}</span></label>)}</div></details> : <small className={`reader-favorite-genres-status is-${favoriteGenresState.kind}`} role={favoriteGenresState.kind === "error" ? "alert" : undefined}>{favoriteGenresState.message}</small>}</fieldset><ReaderTraitEditor traits={draft.traits} onToggle={toggleTrait} /><label className="bookstore-profile-checkbox"><input type="checkbox" checked={draft.is_public} onChange={(event) => update("is_public", event.target.checked)} />Perfil público</label></div></fieldset><button className="primary-button reader-profile-save-button" type="submit">Guardar perfil</button>{profileStatus ? <p className="feedback" role="status">{profileStatus}</p> : null}</form>
    <section className="results-section reader-profile-tab-panel reader-profile-content-block reader-profile-favorites-block" hidden={section !== "favorites"}><div className="section-heading"><div><p className="section-label">❤️ LIBROS FAVORITOS</p><h2>Tus lecturas guardadas</h2></div></div>{favoritesLoading ? <div className="loading-mark" /> : null}{!favoritesLoading && favorites.length === 0 ? <EmptyState compact title="Todavía no guardaste libros">Explorá el catálogo y usá el corazón para volver a encontrarlos acá.</EmptyState> : <div className="search-results-list">{favorites.map((item) => <ReaderFavoriteBookRow key={item.id} item={item} onRemove={removeFavorite} />)}</div>}<div className="section-heading reader-followed-heading reader-profile-content-block reader-profile-followed-block"><div><p className="section-label">🏬 LIBRERÍAS SEGUIDAS</p><h2>Librerías seguidas</h2></div></div>{!favoritesLoading && followedBookstores.length === 0 ? <EmptyState compact title="Todavía no seguís librerías">Visitá sus perfiles y elegí Seguir para encontrarlas acá.</EmptyState> : <div className="reader-followed-bookstores">{followedBookstores.map((bookstore) => <article key={bookstore.id} className="dashboard-card reader-followed-bookstore">{bookstore.logo_url ? <img className="store-logo" src={resolveApiUrl(bookstore.logo_url)} alt="" /> : null}<div>{bookstore.is_active === false ? <strong>{bookstore.name}</strong> : <AppLink href={`/bookstores/${bookstore.slug}`}><strong>{bookstore.name}</strong></AppLink>}{bookstore.is_active === false ? <span>Esta librería ya no está disponible.</span> : bookstore.address ? <span>{bookstore.address}</span> : null}</div><button className="secondary-button" type="button" onClick={() => unfollowBookstore(bookstore.id)}>Dejar de seguir</button></article>)}</div>}{profileStatus ? <p className="feedback" role="status">{profileStatus}</p> : null}</section>
    <section className="reader-profile-tab-panel reader-wanted-dashboard" hidden={section !== "wanted"}><div className="section-heading"><div><p className="section-label">🔎 MI LISTA DE DESEOS</p><h2>Libros que estoy buscando</h2><p>Agregá hasta 20 títulos que te gustaría encontrar. Se mostrarán en tu perfil cuando sea público.</p></div></div>{wantedLoading ? <div className="loading-mark" /> : null}{!wantedLoading && (!atWantedLimit || wantedDraft.id) ? <form className="dashboard-card reader-wanted-form reader-profile-content-block reader-profile-wanted-editor" onSubmit={saveWanted}><div className="reader-wanted-form-fields"><label><span>Título</span><input value={wantedDraft.title} onChange={(event) => changeWanted("title", event.target.value)} maxLength={255} required /></label><label><span>Autor o autora <small>(opcional)</small></span><input value={wantedDraft.author} onChange={(event) => changeWanted("author", event.target.value)} maxLength={255} /></label><label className="reader-wanted-detail-field"><span>Detalle <small>(opcional)</small></span><textarea value={wantedDraft.details} onChange={(event) => changeWanted("details", event.target.value)} maxLength={500} rows={3} placeholder="Ej.: edición, idioma o estado que buscás." /></label></div><div className="card-actions"><div className="card-actions-main">{wantedDraft.id ? <button type="button" className="secondary-button" onClick={cancelWantedEdit} disabled={wantedSaving}>Cancelar</button> : null}<button type="submit" className="primary-button" disabled={wantedSaving}>{wantedSaving ? "Guardando..." : wantedDraft.id ? "Guardar cambios" : "Agregar libro"}</button></div></div></form> : null}{!wantedLoading && atWantedLimit && !wantedDraft.id ? <p className="feedback">Llegaste al máximo de 20 libros. Podés editar o quitar uno para agregar otro.</p> : null}{!wantedLoading && wantedBooks.length === 0 ? <EmptyState compact title="Tu lista todavía está vacía">Sumá esos libros que esperás cruzarte en una librería.</EmptyState> : <div className="reader-wanted-dashboard-list reader-profile-content-block reader-profile-wanted-list">{wantedBooks.map((item) => <article key={item.id} className="dashboard-card reader-wanted-dashboard-item"><div><h3>{item.title}</h3>{item.author ? <p>{item.author}</p> : null}{item.details ? <p className="reader-wanted-details">{item.details}</p> : null}</div><div className="card-actions"><button type="button" className="secondary-button" onClick={() => setWantedDraft(createWantedBookDraft(item))} disabled={wantedSaving}>Editar</button><button type="button" className="secondary-button" onClick={() => removeWanted(item.id)} disabled={wantedSaving}>Quitar</button></div></article>)}</div>}{wantedStatus ? <p className="feedback" role="status">{wantedStatus}</p> : null}</section>
    <section className="reader-profile-tab-panel reader-reading-clubs-dashboard" hidden={section !== "clubs"}><div className="section-heading"><div><p className="section-label">📖 CLUB DE LECTURA</p><h2>Compartí tus encuentros</h2><p>Creá, publicá y compartí los clubes que organizás con la comunidad Bookia.</p></div></div>{!profile.is_public ? <p className="feedback">Podés guardar clubes ocultos. Para publicarlos, primero completá y hacé público tu perfil.</p> : null}<ReadingClubManager host={profile.slug ? { type: "reader", slug: profile.slug } : null} hostName={profile.display_name} source="reader_profile_reading_clubs" genres={genres} genresLoading={genresLoading} genresError={genresError} formClassName="dashboard-card reader-profile-content-block" canPublish={profile.is_public} /></section>
    <aside className="dashboard-card author-profile-invitation" hidden={section !== "info" || authorIsActive}><div><p className="section-label">¿ESCRIBÍS LIBROS?</p><h2>Publicá tus libros en Bookia</h2><p>Activá gratis tu perfil de autor/a y preparate para compartir tus obras.</p></div><AppLink className="secondary-button" href={buildReaderProfileUrl("author")}>Conocer más</AppLink></aside>
    {section === "author" ? <AuthorProfileSection authorProfile={authorProfile} readerProfile={profile} genres={genres} accepted={authorAccepted} onAcceptedChange={setAuthorAccepted} onActivate={activateAuthor} onDeactivate={deactivateAuthor} pending={authorPending} feedback={authorFeedback} /> : null}
  </section>;
}
