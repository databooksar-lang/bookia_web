import { useEffect, useState } from "react";

import { apiFetch, resolveApiUrl } from "../api";
import { trackWebInteractionEvent } from "../analyticsState";
import { formatCommercialPrice, getCommercialPrices } from "../plansPricingState";
import { buildFacebookHref, buildInstagramHref, buildWebsiteHref, buildWhatsAppHref, formatDisplayPhone, formatDisplayUrl } from "../formatters";
import { AppLink, navigate } from "../navigation";
import { buildRegisterPath } from "../registerState";
import { displayBookstoreDescription } from "../profileEditorState";
import { displayReadingClubDate } from "../readingClubState";
import { buildPublicSearchParams, buildReadingClubSearchParams, filterBookstores, getAvailableReadingClubGenres, getBookstoreTags, getVisibleReadingClubs } from "../publicSearchState";
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

function trackBookDetailOpened(item, source) {
  const bookstoreId = item?.bookstore?.id;
  if (!bookstoreId || !item?.id) return;
  trackWebInteractionEvent({ eventType: "book_detail_opened", bookstoreId, catalogItemId: item.id, source });
}

function trackBookstoreOpened(bookstore, source) {
  if (!bookstore?.id) return;
  trackWebInteractionEvent({ eventType: "bookstore_opened", bookstoreId: bookstore.id, source, metadata: bookstore.slug ? { path: `/bookstores/${bookstore.slug}` } : undefined });
}

