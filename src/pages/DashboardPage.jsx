import { useEffect, useState, useTransition } from "react";

import { apiFetch, resolveApiUrl } from "../api";
import BookstoreProfileEditor from "../components/BookstoreProfileEditor";
import { EmptyState } from "../components/Commerce";
import { ArrowIcon, BookIcon, SearchIcon } from "../components/Icons";
import { buildSingleGenreIds, getSingleGenreValue } from "../genreSelection";
import { getGenreSelectorState } from "../genreSelectorState";
import { navigate } from "../navigation";

const EMPTY_ITEM = {
  title: "",
  author: "",
  publisher: "",
  language: "",
  description: "",
  genre_ids: [],
  book_status: "nuevo",
  availability_status: "available",
};
const AVAILABILITY_LABELS = {
  available: "Disponible",
  reserved: "Reservado",
  sold_out: "Agotado",
  hidden: "Agotado",
};
const EDITABLE_AVAILABILITY_OPTIONS = [
  { value: "available", label: "Disponible" },
  { value: "reserved", label: "Reservado" },
  { value: "hidden", label: "Agotado" },
];
const BOOK_STATUS_LABELS = {
  nuevo: "Nuevo",
  usado: "Usado",
};
const EDITABLE_BOOK_STATUS_OPTIONS = [
  { value: "nuevo", label: "Nuevo" },
  { value: "usado", label: "Usado" },
];
const CATALOG_IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";
const MAX_CATALOG_IMAGES = 3;

function DashboardSection({ label, title, description, countLabel, isOpen, onToggle, children, className = "" }) {
  return (
    <section className={`dashboard-section dashboard-card ${className}`.trim()}>
      <button type="button" className="dashboard-section-toggle" onClick={onToggle} aria-expanded={isOpen}>
        <div>
          <p className="section-label">{label}</p>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        <div className="dashboard-section-meta">
          {countLabel ? <span>{countLabel}</span> : null}
          <strong>{isOpen ? "Ocultar" : "Mostrar"}</strong>
        </div>
      </button>
      {isOpen ? <div className="dashboard-section-body">{children}</div> : null}
    </section>
  );
}

function normalizeEditableAvailability(value) {
  if (value === "reserved") {
    return "reserved";
  }
  if (value === "hidden" || value === "sold_out") {
    return "hidden";
  }
  return "available";
}

function normalizeBookStatus(value) {
  return value === "nuevo" || value === "usado" ? value : "usado";
}

function GenreSelector({ genres, genresLoading = false, genresError = "", selectedGenreIds, onChange, legend = "Generos" }) {
  const state = getGenreSelectorState({ genresLoading, genresError, genres });

  if (state.kind !== "ready") {
    return (
      <div className={`dashboard-field-wide dashboard-genre-status is-${state.kind}`} role={state.kind === "error" ? "alert" : undefined}>
        <span className="dashboard-genre-status-label">{legend}</span>
        <small>{state.message}</small>
      </div>
    );
  }

  return (
    <label>
      <span>{legend}</span>
      <select value={getSingleGenreValue(selectedGenreIds)} onChange={(event) => onChange(buildSingleGenreIds(event.target.value))}>
        <option value="">Sin genero</option>
        {genres.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}
      </select>
    </label>
  );
}

