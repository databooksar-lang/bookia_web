import { useEffect, useState } from "react";

import { apiFetch, resolveApiUrl } from "../api";
import { buildFacebookHref, buildInstagramHref, buildWebsiteHref, formatDisplayPhone, formatDisplayUrl } from "../formatters";
import { AppLink, navigate } from "../navigation";
import { EmptyState, WhatsAppButton } from "../components/Commerce";
import { ArrowIcon, BookIcon, LocationIcon, SearchIcon, StoreIcon, WhatsAppIcon } from "../components/Icons";

function BookCover({ item, className = "book-cover", interactive = false, onOpen }) {
  const [broken, setBroken] = useState(false);
  const coverUrl = item.cover_image_url ? resolveApiUrl(item.cover_image_url) : null;
  const image = coverUrl && !broken ? (
    <img className={className} src={coverUrl} alt={`Tapa de ${item.title}`} onError={() => setBroken(true)} />
  ) : (
    <span className={`${className} book-cover-placeholder`} aria-label={`Sin tapa disponible para ${item.title}`}>
      <BookIcon size={24} />
      <small>Sin tapa</small>
    </span>
  );

  if (!interactive || !coverUrl || broken) {
    return image;
  }

  return (
    <button type="button" className="book-cover-button" aria-label={`Ampliar tapa de ${item.title}`} onClick={() => onOpen({ title: item.title, url: coverUrl })}>
      {image}
    </button>
  );
}

function HeroSearch({ initialQuery = "", initialField = "general", onSearch }) {
  const [query, setQuery] = useState(initialQuery);
  const [field, setField] = useState(initialField);

  function submit(event) {
    event.preventDefault();
    onSearch({ query, field });
  }

  return (
    <section className="hero">
      <div className="hero-copy">
        <p className="section-label">Tu proxima lectura esta cerca</p>
        <h1>El libro que buscas, <em>mas cerca</em> de lo que imaginas.</h1>
        <p className="hero-lead">Bookia reune catalogos de librerias, vendedores de usados y emprendimientos para que encuentres tu proxima historia en tu comunidad.</p>
        <form className="search-panel" onSubmit={submit} aria-label="Buscar libros">
          <label className="search-field search-field-type">
            <span>Buscar por</span>
            <select value={field} onChange={(event) => setField(event.target.value)}>
              <option value="general">Titulo, autor o editorial</option>
              <option value="title">Solo titulo</option>
              <option value="author">Autor</option>
              <option value="publisher">Editorial</option>
            </select>
          </label>
          <label className="search-field search-field-query">
            <span>Palabra clave</span>
            <span className="input-with-icon">
              <SearchIcon />
              <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej: Rayuela, Borges o Sudamericana" />
            </span>
          </label>
          <button className="primary-button search-submit" type="submit">Buscar libros <ArrowIcon /></button>
        </form>
      </div>
      <div className="hero-books" aria-hidden="true">
        <span className="hero-book hero-book-one"><small>Historias</small><strong>que nos<br />encuentran</strong></span>
        <span className="hero-book hero-book-two"><small>Autores</small><strong>de aca<br />y de alla</strong></span>
        <span className="hero-book hero-book-three"><small>Lecturas</small><strong>para cada<br />momento</strong></span>
        <span className="hero-leaf hero-leaf-one" />
        <span className="hero-leaf hero-leaf-two" />
      </div>
    </section>
  );
}

