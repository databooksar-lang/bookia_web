import { useEffect, useRef, useState } from "react";

import { apiFetch, resolveApiUrl } from "../api";
import {
  createAuthorBook,
  createAuthorBookDraft,
  deleteAuthorBook,
  getAuthorBookCapacityState,
  loadAuthorBooks,
  normalizeAuthorBooks,
  setAuthorBookHidden,
  updateAuthorBook,
} from "../authorBooksState";
import { EmptyState } from "./Commerce";

function authorBookCoverSrc(book) {
  const version = encodeURIComponent(book.updated_at || book.id);
  return resolveApiUrl(`${book.cover_url}?v=${version}`);
}

export function AuthorBooksPanel({ books, draft, genres, loading, saving, feedback, previewUrl, onDraftChange, onCoverChange, onSubmit, onCancelEdit, onEdit, onToggleHidden, onDelete }) {
  const capacity = getAuthorBookCapacityState(books);
  const editingBook = draft.id ? books.find((book) => book.id === draft.id) : null;
  const canCreate = !loading && (!capacity.atLimit || Boolean(draft.id));
  const currentCover = previewUrl || (editingBook ? authorBookCoverSrc(editingBook) : "");

  return <section className="author-books" aria-labelledby="author-books-title">
    <div className="author-books-heading"><div><p className="section-label">OBRAS PROPIAS</p><h2 id="author-books-title">Mis libros</h2><p>Gestioná hasta cinco obras. Cada libro visible se publica en tu perfil público mientras tu perfil de autor/a esté activo.</p></div><strong className="author-books-capacity">{capacity.count} de 5 libros</strong></div>
    {canCreate ? <form className="dashboard-card author-book-form" onSubmit={onSubmit}>
      <div className="author-book-form-heading"><div><p className="section-label">{draft.id ? "EDICIÓN" : "NUEVA OBRA"}</p><h3>{draft.id ? "Editar libro" : "Agregar libro"}</h3></div>{draft.id ? <button className="secondary-button" type="button" onClick={onCancelEdit} disabled={saving}>Cancelar</button> : null}</div>
      <div className="author-book-form-grid">
        <label><span>Título</span><input value={draft.title} onChange={(event) => onDraftChange("title", event.target.value)} maxLength={500} required disabled={saving} /></label>
        <label><span>Género</span><select value={draft.genre_id} onChange={(event) => onDraftChange("genre_id", event.target.value)} required disabled={saving}><option value="">Seleccioná un género</option>{genres.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}</select></label>
        <label><span>Editorial <small>(opcional)</small></span><input value={draft.publisher} onChange={(event) => onDraftChange("publisher", event.target.value)} maxLength={255} disabled={saving} /></label>
        <label><span>Año <small>(opcional)</small></span><input type="number" min="1000" max="9999" step="1" value={draft.publication_year} onChange={(event) => onDraftChange("publication_year", event.target.value)} disabled={saving} /></label>
        <label className="author-book-field-wide"><span>Sinopsis</span><textarea value={draft.synopsis} onChange={(event) => onDraftChange("synopsis", event.target.value)} maxLength={5000} rows={6} required disabled={saving} /></label>
        <label className="author-book-cover-field"><span>Portada{draft.id ? " (opcional)" : ""}</span><input type="file" accept="image/png,image/jpeg,image/webp" onChange={(event) => onCoverChange(event.target.files?.[0] || null)} required={!draft.id} disabled={saving} /><small>{draft.id ? "Conservar portada actual si no elegís otra imagen." : "PNG, JPEG o WebP de hasta 5 MB."}</small></label>
        {currentCover ? <img className="author-book-cover-preview" src={currentCover} alt={previewUrl ? "Vista previa de la nueva portada" : `Portada actual de ${draft.title}`} crossOrigin="use-credentials" /> : null}
      </div>
      <button className="primary-button" type="submit" disabled={saving}>{saving ? "Guardando..." : draft.id ? "Guardar cambios" : "Agregar libro"}</button>
    </form> : <p className="feedback author-books-limit">Llegaste al máximo de 5 libros. Podés editar tus libros o eliminar uno para liberar un cupo.</p>}
    {loading ? <div className="loading-mark" /> : null}
    {!loading && books.length === 0 ? <EmptyState compact title="Todavía no cargaste libros">Sumá tu primera obra con su portada, sinopsis y género.</EmptyState> : null}
    {!loading && books.length > 0 ? <div className="author-book-list">{books.map((book) => <article key={book.id} className={`dashboard-card author-book-card${book.is_hidden ? " is-hidden" : ""}`}>
      <img className="author-book-card-cover" src={authorBookCoverSrc(book)} alt={`Portada de ${book.title}`} crossOrigin="use-credentials" />
      <div className="author-book-card-copy"><div className="author-book-card-title"><div><span className={`author-book-visibility${book.is_hidden ? " is-hidden" : ""}`}>{book.is_hidden ? "Oculto" : "Visible"}</span><h3>{book.title}</h3></div></div><p className="author-book-genre">{book.genre.name}</p>{book.publisher || book.publication_year ? <p>{[book.publisher, book.publication_year].filter(Boolean).join(" · ")}</p> : null}<p className="author-book-synopsis">{book.synopsis}</p></div>
      <div className="card-actions author-book-actions"><button className="secondary-button" type="button" onClick={() => onEdit(book)} disabled={saving}>Editar</button><button className="secondary-button" type="button" onClick={() => onToggleHidden(book)} disabled={saving}>{book.is_hidden ? "Mostrar" : "Ocultar"}</button><button className="danger-button" type="button" onClick={() => onDelete(book)} disabled={saving}>Eliminar</button></div>
    </article>)}</div> : null}
    {feedback ? <p className="feedback" role="status">{feedback}</p> : null}
  </section>;
}

