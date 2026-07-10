import { useEffect, useState, useTransition } from "react";

import { apiFetch, resolveApiUrl } from "../api";
import { navigate } from "../navigation";
import { EmptyState } from "../components/Commerce";
import { ArrowIcon, BookIcon, SearchIcon } from "../components/Icons";

const EMPTY_ITEM = { title: "", author: "", publisher: "", language: "" };

export function DashboardPage({ me, refreshMe }) {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [newItem, setNewItem] = useState(EMPTY_ITEM);
  const [createBusy, startCreateTransition] = useTransition();

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
    return <div className="page-state"><EmptyState title="Necesitás iniciar sesión">Ingresá con los datos de tu librería para administrar el catálogo.</EmptyState><button className="primary-button" onClick={() => navigate("/login")}>Ingresar</button></div>;
  }

  function updateItem(itemId, payload) {
    apiFetch(`/dashboard/catalog/${itemId}`, { method: "PATCH", body: JSON.stringify(payload) }).then(() => loadCatalog(query)).catch((fetchError) => setError(fetchError.message));
  }

  function updateAvailability(itemId, availabilityStatus) {
    apiFetch(`/dashboard/catalog/${itemId}/availability`, { method: "PATCH", body: JSON.stringify({ availability_status: availabilityStatus }) }).then(() => loadCatalog(query)).catch((fetchError) => setError(fetchError.message));
  }

  function deleteItem(itemId) {
    apiFetch(`/dashboard/catalog/${itemId}`, { method: "DELETE" }).then(() => loadCatalog(query)).catch((fetchError) => setError(fetchError.message));
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
        <div><p className="section-label">Panel de librería</p><h1>{me.bookstore.name}</h1><p>Gestioná el catálogo que ven los lectores en Bookia.</p></div>
        <div className="dashboard-actions"><button className="secondary-button" onClick={() => navigate(`/bookstores/${me.bookstore.slug}`)}>Ver ficha pública <ArrowIcon /></button><button className="text-link" onClick={logout}>Cerrar sesión</button></div>
      </header>

      <form className="dashboard-search" onSubmit={(event) => { event.preventDefault(); loadCatalog(query); }}>
        <span className="input-with-icon"><SearchIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar en mi catálogo" /></span>
        <button className="primary-button" type="submit">Filtrar</button>
      </form>

      <form className="dashboard-create dashboard-card" onSubmit={createItem}>
        <div className="dashboard-card-head"><div><p className="section-label">Nuevo título</p><h2>Agregar libro manualmente</h2><p>Usá este formulario cuando quieras cargar un libro desde cero.</p></div><button className="primary-button" type="submit" disabled={createBusy}>{createBusy ? "Guardando..." : "Crear libro"}</button></div>
        <div className="dashboard-form-grid">
          <label>Título<input value={newItem.title} onChange={(event) => setNewItem((current) => ({ ...current, title: event.target.value }))} required /></label>
          <label>Autor<input value={newItem.author} onChange={(event) => setNewItem((current) => ({ ...current, author: event.target.value }))} required /></label>
          <label>Editorial<input value={newItem.publisher} onChange={(event) => setNewItem((current) => ({ ...current, publisher: event.target.value }))} /></label>
          <label>Idioma<input value={newItem.language} onChange={(event) => setNewItem((current) => ({ ...current, language: event.target.value }))} /></label>
        </div>
      </form>

      {error ? <p className="feedback error">{error}</p> : null}
      <div className="catalog-heading"><div><p className="section-label">Catálogo activo</p><h2>Tus publicaciones</h2></div><span>{items.length} {items.length === 1 ? "libro" : "libros"}</span></div>
      {loading ? <div className="loading-list"><span /><span /><span /></div> : null}
      {!loading && items.length === 0 ? <EmptyState title={query ? "No hay coincidencias" : "Tu catálogo está listo para crecer"}>{query ? "Probá con otra búsqueda." : "Agregá el primer libro usando el formulario de arriba."}</EmptyState> : null}
      {!loading && items.length > 0 ? <div className="dashboard-list">{items.map((item) => {
        const coverUrl = resolveApiUrl(item.cover_image_url);
        return (
          <article key={item.id} className="dashboard-card catalog-item">
            <div className="catalog-item-summary">{coverUrl ? <img src={coverUrl} alt={`Tapa de ${item.title}`} onError={(event) => { event.currentTarget.hidden = true; }} /> : <span className="catalog-cover-placeholder"><BookIcon /></span>}<div><span className="catalog-id">Libro #{item.id}</span><h3>{item.title}</h3><p>{item.author || "Autor no visible"}</p></div><label className="status-select">Disponibilidad<select value={item.availability_status} onChange={(event) => updateAvailability(item.id, event.target.value)}><option value="available">Disponible</option><option value="reserved">Reservado</option><option value="sold_out">Agotado</option><option value="hidden">Oculto</option></select></label></div>
            <div className="dashboard-form-grid"><label>Título<input defaultValue={item.title} onBlur={(event) => updateItem(item.id, { title: event.target.value })} /></label><label>Autor<input defaultValue={item.author} onBlur={(event) => updateItem(item.id, { author: event.target.value })} /></label><label>Editorial<input defaultValue={item.publisher || ""} onBlur={(event) => updateItem(item.id, { publisher: event.target.value || null })} /></label><label>Idioma<input defaultValue={item.language || ""} onBlur={(event) => updateItem(item.id, { language: event.target.value || null })} /></label></div>
            <div className="card-actions"><button className="secondary-button" onClick={() => navigate(`/bookstores/${me.bookstore.slug}`)}>Ver en el sitio público</button><button className="danger-button" onClick={() => deleteItem(item.id)}>Eliminar</button></div>
          </article>
        );
      })}</div> : null}
    </section>
  );
}