function SearchResults({ filters, stores }) {
  const [items, setItems] = useState([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [selectedCover, setSelectedCover] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasSearched = filters !== null;
  const visibleItems = items.filter((item) => item.availability_status !== "hidden");

  useEffect(() => {
    if (!selectedCover) return undefined;
    const onKeyDown = (event) => event.key === "Escape" && setSelectedCover(null);
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedCover]);

  useEffect(() => {
    if (!hasSearched) {
      setItems([]);
      setSelectedStore("");
      setError("");
      setSelectedCover(null);
      return;
    }

    const params = new URLSearchParams();
    if (filters.query) params.set("query", filters.query);
    if (filters.field) params.set("field", filters.field);
    if (selectedStore) params.set("bookstore", selectedStore);

    setLoading(true);
    apiFetch(`/search?${params.toString()}`)
      .then((data) => {
        setItems(data.items);
        setError("");
      })
      .catch((fetchError) => {
        setItems([]);
        setError(fetchError.message);
      })
      .finally(() => setLoading(false));
  }, [filters, hasSearched, selectedStore]);

  if (!hasSearched) return null;

  return (
    <section className="results-section" id="resultados" aria-live="polite">
      <div className="section-heading results-heading">
        <div>
          <p className="section-label">Catalogos locales</p>
          <h2>Resultados de busqueda</h2>
          <p>{loading ? "Buscando en los catalogos..." : `${visibleItems.length} ${visibleItems.length === 1 ? "libro encontrado" : "libros encontrados"}`}</p>
        </div>
        <label className="compact-filter">
          <span>Libreria</span>
          <select value={selectedStore} onChange={(event) => setSelectedStore(event.target.value)}>
            <option value="">Todas las librerias</option>
            {stores.map((store) => <option key={store.id} value={store.slug}>{store.name}</option>)}
          </select>
        </label>
      </div>
      {error ? <p className="feedback error">{error}</p> : null}
      {loading ? <div className="loading-list" aria-label="Cargando resultados"><span /><span /><span /></div> : null}
      {!loading && !error && visibleItems.length === 0 ? <EmptyState title="No encontramos coincidencias">Proba con otro titulo, autor o editorial, o busca en todas las librerias.</EmptyState> : null}
      {!loading && visibleItems.length > 0 ? (
        <div className="search-results-list" role="list">
          {visibleItems.map((item) => (
            <article key={item.id} className="search-result-row" role="listitem">
              <BookCover item={item} className="search-result-cover" interactive onOpen={setSelectedCover} />
              <div className="search-result-main">
                <p className="result-kicker">{item.publisher || "Editorial no visible"}</p>
                <h3>{item.title}</h3>
                <p>{item.author || "Autor no visible"}</p>
              </div>
              <div className="search-result-store-info">
                <span>Libreria</span>
                <AppLink href={`/bookstores/${item.bookstore.slug}`}>{item.bookstore.name} <ArrowIcon size={15} /></AppLink>
              </div>
              <WhatsAppButton className="primary-button search-result-whatsapp" phoneCountryCd={item.bookstore.phone_country_cd} phone={item.bookstore.phone}>
                <WhatsAppIcon size={19} /> Contactar
              </WhatsAppButton>
            </article>
          ))}
        </div>
      ) : null}
      {selectedCover ? (
        <div className="search-cover-modal" role="dialog" aria-modal="true" aria-label={`Tapa ampliada de ${selectedCover.title}`} onClick={() => setSelectedCover(null)}>
          <div className="search-cover-modal-card" onClick={(event) => event.stopPropagation()}>
            <button type="button" className="search-cover-modal-close" onClick={() => setSelectedCover(null)}>Cerrar</button>
            <img className="search-cover-modal-image" src={selectedCover.url} alt={`Tapa ampliada de ${selectedCover.title}`} />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function BenefitsStrip() {
  const benefits = [
    [<LocationIcon key="icon" />, "Cerca tuyo", "Resultados de tu comunidad"],
    [<StoreIcon key="icon" />, "Librerias y vendedores", "Nuevos, usados y hallazgos"],
    [<WhatsAppIcon key="icon" />, "Contacto directo", "Consulta por WhatsApp"],
  ];
  return <section className="benefits-strip" aria-label="Beneficios de Bookia">{benefits.map(([icon, title, text]) => <div key={title}>{icon}<span><strong>{title}</strong><small>{text}</small></span></div>)}</section>;
}

function BookstoresSection({ stores, loading }) {
  return (
    <section className="home-section bookstores-section">
      <div className="section-heading">
        <div><p className="section-label">Una red que crece</p><h2>Librerias para descubrir</h2></div>
        <p>Explora catalogos reales y encontra una nueva libreria favorita.</p>
      </div>
      {loading ? <div className="store-grid loading-stores"><span /><span /><span /></div> : null}
      {!loading && stores.length === 0 ? <EmptyState compact title="Proximamente mas librerias">Estamos preparando nuevos catalogos para que puedas descubrirlos.</EmptyState> : null}
      {!loading && stores.length > 0 ? (
        <div className="store-grid">
          {stores.slice(0, 6).map((store, index) => {
            const logoUrl = resolveApiUrl(store.logo_url);
            return (
              <AppLink className="store-card" href={`/bookstores/${store.slug}`} key={store.id}>
                <span className="store-card-number">{String(index + 1).padStart(2, "0")}</span>
                {logoUrl ? <img src={logoUrl} alt="" onError={(event) => { event.currentTarget.hidden = true; }} /> : <span className="store-card-placeholder"><StoreIcon /></span>}
                <span><strong>{store.name}</strong><small>{store.address || "Catalogo disponible online"}</small></span>
                <ArrowIcon />
              </AppLink>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}

function ContactLink({ href, children }) {
  return <a href={href} target="_blank" rel="noreferrer">{children}</a>;
}

export function HomePage() {
  const [stores, setStores] = useState([]);
  const [storesLoading, setStoresLoading] = useState(true);
  const [draftFilters, setDraftFilters] = useState({ query: "", field: "general" });
  const [searchFilters, setSearchFilters] = useState(null);

  useEffect(() => {
    apiFetch("/bookstores").then((data) => setStores(data.items)).catch(() => setStores([])).finally(() => setStoresLoading(false));
  }, []);

  return (
    <>
      <HeroSearch initialQuery={draftFilters.query} initialField={draftFilters.field} onSearch={(nextFilters) => { setDraftFilters(nextFilters); setSearchFilters(nextFilters); setTimeout(() => document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0); }} />
      <BenefitsStrip />
      <SearchResults filters={searchFilters} stores={stores} />
      <BookstoresSection stores={stores} loading={storesLoading} />
      <section className="home-section how-section">
        <div className="how-intro"><p className="section-label">Simple y local</p><h2>Una busqueda.<br />Muchas historias posibles.</h2><p>Bookia acerca catalogos que antes estaban dispersos para que encontrar un libro vuelva a sentirse como un descubrimiento.</p></div>
        <ol className="how-list"><li><span>01</span><div><h3>Busca lo que queres leer</h3><p>Por titulo, autor o editorial.</p></div></li><li><span>02</span><div><h3>Elegi donde encontrarlo</h3><p>Compara librerias y vendedores locales.</p></div></li><li><span>03</span><div><h3>Habla directamente</h3><p>Consulta disponibilidad por WhatsApp.</p></div></li></ol>
      </section>
      <section className="bookstore-cta"><div><p className="section-label">Para librerias</p><h2>Tu catalogo merece una vidriera mas grande.</h2><p>Suma tu libreria a Bookia y acerca tus libros a personas que ya los estan buscando.</p></div><AppLink className="light-button" href="/plans">Conoce la propuesta <ArrowIcon /></AppLink></section>
    </>
  );
}

export function PlansPage() {
  return (
    <div className="editorial-page plans-page">
      <section className="page-hero"><p className="section-label">Bookia para librerias</p><h1>Tu catalogo, donde ya estan buscando lectores.</h1><p>Una presencia digital simple para mostrar lo que tenes, mantenerlo actualizado y recibir consultas directas.</p></section>
      <section className="plan-benefits">
        <article><span>01</span><StoreIcon size={28} /><h2>Presencia digital</h2><p>Una ficha propia para contar quienes son, donde estan y que libros ofrecen.</p></article>
        <article><span>02</span><BookIcon size={28} /><h2>Catalogo al dia</h2><p>Gestiona titulos y disponibilidad desde un panel claro, sin procesos complicados.</p></article>
        <article><span>03</span><WhatsAppIcon size={28} /><h2>Contacto directo</h2><p>Cada consulta llega a la libreria por WhatsApp, sin intermediarios innecesarios.</p></article>
      </section>
      <section className="plans-cta"><div><p className="section-label">Empeza por tu catalogo</p><h2>Hagamos que mas lectores encuentren tus libros.</h2></div><AppLink href="/login" className="primary-button">Ingresar como libreria <ArrowIcon /></AppLink></section>
    </div>
  );
}

export function AboutPage() {
  return (
    <div className="editorial-page about-page">
      <section className="page-hero about-hero"><p className="section-label">Sobre Bookia</p><h1>Encontrar un libro deberia acercarte a tu comunidad.</h1><p>Bookia nace para conectar busquedas concretas con catalogos reales: los de librerias, vendedores de usados y proyectos que sostienen la circulacion de libros.</p></section>
      <section className="about-statement"><blockquote>"Cada libro encontrado tambien puede ser una libreria descubierta."</blockquote><div><h2>Mas cerca es mejor</h2><p>Creemos en una tecnologia que ordena la busqueda sin borrar el vinculo humano. Por eso Bookia no reemplaza la conversacion: ayuda a que suceda.</p><p>Los lectores encuentran opciones. Las librerias ganan visibilidad. Los libros vuelven a circular.</p></div></section>
      <section className="about-values"><article><span>01</span><h3>Descubrimiento</h3><p>Hacemos visibles catalogos que merecen ser explorados.</p></article><article><span>02</span><h3>Cercania</h3><p>Priorizamos el contacto directo y las redes locales.</p></article><article><span>03</span><h3>Circulacion</h3><p>Ayudamos a que cada libro encuentre una nueva lectura.</p></article></section>
      <section className="bookstore-cta about-cta"><div><p className="section-label">Dos lados de la misma historia</p><h2>Buscas un libro o queres mostrar tu catalogo?</h2></div><div className="cta-actions"><AppLink className="light-button" href="/">Buscar libros <ArrowIcon /></AppLink><AppLink className="outline-light-button" href="/plans">Para librerias</AppLink></div></section>
    </div>
  );
}

export function BookstorePage({ slug }) {
  const [store, setStore] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const visibleItems = items.filter((item) => item.availability_status !== "hidden");

  useEffect(() => {
    setLoading(true);
    apiFetch(`/bookstores/${slug}`).then((data) => { setStore(data.bookstore); setItems(data.items); setError(""); }).catch((fetchError) => setError(fetchError.message)).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="page-state"><div className="loading-mark" /><p>Cargando libreria...</p></div>;
  if (error || !store) return <div className="page-state"><EmptyState title="No encontramos esa libreria">{error || "Revisa el enlace o volve a la busqueda."}</EmptyState><button className="secondary-button" onClick={() => navigate("/")}>Volver a buscar</button></div>;

  const heroImageUrl = resolveApiUrl(store.hero_image_url);
  const logoUrl = resolveApiUrl(store.logo_url);
  const phoneLabel = formatDisplayPhone(store.phone_country_cd, store.phone);
  const hasWhatsApp = Boolean(phoneLabel);
  const instagramHref = buildInstagramHref(store.instagram_handle);
  const facebookHref = buildFacebookHref(store.facebook_handle);
  const websiteHref = buildWebsiteHref(store.website_url);
  const bookstoreTags = [store.tag_1, store.tag_2].map((tag) => String(tag || '').trim()).filter(Boolean);
  const contactItems = [
    phoneLabel ? { label: "Telefono", content: phoneLabel } : null,
    instagramHref ? { label: "Instagram", content: <ContactLink href={instagramHref}>{formatDisplayUrl(instagramHref)}</ContactLink> } : null,
    facebookHref ? { label: "Facebook", content: <ContactLink href={facebookHref}>{formatDisplayUrl(facebookHref)}</ContactLink> } : null,
    websiteHref ? { label: "Sitio web", content: <ContactLink href={websiteHref}>{formatDisplayUrl(websiteHref)}</ContactLink> } : null,
    store.address && String(store.address).trim() ? { label: "Direccion", content: store.address.trim() } : null,
  ].filter(Boolean);

  return (
    <section className="store-page">
      <div className={`store-hero${heroImageUrl ? " has-hero" : ""}`} style={heroImageUrl ? { backgroundImage: `linear-gradient(90deg, rgba(11,45,36,.91), rgba(11,45,36,.52)), url(${heroImageUrl})` } : undefined}>
        <div className="store-identity"><p className="section-label">Libreria en Bookia</p>{logoUrl ? <img className="store-logo" src={logoUrl} alt={`Logo de ${store.name}`} onError={(event) => { event.currentTarget.hidden = true; }} /> : null}<h1>{store.name}</h1><p>{store.description || "Un catalogo local para descubrir nuevas lecturas."}</p>{bookstoreTags.length > 0 ? <div className="store-tags" aria-label="Etiquetas de la libreria">{bookstoreTags.map((tag) => <span key={tag} className="store-tag">{tag}</span>)}</div> : null}</div>
        {contactItems.length > 0 || hasWhatsApp ? <aside className="store-contact-card"><p className="contact-label">Datos de contacto</p>{contactItems.length > 0 ? <dl>{contactItems.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.content}</dd></div>)}</dl> : null}{hasWhatsApp ? <WhatsAppButton phoneCountryCd={store.phone_country_cd} phone={store.phone}><WhatsAppIcon size={19} /> Hablar por WhatsApp</WhatsAppButton> : null}</aside> : null}
      </div>
      <div className="store-catalog">
        <div className="section-heading results-heading"><div><p className="section-label">Estantes disponibles</p><h2>Catalogo de {store.name}</h2><p>{visibleItems.length} {visibleItems.length === 1 ? "libro publicado" : "libros publicados"}</p></div><button className="secondary-button" onClick={() => navigate("/")}>Volver a buscar</button></div>
        {visibleItems.length === 0 ? <EmptyState title="Este catalogo se esta preparando">Volve pronto para descubrir sus libros.</EmptyState> : <div className="book-grid">{visibleItems.map((item) => <article key={item.id} className="book-card"><BookCover item={item} /><div><span className={`status-pill status-${item.availability_status}`}>{({ available: "Disponible", reserved: "Reservado", sold_out: "Agotado", hidden: "Oculto" })[item.availability_status] || item.availability_status}</span><h3>{item.title}</h3><p>{item.author || "Autor no visible"}</p><small>{item.publisher || "Editorial no visible"}{item.language ? ` · ${item.language}` : ""}</small></div></article>)}</div>}
      </div>
    </section>
  );
}
