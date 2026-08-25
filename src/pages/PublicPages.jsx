import { useEffect, useRef, useState } from "react";

import { apiFetch, resolveApiUrl } from "../api";
import { trackAcquisitionEvent, trackReaderFunnelEvent, trackWebInteractionEvent } from "../analyticsState";
import { getSharedBookId } from "../bookSharingState";
import { getSharedReadingClubId } from "../readingClubSharingState";
import { createFavoriteBookIds, createFollowedBookstoreIds, isReaderAccount, toggleFavoriteBookId } from "../favoritesState";
import { formatCommercialPrice, getCommercialPrices } from "../plansPricingState";
import { buildFacebookHref, buildInstagramHref, buildWebsiteHref, buildWhatsAppHref, formatDisplayUrl, formatDisplayWhatsApp } from "../formatters";
import { AppLink, navigate } from "../navigation";
import { buildRegisterPath } from "../registerState";
import { buildPendingReaderActionEvent, cancelPendingReaderAction, clearPendingReaderAction, completeResumablePendingReaderAction, readPendingReaderAction, savePendingReaderAction } from "../pendingReaderAction";
import { displayBookstoreDescription } from "../profileEditorState";
import { displayReadingClubDate } from "../readingClubState";
import { buildGoogleMapsAddressUrl, buildPublicSearchParams, buildReadingClubSearchParams, filterBookstores, getAvailableReadingClubGenres, getBookstoreTags, getDiscoveryCarouselNavigation, getDiscoveryCarouselScrollOptions, getVisibleReadingClubs, selectDiscoveryCarouselItems } from "../publicSearchState";
import { EmptyState, WhatsAppButton } from "../components/Commerce";
import { ReadingClubShareMenu } from "../components/ReadingClubShareMenu";
import { BookstoreProfileShareMenu } from "../components/BookstoreProfileShareMenu";
import { FavoriteBookButton } from "../components/FavoriteBookButton";
import { BookstoreDescription } from "../components/BookstoreDescription";
import { SectionIndex } from "../components/SectionIndex";
import { ReaderAuthorBadge, ReaderAuthorBooks, ReaderMonogram, ReaderPassport, ReaderSocialLinks, ReaderWantedBooksPublic } from "../components/ReaderPublicProfile";
import { ReaderAuthorBookDetailModal } from "../components/ReaderPublicProfile";
import { getSharedAuthorBookId } from "../authorBookSharingState";
import { BookCover } from "../components/BookCover";
import { activateDialogFocus, AuthRequiredDialog, handleActionDialogBackdrop, handleActionDialogEscape, isolateDialogBackground, ReaderActionContinuationDialog, trapDialogFocus } from "../components/AuthRequiredDialog";
import { ArrowIcon, BookIcon, LocationIcon, SearchIcon, StoreIcon, WhatsAppIcon } from "../components/Icons";

export { activateDialogFocus, AuthRequiredDialog, handleActionDialogBackdrop, handleActionDialogEscape, isolateDialogBackground, trapDialogFocus };

export const PENDING_ACTION_PERSISTENCE_ERROR = "La acción no se pudo guardar para continuar. Revisá la configuración del navegador e intentá nuevamente.";

export function dismissReaderActionDialog(action, closeDialog, options) {
  const cancelled = cancelPendingReaderAction(action, options);
  closeDialog?.();
  return cancelled;
}

export function resolveBookstoreContactSession(me, store) {
  if (me === undefined) return undefined;
  if (store?.contact_requires_auth === true) return null;
  if (store?.contact_requires_auth === false) return me || true;
  return me;
}

export function getBookstoreSessionReconciliationKey(me, store, lastReconciledKey = null) {
  if (!me || store?.contact_requires_auth !== true || !store?.id) return null;
  const key = String(store.id);
  return key === lastReconciledKey ? null : key;
}

export function resolveBookstoreContactContinuation(action, store, items = []) {
  if (action?.type !== "contact_bookstore" || action.target_id !== store?.id) return null;
  const catalogItem = action.catalog_item_id ? items.find((item) => item.id === action.catalog_item_id) : null;
  if (action.catalog_item_id && !catalogItem) {
    return { status: "unavailable", message: "Ese libro ya no está disponible en el catálogo. Podés seguir explorando la librería." };
  }
  const message = catalogItem ? `Hola, quisiera consultarte por el libro ${catalogItem.title} que vi publicado en Bookia.` : undefined;
  const href = buildWhatsAppHref(store.whatsapp_phone, message);
  if (!href) return { status: "unavailable", message: "Esta librería ya no tiene WhatsApp disponible. Podés volver a intentarlo más adelante." };
  return {
    status: "ready",
    href,
    catalogItem,
    source: action.source || (catalogItem ? "bookstore_catalog_card" : "bookstore_profile_contact"),
  };
}