export function AuthorBooksManager({ genres = [] }) {
  const [books, setBooks] = useState([]);
  const [draft, setDraft] = useState(() => createAuthorBookDraft());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const fileInputReset = useRef(0);

  useEffect(() => {
    let active = true;
    setLoading(true);
    loadAuthorBooks(apiFetch)
      .then((items) => { if (active) { setBooks(items); setFeedback(""); } })
      .catch((error) => { if (active) setFeedback(error.message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!draft.cover || typeof URL === "undefined" || !URL.createObjectURL) { setPreviewUrl(""); return undefined; }
    const nextUrl = URL.createObjectURL(draft.cover);
    setPreviewUrl(nextUrl);
    return () => URL.revokeObjectURL(nextUrl);
  }, [draft.cover]);

  function resetDraft() {
    setDraft(createAuthorBookDraft());
    fileInputReset.current += 1;
  }

  function changeDraft(field, value) {
    setDraft((current) => ({ ...current, [field]: value }));
  }

  function saveBook(event) {
    event.preventDefault();
    setSaving(true);
    setFeedback(draft.id ? "Guardando cambios..." : "Agregando libro...");
    const request = draft.id ? updateAuthorBook(apiFetch, draft) : createAuthorBook(apiFetch, draft);
    request
      .then((rawItem) => {
        const item = normalizeAuthorBooks([rawItem])[0];
        if (!item) throw new Error("No pudimos leer el libro guardado.");
        setBooks((current) => draft.id ? current.map((book) => book.id === item.id ? item : book) : [item, ...current]);
        resetDraft();
        setFeedback(draft.id ? "Libro actualizado." : "Libro agregado.");
      })
      .catch((error) => setFeedback(error.message))
      .finally(() => setSaving(false));
  }

  function toggleHidden(book) {
    setSaving(true);
    setAuthorBookHidden(apiFetch, book)
      .then((rawItem) => {
        const item = normalizeAuthorBooks([rawItem])[0];
        if (!item) throw new Error("No pudimos leer el libro actualizado.");
        setBooks((current) => current.map((candidate) => candidate.id === item.id ? item : candidate));
        setFeedback(item.is_hidden ? "Libro ocultado." : "Libro visible en tu panel.");
      })
      .catch((error) => setFeedback(error.message))
      .finally(() => setSaving(false));
  }

  function removeBook(book) {
    if (!window.confirm(`¿Querés eliminar definitivamente "${book.title}"?`)) return;
    setSaving(true);
    deleteAuthorBook(apiFetch, book.id)
      .then(() => {
        setBooks((current) => current.filter((candidate) => candidate.id !== book.id));
        if (draft.id === book.id) resetDraft();
        setFeedback("Libro eliminado.");
      })
      .catch((error) => setFeedback(error.message))
      .finally(() => setSaving(false));
  }

  return <AuthorBooksPanel
    key={fileInputReset.current}
    books={books}
    draft={draft}
    genres={genres}
    loading={loading}
    saving={saving}
    feedback={feedback}
    previewUrl={previewUrl}
    onDraftChange={changeDraft}
    onCoverChange={(cover) => changeDraft("cover", cover)}
    onSubmit={saveBook}
    onCancelEdit={resetDraft}
    onEdit={(book) => { setDraft(createAuthorBookDraft(book)); setFeedback(""); }}
    onToggleHidden={toggleHidden}
    onDelete={removeBook}
  />;
}
