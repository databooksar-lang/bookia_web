import { useEffect, useState, useTransition } from "react";

import { apiFetch, resolveApiUrl } from "../api";
import { navigate } from "../navigation";
import { EmptyState } from "../components/Commerce";
import { ArrowIcon, BookIcon, SearchIcon } from "../components/Icons";

const EMPTY_ITEM = { title: "", author: "", publisher: "", language: "", description: "" };
const AVAILABILITY_LABELS = {
  available: "Disponible",
  reserved: "Reservado",
  sold_out: "Agotado",
  hidden: "Oculto",
};

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

export function DashboardPage({ me, refreshMe }) {
  const [items, setItems] = useState([]);
  const [titleQuery, setTitleQuery] = useState("");
  const [authorQuery, setAuthorQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState(EMPTY_ITEM);
  const [editingItemId, setEditingItemId] = useState(null);
  const [draftItem, setDraftItem] = useState(EMPTY_ITEM);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isActiveOpen, setIsActiveOpen] = useState(true);
  const [isHiddenOpen, setIsHiddenOpen] = useState(false);
  const [createBusy, startCreateTransition] = useTransition();
  const [saveBusy, startSaveTransition] = useTransition();
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

  function updateAvailability(itemId, availabilityStatus) {
    apiFetch(`/dashboard/catalog/${itemId}/availability`, { method: "PATCH", body: JSON.stringify({ availability_status: availabilityStatus }) }).then(() => loadCatalog()).catch((fetchError) => setError(fetchError.message));
  }

  function hideItem(itemId) {
    updateAvailability(itemId, "hidden");
  }

  function startEditing(item) {
    setEditingItemId(item.id);
    setDraftItem({
      title: item.title || "",
      author: item.author || "",
      publisher: item.publisher || "",
      language: item.language || "",
      description: item.description || "",
    });
  }

  function cancelEditing() {
    setEditingItemId(null);
    setDraftItem(EMPTY_ITEM);
  }

  function saveItem(itemId) {
    startSaveTransition(() => {
      apiFetch(`/dashboard/catalog/${itemId}`, {
        method: "PATCH",
        body: JSON.stringify({
          title: draftItem.title,
          author: draftItem.author,
          publisher: draftItem.publisher || null,
          language: draftItem.language || null,
          description: draftItem.description || null,
        }),
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
    apiFetch("/auth/logout", { method: "POST" }).finally(() => { refreshMe(); navigate("/"); });
  }

  return (
    <section className="dashboard-shell">
      <header className="dashboard-top">
        <div><p className="section-label">Gestiona tu vidriera</p><h1>{me.bookstore.name}</h1><p>Gestiona tu vidriera y lo que ven los lectores en Bookia.</p></div>
        <div className="dashboard-actions"><button className="secondary-button" onClick={() => navigate(`/bookstores/${me.bookstore.slug}`)}>Ver vidriera digital <ArrowIcon /></button><button className="text-link" onClick={logout}>Cerrar sesion</button></div>
      </header>

      {error ? <p className="feedback error">{error}</p> : null}

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
            <label>Titulo<input value={newItem.title} onChange={(event) => setNewItem((current) => ({ ...current, title: event.target.value }))} required /></label>
            <label>Autor<input value={newItem.author} onChange={(event) => setNewItem((current) => ({ ...current, author: event.target.value }))} required /></label>
            <label>Editorial<input value={newItem.publisher} onChange={(event) => setNewItem((current) => ({ ...current, publisher: event.target.value }))} /></label>
            <label>Idioma<input value={newItem.language} onChange={(event) => setNewItem((current) => ({ ...current, language: event.target.value }))} /></label>
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
          return (
            <article key={item.id} className={`dashboard-card catalog-item${isEditing ? " is-editing" : ""}`}>
              <div className="catalog-item-summary">{coverUrl ? <img src={coverUrl} alt={`Tapa de ${item.title}`} onError={(event) => { event.currentTarget.hidden = true; }} /> : <span className="catalog-cover-placeholder"><BookIcon /></span>}<div><span className="catalog-id">Libro #{item.id}</span><h3>{item.title}</h3><p>{item.author || "Autor no visible"}</p></div><label className="status-select">Disponibilidad<select value={item.availability_status} onChange={(event) => updateAvailability(item.id, event.target.value)}><option value="available">Disponible</option><option value="reserved">Reservado</option><option value="sold_out">Agotado</option><option value="hidden">Oculto</option></select></label></div>
              {item.description ? <p className="catalog-item-description">{item.description}</p> : null}
              {isEditing ? <div className="dashboard-form-grid dashboard-form-grid-extended"><label>Titulo<input value={draftItem.title} onChange={(event) => setDraftItem((current) => ({ ...current, title: event.target.value }))} /></label><label>Autor<input value={draftItem.author} onChange={(event) => setDraftItem((current) => ({ ...current, author: event.target.value }))} /></label><label>Editorial<input value={draftItem.publisher} onChange={(event) => setDraftItem((current) => ({ ...current, publisher: event.target.value }))} /></label><label>Idioma<input value={draftItem.language} onChange={(event) => setDraftItem((current) => ({ ...current, language: event.target.value }))} /></label><label className="dashboard-field-wide">Descripcion<textarea value={draftItem.description} onChange={(event) => setDraftItem((current) => ({ ...current, description: event.target.value }))} rows={4} /></label></div> : null}
              <div className="card-actions"><div className="card-actions-main">{isEditing ? <button type="button" className="secondary-button" onClick={cancelEditing}>Cancelar</button> : <button type="button" className="secondary-button" onClick={() => startEditing(item)}>Editar</button>}{isEditing ? <button type="button" className="primary-button" onClick={() => saveItem(item.id)} disabled={saveBusy}>{saveBusy ? "Guardando..." : "Guardar"}</button> : null}</div><button type="button" className="danger-button" onClick={() => hideItem(item.id)}>Eliminar</button></div>
            </article>
          );
        })}</div> : null}
      </DashboardSection>

      {hiddenItems.length > 0 ? (
        <DashboardSection
          label="Ocultos"
          title="Libros ocultos"
          countLabel={`${hiddenItems.length} ${hiddenItems.length === 1 ? "libro" : "libros"}`}
          isOpen={isHiddenOpen}
          onToggle={() => setIsHiddenOpen((current) => !current)}
        >
          <div className="dashboard-list">{hiddenItems.map((item) => {
            const coverUrl = resolveApiUrl(item.cover_image_url);
            return (
              <article key={item.id} className="dashboard-card catalog-item">
                <div className="catalog-item-summary">{coverUrl ? <img src={coverUrl} alt={`Tapa de ${item.title}`} onError={(event) => { event.currentTarget.hidden = true; }} /> : <span className="catalog-cover-placeholder"><BookIcon /></span>}<div><span className="catalog-id">Libro #{item.id}</span><h3>{item.title}</h3><p>{item.author || "Autor no visible"}</p></div><span className={`status-pill status-${item.availability_status}`}>{AVAILABILITY_LABELS[item.availability_status] || item.availability_status}</span></div>
                <div className="dashboard-form-grid dashboard-form-grid-extended"><label>Titulo<input defaultValue={item.title} onBlur={(event) => updateItem(item.id, { title: event.target.value })} /></label><label>Autor<input defaultValue={item.author} onBlur={(event) => updateItem(item.id, { author: event.target.value })} /></label><label>Editorial<input defaultValue={item.publisher || ""} onBlur={(event) => updateItem(item.id, { publisher: event.target.value || null })} /></label><label>Idioma<input defaultValue={item.language || ""} onBlur={(event) => updateItem(item.id, { language: event.target.value || null })} /></label><label className="dashboard-field-wide">Descripcion<textarea defaultValue={item.description || ""} rows={4} onBlur={(event) => updateItem(item.id, { description: event.target.value || null })} /></label></div>
                <div className="card-actions"><button type="button" className="primary-button" onClick={() => updateAvailability(item.id, "available")}>Volver a publicar</button><button type="button" className="secondary-button" onClick={() => navigate(`/bookstores/${me.bookstore.slug}`)}>Ver vidriera digital</button></div>
              </article>
            );
          })}</div>
        </DashboardSection>
      ) : null}
    </section>
  );
}