function trackWhatsAppClicked(bookstore, source, catalogItemId) {
  if (!bookstore?.id) return;
  trackWebInteractionEvent({ eventType: "whatsapp_clicked", bookstoreId: bookstore.id, catalogItemId, source });
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
      <div className="hero-copy"><p className="section-label">{"ENCONTR\u00C1 TU PR\u00D3XIMA LECTURA"}</p><h1>{"Los libros que busc\u00E1s, en un solo lugar."}</h1><p className="hero-lead">{"Explora librerias, descubri catalogos reales y conectate con clubes de lectura. Bookia reúne todo en un solo lugar para que encuentres el libro que buscas y consultes directamente con quien lo tiene."}</p></div>
      <div className="hero-books" aria-hidden="true"><img className="hero-illustration" src="/images/hero-bookia-discovery.webp" alt="" /></div>
      <form className="search-panel" onSubmit={submit} aria-label="Buscar libros">
        <p className="search-panel-heading">Buscar libros</p>
        <label className="search-field search-field-title"><span>Nombre del libro</span><span className="input-with-icon"><SearchIcon /><input value={filters.title} onChange={updateFilter("title")} placeholder="Ej: Rayuela" /></span></label>
        <label className="search-field search-field-author"><span>Autor</span><input value={filters.author} onChange={updateFilter("author")} placeholder={"Ej: Julio Cort\u00E1zar"} /></label>
        <label className="search-field search-field-publisher"><span>Editorial</span><input value={filters.publisher} onChange={updateFilter("publisher")} placeholder="Ej: Sudamericana" /></label>
        <label className="search-field search-field-language"><span>Idioma</span><input value={filters.language} onChange={updateFilter("language")} placeholder={"Ej: Espa\u00F1ol"} /></label>
        <label className="search-field search-field-genre"><span>{"G\u00E9nero"}</span><select value={filters.genreSlug} onChange={updateFilter("genreSlug")} disabled={genresLoading}><option value="">{genresLoading ? "Cargando g\u00E9neros..." : "Todos los g\u00E9neros"}</option>{genres.map((genre) => <option key={genre.id} value={genre.slug}>{genre.name}</option>)}</select></label>
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
    trackBookDetailOpened(item, "search_results");
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
          <p className="section-label">{"RESULTADOS DE B\u00DASQUEDA"}</p>
          <h2>{"Libros que pod\u00E9s consultar"}</h2>
          <p>{loading ? "Buscando en los cat\u00E1logos..." : `${visibleItems.length} ${visibleItems.length === 1 ? "libro encontrado" : "libros encontrados"}`}</p>
        </div>
        <div className="compact-filter-group">
          <label className="compact-filter">
            <span>{"Librer\u00EDa"}</span>
            <select value={selectedStore} onChange={(event) => setSelectedStore(event.target.value)}>
              <option value="">{"Todas las librer\u00EDas"}</option>
              {stores.map((store) => <option key={store.id} value={store.slug}>{store.name}</option>)}
            </select>
          </label>

        </div>
      </div>
      {error ? <p className="feedback error">{error}</p> : null}
      {loading ? <div className="loading-list" aria-label="Cargando resultados"><span /><span /><span /></div> : null}
      {!loading && !error && visibleItems.length === 0 ? <EmptyState title={"Todav\u00EDa no encontramos ese libro"}>{"Prob\u00E1 con otro t\u00EDtulo, autor, editorial, idioma o g\u00E9nero. Tambi\u00E9n pod\u00E9s ampliar la b\u00FAsqueda a todas las librer\u00EDas."}</EmptyState> : null}
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
                <AppLink href={`/bookstores/${item.bookstore.slug}`} onClick={() => trackBookstoreOpened(item.bookstore, "search_results")}>{item.bookstore.name} <ArrowIcon size={15} /></AppLink>
              </div>
              <WhatsAppButton className="primary-button search-result-whatsapp" whatsappPhone={item.bookstore.whatsapp_phone} phoneCountryCd={item.bookstore.phone_country_cd} phone={item.bookstore.phone} onClick={() => trackWhatsAppClicked(item.bookstore, "search_results", item.id)}>
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

const BOOKSTORE_BENEFITS = [
  [<LocationIcon key="icon" />, "Cat\u00E1logos reales", "Libros publicados por librer\u00EDas y vendedores."],
  [<StoreIcon key="icon" />, "Nuevos y usados", "Opciones para cada b\u00FAsqueda."],
  [<WhatsAppIcon key="icon" />, "Contacto directo", "Consult\u00E1 disponibilidad por WhatsApp"],
];

const SEARCH_BENEFITS = [
  [<BookIcon key="icon" />, "Encontr\u00E1 tu pr\u00F3ximo libro", "Busc\u00E1 por t\u00EDtulo, autor o editorial."],
  [<SearchIcon key="icon" />, "Eleg\u00ED c\u00F3mo quer\u00E9s leer", "Nuevos y usados, g\u00E9neros e idiomas para explorar."],
  [<WhatsAppIcon key="icon" />, "Consult\u00E1 a la librer\u00EDa", "Confirm\u00E1 disponibilidad antes de ir o comprar."],
];
const READING_CLUB_BENEFITS = [
  [<LocationIcon key="icon" />, "Comunidad lectora", "Encontr\u00E1 clubes para compartir tus lecturas."],
  [<BookIcon key="icon" />, "Lecturas compartidas", "Sumate a conversaciones con otros lectores."],
  [<LocationIcon key="icon" />, "Encuentros cercanos", "Conoc\u00E9 fecha y lugar de cada encuentro."],
];

function BenefitsStrip({ benefits, ariaLabel, className = "" }) {
  return <section className={`benefits-strip ${className}`.trim()} aria-label={ariaLabel}>{benefits.map(([icon, title, text]) => <div key={title}>{icon}<span><strong>{title}</strong><small>{text}</small></span></div>)}</section>;
}
function BookstoresSection({ stores, loading }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const tags = getBookstoreTags(stores);
  const filteredStores = filterBookstores(stores, { query, tag });
  const hasActiveFilters = Boolean(query.trim() || tag);
  const visibleStores = hasActiveFilters ? filteredStores : stores.slice(0, 6);

  return (
    <section className="home-section bookstores-section">
      <div className="section-heading">
        <div><p className="section-label">{"LIBRER\u00CDAS EN BOOKIA"}</p><h2>{"Descubr\u00ED las librerias que son parte de la comunidad"}</h2></div>
        <img className="bookstores-section-illustration" src="/images/bookstores-section-facade.png" alt="" />
      </div>
      {!loading && stores.length > 0 ? <form className="bookstore-filters" role="search" aria-label={"Buscar librer\u00EDas"} onSubmit={(event) => event.preventDefault()}>
        <label className="bookstore-filter-field"><span>Nombre de la libreria</span><span className="input-with-icon"><SearchIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej: DataBooksAr" /></span></label>
        <label className="bookstore-filter-field"><span>Etiqueta</span><select value={tag} onChange={(event) => setTag(event.target.value)}><option value="">Todas las etiquetas</option>{tags.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
      </form> : null}
      {loading ? <div className="store-grid loading-stores"><span /><span /><span /></div> : null}
      {!loading && stores.length === 0 ? <EmptyState compact title={"Pronto vas a encontrar m\u00E1s librer\u00EDas"}>{"Estamos sumando nuevos cat\u00E1logos para que tengas m\u00E1s libros para buscar."}</EmptyState> : null}
      {!loading && stores.length > 0 && visibleStores.length === 0 ? <EmptyState compact title="No encontramos librerias con esos filtros">Proba con otro nombre o elegi una etiqueta diferente.</EmptyState> : null}
      {!loading && visibleStores.length > 0 ? (
        <div className="store-grid">
          {visibleStores.map((store, index) => {
            const logoUrl = resolveApiUrl(store.logo_url);
            return (
              <AppLink className="store-card" href={`/bookstores/${store.slug}`} key={store.id} onClick={() => trackBookstoreOpened(store, "home_bookstores")}>
                <span className="store-card-number">{String(index + 1).padStart(2, "0")}</span>
                {logoUrl ? <img src={logoUrl} alt="" onError={(event) => { event.currentTarget.hidden = true; }} /> : <span className="store-card-placeholder"><StoreIcon /></span>}
                <span><strong>{store.name}</strong><small>{store.address || "Catalogo disponible online"}</small></span>
                <ArrowIcon />
              </AppLink>
            );
          })}
        </div>
      ) : null}
      <BenefitsStrip className="bookstores-benefits-strip" benefits={BOOKSTORE_BENEFITS} ariaLabel="Beneficios para librerías" />
    </section>
  );
}


function ReadingClubsSection() {
  const [clubs, setClubs] = useState([]);
  const [availableGenres, setAvailableGenres] = useState([]);
  const [genreSlug, setGenreSlug] = useState("");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const params = buildReadingClubSearchParams(genreSlug);
    setLoading(true);
    setError("");
    apiFetch(`/reading-clubs?${params.toString()}`)
      .then((data) => {
        const nextGenres = getAvailableReadingClubGenres(data.available_genres || []);
        setAvailableGenres(nextGenres);
        if (genreSlug && !nextGenres.some((genre) => genre.slug === genreSlug)) {
          setGenreSlug("");
        }
        setClubs(data.items || []);
      })
      .catch((fetchError) => { setClubs([]); setError(fetchError.message || "No pudimos cargar los clubes de lectura."); })
      .finally(() => setLoading(false));
  }, [genreSlug]);

  const visibleClubs = getVisibleReadingClubs(clubs, genreSlug, query);
  const hasQuery = query.trim().length > 0;

  return (
    <section className="home-section reading-clubs-section">
      <div className="section-heading"><div><p className="section-label">CLUBES DE LECTURA</p><h2>{"Encontr\u00E1 tu pr\u00F3ximo club de lectura"}</h2></div><img className="reading-clubs-section-illustration" src="/images/reading-clubs-section.png" alt="" /></div>
      <form className="bookstore-filters reading-club-filters" role="search" aria-label="Buscar clubes de lectura" onSubmit={(event) => event.preventDefault()}>
        <label className="bookstore-filter-field"><span>Buscar por nombre o palabras clave</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej: Club de novela" /></label>
        <label className="bookstore-filter-field"><span>{"G\u00E9nero"}</span><select value={genreSlug} onChange={(event) => setGenreSlug(event.target.value)} disabled={loading}><option value="">{loading ? "Cargando g\u00E9neros..." : "Todos los g\u00E9neros"}</option>{availableGenres.map((genre) => <option key={genre.id} value={genre.slug}>{genre.name}</option>)}</select></label>
      </form>
      {loading ? <div className="reading-club-public-list loading-stores" aria-label="Cargando clubes de lectura"><span /><span /><span /></div> : null}
      {error ? <p className="feedback error" role="alert">{error}</p> : null}
      {!loading && !error && visibleClubs.length === 0 ? <EmptyState compact title={genreSlug ? "No encontramos clubes de ese g\u00E9nero" : "Pronto vas a encontrar clubes de lectura"}>{genreSlug ? "Prob\u00E1 con otro g\u00E9nero." : "Estamos sumando encuentros para que encuentres tu pr\u00F3xima conversaci\u00F3n."}</EmptyState> : null}
      {!loading && !error && visibleClubs.length > 0 ? (
        <div className="reading-club-public-list">
          {visibleClubs.map((club) => {
            const host = club.host;
            const hostName = host?.type === "bookstore" ? host.name : host?.display_name;
            const hostPath = host?.type === "bookstore" ? `/bookstores/${host.slug}` : `/readers/${host?.slug}`;
            return <AppLink key={club.id} className="reading-club-public-card reading-club-link" href={hostPath}>
              <div className="store-tags" aria-label="G\u00E9nero del club"><span className="store-tag">{club.genre?.name || "Sin g\u00E9nero"}</span></div>
              <h3>{club.title}</h3>
              <p>{club.description}</p>
              <dl><div><dt>Fecha</dt><dd>{displayReadingClubDate(club.meeting_date)}</dd></div><div><dt>Lugar</dt><dd>{club.location || "Lugar a confirmar"}</dd></div><div><dt>Organiza</dt><dd>{hostName || "Anfitri\u00F3n de Bookia"}</dd></div></dl>
            </AppLink>;
          })}
        </div>
      ) : null}
      <BenefitsStrip className="reading-clubs-benefits-strip" benefits={READING_CLUB_BENEFITS} ariaLabel="Beneficios de los clubes de lectura" />
    </section>
  );
}

