import { useEffect, useState } from "react";

import { apiFetch, resolveApiUrl } from "../api";
import { formatCommercialPrice, getCommercialPrices } from "../plansPricingState";
import { buildFacebookHref, buildInstagramHref, buildWebsiteHref, buildWhatsAppHref, formatDisplayPhone, formatDisplayUrl } from "../formatters";
import { AppLink, navigate } from "../navigation";
import { displayBookstoreDescription } from "../profileEditorState";
import { displayReadingClubDate } from "../readingClubState";
import { buildPublicSearchParams } from "../publicSearchState";
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

function bookImageGallery(item) {
  const galleryImages = (item?.images || [])
    .slice()
    .sort((left, right) => (left.sort_order - right.sort_order) || (left.id - right.id))
    .map((image) => ({ id: image.id, url: image.url, isPrimary: image.is_primary }));
  if (galleryImages.length > 0) {
    return galleryImages;
  }
  return item?.cover_image_url ? [{ id: "cover", url: item.cover_image_url, isPrimary: true }] : [];
}
function HeroSearch({ initialFilters, genres, genresLoading, onSearch }) {
  const [filters, setFilters] = useState(() => ({ title: initialFilters.title || "", author: initialFilters.author || "", publisher: initialFilters.publisher || "", language: initialFilters.language || "", genreSlug: initialFilters.genreSlug || "" }));
  function submit(event) { event.preventDefault(); onSearch(filters); }
  function updateFilter(name) { return (event) => setFilters((current) => ({ ...current, [name]: event.target.value })); }
  return (
    <section className="hero">
      <div className="hero-copy"><p className="section-label">Tu proxima lectura esta cerca</p><h1>El libro que buscas, <em>mas cerca</em> de lo que imaginas.</h1><p className="hero-lead">Bookia reune catalogos de librerias, vendedores de usados y emprendimientos para que encuentres tu proxima historia en tu comunidad.</p></div>
      <div className="hero-books" aria-hidden="true"><span className="hero-book hero-book-one"><small>Historias</small><strong>que nos<br />encuentran</strong></span><span className="hero-book hero-book-two"><small>Autores</small><strong>de aca<br />y de alla</strong></span><span className="hero-book hero-book-three"><small>Lecturas</small><strong>para cada<br />momento</strong></span><span className="hero-leaf hero-leaf-one" /><span className="hero-leaf hero-leaf-two" /></div>
      <form className="search-panel" onSubmit={submit} aria-label="Buscar libros">
        <label className="search-field search-field-title"><span>Nombre del libro</span><span className="input-with-icon"><SearchIcon /><input value={filters.title} onChange={updateFilter("title")} placeholder="Ej: Rayuela" /></span></label>
        <label className="search-field search-field-author"><span>Autor</span><input value={filters.author} onChange={updateFilter("author")} placeholder="Ej: Julio Cortazar" /></label>
        <label className="search-field search-field-publisher"><span>Editorial</span><input value={filters.publisher} onChange={updateFilter("publisher")} placeholder="Ej: Sudamericana" /></label>
        <label className="search-field search-field-language"><span>Idioma</span><input value={filters.language} onChange={updateFilter("language")} placeholder="Ej: Espanol" /></label>
        <label className="search-field search-field-genre"><span>Genero</span><select value={filters.genreSlug} onChange={updateFilter("genreSlug")} disabled={genresLoading}><option value="">{genresLoading ? "Cargando generos..." : "Todos los generos"}</option>{genres.map((genre) => <option key={genre.id} value={genre.slug}>{genre.name}</option>)}</select></label>
        <button className="primary-button search-submit" type="submit">Buscar libros <ArrowIcon /></button>
      </form>
    </section>
  );
}

