import { useEffect, useState } from "react";

import { apiFetch, resolveApiUrl } from "../api";
import { buildNewsFormData, createNewsDraft, displayNewsDate, newsCategoryLabel } from "../newsState";
import { EmptyState } from "./Commerce";

function NewsForm({ draft, onChange, onSubmit, submitLabel, busy, editing = false, onCancel }) {
  function update(field) {
    return (event) => onChange((current) => ({ ...current, [field]: event.target.value }));
  }

  return <form className="news-form" onSubmit={onSubmit}>
    <div className="dashboard-form-grid dashboard-form-grid-extended">
      <label>Categoría<select value={draft.category} onChange={update("category")}><option value="news">Novedad</option><option value="offer">Oferta</option><option value="event">Evento</option></select></label>
      <label>Título *<input value={draft.title} onChange={update("title")} required /></label>
      <label>Fecha del evento<input type="date" value={draft.event_date} onChange={update("event_date")} /></label>
      <label>Imagen opcional<input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => onChange((current) => ({ ...current, image: event.target.files?.[0] || null, remove_image: false }))} /></label>
      {editing && draft.image_url ? <label className="dashboard-checkbox-field"><input type="checkbox" checked={draft.remove_image} onChange={(event) => onChange((current) => ({ ...current, remove_image: event.target.checked, image: event.target.checked ? null : current.image }))} /> Quitar imagen actual</label> : null}
      <label className="dashboard-field-wide">Descripción *<textarea value={draft.description} onChange={update("description")} required rows="4" /></label>
    </div>
    <div className="card-actions"><button className="primary-button" type="submit" disabled={busy}>{busy ? "Guardando..." : submitLabel}</button>{editing ? <button className="secondary-button" type="button" disabled={busy} onClick={onCancel}>Cancelar</button> : null}</div>
  </form>;
}

export function NewsManager() {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [newDraft, setNewDraft] = useState(() => createNewsDraft());
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState(() => createNewsDraft());
  const [busyId, setBusyId] = useState(null);

  function loadNews() {
    setLoading(true);
    return apiFetch("/dashboard/news")
      .then((data) => { setItems(data.items || []); setError(""); })
      .catch((fetchError) => setError(fetchError.message || "No pudimos cargar las novedades."))
      .finally(() => setLoading(false));
  }

  useEffect(() => { loadNews(); }, []);

  function createNews(event) {
    event.preventDefault();
    if (busyId) return;
    setBusyId("new");
    apiFetch("/dashboard/news", { method: "POST", body: buildNewsFormData(newDraft) })
      .then(() => { setNewDraft(createNewsDraft()); return loadNews(); })
      .catch((fetchError) => setError(fetchError.message || "No pudimos crear la novedad."))
      .finally(() => setBusyId(null));
  }

  function startEditing(item) {
    setEditingId(item.id);
    setEditDraft(createNewsDraft(item));
  }

  function cancelEditing() {
    setEditingId(null);
    setEditDraft(createNewsDraft());
  }

  function saveNews(event, itemId) {
    event.preventDefault();
    if (busyId) return;
    setBusyId(itemId);
    apiFetch(`/dashboard/news/${itemId}`, { method: "PATCH", body: buildNewsFormData(editDraft) })
      .then(() => { cancelEditing(); return loadNews(); })
      .catch((fetchError) => setError(fetchError.message || "No pudimos guardar la novedad."))
      .finally(() => setBusyId(null));
  }

  function toggleStatus(item) {
    if (busyId) return;
    setBusyId(item.id);
    apiFetch(`/dashboard/news/${item.id}/status`, { method: "PATCH", body: JSON.stringify({ is_active: !item.is_active }) })
      .then(() => loadNews())
      .catch((fetchError) => setError(fetchError.message || "No pudimos actualizar la novedad."))
      .finally(() => setBusyId(null));
  }

  function deleteNews(item) {
    if (busyId || !globalThis.confirm?.(`¿Eliminar definitivamente “${item.title}”?`)) return;
    setBusyId(item.id);
    apiFetch(`/dashboard/news/${item.id}`, { method: "DELETE" })
      .then(() => loadNews())
      .catch((fetchError) => setError(fetchError.message || "No pudimos eliminar la novedad."))
      .finally(() => setBusyId(null));
  }

  return <div className="news-manager">
    <div className="dashboard-card-head dashboard-card-head-inline"><p>Publicá novedades, ofertas y eventos. El perfil público muestra hasta tres novedades activas.</p></div>
    <NewsForm draft={newDraft} onChange={setNewDraft} onSubmit={createNews} submitLabel="Crear novedad" busy={busyId === "new"} />
    <div aria-live="polite">{loading ? <p>Cargando novedades...</p> : null}</div>
    {error ? <p className="feedback error" role="alert">{error}</p> : null}
    {!loading && items.length === 0 ? <EmptyState title="Todavía no hay novedades">Cuando publiques una, podrá aparecer en tu perfil público.</EmptyState> : null}
    {!loading && items.length > 0 ? <div className="dashboard-list news-list">{items.map((item) => {
      const isEditing = editingId === item.id;
      const isBusy = busyId === item.id;
      return <article className="dashboard-card news-item" key={item.id}>
        {isEditing ? <NewsForm draft={editDraft} onChange={setEditDraft} onSubmit={(event) => saveNews(event, item.id)} submitLabel="Guardar cambios" busy={isBusy} editing onCancel={cancelEditing} /> : <>
          <div className="news-item-summary">
            {item.image_url ? <img src={resolveApiUrl(item.image_url)} alt="" /> : null}
            <div><span className="catalog-id">{newsCategoryLabel(item.category)}</span><h3>{item.title}</h3>{item.event_date ? <p>{displayNewsDate(item.event_date)}</p> : null}<p>{item.description}</p></div>
            <span className={`status-pill${item.is_active ? "" : " status-hidden"}`}>{item.is_active ? "Activa" : "Archivada"}</span>
          </div>
          <div className="card-actions"><button type="button" className="secondary-button" disabled={isBusy} onClick={() => startEditing(item)}>Editar</button><button type="button" className="secondary-button" disabled={isBusy} onClick={() => toggleStatus(item)}>{item.is_active ? "Archivar" : "Reactivar"}</button><button type="button" className="danger-button" disabled={isBusy} onClick={() => deleteNews(item)}>Eliminar</button></div>
        </>}
      </article>;
    })}</div> : null}
  </div>;
}