function NewsletterSignup() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("idle");
  const [message, setMessage] = useState("");

  function submit(event) {
    event.preventDefault();
    setStatus("submitting");
    setMessage("");
    apiFetch("/newsletter-subscribers", { method: "POST", body: JSON.stringify({ email, marketing_consent: true }) })
      .then((data) => {
        setEmail("");
        setStatus("success");
        setMessage(data.detail || "Listo, te sumamos a las novedades de Bookia.");
      })
      .catch((error) => {
        setStatus("error");
        setMessage(error.message || "No pudimos guardar tu correo. Intenta nuevamente.");
      });
  }

  return (
    <section className="newsletter-signup" aria-labelledby="newsletter-title">
      <div>
        <p className="section-label">{"NOVEDADES DE BOOKIA"}</p>
        <h2 id="newsletter-title">{"M\u00E1s para descubrir."}</h2>
        <p>{"Recib\u00ED novedades de cat\u00E1logos, recomendaciones, librer\u00EDas y lecturas."}</p>
      </div>
      <form className="newsletter-form" onSubmit={submit}>
        <label><span>{"Tu correo electr\u00F3nico"}</span><input type="email" value={email} onChange={(event) => setEmail(event.target.value)} autoComplete="email" placeholder="lector@ejemplo.com" required disabled={status === "submitting"} /></label>
        <button className="primary-button" type="submit" disabled={status === "submitting"}>{status === "submitting" ? "Sumando..." : "Quiero recibir novedades"} <ArrowIcon /></button>
        <p className="newsletter-consent" style={{ fontSize: "0.8rem" }}>{"Al suscribirte acept\u00E1s recibir novedades y promociones. Consult\u00E1 nuestra "}<AppLink href="/privacy">{"Pol\u00EDtica de Privacidad"}</AppLink>.</p>
        {message ? <p className={`feedback ${status}`} role="status" aria-live="polite">{message}</p> : null}
      </form>
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
      <BenefitsStrip benefits={SEARCH_BENEFITS} ariaLabel="Beneficios de la búsqueda de libros" />
      <SearchResults filters={searchFilters} stores={stores} />
      <BookstoresSection stores={stores} loading={storesLoading} />
      <ReadingClubsSection />
      <NewsletterSignup />
    </>
  );
}


