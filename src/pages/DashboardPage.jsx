import { useEffect, useState, useTransition } from "react";

import { apiFetch, resolveApiUrl } from "../api";
import { navigate } from "../navigation";
import { EmptyState } from "../components/Commerce";
import { ArrowIcon, BookIcon, SearchIcon } from "../components/Icons";

const EMPTY_ITEM = { title: "", author: "", publisher: "", language: "" };
const AVAILABILITY_LABELS = {
  available: "Disponible",
  reserved: "Reservado",
  sold_out: "Agotado",
  hidden: "Oculto",
};

export function DashboardPage({ me, refreshMe }) {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState(EMPTY_ITEM);
  const [createBusy, startCreateTransition] = useTransition();
  const activeItems = items.filter((item) => item.availability_status !== "hidden");
  const hiddenItems = items.filter((item) => item.availability_status === "hidden");

  function loadCatalog(search = "") {
    const params = new URLSearchParams();
    if (search) params.set("query", search);
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
    apiFetch(`/dashboard/catalog/${itemId}`, { method: "PATCH", body: JSON.stringify(payload) }).then(() => loadCatalog(query)).catch((fetchError) => setError(fetchError.message));
  }

  function updateAvailability(itemId, availabilityStatus) {
    apiFetch(`/dashboard/catalog/${itemId}/availability`, { method: "PATCH", body: JSON.stringify({ availability_status: availabilityStatus }) }).then(() => loadCatalog(query)).catch((fetchError) => setError(fetchError.message));
  }

  function hideItem(itemId) {
    updateAvailability(itemId, "hidden");
  }

  function createItem(event) {
    event.preventDefault();
    startCreateTransition(() => {
      apiFetch("/dashboard/catalog", { method: "POST", body: JSON.stringify(newItem) }).then(() => { setNewItem(EMPTY_ITEM); setError(""); loadCatalog(query); }).catch((fetchError) => setError(fetchError.message));
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

      <form className="dashboard-search" onSubmit={(event) => { event.preventDefault(); loadCatalog(query); }}>
        <span className="input-with-icon"><SearchIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en mi catalogo" /></span>
        <button className="primary-button" type="submit">Filtrar</button>
      </form>

      <form className="dashboard-create dashboard-card" onSubmit={createItem}>
        <div className="dashboard-card-head"><div><p className="section-label">Nuevo titulo</p><h2>Agregar libro manualmente</h2><p>Usa este formulario cuando quieras cargar un libro desde cero.</p></div><button className="primary-button" type="submit" disabled={createBusy}>{createBusy ? "Guardando..." : "Crear libro"}</button></div>
        <div className="dashboard-form-grid">
          <label>Titulo<input value={newItem.title} onChange={(event) => setNewItem((current) => ({ ...current, title: event.target.value }))} required /></label>
          <label>Autor<input value={newItem.author} onChange={(event) => setNewItem((current) => ({ ...current, author: event.target.value }))} required /></label>
          <label>Editorial<input value={newItem.publisher} onChange={(event) => setNewItem((current) => ({ ...current, publisher: event.target.value }))} /></label>
          <label>Idioma<input value={newItem.language} onChange={(event) => setNewItem((current) => ({ ...current, language: event.target.value }))} /></label>
        </div>
      </form>

      {error ? <p className="feedback error">{error}</p> : null}
      <div className="catalog-heading"><div><p className="section-label">Catalogo activo</p><h2>Tus publicaciones</h2></div><span>{activeItems.length} {activeItems.length === 1 ? "libro" : "libros"}</span></div>
      {loading ? <div className="loading-list"><span /><span /><span /></div> : null}
      {!loading && activeItems.length === 0 ? <EmptyState title={query ? "No hay coincidencias" : "Tu catalogo esta listo para crecer"}>{query ? "Proba con otra busqueda." : "Agrega el primer libro usando el formulario de arriba."}</EmptyState> : null}
      {!loading && activeItems.length > 0 ? <div className="dashboard-list dashboard-list-active">{activeItems.map((item) => {
        const coverUrl = resolveApiUrl(item.cover_image_url);
        return (
          <article key={item.id} className="dashboard-card catalog-item">
            <div className="catalog-item-summary">{coverUrl ? <img src={coverUrl} alt={`Tapa de ${item.title}`} onError={(event) => { event.currentTarget.hidden = true; }} /> : <span className="catalog-cover-placeholder"><BookIcon /></span>}<div><span className="catalog-id">Libro #{item.id}</span><h3>{item.title}</h3><p>{item.author || "Autor no visible"}</p></div><label className="status-select">Disponibilidad<select value={item.availability_status} onChange={(event) => updateAvailability(item.id, event.target.value)}><option value="available">Disponible</option><option value="reserved">Reservado</option><option value="sold_out">Agotado</option><option value="hidden">Oculto</option></select></label></div>
            <div className="dashboard-form-grid"><label>Titulo<input defaultValue={item.title} onBlur={(event) => updateItem(item.id, { title: event.target.value })} /></label><label>Autor<input defaultValue={item.author} onBlur={(event) => updateItem(item.id, { author: event.target.value })} /></label><label>Editorial<input defaultValue={item.publisher || ""} onBlur={(event) => updateItem(item.id, { publisher: event.target.value || null })} /></label><label>Idioma<input defaultValue={item.language || ""} onBlur={(event) => updateItem(item.id, { language: event.target.value || null })} /></label></div>
            <div className="card-actions"><button className="danger-button" onClick={() => hideItem(item.id)}>Eliminar</button></div>
          </article>
        );
      })}</div> : null}
      {!loading && hiddenItems.length > 0 ? <>
        <div className="catalog-heading"><div><p className="section-label">Ocultos</p><h2>Libros ocultos</h2></div><span>{hiddenItems.length} {hiddenItems.length === 1 ? "libro" : "libros"}</span></div>
        <div className="dashboard-list">{hiddenItems.map((item) => {
          const coverUrl = resolveApiUrl(item.cover_image_url);
          return (
            <article key={item.id} className="dashboard-card catalog-item">
              <div className="catalog-item-summary">{coverUrl ? <img src={coverUrl} alt={`Tapa de ${item.title}`} onError={(event) => { event.currentTarget.hidden = true; }} /> : <span className="catalog-cover-placeholder"><BookIcon /></span>}<div><span className="catalog-id">Libro #{item.id}</span><h3>{item.title}</h3><p>{item.author || "Autor no visible"}</p></div><span className={`status-pill status-${item.availability_status}`}>{AVAILABILITY_LABELS[item.availability_status] || item.availability_status}</span></div>
              <div className="dashboard-form-grid"><label>Titulo<input defaultValue={item.title} onBlur={(event) => updateItem(item.id, { title: event.target.value })} /></label><label>Autor<input defaultValue={item.author} onBlur={(event) => updateItem(item.id, { author: event.target.value })} /></label><label>Editorial<input defaultValue={item.publisher || ""} onBlur={(event) => updateItem(item.id, { publisher: event.target.value || null })} /></label><label>Idioma<input defaultValue={item.language || ""} onBlur={(event) => updateItem(item.id, { language: event.target.value || null })} /></label></div>
              <div className="card-actions"><button className="primary-button" onClick={() => updateAvailability(item.id, "available")}>Volver a publicar</button><button className="secondary-button" onClick={() => navigate(`/bookstores/${me.bookstore.slug}`)}>Ver vidriera digital</button></div>
            </article>
          );
        })}</div>
      </> : null}
    </section>
  );
}

