import { useEffect, useState } from "react";

import { apiFetch } from "../api";
import { AppLink, navigate } from "../navigation";
import { EmptyState } from "../components/Commerce";

export function ReaderProfilePage({ me, refreshMe }) {
  const profile = me?.reader_profile;
  const [draft, setDraft] = useState(() => ({ display_name: profile?.display_name || "", slug: profile?.slug || "", description: profile?.description || "", is_public: Boolean(profile?.is_public) }));
  const [favorites, setFavorites] = useState([]);
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(Boolean(profile));

  useEffect(() => {
    setDraft({ display_name: profile?.display_name || "", slug: profile?.slug || "", description: profile?.description || "", is_public: Boolean(profile?.is_public) });
  }, [profile?.display_name, profile?.slug, profile?.description, profile?.is_public]);

  useEffect(() => {
    if (!profile) return undefined;
    setLoading(true);
    return apiFetch("/dashboard/favorites").then((data) => setFavorites(data.books || [])).catch((error) => setStatus(error.message)).finally(() => setLoading(false));
  }, [profile]);

  if (me === undefined) return <div className="page-state"><div className="loading-mark" /><p>Cargando perfil...</p></div>;
  if (!profile) return <div className="page-state"><EmptyState title={me ? "Este perfil es solo para lectores" : "Necesitas iniciar sesion"}>{me ? "Tu cuenta de libreria se administra desde el panel." : "Ingresa para ver y editar tu perfil."}</EmptyState><button className="primary-button" onClick={() => navigate(me ? "/dashboard" : "/login")}>{me ? "Ir al panel" : "Ingresar"}</button></div>;

  function update(field, value) { setDraft((current) => ({ ...current, [field]: value })); }
  function save(event) {
    event.preventDefault(); setStatus("Guardando...");
    apiFetch("/dashboard/reader-profile", { method: "PATCH", body: JSON.stringify(draft) })
      .then(() => refreshMe({ preserveOnError: true })).then(() => setStatus("Perfil guardado."))
      .catch((error) => setStatus(error.message));
  }
  function removeFavorite(itemId) {
    apiFetch(`/dashboard/favorites/books/${itemId}`, { method: "DELETE" }).then(() => setFavorites((items) => items.filter((item) => item.id !== itemId))).catch((error) => setStatus(error.message));
  }

  return <section className="store-page reader-page"><div className="section-heading"><div><p className="section-label">MI PERFIL</p><h1>{draft.display_name || "Tu perfil lector"}</h1><p>Contale a la comunidad quién sos, qué leés y qué te inspira.</p></div>{draft.is_public && draft.slug ? <AppLink className="secondary-button" href={`/readers/${draft.slug}`}>Ver perfil público</AppLink> : null}</div>
    <form className="bookstore-profile-section dashboard-card" onSubmit={save}><fieldset className="bookstore-profile-group"><legend>Información pública</legend><div className="bookstore-profile-fields"><label><span>Nombre visible</span><input value={draft.display_name} onChange={(event) => update("display_name", event.target.value)} required /></label><label><span>Alias público</span><input value={draft.slug} onChange={(event) => update("slug", event.target.value)} required={draft.is_public} /></label><label className="bookstore-profile-field-wide"><span>Biografía</span><textarea value={draft.description} onChange={(event) => update("description", event.target.value)} placeholder="Tu perfil personal, profesional, gustos y lecturas favoritas." /></label><label className="bookstore-profile-checkbox"><input type="checkbox" checked={draft.is_public} onChange={(event) => update("is_public", event.target.checked)} />Perfil público</label></div></fieldset><button className="primary-button" type="submit">Guardar perfil</button>{status ? <p className="feedback" role="status">{status}</p> : null}</form>
    <section className="results-section"><div className="section-heading"><div><p className="section-label">LIBROS FAVORITOS</p><h2>Tus lecturas guardadas</h2></div></div>{loading ? <div className="loading-mark" /> : null}{!loading && favorites.length === 0 ? <EmptyState compact title="Todavía no guardaste libros">Explorá el catálogo y usá el corazón para volver a encontrarlos acá.</EmptyState> : <div className="search-results-list">{favorites.map((item) => <article key={item.id} className="search-result-row"><div className="search-result-main"><strong>{item.title}</strong><span>{item.author || "Autor no visible"}</span><span>{item.bookstore?.name}</span></div><button className="secondary-button" type="button" onClick={() => removeFavorite(item.id)}>Quitar de favoritos</button></article>)}</div>}</section>
  </section>;
}