export function handleBookstoreContactLoadFailure({ error, slug, storage, origin, now }) {
  const action = readPendingReaderAction({ storage, origin, now });
  const returnPath = action?.return_path?.split(/[?#]/, 1)[0];
  if (action?.type !== "contact_bookstore" || returnPath !== `/bookstores/${slug}`) return null;
  if (![404, 410].includes(error?.status)) return { status: "retryable", action };
  cancelPendingReaderAction(action, { storage, origin, now });
  return { status: "unavailable", action, message: "Esta librería ya no está disponible para contactar. Podés volver a la búsqueda y elegir otra." };
}

export function getReadingClubInterestMode(me) {
  if (me === undefined) return "loading";
  return me ? "open_form" : "auth_required";
}

export function getReadingClubInterestPrefill(me) {
  return {
    name: me?.reader_profile?.display_name || me?.bookstore?.name || "",
    email: me?.account?.email || "",
    phone: "",
    privacy_accepted: false,
  };
}

export function resolveReadingClubContinuation(action, clubs = [], { loading = false, error = "" } = {}) {
  if (action?.type !== "reading_club_interest") return null;
  if (loading || error) return { status: "deferred", club: null };
  const club = clubs.find((candidate) => candidate.id === action.target_id);
  return club ? { status: "ready", club } : { status: "unavailable", message: "Ese club ya no está disponible. Podés explorar otros encuentros." };
}

export async function submitReadingClubInterest({ clubId, draft, storage, origin, now, send = apiFetch, track = trackReaderFunnelEvent }) {
  const result = await send(`/reading-clubs/${clubId}/interests`, { method: "POST", body: JSON.stringify(draft) });
  await completeResumablePendingReaderAction({ type: "reading_club_interest", targetId: clubId, storage, origin, now, track });
  return result;
}

export function BookstoreWhatsAppAction({ me, store, item = null, source, onRequireAuth, className = "primary-button", ariaLabel, children }) {
  const label = children || <><WhatsAppIcon size={19} /> {item ? "Contactar por WhatsApp" : "Hablar por WhatsApp"}</>;
  if (me === undefined || !me) {
    return <button type="button" className={className} aria-label={ariaLabel} disabled={me === undefined} onClick={(event) => { event.stopPropagation(); onRequireAuth?.({ item, source }); }} onKeyDown={(event) => event.stopPropagation()}>{label}</button>;
  }
  return <WhatsAppButton className={className} whatsappPhone={store?.whatsapp_phone} message={item ? `Hola, quisiera consultarte por el libro ${item.title} que vi publicado en Bookia.` : undefined} ariaLabel={ariaLabel} onClick={(event) => { event.stopPropagation(); trackWhatsAppClicked(store, source, item?.id); }}>{label}</WhatsAppButton>;
}

export function startBookstoreContactIntent({ store, item = null, source, returnPath, storage, origin, now, randomUUID, track = trackReaderFunnelEvent }) {
  const action = savePendingReaderAction({
    type: "contact_bookstore",
    targetId: store?.id,
    bookstoreId: store?.id,
    catalogItemId: item?.id,
    source,
    returnPath,
  }, { storage, origin, now, randomUUID });
  if (action) track(buildPendingReaderActionEvent(action, "reader_intent_started"));
  return action;
}

export function startReadingClubInterestIntent({ club, host, returnPath, storage, origin, now, randomUUID, track = trackReaderFunnelEvent }) {
  const action = savePendingReaderAction({
    type: "reading_club_interest",
    targetId: club?.id,
    bookstoreId: host?.type === "bookstore" ? club?.bookstore_id : undefined,
    returnPath,
  }, { storage, origin, now, randomUUID });
  if (action) track(buildPendingReaderActionEvent(action, "reader_intent_started"));
  return action;
}

export function BookstoreContactCard({ store, me, onRequireAuth }) {
  const mapsHref = buildGoogleMapsAddressUrl(store.address);
  const address = store.address?.trim();
  if (!me) {
    return (
      <aside className="store-contact-card is-locked">
        <p className="contact-label">Datos de interés</p>
        {address ? <dl><div><dt>Dirección</dt><dd>{mapsHref ? <ContactLink href={mapsHref}>{address}</ContactLink> : address}</dd></div></dl> : null}
        <div className="store-contact-lock"><span aria-hidden="true">🔒</span><p>Creá una cuenta o iniciá sesión para acceder al contacto digital de esta librería.</p></div>
        <BookstoreWhatsAppAction me={me} store={store} source="bookstore_profile_contact" onRequireAuth={onRequireAuth} />
      </aside>
    );
  }
  const whatsappLabel = formatDisplayWhatsApp(store.whatsapp_phone);
  const instagramHref = buildInstagramHref(store.instagram_handle);
  const facebookHref = buildFacebookHref(store.facebook_handle);
  const websiteHref = buildWebsiteHref(store.website_url);
  const contactItems = [
    whatsappLabel ? { label: "Celular con WhatsApp", content: whatsappLabel } : null,
    store.correo && String(store.correo).trim() ? { label: "Correo", content: <a href={`mailto:${store.correo}`}>{store.correo}</a> } : null,
    instagramHref ? { label: "Instagram", content: <ContactLink href={instagramHref}>{formatDisplayUrl(instagramHref)}</ContactLink> } : null,
    facebookHref ? { label: "Facebook", content: <ContactLink href={facebookHref}>{formatDisplayUrl(facebookHref)}</ContactLink> } : null,
    websiteHref ? { label: "Sitio web", content: <ContactLink href={websiteHref}>{formatDisplayUrl(websiteHref)}</ContactLink> } : null,
    address ? { label: "Dirección", content: mapsHref ? <ContactLink href={mapsHref}>{address}</ContactLink> : address } : null,
  ].filter(Boolean);
  return contactItems.length > 0 ? <aside className="store-contact-card"><p className="contact-label">Datos de interés</p><dl>{contactItems.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.content}</dd></div>)}</dl><BookstoreWhatsAppAction me={me} store={store} source="bookstore_profile_contact" onRequireAuth={onRequireAuth} /></aside> : null;
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
function useFavoriteBooks(me) {
  const readerKey = me?.reader_profile ? String(me.reader_profile.id ?? me.reader_profile.slug ?? me.id ?? "reader") : null;
  const [favoriteIds, setFavoriteIds] = useState(() => new Set());
  const [pendingIds, setPendingIds] = useState(() => new Set());
  const [followedBookstoreIds, setFollowedBookstoreIds] = useState(() => new Set());
  const [pendingBookstoreIds, setPendingBookstoreIds] = useState(() => new Set());
  const [favoriteError, setFavoriteError] = useState("");
  const [favoritesLoading, setFavoritesLoading] = useState(() => isReaderAccount(me));
  const [loadedReaderKey, setLoadedReaderKey] = useState(null);

  useEffect(() => {
    if (!isReaderAccount(me)) { setFavoriteIds(new Set()); setFollowedBookstoreIds(new Set()); setFavoriteError(""); setFavoritesLoading(false); setLoadedReaderKey(null); return undefined; }
    let active = true;
    setFavoritesLoading(true);
    setLoadedReaderKey(null);
    apiFetch("/dashboard/favorites").then((data) => {
      if (!active) return;
      setFavoriteIds(createFavoriteBookIds(data));
      setFollowedBookstoreIds(createFollowedBookstoreIds(data));
      setLoadedReaderKey(readerKey);
      setFavoritesLoading(false);
    }).catch((error) => { if (active) { setFavoriteError(error.message); setFavoritesLoading(false); } });
    return () => { active = false; };
  }, [readerKey]);

  function startReaderIntent(type, targetId, bookstoreId) {
    const action = savePendingReaderAction({
      type,
      targetId,
      bookstoreId,
      returnPath: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    });
    if (action) trackReaderFunnelEvent(buildPendingReaderActionEvent(action, "reader_intent_started"));
    navigate(buildRegisterPath({ profileType: "reader" }));
  }

  function toggleFavorite(itemId, _event, bookstoreId) {
    if (!isReaderAccount(me)) { startReaderIntent("favorite_book", itemId, bookstoreId); return; }
    const wasFavorite = favoriteIds.has(itemId);
    setFavoriteIds((ids) => toggleFavoriteBookId(ids, itemId, !wasFavorite));
    setPendingIds((ids) => toggleFavoriteBookId(ids, itemId, true));
    setFavoriteError("");
    apiFetch(`/dashboard/favorites/books/${itemId}`, { method: wasFavorite ? "DELETE" : "POST" })
      .catch((error) => { setFavoriteIds((ids) => toggleFavoriteBookId(ids, itemId, wasFavorite)); setFavoriteError(error.message); })
      .finally(() => setPendingIds((ids) => toggleFavoriteBookId(ids, itemId, false)));
  }

  function toggleFollowBookstore(bookstore) {
    if (!isReaderAccount(me)) { startReaderIntent("follow_bookstore", bookstore.id, bookstore.id); return; }
    const wasFollowing = followedBookstoreIds.has(bookstore.id);
    setFollowedBookstoreIds((ids) => toggleFavoriteBookId(ids, bookstore.id, !wasFollowing));
    setPendingBookstoreIds((ids) => toggleFavoriteBookId(ids, bookstore.id, true));
    setFavoriteError("");
    apiFetch(`/dashboard/favorites/bookstores/${bookstore.id}`, { method: wasFollowing ? "DELETE" : "POST" })
      .catch((error) => {
        setFollowedBookstoreIds((ids) => toggleFavoriteBookId(ids, bookstore.id, wasFollowing));
        setFavoriteError(error.message);
      })
      .finally(() => setPendingBookstoreIds((ids) => toggleFavoriteBookId(ids, bookstore.id, false)));
  }

  return { favoriteIds, pendingIds, followedBookstoreIds, pendingBookstoreIds, favoriteError, favoritesLoading: isReaderAccount(me) && (favoritesLoading || loadedReaderKey !== readerKey), toggleFavorite, toggleFollowBookstore };
}
const EMPTY_SEARCH_FILTERS = { query: "", bookStatus: "", language: "", genreSlug: "" };

function createSearchFilters(filters = {}) {
  return { query: filters.query || "", bookStatus: filters.bookStatus || "", language: filters.language || "", genreSlug: filters.genreSlug || "" };
}

function HeroSearch({ initialFilters, genres, genresLoading, onSearch, children }) {
  const [filters, setFilters] = useState(() => createSearchFilters(initialFilters));
  useEffect(() => setFilters(createSearchFilters(initialFilters)), [initialFilters]);
  function submit(event) { event.preventDefault(); onSearch(filters); }
  function updateFilter(name) { return (event) => setFilters((current) => ({ ...current, [name]: event.target.value })); }
  return (
    <section className="hero" id="buscar">
      <div className="hero-copy"><p className="section-label">ENCONTRÁ TU PRÓXIMO LIBRO</p><h1>Encontrá el libro que buscás.</h1><p className="hero-lead">Buscá por título, autor o editorial. Después, contactá directamente a la librería para confirmar disponibilidad.</p></div>
      <div className="hero-books" aria-hidden="true"><img className="hero-illustration" src="/images/hero-bookia-discovery.webp" alt="" /></div>
      <form className="search-panel" onSubmit={submit} aria-label="Buscar libros">
        <p className="search-panel-heading">Buscá un libro</p>
        <label className="search-field search-field-query"><span>¿Qué libro buscás?</span><span className="input-with-icon"><SearchIcon /><input value={filters.query} onChange={updateFilter("query")} placeholder="Ej.: Rayuela, Julio Cortázar o Sudamericana" /></span></label>
        <details className="search-filters">
          <summary>Más filtros</summary>
          <div className="search-filter-fields">
            <label className="search-field"><span>Estado</span><select value={filters.bookStatus} onChange={updateFilter("bookStatus")}><option value="">Todos los estados</option><option value="nuevo">Nuevo</option><option value="usado">Usado</option></select></label>
            <label className="search-field"><span>Idioma</span><input value={filters.language} onChange={updateFilter("language")} placeholder="Ej.: Español" /></label>
            <label className="search-field"><span>Género</span><select value={filters.genreSlug} onChange={updateFilter("genreSlug")} disabled={genresLoading}><option value="">{genresLoading ? "Cargando géneros..." : "Todos los géneros"}</option>{genres.map((genre) => <option key={genre.id} value={genre.slug}>{genre.name}</option>)}</select></label>
          </div>
        </details>
        <button className="primary-button search-submit" type="submit">Buscar <ArrowIcon /></button>
      </form>
      {children}
    </section>
  );
}

export function DiscoveryCarousel({ items = [], loading, onOpenBook }) {
  const trackRef = useRef(null);
  const [navigation, setNavigation] = useState(() => ({ canPrevious: false, canNext: items.length > 1 }));

  useEffect(() => {
    const track = trackRef.current;
    if (!track || loading || !items.length) return undefined;
    function updateNavigation() {
      const nextNavigation = getDiscoveryCarouselNavigation(track);
      setNavigation((current) => current.canPrevious === nextNavigation.canPrevious && current.canNext === nextNavigation.canNext ? current : nextNavigation);
    }
    updateNavigation();
    track.addEventListener("scroll", updateNavigation, { passive: true });
    globalThis.addEventListener?.("resize", updateNavigation);
    return () => {
      track.removeEventListener("scroll", updateNavigation);
      globalThis.removeEventListener?.("resize", updateNavigation);
    };
  }, [items.length, loading]);

  function scrollTrack(direction) {
    const track = trackRef.current;
    if (!track) return;
    const reduceMotion = globalThis.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    track.scrollBy(getDiscoveryCarouselScrollOptions({ direction, clientWidth: track.clientWidth, reduceMotion }));
  }

  function handleTrackKeyDown(event) {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    scrollTrack(event.key === "ArrowLeft" ? -1 : 1);
  }

  if (loading) {
    return (
      <section className="discovery-carousel discovery-carousel-loading" aria-label="Cargando libros para explorar">
        <div className="discovery-carousel-heading"><span /><span /></div>
        <div className="discovery-carousel-skeletons" aria-hidden="true"><span /><span /><span /><span /></div>
      </section>
    );
  }
  if (!items.length) return null;

  return (
    <section className="discovery-carousel" aria-labelledby="discovery-carousel-title">
      <div className="discovery-carousel-heading">
        <div><p className="section-label">PARA EMPEZAR A EXPLORAR</p><h2 id="discovery-carousel-title">Algunos libros en Bookia</h2></div>
        <div className="discovery-carousel-controls">
          <button type="button" aria-label="Ver libros anteriores" disabled={!navigation.canPrevious} onClick={() => scrollTrack(-1)}><ArrowIcon /></button>
          <button type="button" aria-label="Ver más libros" disabled={!navigation.canNext} onClick={() => scrollTrack(1)}><ArrowIcon /></button>
        </div>
      </div>
      <div ref={trackRef} className="discovery-carousel-track" aria-label="Libros para explorar" tabIndex={0} onKeyDown={handleTrackKeyDown}>
        {items.map((item) => (
          <button key={item.id} type="button" className="discovery-book-card" aria-label={`Ver detalles de ${item.title}`} onClick={() => onOpenBook(item)}>
            <BookCover item={item} className="discovery-book-cover" loading="lazy" />
            <span className="discovery-book-copy">
              <strong>{item.title}</strong>
              <span>{item.author || "Autor no visible"}</span>
              <small>{item.bookstore?.name || "Librería en Bookia"}</small>
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function InitialBookDiscovery({ items, loading, me }) {
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedBookImageUrl, setSelectedBookImageUrl] = useState(null);
  const [authAction, setAuthAction] = useState(null);

  function openBookDetail(item) {
    trackBookDetailOpened(item, "discovery_carousel");
    const gallery = bookImageGallery(item);
    setSelectedBook(item);
    setSelectedBookImageUrl(gallery[0]?.url ? resolveApiUrl(gallery[0].url) : null);
  }

  function closeBookDetail() {
    setSelectedBook(null);
    setSelectedBookImageUrl(null);
  }

  function requireBookstoreAuth({ item, source }) {
    const store = item?.bookstore;
    if (!store?.id || !store?.slug) return;
    const action = startBookstoreContactIntent({ store, item, source, returnPath: `/bookstores/${store.slug}` });
    if (action) setAuthAction(action);
  }

  useEffect(() => {
    if (!selectedBook) return undefined;
    const onKeyDown = (event) => event.key === "Escape" && closeBookDetail();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedBook]);

  return <><DiscoveryCarousel items={items} loading={loading} onOpenBook={openBookDetail} />{selectedBook ? <DiscoveryBookDetailModal selectedBook={selectedBook} selectedBookImageUrl={selectedBookImageUrl} onImageChange={setSelectedBookImageUrl} onClose={closeBookDetail} me={me} contactGate={{ me, onRequireAuth: requireBookstoreAuth }} isBackgroundObscured={Boolean(authAction)} /> : null}{authAction ? <AuthRequiredDialog action={authAction} onCancel={() => dismissReaderActionDialog(authAction, () => setAuthAction(null))} /> : null}</>;
}

function DiscoveryBookDetailModal({ me, ...modalProps }) {
  const favorites = useFavoriteBooks(me);
  return <BookDetailModal {...modalProps} favorites={favorites} isSessionLoading={me === undefined || favorites.favoritesLoading} />;
}

function SearchResults({ filters, stores, me, onClearFilters }) {
  const [items, setItems] = useState([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedBookImageUrl, setSelectedBookImageUrl] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [authAction, setAuthAction] = useState(null);
  const favorites = useFavoriteBooks(me);
  const hasSearched = filters !== null;
  const visibleItems = items.filter((item) => item.availability_status !== "hidden");
  const activeFilters = [
    filters?.query ? `Búsqueda: ${filters.query}` : "",
    filters?.bookStatus ? `Estado: ${filters.bookStatus === "nuevo" ? "Nuevo" : "Usado"}` : "",
    filters?.language ? `Idioma: ${filters.language}` : "",
    filters?.genreSlug ? `Género: ${filters.genreSlug}` : "",
    selectedStore ? `Librería: ${stores.find((store) => store.slug === selectedStore)?.name || selectedStore}` : "",
  ].filter(Boolean);

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

  function requireBookstoreAuth({ item, source }) {
    const store = item?.bookstore;
    if (!store?.id || !store?.slug) return;
    const action = startBookstoreContactIntent({ store, item, source, returnPath: `/bookstores/${store.slug}` });
    if (action) setAuthAction(action);
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

  function clearFilters() {
    setSelectedStore("");
    onClearFilters();
  }

  return (
    <section className="results-section" id="resultados" aria-live="polite">
      <div className="section-heading results-heading">
        <div>
          <p className="section-label">{"RESULTADOS DE B\u00DASQUEDA"}</p>
          <h2>{filters.query ? `Resultados para «${filters.query}»` : "Libros para explorar"}</h2>
          <p>{loading ? "Buscando en los cat\u00E1logos..." : `${visibleItems.length} ${visibleItems.length === 1 ? "libro encontrado" : "libros encontrados"}`}</p>
          {activeFilters.length > 0 ? <div className="active-search-filters" aria-label="Filtros activos">{activeFilters.map((filter) => <span key={filter}>{filter}</span>)}</div> : null}
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
      {error ? <p className="feedback error">{error}</p> : null}{favorites.favoriteError ? <p className="feedback error">{favorites.favoriteError}</p> : null}
      {loading ? <div className="loading-list" aria-label="Cargando resultados"><span /><span /><span /></div> : null}
      {!loading && !error && visibleItems.length === 0 ? <div className="search-empty-result"><EmptyState title="No encontramos libros con esos filtros">Probá con otra búsqueda o limpiá los filtros para explorar todo el catálogo.</EmptyState><button type="button" className="secondary-button" onClick={clearFilters}>Limpiar filtros</button></div> : null}
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
              <BookstoreWhatsAppAction className="primary-button search-result-whatsapp" me={me} store={item.bookstore} item={item} source="search_results" onRequireAuth={requireBookstoreAuth}>
                <WhatsAppIcon size={19} /> Contactar
              </BookstoreWhatsAppAction>
              <FavoriteBookButton itemId={item.id} bookstoreId={item.bookstore?.id} isFavorite={favorites.favoriteIds.has(item.id)} isPending={favorites.pendingIds.has(item.id)} isSessionLoading={me === undefined || favorites.favoritesLoading} onToggle={favorites.toggleFavorite} />

            </article>
          ))}
        </div>
      ) : null}
      <BookDetailModal selectedBook={selectedBook} selectedBookImageUrl={selectedBookImageUrl} onImageChange={setSelectedBookImageUrl} onClose={closeBookDetail} favorites={favorites} isSessionLoading={me === undefined || favorites.favoritesLoading} contactGate={{ me, onRequireAuth: requireBookstoreAuth }} isBackgroundObscured={Boolean(authAction)} />
      {authAction ? <AuthRequiredDialog action={authAction} onCancel={() => dismissReaderActionDialog(authAction, () => setAuthAction(null))} /> : null}
    </section>
  );
}

const BOOKSTORE_BENEFITS = [
  [<StoreIcon key="icon" />, "Catálogos publicados", "Descubrí librerías con libros disponibles para explorar."],
  [<BookIcon key="icon" />, "Nuevos y usados", "Elegí la opción que mejor se adapte a tu búsqueda."],
  [<WhatsAppIcon key="icon" />, "Contacto directo", "Consultá disponibilidad por WhatsApp."],
];

const SEARCH_BENEFITS = [
  [<BookIcon key="icon" />, "Buscá como te resulte más fácil", "Escribí el título, autor o editorial."],
  [<SearchIcon key="icon" />, "Elegí cómo querés leer", "Filtrá por estado, idioma o género."],
  [<WhatsAppIcon key="icon" />, "Consultá a la librería", "Confirmá disponibilidad por WhatsApp antes de ir."],
];
const READING_CLUB_BENEFITS = [
  [<BookIcon key="icon" />, "Encontrá tu comunidad", "Descubrí clubes por nombre, tema o género."],
  [<LocationIcon key="icon" />, "Conocé cada encuentro", "Revisá fecha, lugar y quién lo organiza."],
  [<WhatsAppIcon key="icon" />, "Compartí la invitación", "Compartí los clubes que te interesan."],
];

function BenefitsStrip({ benefits, ariaLabel, className = "" }) {
  return <section className={`benefits-strip ${className}`.trim()} aria-label={ariaLabel}>{benefits.map(([icon, title, text]) => <div key={title}>{icon}<span><strong>{title}</strong><small>{text}</small></span></div>)}</section>;
}

export function hideBrokenReadingClubCover(event) {
  event.currentTarget.hidden = true;
}

export function ReadingClubPublicCard({
  club,
  host = null,
  hostPath = "",
  bookstoreId = null,
  source = "",
  showOrganizer = false,
  showShare = false,
  shared = false,
  onOpenDetails = null,
  onOpenInterest = null,
  showInterest = false,
  interestDisabled = false,
  hideExternalLink = false,
}) {
  const hostName = host?.type === "bookstore" ? host.name : host?.display_name;
  const profileLabel = "Ver perfil";
  const details = <>
    <div className="reading-club-public-genre-row" aria-label="Género del club"><span className="reading-club-public-genre">{club.genre?.name || "Sin género"}</span></div>
    <h3 className="reading-club-public-title">{club.title}</h3>
    <BookstoreDescription className="reading-club-public-description" value={club.description} />
    <dl>
      <div><dt>Fecha</dt><dd>{displayReadingClubDate(club.meeting_date)}</dd></div>
      <div><dt>Lugar</dt><dd>{club.location || "Lugar a confirmar"}</dd></div>
      {showOrganizer ? <div><dt>Organiza</dt><dd>{hostName || "Anfitrión de Bookia"}</dd></div> : null}
    </dl>
  </>;
  const content = <>
    {club.cover_url ? <img className="reading-club-public-cover" src={resolveApiUrl(club.cover_url)} alt={`Portada de ${club.title}`} loading="lazy" decoding="async" onError={hideBrokenReadingClubCover} /> : null}
    <div className="reading-club-public-card-details">{details}</div>
  </>;
  const hasExternalLink = Boolean(club.external_url && !hideExternalLink);

  return <article id={`club-${club.id}`} className={`reading-club-public-card${shared ? " is-shared-club" : ""}`}>
    {showShare ? <ReadingClubShareMenu club={club} host={host} hostName={hostName} bookstoreId={bookstoreId} source={source} /> : null}
    {onOpenDetails ? <button type="button" className="reading-club-public-card-content reading-club-link reading-club-detail-trigger" aria-label={`Ver detalles de ${club.title}`} onClick={onOpenDetails}>{content}</button> : hostPath ? <AppLink className="reading-club-public-card-content reading-club-link" href={hostPath}>{content}</AppLink> : <div className="reading-club-public-card-content">{content}</div>}
    {onOpenDetails || hostPath || showShare || hasExternalLink ? <div className="reading-club-public-actions">
      <div className="reading-club-public-actions-main">
        {hostPath && hostName ? <AppLink className="secondary-button reading-club-card-action" href={hostPath}>{profileLabel}</AppLink> : null}
        {onOpenDetails ? club.external_url ? <a className="secondary-button reading-club-card-action" href={club.external_url} target="_blank" rel="noopener noreferrer">+ info</a> : <button type="button" className="secondary-button reading-club-card-action" onClick={onOpenDetails}>+ info</button> : null}
        {showInterest && onOpenInterest ? <button type="button" className="primary-button reading-club-card-action" onClick={onOpenInterest} disabled={interestDisabled}>Estoy interesado@</button> : null}
      </div>
      {hasExternalLink ? <a className="reading-club-external-link" href={club.external_url} target="_blank" rel="noopener noreferrer">Ver más sobre este encuentro <ArrowIcon size={15} /></a> : null}
    </div> : null}
  </article>;
}

function BookstoresSection({ stores, loading }) {
  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("");
  const [showAll, setShowAll] = useState(false);
  const tags = getBookstoreTags(stores);
  const filteredStores = filterBookstores(stores, { query, tag });
  const hasActiveFilters = Boolean(query.trim() || tag);
  const visibleStores = hasActiveFilters || showAll ? filteredStores : filteredStores.slice(0, 6);
  const canExpand = !hasActiveFilters && filteredStores.length > 6;

  function clearFilters() {
    setQuery("");
    setTag("");
    setShowAll(false);
  }

  return (
    <section className="home-section bookstores-section" id="librerias">
      <div className="section-heading">
        <div><p className="section-label">LIBRERÍAS EN BOOKIA</p><h2>Encontrá librerías para tu próxima lectura</h2></div>
        <img className="bookstores-section-illustration" src="/images/bookstores-section-facade.png" alt="" />
      </div>
      {!loading && stores.length > 0 ? <form className="bookstore-filters" role="search" aria-label="Buscar librerías" onSubmit={(event) => event.preventDefault()}>
        <label className="bookstore-filter-field"><span>Buscá una librería</span><span className="input-with-icon"><SearchIcon /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej.: DataBooksAr" /></span></label>
        <label className="bookstore-filter-field"><span>Género</span><select value={tag} onChange={(event) => setTag(event.target.value)}><option value="">Todos los géneros</option>{tags.map((option) => <option key={option} value={option}>{option}</option>)}</select></label>
      </form> : null}
      {loading ? <div className="store-grid loading-stores"><span /><span /><span /></div> : null}
      {!loading && stores.length === 0 ? <EmptyState compact title="Todavía no hay librerías disponibles">Estamos sumando catálogos. Volvé pronto para descubrir nuevos libros.</EmptyState> : null}
      {!loading && stores.length > 0 ? <p className="discovery-results-summary" aria-live="polite">{filteredStores.length} {filteredStores.length === 1 ? "librería encontrada" : "librerías encontradas"}</p> : null}
      {!loading && stores.length > 0 && visibleStores.length === 0 ? <div className="discovery-empty-result"><EmptyState compact title="No encontramos librerías con esos filtros">Probá otro nombre, otro género o limpiá los filtros.</EmptyState><button type="button" className="secondary-button" onClick={clearFilters}>Limpiar filtros</button></div> : null}
      {!loading && visibleStores.length > 0 ? (
        <div id="bookstores-results" className="store-grid">
          {visibleStores.map((store, index) => {
            const logoUrl = resolveApiUrl(store.logo_url);
            return (
              <AppLink className="store-card" href={`/bookstores/${store.slug}`} key={store.id} onClick={() => trackBookstoreOpened(store, "home_bookstores")}>
                <span className="store-card-number">{String(index + 1).padStart(2, "0")}</span>
                {logoUrl ? <img src={logoUrl} alt="" onError={(event) => { event.currentTarget.hidden = true; }} /> : <span className="store-card-placeholder"><StoreIcon /></span>}
                <span><strong>{store.name}</strong><small>{store.address || "Catálogo disponible online"}</small></span>
                <ArrowIcon />
              </AppLink>
            );
          })}
        </div>
      ) : null}
      {canExpand ? <button type="button" className="secondary-button discovery-expand-button" aria-controls="bookstores-results" aria-expanded={showAll} onClick={() => setShowAll((current) => !current)}>{showAll ? "Mostrar menos" : "Ver todas las librerías"}</button> : null}
      <BenefitsStrip className="bookstores-benefits-strip" benefits={BOOKSTORE_BENEFITS} ariaLabel="Beneficios para librerías" />
    </section>
  );
}


function ReadingClubsSection({ me }) {
  const [clubs, setClubs] = useState([]);
  const [availableGenres, setAvailableGenres] = useState([]);
  const [genreSlug, setGenreSlug] = useState("");
  const [query, setQuery] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedClub, setSelectedClub] = useState(null);
  const [selectedClubHost, setSelectedClubHost] = useState(null);
  const [selectedClubHostPath, setSelectedClubHostPath] = useState("");
  const [interestOpen, setInterestOpen] = useState(false);
  const [authAction, setAuthAction] = useState(null);
  const [continuationAction, setContinuationAction] = useState(null);
  const [actionError, setActionError] = useState("");

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

  const hasActiveFilters = Boolean(query.trim() || genreSlug);
  const visibleClubs = getVisibleReadingClubs(clubs, genreSlug, query, showAll);
  const canExpand = !hasActiveFilters && clubs.length > 6;

  function closeClubDetails() {
    setSelectedClub(null);
    setSelectedClubHost(null);
    setSelectedClubHostPath("");
    setInterestOpen(false);
  }

  function openClubDetails(club, host, hostPath) {
    setSelectedClub(club);
    setSelectedClubHost(host);
    setSelectedClubHostPath(hostPath);
    setInterestOpen(false);
  }

  function showClubInterest(club, host, hostPath) {
    setSelectedClub(club);
    setSelectedClubHost(host);
    setSelectedClubHostPath(hostPath);
    setInterestOpen(true);
  }

  function openClubInterest(club, host, hostPath) {
    const mode = getReadingClubInterestMode(me);
    if (mode === "loading") return;
    if (mode === "open_form") {
      showClubInterest(club, host, hostPath);
      return;
    }
    const action = startReadingClubInterestIntent({
      club,
      host,
      returnPath: `${window.location.pathname}${window.location.search}${window.location.hash || "#clubes"}`,
    });
    if (!action) {
      setActionError(PENDING_ACTION_PERSISTENCE_ERROR);
      return;
    }
    setActionError("");
    setAuthAction(action);
  }

  function cancelClubAuth() {
    cancelPendingReaderAction(authAction);
    setAuthAction(null);
  }

  useEffect(() => {
    if (loading || !me) return;
    const action = readPendingReaderAction();
    const continuation = resolveReadingClubContinuation(action, clubs, { loading, error });
    if (!continuation) return;
    if (continuation.status === "deferred") return;
    if (continuation.status === "unavailable") {
      clearPendingReaderAction();
      setActionError(continuation.message);
      return;
    }
    setContinuationAction(action);
  }, [loading, error, clubs, me]);

  function continueClubInterest() {
    const club = clubs.find((candidate) => candidate.id === continuationAction?.target_id);
    if (!club) return;
    const host = club.host;
    const hostPath = host?.slug ? (host.type === "bookstore" ? `/bookstores/${host.slug}` : `/readers/${host.slug}`) : "";
    setContinuationAction(null);
    showClubInterest(club, host, hostPath);
  }

  useEffect(() => {
    if (!selectedClub) return undefined;
    const onKeyDown = (event) => event.key === "Escape" && closeClubDetails();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedClub]);

  function clearFilters() {
    setGenreSlug("");
    setQuery("");
    setShowAll(false);
  }

  return (
    <section className="home-section reading-clubs-section" id="clubes">
      <div className="section-heading"><div><p className="section-label">CLUBES DE LECTURA</p><h2>Encontrá un club para compartir lecturas</h2></div><img className="reading-clubs-section-illustration" src="/images/reading-clubs-section.png" alt="" /></div>
      <form className="bookstore-filters reading-club-filters" role="search" aria-label="Buscar clubes de lectura" onSubmit={(event) => event.preventDefault()}>
        <label className="bookstore-filter-field"><span>Buscá por nombre o tema</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Ej.: ciencia ficción, poesía o Club de novela" /></label>
        <label className="bookstore-filter-field"><span>Género</span><select value={genreSlug} onChange={(event) => setGenreSlug(event.target.value)} disabled={loading}><option value="">{loading ? "Cargando géneros..." : "Todos los géneros"}</option>{availableGenres.map((genre) => <option key={genre.id} value={genre.slug}>{genre.name}</option>)}</select></label>
      </form>
      {loading ? <div className="reading-club-public-list loading-stores" aria-label="Cargando clubes de lectura"><span /><span /><span /></div> : null}
      {error ? <p className="feedback error" role="alert">{error}</p> : null}
      {actionError ? <p className="feedback error" role="alert">{actionError}</p> : null}
      {!loading && !error && clubs.length > 0 ? <p className="discovery-results-summary" aria-live="polite">{visibleClubs.length} {visibleClubs.length === 1 ? "club encontrado" : "clubes encontrados"}</p> : null}
      {!loading && !error && clubs.length === 0 && !hasActiveFilters ? <EmptyState compact title="Todavía no hay clubes de lectura disponibles">Estamos sumando encuentros para que encuentres tu próxima conversación.</EmptyState> : null}
      {!loading && !error && clubs.length === 0 && hasActiveFilters ? <div className="discovery-empty-result"><EmptyState compact title="No encontramos clubes con esos filtros">Probá otro nombre, tema o género, o limpiá los filtros.</EmptyState><button type="button" className="secondary-button" onClick={clearFilters}>Limpiar filtros</button></div> : null}
      {!loading && !error && visibleClubs.length > 0 ? (
        <div id="reading-clubs-results" className="reading-club-public-list">
          {visibleClubs.map((club) => {
            const host = club.host;
            const hostPath = host?.slug ? (host.type === "bookstore" ? `/bookstores/${host.slug}` : `/readers/${host.slug}`) : "";
            return <ReadingClubPublicCard key={club.id} club={club} host={host} hostPath={hostPath} bookstoreId={host?.type === "bookstore" ? club.bookstore_id : null} source="public_reading_clubs" showOrganizer showInterest showShare onOpenDetails={() => openClubDetails(club, host, hostPath)} onOpenInterest={() => openClubInterest(club, host, hostPath)} interestDisabled={me === undefined} hideExternalLink />;
          })}
        </div>
      ) : null}
      {canExpand ? <button type="button" className="secondary-button discovery-expand-button" aria-controls="reading-clubs-results" aria-expanded={showAll} onClick={() => setShowAll((current) => !current)}>{showAll ? "Mostrar menos" : "Ver todos los clubes"}</button> : null}
      <BenefitsStrip className="reading-clubs-benefits-strip" benefits={READING_CLUB_BENEFITS} ariaLabel="Beneficios de los clubes de lectura" />
      <ReadingClubDetailModal selectedClub={selectedClub} host={selectedClubHost} hostPath={selectedClubHostPath} initialInterestOpen={interestOpen} me={me} onClose={closeClubDetails} />
      {authAction ? <AuthRequiredDialog action={authAction} onCancel={cancelClubAuth} /> : null}
      {continuationAction ? <ReaderActionContinuationDialog action={continuationAction} continueLabel="Continuar con mi interés" onContinue={continueClubInterest} onCancel={() => dismissReaderActionDialog(continuationAction, () => setContinuationAction(null))} /> : null}
    </section>
  );
}

export function ReadingClubDetailModal({ selectedClub, host = null, hostPath = "", initialInterestOpen = false, me = null, onClose }) {
  const [interestOpen, setInterestOpen] = useState(false);
  const [interestDraft, setInterestDraft] = useState({ name: "", email: "", phone: "", privacy_accepted: false });
  const [interestStatus, setInterestStatus] = useState("");
  const [interestError, setInterestError] = useState("");
  const [interestSaving, setInterestSaving] = useState(false);
  useEffect(() => {
    setInterestOpen(initialInterestOpen);
    setInterestStatus("");
    setInterestError("");
    setInterestDraft(getReadingClubInterestPrefill(me));
  }, [selectedClub?.id, initialInterestOpen, me]);
  if (!selectedClub) return null;
  const hostName = host?.type === "bookstore" ? host.name : host?.display_name;

  function submitInterest(event) {
    event.preventDefault();
    if (interestSaving) return;
    setInterestSaving(true);
    setInterestError("");
    submitReadingClubInterest({ clubId: selectedClub.id, draft: interestDraft })
      .then((result) => {
        setInterestStatus(result.detail);
        setInterestDraft(getReadingClubInterestPrefill(me));
        setInterestOpen(false);
      })
      .catch((error) => setInterestError(error.message || "No pudimos registrar tu interés."))
      .finally(() => setInterestSaving(false));
  }

  return (
    <div className="reading-club-detail-modal" role="dialog" aria-modal="true" aria-labelledby="reading-club-detail-title" onClick={onClose}>
      <div className="reading-club-detail-modal-card" onClick={(event) => event.stopPropagation()}>
        <button type="button" className="reading-club-detail-modal-close" onClick={onClose}>Cerrar</button>
        <div className={`reading-club-detail-modal-layout${selectedClub.cover_url ? " has-cover" : ""}`}>
          {selectedClub.cover_url ? <img className="reading-club-detail-cover" src={resolveApiUrl(selectedClub.cover_url)} alt={`Portada de ${selectedClub.title}`} onError={hideBrokenReadingClubCover} /> : null}
          <div className="reading-club-detail-copy">
            <span className="reading-club-public-genre">{selectedClub.genre?.name || "Sin género"}</span>
            <h2 id="reading-club-detail-title">{selectedClub.title}</h2>
            <div className="reading-club-detail-section"><span>Descripción</span><BookstoreDescription value={selectedClub.description || "Sin descripción visible."} /></div>
            <dl className="reading-club-detail-meta">
              <div><dt>Fecha</dt><dd>{displayReadingClubDate(selectedClub.meeting_date)}</dd></div>
              <div><dt>Lugar</dt><dd>{selectedClub.location || "Lugar a confirmar"}</dd></div>
              <div><dt>Organiza</dt><dd>{hostName || "Anfitrión de Bookia"}</dd></div>
            </dl>
            {interestStatus ? <p className="feedback reading-club-interest-status" role="status">{interestStatus}</p> : null}
            {interestOpen ? <form className="reading-club-interest-form" onSubmit={submitInterest}>
              <p>Esto no confirma una vacante. Compartiremos tus datos únicamente con el anfitrión para que pueda contactarte.</p>
              <label>Nombre<input name="name" value={interestDraft.name} onChange={(event) => setInterestDraft((current) => ({ ...current, name: event.target.value }))} maxLength="120" required /></label>
              <label>Correo electrónico<input name="email" type="email" value={interestDraft.email} onChange={(event) => setInterestDraft((current) => ({ ...current, email: event.target.value }))} required /></label>
              <label>Teléfono<input name="phone" type="tel" value={interestDraft.phone} onChange={(event) => setInterestDraft((current) => ({ ...current, phone: event.target.value }))} placeholder="11 2222-3333" required /></label>
              <label className="reading-club-interest-consent"><input name="privacy_accepted" type="checkbox" checked={interestDraft.privacy_accepted} onChange={(event) => setInterestDraft((current) => ({ ...current, privacy_accepted: event.target.checked }))} required />Acepto la <AppLink href="/privacy">Política de privacidad</AppLink>.</label>
              {interestError ? <p className="feedback error" role="alert">{interestError}</p> : null}
              <div className="reading-club-interest-form-actions"><button type="submit" className="primary-button" disabled={interestSaving}>{interestSaving ? "Enviando..." : "Enviar interés"}</button><button type="button" className="secondary-button" onClick={() => setInterestOpen(false)} disabled={interestSaving}>Cancelar</button></div>
            </form> : null}
          </div>
        </div>
      </div>
    </div>
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
    <section className="newsletter-signup" id="novedades" aria-labelledby="newsletter-title">
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
  return <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>;
}

export function HomePage({ me }) {
  const [stores, setStores] = useState([]);
  const [genres, setGenres] = useState([]);
  const [genresLoading, setGenresLoading] = useState(true);
  const [storesLoading, setStoresLoading] = useState(true);
  const [draftFilters, setDraftFilters] = useState(EMPTY_SEARCH_FILTERS);
  const [searchFilters, setSearchFilters] = useState(null);
  const [discoveryItems, setDiscoveryItems] = useState([]);
  const [discoveryLoading, setDiscoveryLoading] = useState(true);

  useEffect(() => {
    apiFetch("/bookstores").then((data) => setStores(data.items)).catch(() => setStores([])).finally(() => setStoresLoading(false));
    apiFetch("/genres").then((data) => setGenres(data.items || [])).catch(() => setGenres([])).finally(() => setGenresLoading(false));
    apiFetch("/search").then((data) => setDiscoveryItems(selectDiscoveryCarouselItems(data.items || []))).catch(() => setDiscoveryItems([])).finally(() => setDiscoveryLoading(false));
  }, []);

  return (
    <>
      <SectionIndex />
      <HeroSearch initialFilters={draftFilters} genres={genres} genresLoading={genresLoading} onSearch={(nextFilters) => { setDraftFilters(nextFilters); setSearchFilters(nextFilters); setTimeout(() => document.getElementById("resultados")?.scrollIntoView({ behavior: "smooth", block: "start" }), 0); }}>
        {searchFilters === null ? <InitialBookDiscovery items={discoveryItems} loading={discoveryLoading} me={me} /> : null}
      </HeroSearch>
      <BenefitsStrip benefits={SEARCH_BENEFITS} ariaLabel="Beneficios de la búsqueda de libros" />
      {searchFilters !== null ? <SearchResults filters={searchFilters} stores={stores} me={me} onClearFilters={() => { setDraftFilters(EMPTY_SEARCH_FILTERS); setSearchFilters(EMPTY_SEARCH_FILTERS); }} /> : null}
      <BookstoresSection stores={stores} loading={storesLoading} />
      <ReadingClubsSection me={me} />
      <NewsletterSignup />
    </>
  );
}


export function BookstoresPage() {
  const demoHref = "https://wa.me/5491162366344?text=Hola%2C%20vengo%20desde%20la%20p%C3%A1gina%20Para%20librer%C3%ADas%20de%20Bookia.%20Quiero%20solicitar%20una%20demostraci%C3%B3n.";

  return (
    <div className="editorial-page bookstores-page">
      <section className="bookstores-hero">
        <div className="bookstores-hero-copy">
          <p className="section-label">PARA LIBRERÍAS</p>
          <h1>Tu catálogo, frente a lectores que buscan qué leer.</h1>
          <p>Publicá tus libros en Bookia, recibí consultas directas y hacé visible tu librería en una comunidad de lectores.</p>
          <div className="bookstores-hero-actions">
            <AppLink className="primary-button" href="/plans?register=bookstore" onClick={() => trackAcquisitionEvent("bookstore_trial_started")}>Empezar 30 días gratis <ArrowIcon /></AppLink>
            <a className="outline-light-button" href={demoHref} target="_blank" rel="noopener noreferrer" onClick={() => trackAcquisitionEvent("bookstore_demo_requested")}>Solicitar demostración <WhatsAppIcon size={18} /></a>
          </div>
          <p className="bookstores-trust-note">30 días gratis. Luego, suscripción mensual; podés cancelarla desde Bookia.</p>
        </div>
        <div className="bookstores-hero-art" aria-hidden="true"><img className="bookstores-hero-image" src="/images/bookstores-hero-library.png" alt="" /></div>
      </section>

      <section className="bookstores-benefits" aria-labelledby="bookstores-benefits-title">
        <div className="bookstores-section-heading"><p className="section-label">UNA VIDRIERA PARA TU CATÁLOGO</p><h2 id="bookstores-benefits-title">Todo lo que necesitás para ganar más visibilidad.</h2></div>
        <div className="bookstores-benefit-grid">
          <article><span>01</span><h3>Llegá a lectores que ya están buscando</h3><p>Tu catálogo aparece en las búsquedas de Bookia cuando alguien busca su próxima lectura.</p></article>
          <article><span>02</span><h3>Publicá y mantené tu catálogo al día</h3><p>Cargá tus libros y actualizá tu vidriera digital cuando lo necesites.</p></article>
          <article><span>03</span><h3>Recibí consultas directas</h3><p>Las personas interesadas consultan disponibilidad por WhatsApp directamente con tu librería.</p></article>
        </div>
      </section>

      <section className="bookstores-how" aria-labelledby="bookstores-how-title">
        <div className="bookstores-section-heading"><p className="section-label">ASÍ FUNCIONA</p><h2 id="bookstores-how-title">Empezá a mostrar tu catálogo en tres pasos.</h2></div>
        <ol><li><span>01</span><h3>Creás tu cuenta y elegís el plan.</h3></li><li><span>02</span><h3>Cargás tus libros, desde foto o con asistencia de IA según el plan.</h3></li><li><span>03</span><h3>Los lectores encuentran tu catálogo y te contactan directamente.</h3></li></ol>
        <p className="bookstores-disclaimer">Bookia facilita el descubrimiento y el contacto; las ventas y pagos se acuerdan directamente con cada librería.</p>
      </section>

      <section className="bookstores-plans" aria-labelledby="bookstores-plans-title">
        <div><p className="section-label">CRECÉ A TU RITMO</p><h2 id="bookstores-plans-title">Cargá tu catálogo sin sumar trabajo innecesario.</h2><p>Elegí el plan que acompañe el tamaño y la forma de trabajo de tu librería.</p><AppLink className="secondary-button bookstores-plans-link" href="/plans?register=bookstore" onClick={() => trackAcquisitionEvent("bookstore_plans_opened")}>Ver planes y funcionalidades <ArrowIcon /></AppLink></div>
        <div className="bookstores-ai-card"><p>GESTIÓN MÁS SIMPLE</p><h3>Menos tiempo cargando, más tiempo entre libros.</h3><ul><li>Carga desde foto</li><li>Autocompletado con IA cuando corresponda</li><li>Perfil público para tu librería</li><li>Promocioná novedades y clubes de lectura.</li></ul></div>
      </section>

      <section className="bookstore-cta bookstores-final-cta"><div><p className="section-label">PARA LIBRERÍAS</p><h2>¿Preferís verlo antes de empezar?</h2><p>Pedinos una demostración y conocé cómo cargar, mostrar y compartir tu catálogo.</p></div><div className="bookstores-final-actions"><a className="light-button" href={demoHref} target="_blank" rel="noopener noreferrer" onClick={() => trackAcquisitionEvent("bookstore_demo_requested")}>Solicitar demostración por WhatsApp <WhatsAppIcon size={18} /></a><AppLink className="outline-light-button" href="/plans?register=bookstore" onClick={() => trackAcquisitionEvent("bookstore_trial_started")}>Empezar 30 días gratis <ArrowIcon /></AppLink></div></section>
    </div>
  );
}

function LegacyBookstoresPage() {
  return (
    <div className="editorial-page bookstores-page">
      <section className="bookstores-hero">
        <div className="bookstores-hero-copy"><p className="section-label">{"PARA LIBRER\u00CDAS"}</p><h1>{"Tu librer\u00EDa, m\u00E1s cerca de nuevos lectores."}</h1><p>{"Mostr\u00E1 tu cat\u00E1logo en Bookia para que cada b\u00FAsqueda pueda convertirse en una nueva oportunidad."}</p><AppLink className="primary-button" href="/register">{"Crear cuenta para mi librer\u00EDa"} <ArrowIcon /></AppLink></div>
        <div className="bookstores-hero-art" aria-hidden="true"><img className="bookstores-hero-image" src="/images/bookstores-hero-library.png" alt="" /></div>
      </section>
      <section className="bookstores-benefits" aria-labelledby="bookstores-benefits-title">
        <div className="bookstores-section-heading"><p className="section-label">{"UNA VIDRIERA PARA TU CAT\u00C1LOGO"}</p><h2 id="bookstores-benefits-title">{"Todo lo que necesit\u00E1s para que tener mas visibilidad."}</h2></div>
        <div className="bookstores-benefit-grid">
          <article><span>01</span><h3>{"Lleg\u00E1 a m\u00E1s lectores"}</h3><p>{"Hac\u00E9 visible tu cat\u00E1logo para quienes ya est\u00E1n buscando su pr\u00F3xima lectura."}</p></article>
          <article><span>02</span><h3>{"Organiz\u00E1 tu cat\u00E1logo"}</h3><p>{"Public\u00E1 tus libros y manten\u00E9 actualizada tu vidriera digital."}</p></article>
          <article><span>03</span><h3>Consultas directas</h3><p>{"Las personas interesadas pueden contactar a tu librer\u00EDa directamente para consultar disponibilidad."}</p></article>
        </div>
      </section>
      <section className="bookstores-plans" aria-labelledby="bookstores-plans-title">
        <div><p className="section-label">{"CREC\u00C9 A TU RITMO"}</p><h2 id="bookstores-plans-title">{"Planes que acompa\u00F1an tu etapa."}</h2><p>{"Empez\u00E1 con una prueba inicial y eleg\u00ED el plan que mejor acompa\u00F1e el tama\u00F1o y la forma de trabajo de tu librer\u00EDa."}</p></div>
        <div className="bookstores-ai-card"><p>{"Gesti\u00F3n m\u00E1s simple"}</p><h3>{"Menos tiempo cargando, m\u00E1s tiempo entre libros."}</h3><ul><li>Carga desde foto</li><li>Autocompletado con IA</li><li>{"Vidriera digital atractiva"}</li><li>Promociona eventos, clubes de lectura y novedades de tu librería.</li></ul></div>
      </section>
      <section className="bookstore-cta"><div><p className="section-label">{"PARA LIBRER\u00CDAS"}</p><h2>{"Hac\u00E9 que tus libros lleguen a m\u00E1s lectores."}</h2><p>{"Public\u00E1 tu cat\u00E1logo en Bookia para que las personas encuentren tus libros y puedan consultarte directo."}</p></div><AppLink className="light-button" href="/register">{"Crear cuenta para mi librer\u00EDa"} <ArrowIcon /></AppLink></section>
    </div>
  );
}
function PlansPlan({ plan, isRegistrationFlow, onSelect }) {
  const className = `plans-plan plans-plan-${plan.tone}`;
  const content = <>
    <div className="plans-plan-head"><span>{plan.name}</span></div>
    <p className="plans-price">{plan.price}<small>{plan.detail}</small></p>
    <p className="plans-limit">{plan.limit}</p>
    <ul>{plan.benefits.map((benefit) => <li key={benefit}><b>{"\u2713"}</b>{benefit}</li>)}</ul>
    {!isRegistrationFlow && plan.code === "trial" ? <AppLink className="plans-select-action" href={buildRegisterPath({ profileType: "bookstore", planCode: "trial" })} onClick={() => trackAcquisitionEvent("bookstore_trial_started")}>Empezar sin costo <ArrowIcon size={16} /></AppLink> : null}
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
    { code: "trial", name: "Prueba gratis", price: "Sin costo", detail: "por 30 dias", limit: "Hasta 10 libros", benefits: ["Carga manual desde web y Telegram", "Sin funcionalidades de IA"], tone: "base" },
    { code: "initial", name: "Manual", price: priceLabel("initial"), detail: "/mes", limit: "Hasta 25 libros", benefits: ["Carga manual desde web y Telegram", "Sin funcionalidades de IA"], tone: "base" },
    { code: "base", name: "Plus AI", price: priceLabel("base"), detail: "/mes", limit: "Hasta 40 libros", benefits: ["Todas las funcionalidades web", "Funcionalidades de IA incluidas", "Acceso al bot de Telegram"], tone: "featured" },
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
        <div className="about-hero-copy"><p className="section-label">Sobre Bookia</p><h1>Un lugar para conectar lectores, autores, librerías y clubes de lectura.</h1><p>Bookia reúne los catálogos de librerías en un solo lugar para que encontrar tu próxima lectura y descubrir nuevas librerías sea más simple.</p><div className="cta-actions"><AppLink className="primary-button" href="/">Explorar libros <ArrowIcon /></AppLink><AppLink className="secondary-button" href="/register">Sumar mi librería</AppLink></div></div>
        <img className="about-hero-logo" src="/images/grafo_bookia.png" alt="Grafo de conexiones de Bookia" />
      </section>
      <section className="about-problem"><div><p className="section-label">UNA BÚSQUEDA MÁS SIMPLE</p><h2>Menos recorridas entre catálogos. Más tiempo para encontrar.</h2></div><p>Bookia reúne en un solo lugar los catálogos de librerías, vendedores de usados y proyectos que hacen circular libros. Ordena la búsqueda, pero deja la conversación donde importa: entre vos y quien tiene el libro.</p></section>
      <section className="about-how" aria-labelledby="about-how-title"><div className="about-section-heading"><p className="section-label">CÓMO FUNCIONA</p><h2 id="about-how-title">Una conexión directa, en tres pasos.</h2></div><ol><li><span>01</span><BookIcon size={28} /><h3>Buscá un libro</h3><p>Explorá por título, autor, editorial, idioma o género.</p></li><li><span>02</span><StoreIcon size={28} /><h3>Descubrí quién lo tiene</h3><p>Conocé el catálogo y el perfil de cada librería.</p></li><li><span>03</span><WhatsAppIcon size={28} /><h3>Contactá directamente</h3><p>Confirmá disponibilidad con la librería antes de ir o comprar.</p></li></ol><p className="about-disclaimer">Bookia no vende libros ni procesa pagos: facilita el encuentro para que cada operación se acuerde directamente con la librería.</p></section>
      <section className="about-paths" aria-labelledby="about-paths-title"><div className="about-section-heading"><p className="section-label">DOS CAMINOS, UNA COMUNIDAD</p><h2 id="about-paths-title">Bookia crece de los dos lados de la historia.</h2></div><div><article className="about-path-reader"><BookIcon size={34} /><h3>Lectores:<br></br>Quiero encontrar libros</h3><p>Descubrí catálogos reales, nuevas librerías y tu próxima lectura.</p><AppLink href="/">Explorar libros <ArrowIcon size={17} /></AppLink></article><article className="about-path-bookstore"><StoreIcon size={34} /><h3>Librerias:<br></br>Quiero mostrar mi catálogo</h3><p>Hacé visible tu librería y gestioná tus libros con herramientas simples.</p><AppLink href="/register">Sumar mi librería <ArrowIcon size={17} /></AppLink></article></div></section>
      <section className="about-origin"><div><p className="section-label">DE DÓNDE NACE</p><h2>Creada por Marcelo G. González.</h2></div><div><p>Bookia nació de una pasión por los libros y de una idea simple: hacer más fácil el encuentro entre lectores y librerías.</p><p>Reunimos catálogos en un solo lugar para que buscar un título, descubrir una librería y consultar su disponibilidad requiera menos vueltas. Así, las librerías pueden dedicar más tiempo a lo que mejor hacen: recomendar libros y construir comunidad.</p></div></section>
      <section className="about-impact" aria-labelledby="about-impact-title"><p className="section-label">EL IMPACTO QUE BUSCAMOS</p><h2 id="about-impact-title">Que cada búsqueda abra una nueva posibilidad.</h2><div><article><span>01</span><h3>Más descubrimiento</h3><p>Lectores que encuentran más opciones y librerías que antes no conocían.</p></article><article><span>02</span><h3>Más visibilidad</h3><p>Catálogos y herramientas que acompañan la gestión cotidiana de cada librería.</p></article><article><span>03</span><h3>Más circulación</h3><p>Libros nuevos y usados que vuelven a encontrarse con sus próximos lectores.</p></article></div></section>
      <section className="bookstore-cta about-cta"><div><p className="section-label">EMPEZÁ POR DONDE ESTÉS</p><h2>Tu próximo paso empieza acá.</h2></div><div className="cta-actions"><AppLink className="light-button" href="/">Explorar libros <ArrowIcon /></AppLink><AppLink className="outline-light-button" href="/register">Sumar mi librería</AppLink></div></section>
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

export function BookDetailModal({ selectedBook, selectedBookImageUrl, onImageChange, onClose, favorites, isSessionLoading, contactGate = null, contactError = "", isBackgroundObscured = false }) {
  const modalCardRef = useRef(null);
  const closeButtonRef = useRef(null);

  useEffect(() => {
    if (!selectedBook) return undefined;
    const previousFocus = document.activeElement;
    const focusFrame = globalThis.requestAnimationFrame?.(() => closeButtonRef.current?.focus());
    return () => {
      if (focusFrame !== undefined) globalThis.cancelAnimationFrame?.(focusFrame);
      previousFocus?.focus?.();
    };
  }, [selectedBook]);

  function trapDialogFocus(event) {
    if (event.key !== "Tab") return;
    const focusable = [...(modalCardRef.current?.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') || [])];
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  if (!selectedBook) return null;

  const selectedBookGallery = bookImageGallery(selectedBook);
  const bookstore = contactGate?.store || selectedBook.bookstore;
  const hasBookstoreContact = Boolean(buildWhatsAppHref(bookstore?.whatsapp_phone));
  const showBookstoreContact = contactGate && (contactGate.me === undefined || !contactGate.me || hasBookstoreContact);

  return (
    <div className="book-detail-modal" role="dialog" aria-hidden={isBackgroundObscured ? "true" : undefined} inert={isBackgroundObscured ? "" : undefined} aria-modal={isBackgroundObscured ? undefined : "true"} aria-labelledby="book-detail-title" onClick={onClose}>
      <div ref={modalCardRef} className="book-detail-modal-card" onClick={(event) => event.stopPropagation()} onKeyDown={trapDialogFocus}>
        <button ref={closeButtonRef} type="button" className="book-detail-modal-close" onClick={onClose}>Cerrar</button>
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
            <FavoriteBookButton itemId={selectedBook.id} bookstoreId={bookstore?.id} isFavorite={favorites?.favoriteIds.has(selectedBook.id)} isPending={favorites?.pendingIds.has(selectedBook.id)} isSessionLoading={isSessionLoading} onToggle={favorites?.toggleFavorite || (() => {})} />
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
            {contactGate && contactError ? <p className="feedback error bookstore-contact-feedback" role="alert">{contactError}</p> : null}
            {showBookstoreContact ? (
              <BookstoreWhatsAppAction className="primary-button book-detail-whatsapp" me={contactGate.me} store={bookstore} item={selectedBook} source="book_detail_modal" onRequireAuth={contactGate.onRequireAuth}><WhatsAppIcon size={19} /> Contactar por WhatsApp</BookstoreWhatsAppAction>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

export function BookstorePage({ slug, me, refreshSession }) {
  const [store, setStore] = useState(null);
  const [items, setItems] = useState([]);
  const [readingClubs, setReadingClubs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedBook, setSelectedBook] = useState(null);
  const [selectedBookImageUrl, setSelectedBookImageUrl] = useState(null);
  const [authAction, setAuthAction] = useState(null);
  const [contactContinuation, setContactContinuation] = useState(null);
  const [actionError, setActionError] = useState("");
  const reconciledSessionRef = useRef(null);
  const favorites = useFavoriteBooks(me);
  const visibleItems = items.filter((item) => item.availability_status !== "hidden");
  const contactSession = resolveBookstoreContactSession(me, store);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/bookstores/${slug}`).then((data) => { setStore(data.bookstore); setItems(data.items); setReadingClubs(data.reading_clubs || []); setError(""); }).catch((fetchError) => {
      const actionFailure = handleBookstoreContactLoadFailure({ error: fetchError, slug });
      if (actionFailure?.status === "unavailable") setActionError(actionFailure.message);
      setError(fetchError.message);
    }).finally(() => setLoading(false));
  }, [slug]);

  useEffect(() => {
    const reconciliationKey = getBookstoreSessionReconciliationKey(me, store, reconciledSessionRef.current);
    if (!reconciliationKey) {
      if (!me || store?.contact_requires_auth !== true) reconciledSessionRef.current = null;
      return;
    }
    reconciledSessionRef.current = reconciliationKey;
    refreshSession?.();
  }, [me, store, refreshSession]);

  useEffect(() => {
    const sharedBookId = getSharedBookId(window.location.search);
    if (!sharedBookId || selectedBook || items.length === 0) return;
    const sharedItem = items.find((item) => item.id === sharedBookId && item.availability_status !== "hidden");
    if (sharedItem) openBookDetail(sharedItem);
  }, [items, selectedBook]);

  useEffect(() => {
    if (loading || !contactSession || !store) return;
    const action = readPendingReaderAction();
    const continuation = resolveBookstoreContactContinuation(action, store, items);
    if (!continuation) return;
    if (continuation.status === "unavailable") {
      clearPendingReaderAction();
      setActionError(continuation.message);
      return;
    }
    setContactContinuation({ action, ...continuation });
  }, [loading, contactSession, store, items]);

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

  function requireBookstoreAuth({ item, source }) {
    const action = startBookstoreContactIntent({
      store,
      item,
      source,
      returnPath: `${window.location.pathname}${window.location.search}${window.location.hash}`,
    });
    if (!action) {
      setActionError(PENDING_ACTION_PERSISTENCE_ERROR);
      return;
    }
    setActionError("");
    setAuthAction(action);
  }

  function cancelBookstoreAuth() {
    cancelPendingReaderAction(authAction);
    setAuthAction(null);
  }

  function completeBookstoreContact() {
    if (!contactContinuation) return;
    completeResumablePendingReaderAction({ type: "contact_bookstore", targetId: store.id });
    trackWhatsAppClicked(store, contactContinuation.source, contactContinuation.catalogItem?.id);
    setContactContinuation(null);
  }
  useEffect(() => {
    if (!selectedBook) return undefined;
    const onKeyDown = (event) => event.key === "Escape" && closeBookDetail();
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [selectedBook]);

  if (loading) return <div className="page-state"><div className="loading-mark" /><p>Cargando libreria...</p></div>;
  if (error || !store) return <div className="page-state"><EmptyState title={actionError ? "No pudimos retomar ese contacto" : "No encontramos esa libreria"}>{actionError || error || "Revisa el enlace o volve a la busqueda."}</EmptyState><button className="secondary-button" onClick={() => navigate("/")}>Volver a buscar</button></div>;

  const heroImageUrl = resolveApiUrl(store.hero_image_url);
  const logoUrl = resolveApiUrl(store.logo_url);
  const hasWhatsApp = Boolean(buildWhatsAppHref(store.whatsapp_phone));
  const bookstoreTags = [store.tag_1, store.tag_2].map((tag) => String(tag || '').trim()).filter(Boolean);
  const isFollowing = favorites.followedBookstoreIds.has(store.id);
  const followPending = favorites.pendingBookstoreIds.has(store.id);
  const topActionDialogOpen = Boolean(authAction || contactContinuation);

  return (
    <section className="store-page">
      <div className={`store-hero${heroImageUrl ? " has-hero" : ""}`} style={heroImageUrl ? { backgroundImage: `url(${heroImageUrl})` } : undefined} />
      <div className="store-profile-panel">
        <div className="store-identity"><p className="section-label">Libreria en Bookia</p>{logoUrl ? <img className="store-logo" src={logoUrl} alt={`Logo de ${store.name}`} onError={(event) => { event.currentTarget.hidden = true; }} /> : null}<h1>{store.name}</h1><BookstoreDescription value={displayBookstoreDescription(store.description)} /><BookstoreProfileShareMenu bookstore={store} />{!me?.bookstore ? <button type="button" className={`secondary-button bookstore-follow-button${isFollowing ? " is-following" : ""}`} aria-pressed={isFollowing} aria-busy={followPending} disabled={followPending || me === undefined || favorites.favoritesLoading} onClick={() => favorites.toggleFollowBookstore(store)}>{isFollowing ? "Dejar de seguir" : "Seguir"}</button> : null}{bookstoreTags.length > 0 ? <div className="store-tags" aria-label="Etiquetas de la libreria">{bookstoreTags.map((tag) => <span key={tag} className="store-tag">{tag}</span>)}</div> : null}{favorites.favoriteError ? <p className="feedback error bookstore-follow-feedback" role="alert">{favorites.favoriteError}</p> : null}</div>
        <BookstoreContactCard store={store} me={contactSession} onRequireAuth={requireBookstoreAuth} />
      </div>
      {actionError ? <p className="feedback error bookstore-contact-feedback" role="alert">{actionError}</p> : null}
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
                <div className="book-card-cover-actions">
                  <BookCover item={item} />
                  {(contactSession === undefined || !contactSession || hasWhatsApp) ? <BookstoreWhatsAppAction className="book-card-whatsapp" me={contactSession} store={store} item={item} source="bookstore_catalog_card" onRequireAuth={requireBookstoreAuth} ariaLabel={`Contactar por WhatsApp por ${item.title}`}><WhatsAppIcon size={20} /></BookstoreWhatsAppAction> : null}
                </div>
                <div>
                  <div className="book-card-meta-row">
                    <div className="book-card-statuses">
                      <span className={`status-pill status-${item.availability_status}`}>{bookAvailabilityLabel(item.availability_status)}</span>
                      {item.is_featured ? <span className="status-pill status-featured">Destacado</span> : null}
                    </div>
                    <FavoriteBookButton itemId={item.id} bookstoreId={store.id} isFavorite={favorites.favoriteIds.has(item.id)} isPending={favorites.pendingIds.has(item.id)} isSessionLoading={me === undefined || favorites.favoritesLoading} onToggle={(itemId, event, bookstoreId) => { event.stopPropagation(); favorites.toggleFavorite(itemId, event, bookstoreId); }} />
                  </div>
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
            {readingClubs.map((club) => <ReadingClubPublicCard key={club.id} club={club} host={{ type: "bookstore", slug: store.slug, name: store.name }} bookstoreId={store.id} source="bookstore_reading_clubs" showShare shared={getSharedReadingClubId(window.location.search) === club.id} />)}
          </div>
        </section>
      ) : null}
      <BookDetailModal selectedBook={selectedBook} selectedBookImageUrl={selectedBookImageUrl} onImageChange={setSelectedBookImageUrl} onClose={closeBookDetail} favorites={favorites} isSessionLoading={me === undefined || favorites.favoritesLoading} contactGate={{ me: contactSession, store, onRequireAuth: requireBookstoreAuth }} contactError={actionError} isBackgroundObscured={topActionDialogOpen} />
      {authAction ? <AuthRequiredDialog action={authAction} onCancel={cancelBookstoreAuth} /> : null}
      {contactContinuation ? <ReaderActionContinuationDialog action={contactContinuation.action} continueLabel="Continuar a WhatsApp" continueHref={contactContinuation.href} onContinue={completeBookstoreContact} onCancel={() => dismissReaderActionDialog(contactContinuation.action, () => setContactContinuation(null))} /> : null}
    </section>
  );
}

export function ReaderReadingClubs({ reader, readingClubs, onBack, sharedClubId = null }) {
  if (!readingClubs.length) return null;

  return <section className="store-reading-clubs"><div className="section-heading results-heading"><div><p className="section-label">Clubes de lectura</p><h2>Encuentros de {reader.display_name}</h2><p>{readingClubs.length} {readingClubs.length === 1 ? "club publicado" : "clubes publicados"}</p></div><button className="secondary-button" onClick={onBack}>Volver a buscar</button></div>
    <div className="reading-club-public-list">{readingClubs.map((club) => <ReadingClubPublicCard key={club.id} club={club} shared={sharedClubId === club.id} />)}</div>
  </section>;
}

export function ReaderPage({ slug, search = "" }) {
  const [reader, setReader] = useState(null);
  const [readingClubs, setReadingClubs] = useState([]);
  const [wantedBooks, setWantedBooks] = useState([]);
  const [authorBooks, setAuthorBooks] = useState([]);
  const [selectedAuthorBook, setSelectedAuthorBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    apiFetch(`/readers/${slug}`).then((data) => { setReader(data.reader); setReadingClubs(data.reading_clubs || []); setWantedBooks(data.wanted_books || []); setAuthorBooks(data.author_books || []); setError(""); }).catch((fetchError) => setError(fetchError.message)).finally(() => setLoading(false));
  }, [slug]);
  useEffect(() => {
    const sharedId = getSharedAuthorBookId(search);
    setSelectedAuthorBook(sharedId ? authorBooks.find((book) => book.id === sharedId) || null : null);
  }, [authorBooks, search]);

  function openAuthorBook(book) {
    setSelectedAuthorBook(book);
    navigate(`/readers/${encodeURIComponent(slug)}?book=${book.id}`);
  }

  function closeAuthorBook() {
    setSelectedAuthorBook(null);
    navigate(`/readers/${encodeURIComponent(slug)}`);
  }

  if (loading) return <div className="page-state"><div className="loading-mark" /><p>Cargando lector...</p></div>;
  if (error || !reader) return <div className="page-state"><EmptyState title="No encontramos a este lector">{error || "Revis\u00E1 el enlace o volv\u00E9 a la b\u00FAsqueda."}</EmptyState><button className="secondary-button" onClick={() => navigate("/")}>Volver a buscar</button></div>;

  return <section className="store-page reader-page">
    <div className="store-profile-panel reader-profile-panel"><div className="reader-profile-identity"><ReaderMonogram displayName={reader.display_name} className="is-profile-hero" /><div className="store-identity"><div className="reader-profile-labels"><p className="section-label">Lector en Bookia</p><ReaderAuthorBadge isAuthor={reader.is_author} /></div><h1>{reader.display_name}</h1><BookstoreDescription value={reader.description || "Comparte clubes de lectura con la comunidad Bookia."} />{reader.favorite_genres?.length ? <div className="store-tags" aria-label="Generos favoritos">{reader.favorite_genres.map((genre) => <span key={genre.id} className="store-tag">{genre.name}</span>)}</div> : null}</div></div><ReaderPassport reader={reader} /></div>
    <ReaderSocialLinks links={reader.social_links || []} />
    <ReaderAuthorBooks reader={reader} books={authorBooks} onOpenDetails={openAuthorBook} />
    <ReaderAuthorBookDetailModal reader={reader} book={selectedAuthorBook} onClose={closeAuthorBook} />
    <ReaderWantedBooksPublic items={wantedBooks} />
    <ReaderReadingClubs reader={reader} readingClubs={readingClubs} onBack={() => navigate("/")} sharedClubId={typeof window === "undefined" ? null : getSharedReadingClubId(window.location.search)} />
  </section>;
}