export function BookstoresPage() {
  return (
    <div className="editorial-page bookstores-page">
      <section className="bookstores-hero">
        <div className="bookstores-hero-copy"><p className="section-label">{"PARA LIBRER\u00CDAS"}</p><h1>{"Tu librer\u00EDa, m\u00E1s cerca de nuevos lectores."}</h1><p>{"Mostr\u00E1 tu cat\u00E1logo en Bookia para que cada b\u00FAsqueda pueda convertirse en una nueva conversaci\u00F3n."}</p><AppLink className="primary-button" href="/register">{"Crear cuenta para mi librer\u00EDa"} <ArrowIcon /></AppLink></div>
        <div className="bookstores-catalog-preview" aria-hidden="true">
          <div className="catalog-preview-toolbar"><span /><span /></div>
          <div className="catalog-preview-search"><span /><i /></div>
          <div className="catalog-preview-list">
            <div className="catalog-preview-row"><b /><span><i /><i /><i /></span><em /></div>
            <div className="catalog-preview-row"><b /><span><i /><i /><i /></span><em /></div>
            <div className="catalog-preview-row"><b /><span><i /><i /><i /></span><em /></div>
          </div>
        </div>
      </section>
      <section className="bookstores-benefits" aria-labelledby="bookstores-benefits-title">
        <div className="bookstores-section-heading"><p className="section-label">{"UNA VIDRIERA PARA TU CAT\u00C1LOGO"}</p><h2 id="bookstores-benefits-title">{"Todo lo que necesit\u00E1s para que tus libros se encuentren."}</h2></div>
        <div className="bookstores-benefit-grid">
          <article><span>01</span><h3>{"Lleg\u00E1 a m\u00E1s lectores"}</h3><p>{"Hac\u00E9 visible tu cat\u00E1logo para quienes ya est\u00E1n buscando su pr\u00F3xima lectura."}</p></article>
          <article><span>02</span><h3>{"Organiz\u00E1 tu cat\u00E1logo"}</h3><p>{"Public\u00E1 tus libros y manten\u00E9 actualizada la informaci\u00F3n que quer\u00E9s compartir."}</p></article>
          <article><span>03</span><h3>Consultas directas</h3><p>{"Las personas interesadas pueden contactar a tu librer\u00EDa directamente para consultar disponibilidad."}</p></article>
        </div>
      </section>
      <section className="bookstores-plans" aria-labelledby="bookstores-plans-title">
        <div><p className="section-label">{"CREC\u00C9 A TU RITMO"}</p><h2 id="bookstores-plans-title">{"Planes que acompa\u00F1an tu etapa."}</h2><p>{"Empez\u00E1 con una prueba inicial y eleg\u00ED el plan que mejor acompa\u00F1e el tama\u00F1o y la forma de trabajo de tu librer\u00EDa."}</p></div>
        <div className="bookstores-ai-card"><p>{"Gesti\u00F3n m\u00E1s simple"}</p><h3>{"Menos tiempo cargando, m\u00E1s tiempo entre libros."}</h3><ul><li>Carga desde foto</li><li>Autocompletado con IA</li><li>{"Fichas que siempre pod\u00E9s revisar y editar"}</li></ul></div>
      </section>
      <section className="bookstore-cta"><div><p className="section-label">{"PARA LIBRER\u00CDAS"}</p><h2>{"Hac\u00E9 que tus libros lleguen a m\u00E1s lectores."}</h2><p>{"Public\u00E1 tu cat\u00E1logo en Bookia para que las personas encuentren tus libros y puedan consultarte directo."}</p></div><AppLink className="light-button" href="/register">{"Crear cuenta para mi librer\u00EDa"} <ArrowIcon /></AppLink></section>
    </div>
  );
}
function PlansPlan({ plan, isRegistrationFlow, onSelect }) {
  const className = `plans-plan plans-plan-${plan.tone}${plan.featured ? " plans-featured" : ""}`;
  const content = <>
    <div className="plans-plan-head"><span>{plan.name}</span>{plan.featured ? <strong>Mas elegido</strong> : null}</div>
    <p className="plans-price">{plan.price}<small>{plan.detail}</small></p>
    <p className="plans-limit">{plan.limit}</p>
    <ul>{plan.benefits.map((benefit) => <li key={benefit}><b>{"\u2713"}</b>{benefit}</li>)}</ul>
    {isRegistrationFlow && plan.code ? <span className="plans-select-action">Elegir este plan <ArrowIcon size={16} /></span> : null}
  </>;

  if (isRegistrationFlow && plan.code) {
    return <button type="button" className={className} onClick={() => onSelect(plan.code)}>{content}</button>;
  }
  return <article className={className}>{content}</article>;
}

