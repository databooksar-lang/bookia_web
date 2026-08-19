import { useEffect, useState, useTransition } from "react";

import { apiFetch } from "../api";
import { getGenreSelectorState } from "../genreSelectorState";
import { buildReadingClubPayload, createReadingClubDraft, displayReadingClubDate } from "../readingClubState";
import { EmptyState } from "./Commerce";
import { ReadingClubShareMenu } from "./ReadingClubShareMenu";

function ReadingClubGenreField({ genres, loading, error, value, onChange }) {
  const state = getGenreSelectorState({ genresLoading: loading, genresError: error, genres });

  if (state.kind !== "ready") {
    return <div className={`dashboard-field-wide dashboard-genre-status is-${state.kind}`} role={state.kind === "error" ? "alert" : undefined}><span className="dashboard-genre-status-label">Género *</span><small>{state.message}</small></div>;
  }

  return <label>Género *<select value={value} onChange={(event) => onChange(event.target.value)} required><option value="">Seleccionar género</option>{genres.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}</select></label>;
}

export function ReadingClubManager({ host, hostName, source, onClubCountChange, genres, genresLoading, genresError, formClassName = "" }) {
  const [clubs, setClubs] = useState([]);
  const [clubsLoading, setClubsLoading] = useState(true);
  const [error, setError] = useState("");
  const [newClub, setNewClub] = useState(createReadingClubDraft());
  const [editingClubId, setEditingClubId] = useState(null);
  const [draftClub, setDraftClub] = useState(createReadingClubDraft());
  const [isPending, startTransition] = useTransition();

  function loadClubs() {
    setClubsLoading(true);
    return apiFetch("/dashboard/reading-clubs")
      .then((data) => { setClubs(data.items || []); setError(""); })
      .catch((fetchError) => setError(fetchError.message || "No pudimos cargar los clubes de lectura."))
      .finally(() => setClubsLoading(false));
  }

  useEffect(() => {
    loadClubs();
  }, []);

  useEffect(() => { onClubCountChange?.(clubs.length); }, [clubs.length, onClubCountChange]);

  function createClub(event) {
    event.preventDefault();
    startTransition(() => {
      apiFetch("/dashboard/reading-clubs", { method: "POST", body: JSON.stringify(buildReadingClubPayload(newClub)) })
        .then(() => { setNewClub(createReadingClubDraft()); setError(""); return loadClubs(); })
        .catch((fetchError) => setError(fetchError.message));
    });
  }

  function startEditing(club) {
    setEditingClubId(club.id);
    setDraftClub(createReadingClubDraft(club));
  }

  function cancelEditing() {
    setEditingClubId(null);
    setDraftClub(createReadingClubDraft());
  }

  function saveClub(clubId) {
    startTransition(() => {
      apiFetch(`/dashboard/reading-clubs/${clubId}`, { method: "PATCH", body: JSON.stringify(buildReadingClubPayload(draftClub)) })
        .then(() => { cancelEditing(); setError(""); return loadClubs(); })
        .catch((fetchError) => setError(fetchError.message));
    });
  }

  return <div className="reading-club-manager">
    <form className={formClassName} onSubmit={createClub}>
      <div className="dashboard-card-head dashboard-card-head-inline"><p>Título, descripción y género son obligatorios. Fecha y lugar pueden quedar a confirmar.</p><button className="primary-button" type="submit" disabled={isPending}>{isPending ? "Guardando..." : "Crear club"}</button></div>
      <div className="dashboard-form-grid dashboard-form-grid-extended">
        <label>Título *<input value={newClub.title} onChange={(event) => setNewClub((current) => ({ ...current, title: event.target.value }))} required /></label>
        <ReadingClubGenreField genres={genres} loading={genresLoading} error={genresError} value={newClub.genre_id} onChange={(genreId) => setNewClub((current) => ({ ...current, genre_id: genreId }))} />
        <label>Fecha<input type="date" value={newClub.meeting_date} onChange={(event) => setNewClub((current) => ({ ...current, meeting_date: event.target.value }))} /></label>
        <label>Lugar<input value={newClub.location} onChange={(event) => setNewClub((current) => ({ ...current, location: event.target.value }))} placeholder="Ej.: Sala del fondo" /></label>
        <label>Página externa<input value={newClub.external_url} onChange={(event) => setNewClub((current) => ({ ...current, external_url: event.target.value }))} placeholder="Ej.: sitio.com/club" /></label>
        <label className="dashboard-field-wide">Descripción *<textarea value={newClub.description} onChange={(event) => setNewClub((current) => ({ ...current, description: event.target.value }))} rows={4} required /></label>
        <label className="dashboard-checkbox-field"><input type="checkbox" checked={newClub.is_visible} onChange={(event) => setNewClub((current) => ({ ...current, is_visible: event.target.checked }))} /> Publicar en perfil público</label>
      </div>
    </form>

    {clubsLoading ? <div className="loading-list"><span /><span /><span /></div> : null}
    {!clubsLoading && clubs.length === 0 ? <EmptyState title="Todavía no hay clubes cargados">Cuando crees un club visible, va a aparecer en tu perfil público.</EmptyState> : null}
    {!clubsLoading && clubs.length > 0 ? <div className="dashboard-list reading-club-list">{clubs.map((club) => {
      const isEditing = editingClubId === club.id;
      return <article key={club.id} className="dashboard-card reading-club-item">
        {isEditing ? <div className="dashboard-form-grid dashboard-form-grid-extended">
          <label>Título *<input value={draftClub.title} onChange={(event) => setDraftClub((current) => ({ ...current, title: event.target.value }))} required /></label>
          <ReadingClubGenreField genres={genres} loading={genresLoading} error={genresError} value={draftClub.genre_id} onChange={(genreId) => setDraftClub((current) => ({ ...current, genre_id: genreId }))} />
          <label>Fecha<input type="date" value={draftClub.meeting_date} onChange={(event) => setDraftClub((current) => ({ ...current, meeting_date: event.target.value }))} /></label>
          <label>Lugar<input value={draftClub.location} onChange={(event) => setDraftClub((current) => ({ ...current, location: event.target.value }))} /></label>
          <label>Página externa<input value={draftClub.external_url} onChange={(event) => setDraftClub((current) => ({ ...current, external_url: event.target.value }))} placeholder="Ej.: sitio.com/club" /></label>
          <label className="dashboard-field-wide">Descripción *<textarea value={draftClub.description} onChange={(event) => setDraftClub((current) => ({ ...current, description: event.target.value }))} rows={4} required /></label>
          <label className="dashboard-checkbox-field"><input type="checkbox" checked={draftClub.is_visible} onChange={(event) => setDraftClub((current) => ({ ...current, is_visible: event.target.checked }))} /> Publicar en perfil público</label>
        </div> : <><div className="catalog-item-summary reading-club-summary"><span className={`status-pill${club.is_visible ? "" : " status-hidden"}`}>{club.is_visible ? "Publicado" : "Oculto"}</span><div><span className="catalog-id">{club.genre?.name || "Sin género"}</span><h3>{club.title}</h3><p>{displayReadingClubDate(club.meeting_date)}{club.location ? ` / ${club.location}` : ""}</p></div></div><p className="catalog-item-description">{club.description}</p></>}
        <div className="card-actions"><div className="card-actions-main">{isEditing ? <button type="button" className="secondary-button" onClick={cancelEditing}>Cancelar</button> : <><button type="button" className="secondary-button" onClick={() => startEditing(club)}>Editar</button>{club.is_visible ? <ReadingClubShareMenu club={club} host={host} hostName={hostName} bookstoreId={host?.type === "bookstore" ? host.id : null} source={source} /> : null}</>}{isEditing ? <button type="button" className="primary-button" onClick={() => saveClub(club.id)} disabled={isPending}>{isPending ? "Guardando..." : "Guardar"}</button> : null}</div></div>
      </article>;
    })}</div> : null}
    {error ? <p className="feedback error" role="alert">{error}</p> : null}
  </div>;
}