function SearchResults({ filters, stores }) {
  const [items, setItems] = useState([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedBookImageUrl, setSelectedBookImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const hasSearched = filters !== null;
  const visibleItems = items.filter((item) => item.availability_status !== "hidden");

  function openBookDetail(item) {
    const gallery = bookImageGallery(item);
    setSelectedBook(item);
    setSelectedBookImageUrl(gallery[0]?.url ? resolveApiUrl(gallery[0].url) : null);
  }

  function closeBookDetail() {
    setSelectedBook(null);
    setSelectedBookImageUrl(null);
  }

  useEffect(() => {
    if (!selectedBook) return undefined;
    const onKeyDown = (event) => event.key === "Escape" && closeBookDetail();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedBook]);

  useEffect(() => {
    if (!hasSearched) {
      setItems([]);
      setSelectedStore("");
      setError("");
      closeBookDetail();
      return;
    }

    const params = buildPublicSearchParams(filters);
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
        <div className="compact-filter-group">
          <label className="compact-filter">
            <span>Libreria</span>
            <select value={selectedStore} onChange={(event) => setSelectedStore(event.target.value)}>
              <option value="">Todas las librerias</option>
              {stores.map((store) => <option key={store.id} value={store.slug}>{store.name}</option>)}
            </select>
          </label>

        </div>
      </div>
      {error ? <p className="feedback error">{error}</p> : null}
      {loading ? <div className="loading-list" aria-label="Cargando resultados"><span /><span /><span /></div> : null}
      {!loading && !error && visibleItems.length === 0 ? <EmptyState title="No encontramos coincidencias">Proba con otro nombre de libro, autor, editorial, idioma o genero, o busca en todas las librerias.</EmptyState> : null}
      {!loading && visibleItems.length > 0 ? (
        <div className="search-results-list" role="list">
          {visibleItems.map((item) => (
            <article key={item.id} className="search-result-row" role="listitem">
              <button type="button" className="search-result-book-button" aria-label={`Ver detalles de ${item.title}`} onClick={() => openBookDetail(item)}>
                <BookCover item={item} className="search-result-cover" />
                <span className="search-result-main">
                  <span className="result-kicker">{item.publisher || "Editorial no visible"}</span>
                  <strong>{item.title}</strong>
                  <span>{item.author || "Autor no visible"}</span>
                  {item.genres?.length ? <span className="store-tags" aria-label="Generos del libro">{item.genres.map((genre) => <span key={genre.id} className="store-tag">{genre.name}</span>)}</span> : null}
                </span>
              </button>
              <div className="search-result-store-info">
                <span>Libreria</span>
                <AppLink href={`/bookstores/${item.bookstore.slug}`}>{item.bookstore.name} <ArrowIcon size={15} /></AppLink>
              </div>
              <WhatsAppButton className="primary-button search-result-whatsapp" whatsappPhone={item.bookstore.whatsapp_phone} phoneCountryCd={item.bookstore.phone_country_cd} phone={item.bookstore.phone}>
                <WhatsAppIcon size={19} /> Contactar
              </WhatsAppButton>
            </article>
          ))}
        </div>
      ) : null}
      <BookDetailModal selectedBook={selectedBook} selectedBookImageUrl={selectedBookImageUrl} onImageChange={setSelectedBookImageUrl} onClose={closeBookDetail} />
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
  const [genres, setGenres] = useState([]);
  const [genresLoading, setGenresLoading] = useState(true);
  const [storesLoading, setStoresLoading] = useState(true);
  const [draftFilters, setDraftFilters] = useState({ title: "", author: "", publisher: "", language: "", genreSlug: "" });
  const [searchFilters, setSearchFilters] = useState(null);

  useEffect(() => {
    apiFetch("/bookstores").then((data) => setStores(data.items)).catch(() => setStores([])).finally(() => setStoresLoading(false));
    apiFetch("/genres").then((data) => setGenres(data.items || [])).catch(() => setGenres([])).finally(() => setGenresLoading(false));
  }, []);

  return (
    <>
      <HeroSearch initialFilters={draftFilters} genres={genres} genresLoading={genresLoading} onSearch={(nextFilters) => { setDraftFilters(nextFilters); setSearchFilters(nextFilters); setTimeout(() => document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0); }} />
      <BenefitsStrip />
      <SearchResults filters={searchFilters} stores={stores} />
      <BookstoresSection stores={stores} loading={storesLoading} />
      <section className="bookstore-cta"><div><p className="section-label">Para librerias</p><h2>Tu catalogo merece una vidriera mas grande.</h2><p>Suma tu libreria a Bookia y acerca tus libros a personas que ya los estan buscando.</p></div><AppLink className="light-button" href="/plans">Conoce la propuesta <ArrowIcon /></AppLink></section>
    </>
  );
}

export function PlansPage() {
  const [pricingState, setPricingState] = useState({ loading: true, prices: null, error: "" });

  useEffect(() => {
    apiFetch("/commercial-prices")
      .then((data) => {
        const prices = getCommercialPrices(data.items);
        if (!prices) throw new Error("La respuesta de precios esta incompleta.");
        setPricingState({ loading: false, prices, error: "" });
      })
      .catch(() => setPricingState({ loading: false, prices: null, error: "No pudimos cargar los precios en este momento." }));
  }, []);

  const priceLabel = (offeringCode) => {
    if (pricingState.loading) return "Cargando...";
    return pricingState.prices ? formatCommercialPrice(pricingState.prices[offeringCode]) : "Precio no disponible";
  };
  const plans = [
    { name: "Prueba gratis", price: priceLabel("trial"), detail: "por 30 dias", limit: "Hasta 10 libros", benefits: ["IA incluida", "Todas las funcionalidades"], tone: "trial" },
    { name: "Base", price: priceLabel("base"), detail: "/mes", limit: "Hasta 50 libros", benefits: ["Perfil publico", "Carga manual"], tone: "base" },
    { name: "IA", price: priceLabel("plus_ai"), detail: "/mes", limit: "Hasta 50 libros", benefits: ["Carga desde foto", "Autocompletado con IA"], tone: "featured", featured: true },
  ];

  return (
    <div className="editorial-page plans-page">
      <section className="plans-hero">
        <div className="plans-hero-copy"><p className="section-label">Planes para librerias</p><h1>Una vidriera que crece con tu catalogo<span>.</span></h1><p>Empeza sin costo, mostra tus libros y elegi la forma de carga que mejor funciona para vos.</p></div>
        <div className="plans-hero-art" aria-hidden="true"><img src="/images/plans-books.png" alt="" /></div>
      </section>
      <section className="plans-pricing" aria-label="Planes de Bookia">
        {pricingState.error ? <p className="plans-pricing-status" role="status">{pricingState.error}</p> : null}
        {plans.map((plan) => <article key={plan.name} className={`plans-plan plans-plan-${plan.tone}${plan.featured ? " plans-featured" : ""}`}>
          <div className="plans-plan-head"><span>{plan.name}</span>{plan.featured ? <strong>Mas elegido</strong> : null}</div>
          <p className="plans-price">{plan.price}<small>{plan.detail}</small></p>
          <p className="plans-limit">{plan.limit}</p>
          <ul>{plan.benefits.map((benefit) => <li key={benefit}><b>✓</b>{benefit}</li>)}</ul>
        </article>)}
      </section>
      <section className="plans-growth-band" aria-label="Ampliaciones de catalogo">
        <div className="plans-growth-title"><span aria-hidden="true">▥</span><div><p className="plans-growth-kicker">Adicionales de catalogo</p><h2>Hace crecer<br />tu catalogo</h2></div></div>
        <div><p>Hasta</p><strong>100 <small>libros</small></strong><span>+ {priceLabel("catalog_100")}/mes</span></div>
        <div><p>Hasta</p><strong>200 <small>libros</small></strong><span>+ {priceLabel("catalog_200")}/mes</span></div>
      </section>
      <section className="plans-cta"><div><p className="section-label">Sin letra chica</p><h2>Proba Bookia durante <em>30 dias.</em></h2></div><AppLink href="/login" className="primary-button">Ingresar como libreria <ArrowIcon /></AppLink></section>
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

const AVAILABILITY_LABELS = {
  available: "Disponible",
  reserved: "Reservado",
  sold_out: "Agotado",
  hidden: "Oculto",
};

const BOOK_STATUS_LABELS = {
  nuevo: "Nuevo",
  usado: "Usado",
};

function bookStatusLabel(value) {
  return BOOK_STATUS_LABELS[value] || BOOK_STATUS_LABELS.usado;
}

function bookAvailabilityLabel(value) {
  return AVAILABILITY_LABELS[value] || value;
}

function bookEditionLine(item) {
  return [item.publisher, item.language].filter(Boolean).join(" / ") || "Edicion no visible";
}

function BookGenreTags({ item }) {
  return (
    <div className="store-tags" aria-label="Generos del libro">
      {item.genres?.length ? item.genres.map((genre) => <span key={genre.id} className="store-tag">{genre.name}</span>) : <span className="store-tag">Sin genero</span>}
    </div>
  );
}

function BookDetailModal({ selectedBook, selectedBookImageUrl, onImageChange, onClose }) {
  if (!selectedBook) return null;

  const selectedBookGallery = bookImageGallery(selectedBook);
  const bookstore = selectedBook.bookstore;
  const hasBookstoreContact = Boolean(buildWhatsAppHref(bookstore?.whatsapp_phone, bookstore?.phone_country_cd, bookstore?.phone));

  return (
    <div className="book-detail-modal" role="dialog" aria-modal="true" aria-labelledby="book-detail-title" onClick={onClose}>
      <div className="book-detail-modal-card" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="book-detail-modal-close" onClick={onClose}>Cerrar</button>
        <div className="book-detail-modal-layout">
          <div className="book-detail-gallery">
            {selectedBookImageUrl ? <img className="book-detail-cover" src={selectedBookImageUrl} alt={`Foto de ${selectedBook.title}`} /> : <BookCover item={selectedBook} className="book-detail-cover" />}
            {selectedBookGallery.length > 1 ? (
              <div className="book-detail-thumbnails" aria-label="Fotos del libro">
                {selectedBookGallery.map((image) => {
                  const thumbnailUrl = resolveApiUrl(image.url);
                  return (
                    <button key={image.id} type="button" className={`book-detail-thumbnail${thumbnailUrl === selectedBookImageUrl ? " is-active" : ""}`} onClick={() => onImageChange(thumbnailUrl)} aria-label={`Ver foto de ${selectedBook.title}`}>
                      <img src={thumbnailUrl} alt="" />
                    </button>
                  );
                })}
              </div>
            ) : null}
          </div>
          <div className="book-detail-copy">
            <div className="book-detail-status-row">
              <span className={`status-pill status-${selectedBook.availability_status}`}>{bookAvailabilityLabel(selectedBook.availability_status)}</span>
              {selectedBook.is_featured ? <span className="status-pill status-featured">Destacado</span> : null}
              <span className="status-pill">{bookStatusLabel(selectedBook.book_status)}</span>
            </div>
            <h2 id="book-detail-title">{selectedBook.title}</h2>
            <p className="book-detail-author">{selectedBook.author || "Autor no visible"}</p>
            <BookGenreTags item={selectedBook} />
            <div className="book-detail-section">
              <span>Descripcion</span>
              <p>{selectedBook.description || "Sin descripcion visible."}</p>
            </div>
            <dl className="book-detail-meta">
              <div><dt>Editorial</dt><dd>{selectedBook.publisher || "Editorial no visible"}</dd></div>
              <div><dt>Idioma</dt><dd>{selectedBook.language || "Idioma no visible"}</dd></div>
              <div><dt>Edicion</dt><dd>{bookEditionLine(selectedBook)}</dd></div>
              <div><dt>Libreria</dt><dd>{bookstore ? <AppLink className="book-detail-store-link" href={`/bookstores/${bookstore.slug}`}>{bookstore.name} <ArrowIcon size={14} /></AppLink> : "Libreria no visible"}</dd></div>
            </dl>
            {hasBookstoreContact ? (
              <WhatsAppButton className="primary-button book-detail-whatsapp" whatsappPhone={bookstore.whatsapp_phone} phoneCountryCd={bookstore.phone_country_cd} phone={bookstore.phone}>
                <WhatsAppIcon size={19} /> Contactar por WhatsApp
              </WhatsAppButton>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BookstorePage({ slug }) {
  const [store, setStore] = useState(null);
  const [items, setItems] = useState([]);
  const [readingClubs, setReadingClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedBookImageUrl, setSelectedBookImageUrl] = useState(null);
  const visibleItems = items.filter((item) => item.availability_status !== "hidden");

  useEffect(() => {
    setLoading(true);
    apiFetch(`/bookstores/${slug}`).then((data) => { setStore(data.bookstore); setItems(data.items); setReadingClubs(data.reading_clubs || []); setError(""); }).catch((fetchError) => setError(fetchError.message)).finally(() => setLoading(false));
  }, [slug]);

  function openBookDetail(item) {
    const gallery = bookImageGallery(item);
    setSelectedBook(item);
    setSelectedBookImageUrl(gallery[0]?.url ? resolveApiUrl(gallery[0].url) : null);
  }

  function closeBookDetail() {
    setSelectedBook(null);
    setSelectedBookImageUrl(null);
  }
  useEffect(() => {
    if (!selectedBook) return undefined;
    const onKeyDown = (event) => event.key === "Escape" && closeBookDetail();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedBook]);

  if (loading) return <div className="page-state"><div className="loading-mark" /><p>Cargando libreria...</p></div>;
  if (error || !store) return <div className="page-state"><EmptyState title="No encontramos esa libreria">{error || "Revisa el enlace o volve a la busqueda."}</EmptyState><button className="secondary-button" onClick={() => navigate("/")}>Volver a buscar</button></div>;

  const heroImageUrl = resolveApiUrl(store.hero_image_url);
  const logoUrl = resolveApiUrl(store.logo_url);
  const phoneLabel = formatDisplayPhone(store.phone_country_cd, store.phone);
  const hasWhatsApp = Boolean(buildWhatsAppHref(store.whatsapp_phone, store.phone_country_cd, store.phone));
  const instagramHref = buildInstagramHref(store.instagram_handle);
  const facebookHref = buildFacebookHref(store.facebook_handle);
  const websiteHref = buildWebsiteHref(store.website_url);
  const bookstoreTags = [store.tag_1, store.tag_2].map((tag) => String(tag || '').trim()).filter(Boolean);
  const contactItems = [
    phoneLabel ? { label: "Telefono", content: phoneLabel } : null,
    store.correo && String(store.correo).trim() ? { label: "Correo", content: <a href={`mailto:${store.correo}`}>{store.correo}</a> } : null,
    instagramHref ? { label: "Instagram", content: <ContactLink href={instagramHref}>{formatDisplayUrl(instagramHref)}</ContactLink> } : null,
    facebookHref ? { label: "Facebook", content: <ContactLink href={facebookHref}>{formatDisplayUrl(facebookHref)}</ContactLink> } : null,
    websiteHref ? { label: "Sitio web", content: <ContactLink href={websiteHref}>{formatDisplayUrl(websiteHref)}</ContactLink> } : null,
    store.address && String(store.address).trim() ? { label: "Direccion", content: store.address.trim() } : null,
  ].filter(Boolean);

  return (
    <section className="store-page">
      <div className={`store-hero${heroImageUrl ? " has-hero" : ""}`} style={heroImageUrl ? { backgroundImage: `url(${heroImageUrl})` } : undefined} />
      <div className="store-profile-panel">
        <div className="store-identity"><p className="section-label">Libreria en Bookia</p>{logoUrl ? <img className="store-logo" src={logoUrl} alt={`Logo de ${store.name}`} onError={(event) => { event.currentTarget.hidden = true; }} /> : null}<h1>{store.name}</h1><p>{displayBookstoreDescription(store.description)}</p>{bookstoreTags.length > 0 ? <div className="store-tags" aria-label="Etiquetas de la libreria">{bookstoreTags.map((tag) => <span key={tag} className="store-tag">{tag}</span>)}</div> : null}</div>
        {contactItems.length > 0 || hasWhatsApp ? <aside className="store-contact-card"><p className="contact-label">Datos de interes</p>{contactItems.length > 0 ? <dl>{contactItems.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.content}</dd></div>)}</dl> : null}{hasWhatsApp ? <WhatsAppButton whatsappPhone={store.whatsapp_phone} phoneCountryCd={store.phone_country_cd} phone={store.phone}><WhatsAppIcon size={19} /> Hablar por WhatsApp</WhatsAppButton> : null}</aside> : null}
      </div>
      <div className="store-catalog">
        <div className="section-heading results-heading"><div><p className="section-label">Estantes disponibles</p><h2>Catalogo de {store.name}</h2><p>{visibleItems.length} {visibleItems.length === 1 ? "libro publicado" : "libros publicados"}</p></div><button className="secondary-button" onClick={() => navigate("/")}>Volver a buscar</button></div>
        {visibleItems.length === 0 ? <EmptyState title="Este catalogo se esta preparando">Volve pronto para descubrir sus libros.</EmptyState> : (
          <div className="book-grid">
            {visibleItems.map((item) => (
              <article
                key={item.id}
                className="book-card"
                role="button"
                tabIndex={0}
                aria-label={`Ver detalles de ${item.title}`}
                onClick={() => openBookDetail(item)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    openBookDetail(item);
                  }
                }}
              >
                <BookCover item={item} />
                <div>
                  <span className={`status-pill status-${item.availability_status}`}>{bookAvailabilityLabel(item.availability_status)}</span>
                  {item.is_featured ? <span className="status-pill status-featured">Destacado</span> : null}
                  <h3>{item.title}</h3>
                  <p>{item.author || "Autor no visible"}</p>
                  <BookGenreTags item={item} />
                  {item.description ? <p className="book-card-description">{item.description}</p> : <p className="book-card-description">Sin descripcion visible.</p>}
                  <small>{bookEditionLine(item)} / {bookStatusLabel(item.book_status)}</small>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
      {readingClubs.length > 0 ? (
        <section className="store-reading-clubs">
          <div className="section-heading results-heading"><div><p className="section-label">Club de lectura</p><h2>Encuentros de {store.name}</h2><p>{readingClubs.length} {readingClubs.length === 1 ? "club publicado" : "clubes publicados"}</p></div></div>
          <div className="reading-club-public-list">
            {readingClubs.map((club) => (
              <article key={club.id} className="reading-club-public-card">
                <div className="store-tags" aria-label="Genero del club"><span className="store-tag">{club.genre?.name || "Sin genero"}</span></div>
                <h3>{club.title}</h3>
                <p>{club.description}</p>
                <dl>
                  <div><dt>Fecha</dt><dd>{displayReadingClubDate(club.meeting_date)}</dd></div>
                  {club.location ? <div><dt>Lugar</dt><dd>{club.location}</dd></div> : null}
                </dl>
              </article>
            ))}
          </div>
        </section>
      ) : null}
      <BookDetailModal selectedBook={selectedBook} selectedBookImageUrl={selectedBookImageUrl} onImageChange={setSelectedBookImageUrl} onClose={closeBookDetail} />
    </section>
  );
}