export function PlansPage({ isRegistrationFlow = false }) {
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
    { code: "base", name: "Prueba gratis", price: priceLabel("trial"), detail: "por 30 dias", limit: "Hasta 10 libros", benefits: ["IA incluida", "Todas las funcionalidades"], tone: "trial" },
    { code: "base", name: "Base", price: priceLabel("base"), detail: "/mes", limit: "Hasta 50 libros", benefits: ["Perfil publico", "Carga manual"], tone: "base" },
    { code: "plus_ai", name: "IA", price: priceLabel("plus_ai"), detail: "/mes", limit: "Hasta 50 libros", benefits: ["Carga desde foto", "Autocompletado con IA"], tone: "featured", featured: true },
  ];

  return (
    <div className="editorial-page plans-page">
      <section className="plans-hero">
        <div className="plans-hero-copy"><p className="section-label">Planes para librerias</p><h1>Una vidriera que crece con tu catalogo<span>.</span></h1><p>{isRegistrationFlow ? "Elegi el plan que mejor acompana a tu libreria. La prueba de 30 dias se activa automaticamente." : "Empeza sin costo, mostra tus libros y elegi la forma de carga que mejor funciona para vos."}</p></div>
        <div className="plans-hero-art" aria-hidden="true"><img src="/images/plans-books.png" alt="" /></div>
      </section>
      <section className="plans-pricing" aria-label="Planes de Bookia">
        {pricingState.error ? <p className="plans-pricing-status" role="status">{pricingState.error}</p> : null}
        {plans.map((plan) => <PlansPlan key={plan.name} plan={plan} isRegistrationFlow={isRegistrationFlow} onSelect={(planCode) => navigate(buildRegisterPath({ profileType: "bookstore", planCode }))} />)}
      </section>
      <section className="plans-growth-band" aria-label="Ampliaciones de catalogo">
        <div className="plans-growth-title"><BookIcon size={54} /><div><p className="plans-growth-kicker">Adicionales de catalogo</p><h2>Hace crecer<br />tu catalogo</h2></div></div>
        <div><p>Hasta</p><strong>100 <small>libros</small></strong><span>+ {priceLabel("catalog_100")}/mes</span></div>
        <div><p>Hasta</p><strong>200 <small>libros</small></strong><span>+ {priceLabel("catalog_200")}/mes</span></div>
      </section>
    </div>
  );
}
export function AboutPage() {
  return (
    <div className="editorial-page about-page">
      <section className="about-hero-modern">
        <div className="about-hero-copy"><p className="section-label">Sobre Bookia</p><h1>Los libros, las librerías y los lectores, en el mismo lugar.</h1><p>Bookia centraliza catálogos reales para que encontrar una lectura y descubrir la librería que la tiene sea más simple.</p><div className="cta-actions"><AppLink className="primary-button" href="/">Explorar libros <ArrowIcon /></AppLink><AppLink className="secondary-button" href="/register">Sumar mi librería</AppLink></div></div>
        <img className="about-hero-logo" src="/images/logo-sin-fondo.png" alt="Logo circular de Bookia" />
      </section>
      <section className="about-problem"><div><p className="section-label">UNA BÚSQUEDA MÁS SIMPLE</p><h2>Menos recorridas entre catálogos. Más tiempo para encontrar.</h2></div><p>Bookia reúne en un solo lugar los catálogos de librerías, vendedores de usados y proyectos que hacen circular libros. Ordena la búsqueda, pero deja la conversación donde importa: entre vos y quien tiene el libro.</p></section>
      <section className="about-how" aria-labelledby="about-how-title"><div className="about-section-heading"><p className="section-label">CÓMO FUNCIONA</p><h2 id="about-how-title">Una conexión directa, en tres pasos.</h2></div><ol><li><span>01</span><BookIcon size={28} /><h3>Buscá un libro</h3><p>Explorá por título, autor, editorial, idioma o género.</p></li><li><span>02</span><StoreIcon size={28} /><h3>Descubrí quién lo tiene</h3><p>Conocé el catálogo y el perfil de cada librería.</p></li><li><span>03</span><WhatsAppIcon size={28} /><h3>Contactá directamente</h3><p>Confirmá disponibilidad con la librería antes de ir o comprar.</p></li></ol><p className="about-disclaimer">Bookia no vende libros ni procesa pagos: facilita el encuentro para que cada operación se acuerde directamente con la librería.</p></section>
      <section className="about-paths" aria-labelledby="about-paths-title"><div className="about-section-heading"><p className="section-label">DOS CAMINOS, UNA COMUNIDAD</p><h2 id="about-paths-title">Bookia crece de los dos lados de la historia.</h2></div><div><article className="about-path-reader"><BookIcon size={34} /><h3>Quiero encontrar libros</h3><p>Descubrí catálogos reales, nuevas librerías y tu próxima lectura.</p><AppLink href="/">Explorar libros <ArrowIcon size={17} /></AppLink></article><article className="about-path-bookstore"><StoreIcon size={34} /><h3>Quiero mostrar mi catálogo</h3><p>Hacé visible tu librería y gestioná tus libros con herramientas simples.</p><AppLink href="/register">Sumar mi librería <ArrowIcon size={17} /></AppLink></article></div></section>
      <section className="about-origin"><div><p className="section-label">DE DÓNDE NACE</p><h2>Creada por Marcelo G. González.</h2></div><div><p>Bookia nació de una pasión por los libros y de una idea concreta: conectar de forma sencilla a lectores y librerías en un lugar centralizado.</p><p>La plataforma busca hacer más fácil descubrir, conversar y gestionar, para que las librerías tengan más tiempo para lo que mejor hacen.</p></div></section>
      <section className="about-impact" aria-labelledby="about-impact-title"><p className="section-label">EL IMPACTO QUE BUSCAMOS</p><h2 id="about-impact-title">Que cada búsqueda abra una nueva posibilidad.</h2><div><article><span>01</span><h3>Más descubrimiento</h3><p>Lectores que encuentran más opciones y librerías que antes no conocían.</p></article><article><span>02</span><h3>Más visibilidad</h3><p>Catálogos y herramientas que acompañan la gestión cotidiana de cada librería.</p></article><article><span>03</span><h3>Más circulación</h3><p>Libros nuevos y usados que vuelven a encontrarse con sus próximos lectores.</p></article></div></section>
      <section className="bookstore-cta about-cta"><div><p className="section-label">EMPEZÁ POR DONDE ESTÉS</p><h2>Tu próxima lectura o tu próxima conversación empieza acá.</h2></div><div className="cta-actions"><AppLink className="light-button" href="/">Explorar libros <ArrowIcon /></AppLink><AppLink className="outline-light-button" href="/register">Sumar mi librería</AppLink></div></section>
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
              <div><dt>Libreria</dt><dd>{bookstore ? <AppLink className="book-detail-store-link" href={`/bookstores/${bookstore.slug}`} onClick={() => trackBookstoreOpened(bookstore, "book_detail_modal")}>{bookstore.name} <ArrowIcon size={14} /></AppLink> : "Libreria no visible"}</dd></div>
            </dl>
            {hasBookstoreContact ? (
              <WhatsAppButton className="primary-button book-detail-whatsapp" whatsappPhone={bookstore.whatsapp_phone} phoneCountryCd={bookstore.phone_country_cd} phone={bookstore.phone} onClick={() => trackWhatsAppClicked(bookstore, "book_detail_modal", selectedBook.id)}>
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
    trackBookDetailOpened(item, "bookstore_page");
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

export function ReaderPage({ slug }) {
  const [reader, setReader] = useState(null);
  const [readingClubs, setReadingClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    apiFetch(`/readers/${slug}`).then((data) => { setReader(data.reader); setReadingClubs(data.reading_clubs || []); setError(""); }).catch((fetchError) => setError(fetchError.message)).finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div className="page-state"><div className="loading-mark" /><p>Cargando lector...</p></div>;
  if (error || !reader) return <div className="page-state"><EmptyState title="No encontramos a este lector">{error || "Revis\u00E1 el enlace o volv\u00E9 a la b\u00FAsqueda."}</EmptyState><button className="secondary-button" onClick={() => navigate("/")}>Volver a buscar</button></div>;

  return <section className="store-page reader-page">
    <div className="store-profile-panel reader-profile-panel"><div className="store-identity"><p className="section-label">Lector en Bookia</p><h1>{reader.display_name}</h1><p>{reader.description || "Comparte clubes de lectura con la comunidad Bookia."}</p></div></div>
    <section className="store-reading-clubs"><div className="section-heading results-heading"><div><p className="section-label">Clubes de lectura</p><h2>Encuentros de {reader.display_name}</h2><p>{readingClubs.length} {readingClubs.length === 1 ? "club publicado" : "clubes publicados"}</p></div><button className="secondary-button" onClick={() => navigate("/")}>Volver a buscar</button></div>
      {readingClubs.length === 0 ? <EmptyState title="Todav\u00EDa no public\u00F3 clubes">Volv\u00E9 pronto para conocer sus pr\u00F3ximos encuentros.</EmptyState> : <div className="reading-club-public-list">{readingClubs.map((club) => <article key={club.id} className="reading-club-public-card"><div className="store-tags" aria-label="G\u00E9nero del club"><span className="store-tag">{club.genre?.name || "Sin g\u00E9nero"}</span></div><h3>{club.title}</h3><p>{club.description}</p><dl><div><dt>Fecha</dt><dd>{displayReadingClubDate(club.meeting_date)}</dd></div><div><dt>Lugar</dt><dd>{club.location || "Lugar a confirmar"}</dd></div></dl></article>)}</div>}
    </section>
  </section>;
}