export function DashboardPage({ me, refreshMe }) {
  const [items, setItems] = useState([]);
  const [titleQuery, setTitleQuery] = useState("");
  const [authorQuery, setAuthorQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [genres, setGenres] = useState([]);
  const [genresLoading, setGenresLoading] = useState(true);
  const [genresError, setGenresError] = useState("");
  const [newItem, setNewItem] = useState(EMPTY_ITEM);
  const [editingItemId, setEditingItemId] = useState(null);
  const [draftItem, setDraftItem] = useState(EMPTY_ITEM);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isActiveOpen, setIsActiveOpen] = useState(true);
  const [isHiddenOpen, setIsHiddenOpen] = useState(false);
  const [createBusy, startCreateTransition] = useTransition();
  const [saveBusy, startSaveTransition] = useTransition();
  const [imageBusyId, setImageBusyId] = useState(null);
  const activeItems = items.filter((item) => item.availability_status !== "hidden");
  const hiddenItems = items.filter((item) => item.availability_status === "hidden");
  const hasActiveFilters = Boolean(titleQuery.trim() || authorQuery.trim());

  function loadCatalog(filters = {}) {
    const params = new URLSearchParams();
    const nextTitle = filters.title ?? titleQuery;
    const nextAuthor = filters.author ?? authorQuery;
    if (nextTitle.trim()) params.set("title", nextTitle.trim());
    if (nextAuthor.trim()) params.set("author", nextAuthor.trim());
    setLoading(true);
    apiFetch(`/dashboard/catalog?${params.toString()}`).then((data) => { setItems(data.items); setError(""); }).catch((fetchError) => setError(fetchError.message)).finally(() => setLoading(false));
  }

  useEffect(() => {
    setGenresLoading(true);
    setGenresError("");
    apiFetch("/genres")
      .then((data) => {
        setGenres(data.items || []);
        setGenresError("");
      })
      .catch((fetchError) => {
        setGenres([]);
        setGenresError(fetchError.message || "No pudimos cargar los generos.");
      })
      .finally(() => setGenresLoading(false));
  }, []);

  useEffect(() => { if (me) loadCatalog(); }, [me]);

  if (me === undefined) {
    return <div className="page-state"><div className="loading-mark" /><p>Preparando tu panel...</p></div>;
  }

  if (!me) {
    return <div className="page-state"><EmptyState title="Necesitas iniciar sesion">Ingresa con los datos de tu libreria para administrar el catalogo.</EmptyState><button className="primary-button" onClick={() => navigate("/login")}>Ingresar</button></div>;
  }

  function updateItem(itemId, payload) {
    apiFetch(`/dashboard/catalog/${itemId}`, { method: "PATCH", body: JSON.stringify(payload) }).then(() => loadCatalog()).catch((fetchError) => setError(fetchError.message));
  }

  function toggleFeatured(item) {
    updateItem(item.id, { is_featured: !Boolean(item.is_featured) });
  }

  function updateAvailability(itemId, availabilityStatus) {
    apiFetch(`/dashboard/catalog/${itemId}/availability`, { method: "PATCH", body: JSON.stringify({ availability_status: availabilityStatus }) }).then(() => loadCatalog()).catch((fetchError) => setError(fetchError.message));
  }

  function hideItem(itemId) {
    updateAvailability(itemId, "hidden");
  }
  function uploadItemImages(itemId, files) {
    const selectedFiles = Array.from(files || []);
    if (selectedFiles.length === 0) return;
    const formData = new FormData();
    selectedFiles.forEach((file) => formData.append("images", file));
    setImageBusyId(itemId);
    apiFetch(`/dashboard/catalog/${itemId}/images`, { method: "POST", body: formData })
      .then(() => { setError(""); loadCatalog(); })
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setImageBusyId(null));
  }

  function markPrimaryImage(itemId, imageId) {
    setImageBusyId(itemId);
    apiFetch(`/dashboard/catalog/${itemId}/images/${imageId}`, { method: "PATCH", body: JSON.stringify({ is_primary: true }) })
      .then(() => { setError(""); loadCatalog(); })
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setImageBusyId(null));
  }

  function deleteItemImage(itemId, imageId) {
    setImageBusyId(itemId);
    apiFetch(`/dashboard/catalog/${itemId}/images/${imageId}`, { method: "DELETE" })
      .then(() => { setError(""); loadCatalog(); })
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setImageBusyId(null));
  }

  function startEditing(item) {
    setEditingItemId(item.id);
    setDraftItem({
      title: item.title || "",
      author: item.author || "",
      publisher: item.publisher || "",
      language: item.language || "",
      description: item.description || "",
      genre_ids: item.genre_ids || [],
      book_status: normalizeBookStatus(item.book_status),
      availability_status: normalizeEditableAvailability(item.availability_status),
    });
  }

  function cancelEditing() {
    setEditingItemId(null);
    setDraftItem(EMPTY_ITEM);
  }

  function saveItem(itemId, currentAvailabilityStatus) {
    const nextAvailabilityStatus = normalizeEditableAvailability(draftItem.availability_status);
    startSaveTransition(() => {
      apiFetch(`/dashboard/catalog/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: draftItem.title,
          author: draftItem.author,
          publisher: draftItem.publisher || null,
          language: draftItem.language || null,
          description: draftItem.description || null,
          genre_ids: draftItem.genre_ids || [],
          book_status: normalizeBookStatus(draftItem.book_status),
        }),
      }).then(() => {
        if (nextAvailabilityStatus !== normalizeEditableAvailability(currentAvailabilityStatus)) {
          return apiFetch(`/dashboard/catalog/${itemId}/availability`, {
            method: "PATCH",
            body: JSON.stringify({ availability_status: nextAvailabilityStatus }),
          });
        }
        return null;
      }).then(() => {
        cancelEditing();
        setError("");
        loadCatalog();
      }).catch((fetchError) => setError(fetchError.message));
    });
  }

  function createItem(event) {
    event.preventDefault();
    startCreateTransition(() => {
      apiFetch("/dashboard/catalog", { method: "POST", body: JSON.stringify(newItem) }).then(() => {
        setNewItem(EMPTY_ITEM);
        setError("");
        setIsCreateOpen(false);
        setIsActiveOpen(true);
        loadCatalog();
      }).catch((fetchError) => setError(fetchError.message));
    });
  }

  function logout() {
    apiFetch("/auth/logout", { method: "POST" })
      .catch(() => null)
      .then(() => refreshMe())
      .finally(() => navigate("/"));
  }

  return (
    <section className="dashboard-shell">
      <header className="dashboard-top">
        <div><p className="section-label">Gestiona tu vidriera</p><h1>{me.bookstore.name}</h1><p>Gestiona tu vidriera y lo que ven los lectores en Bookia.</p></div>
        <div className="dashboard-actions"><button className="secondary-button" onClick={() => navigate(`/bookstores/${me.bookstore.slug}`)}>Ver vidriera digital <ArrowIcon /></button><button className="text-link" onClick={logout}>Cerrar sesion</button></div>
      </header>

      {error ? <p className="feedback error">{error}</p> : null}

      <BookstoreProfileEditor bookstore={me.bookstore} onSaved={() => refreshMe({ preserveOnError: true })} onError={setError} />

      <DashboardSection
        label="Nuevo titulo"
        title="Agregar libro manualmente"
        description="Usa este formulario cuando quieras cargar un libro desde cero."
        isOpen={isCreateOpen}
        onToggle={() => setIsCreateOpen((current) => !current)}
        className="dashboard-create"
      >
        <form onSubmit={createItem}>
          <div className="dashboard-card-head dashboard-card-head-inline">
            <p>Solo Titulo y Autor son obligatorios. El resto de los campos son opcionales.</p>
            <button className="primary-button" type="submit" disabled={createBusy}>{createBusy ? "Guardando..." : "Crear libro"}</button>
          </div>
          <div className="dashboard-form-grid dashboard-form-grid-extended">
            <label>Titulo *<input value={newItem.title} onChange={(event) => setNewItem((current) => ({ ...current, title: event.target.value }))} required /></label>
            <label>Autor *<input value={newItem.author} onChange={(event) => setNewItem((current) => ({ ...current, author: event.target.value }))} required /></label>
            <label>Editorial<input value={newItem.publisher} onChange={(event) => setNewItem((current) => ({ ...current, publisher: event.target.value }))} /></label>
            <label>Idioma<input value={newItem.language} onChange={(event) => setNewItem((current) => ({ ...current, language: event.target.value }))} /></label>
            <label>Estado<select value={newItem.book_status} onChange={(event) => setNewItem((current) => ({ ...current, book_status: event.target.value }))}>{EDITABLE_BOOK_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label>
            <GenreSelector
              genres={genres}
              genresLoading={genresLoading}
              genresError={genresError}
              selectedGenreIds={newItem.genre_ids}
              onChange={(genreIds) => setNewItem((current) => ({ ...current, genre_ids: genreIds }))}
            />
            <label className="dashboard-field-wide">Descripcion<textarea value={newItem.description} onChange={(event) => setNewItem((current) => ({ ...current, description: event.target.value }))} rows={4} placeholder="Cuenta brevemente de que trata el libro, su edicion o cualquier detalle util." /></label>
          </div>
        </form>
      </DashboardSection>

      <DashboardSection
        label="Catalogo activo"
        title="Tus publicaciones"
        countLabel={`${activeItems.length} ${activeItems.length === 1 ? "libro" : "libros"}`}
        isOpen={isActiveOpen}
        onToggle={() => setIsActiveOpen((current) => !current)}
      >
        <form className="dashboard-search" onSubmit={(event) => { event.preventDefault(); loadCatalog(); }}>
          <label className="dashboard-search-field dashboard-search-field-title">
            <span>Nombre de libro</span>
            <span className="input-with-icon"><SearchIcon /><input value={titleQuery} onChange={(event) => setTitleQuery(event.target.value)} placeholder="Filtrar por nombre de libro" /></span>
          </label>
          <label className="dashboard-search-field">
            <span>Autor</span>
            <input value={authorQuery} onChange={(event) => setAuthorQuery(event.target.value)} placeholder="Filtrar por autor" />
          </label>
          <button className="primary-button" type="submit">Filtrar</button>
        </form>
        {loading ? <div className="loading-list"><span /><span /><span /></div> : null}
        {!loading && activeItems.length === 0 ? <EmptyState title={hasActiveFilters ? "No hay coincidencias" : "Tu catalogo esta listo para crecer"}>{hasActiveFilters ? "Proba con otros filtros." : "Agrega el primer libro usando el formulario de arriba."}</EmptyState> : null}
        {!loading && activeItems.length > 0 ? <div className="dashboard-list dashboard-list-active">{activeItems.map((item) => {
          const coverUrl = resolveApiUrl(item.cover_image_url);
          const isEditing = editingItemId === item.id;
          const statusLabel = AVAILABILITY_LABELS[item.availability_status] || AVAILABILITY_LABELS[normalizeEditableAvailability(item.availability_status)];
          const bookStatusLabel = BOOK_STATUS_LABELS[normalizeBookStatus(item.book_status)] || BOOK_STATUS_LABELS.usado;
          return (
            <article key={item.id} className={`dashboard-card catalog-item${isEditing ? " is-editing" : ""}`}>
              <div className="catalog-item-summary">{coverUrl ? <img src={coverUrl} alt={`Tapa de ${item.title}`} onError={(event) => { event.currentTarget.hidden = true; }} /> : <span className="catalog-cover-placeholder"><BookIcon /></span>}<div><span className="catalog-id">Libro #{item.id}</span>{item.is_featured ? <span className="status-pill">Destacado</span> : null}<h3>{item.title}</h3><p>{item.author || "Autor no visible"}</p><p>Estado: {isEditing ? BOOK_STATUS_LABELS[normalizeBookStatus(draftItem.book_status)] : bookStatusLabel}</p></div>{isEditing ? <span className={`status-pill status-${draftItem.availability_status}`}>{AVAILABILITY_LABELS[draftItem.availability_status] || statusLabel}</span> : <span className={`status-pill status-${normalizeEditableAvailability(item.availability_status)}`}>{statusLabel}</span>}</div>
              {item.genres?.length ? <div className="store-tags" aria-label="Generos del libro">{item.genres.map((genre) => <span key={genre.id} className="store-tag">{genre.name}</span>)}</div> : null}
              {item.description ? <p className="catalog-item-description">{item.description}</p> : null}
              {isEditing ? <div className="dashboard-form-grid dashboard-form-grid-extended"><label>Titulo<input value={draftItem.title} onChange={(event) => setDraftItem((current) => ({ ...current, title: event.target.value }))} /></label><label>Autor<input value={draftItem.author} onChange={(event) => setDraftItem((current) => ({ ...current, author: event.target.value }))} /></label><label>Disponibilidad<select value={draftItem.availability_status} onChange={(event) => setDraftItem((current) => ({ ...current, availability_status: event.target.value }))}>{EDITABLE_AVAILABILITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label>Editorial<input value={draftItem.publisher} onChange={(event) => setDraftItem((current) => ({ ...current, publisher: event.target.value }))} /></label><label>Idioma<input value={draftItem.language} onChange={(event) => setDraftItem((current) => ({ ...current, language: event.target.value }))} /></label><label>Estado<select value={draftItem.book_status} onChange={(event) => setDraftItem((current) => ({ ...current, book_status: event.target.value }))}>{EDITABLE_BOOK_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><GenreSelector genres={genres} genresLoading={genresLoading} genresError={genresError} selectedGenreIds={draftItem.genre_ids || []} onChange={(genreIds) => setDraftItem((current) => ({ ...current, genre_ids: genreIds }))} /><label className="dashboard-field-wide">Descripcion<textarea value={draftItem.description} onChange={(event) => setDraftItem((current) => ({ ...current, description: event.target.value }))} rows={4} /></label></div> : null}
              {isEditing ? (
                <div className="catalog-image-editor">
                  <div className="catalog-image-editor-head">
                    <div><h4>Fotos del libro</h4><p>{(item.images || []).length} de {MAX_CATALOG_IMAGES} imagenes cargadas.</p></div>
                    <label className={`secondary-button${(item.images || []).length >= MAX_CATALOG_IMAGES || imageBusyId === item.id ? " button-disabled" : ""}`}>
                      {imageBusyId === item.id ? "Subiendo..." : "Subir fotos"}
                      <input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={(item.images || []).length >= MAX_CATALOG_IMAGES || imageBusyId === item.id} onChange={(event) => { uploadItemImages(item.id, event.target.files); event.target.value = ""; }} />
                    </label>
                  </div>
                  {(item.images || []).length ? (
                    <div className="catalog-image-list">
                      {item.images.map((image) => {
                        const imageUrl = resolveApiUrl(image.url);
                        const isCurrentCover = image.source === "current_cover";
                        const isCatalogImage = image.source === "catalog_image";
                        return (
                          <div key={image.id} className="catalog-image-thumb">
                            <img src={imageUrl} alt={`Foto de ${item.title}`} />
                            <div>
                              {image.is_primary ? <span className="status-pill">Principal</span> : null}
                              {isCatalogImage && !image.is_primary ? <button type="button" className="secondary-button" onClick={() => markPrimaryImage(item.id, image.id)} disabled={imageBusyId === item.id}>Marcar principal</button> : null}
                              {isCatalogImage ? <button type="button" className="danger-button" onClick={() => deleteItemImage(item.id, image.id)} disabled={imageBusyId === item.id}>Quitar foto</button> : null}
                              {isCurrentCover ? <span className="status-pill">Foto actual</span> : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <p className="catalog-image-empty">Todavia no cargaste fotos propias para este libro.</p>}
                </div>
              ) : null}              <div className="card-actions"><div className="card-actions-main">{isEditing ? <button type="button" className="secondary-button" onClick={cancelEditing}>Cancelar</button> : <><button type="button" className="secondary-button" onClick={() => startEditing(item)}>Editar</button><button type="button" className="secondary-button" onClick={() => toggleFeatured(item)}>{item.is_featured ? "Quitar destacado" : "Destacar"}</button></>}{isEditing ? <button type="button" className="primary-button" onClick={() => saveItem(item.id, item.availability_status)} disabled={saveBusy}>{saveBusy ? "Guardando..." : "Guardar"}</button> : null}</div><button type="button" className="danger-button" onClick={() => hideItem(item.id)}>Eliminar</button></div>
            </article>
          );
        })}</div> : null}
      </DashboardSection>

      {hiddenItems.length > 0 ? (
        <DashboardSection
          label="Agotados"
          title="Libros agotados"
          countLabel={`${hiddenItems.length} ${hiddenItems.length === 1 ? "libro" : "libros"}`}
          isOpen={isHiddenOpen}
          onToggle={() => setIsHiddenOpen((current) => !current)}
        >
          <div className="dashboard-list">{hiddenItems.map((item) => {
            const coverUrl = resolveApiUrl(item.cover_image_url);
            const bookStatusLabel = BOOK_STATUS_LABELS[normalizeBookStatus(item.book_status)] || BOOK_STATUS_LABELS.usado;
            return (
              <article key={item.id} className="dashboard-card catalog-item">
                <div className="catalog-item-summary">{coverUrl ? <img src={coverUrl} alt={`Tapa de ${item.title}`} onError={(event) => { event.currentTarget.hidden = true; }} /> : <span className="catalog-cover-placeholder"><BookIcon /></span>}<div><span className="catalog-id">Libro #{item.id}</span><h3>{item.title}</h3><p>{item.author || "Autor no visible"}</p><p>Estado: {bookStatusLabel}</p></div><span className={`status-pill status-${item.availability_status}`}>{AVAILABILITY_LABELS[item.availability_status] || item.availability_status}</span></div>
                {item.genres?.length ? <div className="store-tags" aria-label="Generos del libro">{item.genres.map((genre) => <span key={genre.id} className="store-tag">{genre.name}</span>)}</div> : null}
                {item.description ? <p className="catalog-item-description">{item.description}</p> : null}
                <div className="catalog-item-readonly">
                  <p><strong>Titulo:</strong> {item.title}</p>
                  <p><strong>Autor:</strong> {item.author || "Autor no visible"}</p>
                  <p><strong>Editorial:</strong> {item.publisher || "Editorial no visible"}</p>
                  <p><strong>Idioma:</strong> {item.language || "Idioma no visible"}</p>
                  <p><strong>Generos:</strong> {item.genres?.length ? item.genres.map((genre) => genre.name).join(", ") : "Sin generos"}</p>
                  <p><strong>Estado:</strong> {bookStatusLabel}</p>
                </div>
                <div className="card-actions"><button type="button" className="primary-button" onClick={() => updateAvailability(item.id, "available")}>Volver a publicar</button><button type="button" className="secondary-button" onClick={() => navigate(`/bookstores/${me.bookstore.slug}`)}>Ver vidriera digital</button></div>
              </article>
            );
          })}</div>
        </DashboardSection>
      ) : null}
    </section>
  );
}
