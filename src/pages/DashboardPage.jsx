import { useEffect, useState, useTransition } from "react";

import { apiFetch, resolveApiUrl } from "../api";
import { getAiAutocompleteSourceState, mergeAiAutocompleteSuggestion } from "../aiAutocompleteState";
import { canUseAiAutocomplete } from "../aiAutocompleteAccess";
import { buildCatalogItemUpdatePayload, buildCatalogSaveErrorMessage, buildDraftFromCatalogItem, getCatalogSaveUiState, hasCatalogItemAvailabilityChanged, normalizeBookStatus, normalizeEditableAvailability } from "../dashboardCatalogState";
import { buildDashboardUrl, getAnalyticsMinimumDate, parseDashboardNavigation } from "../dashboardNavigationState";
import BookstoreProfileEditor from "../components/BookstoreProfileEditor";
import { EmptyState } from "../components/Commerce";
import { ArrowIcon, BookIcon, SearchIcon, SparkleIcon } from "../components/Icons";
import { buildSingleGenreIds, getSingleGenreValue } from "../genreSelection";
import { getGenreSelectorState } from "../genreSelectorState";
import { buildReadingClubPayload, createReadingClubDraft, displayReadingClubDate } from "../readingClubState";
import { AppLink, navigate } from "../navigation";
import { formatBillingDate, getBillingAccessState } from "../billingState";
import { BillingSubscriptionPanel } from "../components/BillingSubscriptionPanel";
import { BookShareMenu } from "../components/BookShareMenu";
import { ReadingClubShareMenu } from "../components/ReadingClubShareMenu";

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

const DASHBOARD_TABS = [
  { section: "profile", label: "Perfil", emoji: "👤" },
  { section: "new-book", label: "Alta de libros", emoji: "➕" },
  { section: "catalog", label: "Catalogo", emoji: "📚" },
  { section: "clubs", label: "Clubes de lectura", emoji: "📖" },
  { section: "metrics", label: "Metricas", emoji: "📊" },
  { section: "subscription", label: "Suscripcion", emoji: "💳" },
];

function DashboardTabs({ section }) {
  return (
    <nav className="dashboard-tabs" aria-label="Secciones del panel">
      {DASHBOARD_TABS.map((tab) => (
        <AppLink
          key={tab.section}
          id={`dashboard-tab-${tab.section}`}
          href={buildDashboardUrl(tab.section)}
          className={`dashboard-tab${section === tab.section ? " is-active" : ""}`}
          aria-current={section === tab.section ? "page" : undefined}
        >
          <span>{tab.label}</span>
          <span aria-hidden="true">{tab.emoji}</span>
        </AppLink>
      ))}
    </nav>
  );
}

const EMPTY_ANALYTICS = {
  period_days: 30,
  totals: {
    book_detail_opened: 0,
    bookstore_opened: 0,
    whatsapp_clicked: 0,
    book_shared: 0,
    reading_club_shared: 0,
  },
  share_channels: { whatsapp: 0, instagram: 0, copy_link: 0, telegram: 0 },
  reading_club_share_channels: { whatsapp: 0, instagram: 0, copy_link: 0, telegram: 0 },
  top_books: [],
  top_reading_clubs: [],
};

function formatMetricValue(value) {
  return new Intl.NumberFormat("es-AR").format(Number(value || 0));
}

function getArgentinaToday() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "America/Argentina/Buenos_Aires", year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const values = Object.fromEntries(parts.filter((part) => part.type !== "literal").map((part) => [part.type, part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

function getMonthBounds(month, today = getArgentinaToday()) {
  const targetMonth = month || today.slice(0, 7);
  const [year, monthNumber] = targetMonth.split("-").map(Number);
  const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();
  const startDate = `${targetMonth}-01`;
  const endDate = targetMonth === today.slice(0, 7) ? today : `${targetMonth}-${String(lastDay).padStart(2, "0")}`;
  return { startDate, endDate };
}

function getAnalyticsMonthOptions(today = getArgentinaToday()) {
  const [year, month] = today.slice(0, 7).split("-").map(Number);
  return Array.from({ length: 24 }, (_, index) => {
    const current = new Date(Date.UTC(year, month - 1 - index, 1));
    const value = `${current.getUTCFullYear()}-${String(current.getUTCMonth() + 1).padStart(2, "0")}`;
    return { value, label: new Intl.DateTimeFormat("es-AR", { month: "long", year: "numeric", timeZone: "UTC" }).format(current) };
  });
}

function formatAnalyticsPeriod(analytics) {
  if (!analytics.period_start || !analytics.period_end) return `Resumen de los ultimos ${analytics.period_days || 0} dias.`;
  const format = new Intl.DateTimeFormat("es-AR", { dateStyle: "medium", timeZone: "UTC" });
  return `Del ${format.format(new Date(`${analytics.period_start}T00:00:00Z`))} al ${format.format(new Date(`${analytics.period_end}T00:00:00Z`))}.`;
}

function DashboardPanel({ label, title, description, countLabel, isActive, children, className = "" }) {
  return (
    <section className={`dashboard-section dashboard-card ${className}`.trim()} hidden={!isActive}>
      <div className="dashboard-section-heading">
        <div>
          <p className="section-label">{label}</p>
          <h2>{title}</h2>
          {description ? <p>{description}</p> : null}
        </div>
        {countLabel ? <span className="dashboard-section-count">{countLabel}</span> : null}
      </div>
      <div className="dashboard-section-body">{children}</div>
    </section>
  );
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

function ReadingClubGenreField({ genres, genresLoading, genresError, value, onChange }) {
  const state = getGenreSelectorState({ genresLoading, genresError, genres });

  if (state.kind !== "ready") {
    return (
      <div className={`dashboard-field-wide dashboard-genre-status is-${state.kind}`} role={state.kind === "error" ? "alert" : undefined}>
        <span className="dashboard-genre-status-label">Genero *</span>
        <small>{state.message}</small>
      </div>
    );
  }

  return (
    <label>
      Genero *
      <select value={value} onChange={(event) => onChange(event.target.value)} required>
        <option value="">Seleccionar genero</option>
        {genres.map((genre) => <option key={genre.id} value={genre.id}>{genre.name}</option>)}
      </select>
    </label>
  );
}

export function DashboardPage({ me, refreshMe, locationSearch = "" }) {
  const { section, catalogView, analytics: analyticsFilter } = parseDashboardNavigation(locationSearch, getArgentinaToday());
  const registrationPending = new URLSearchParams(locationSearch).get("registered") === "pending";
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
  const [createBusy, startCreateTransition] = useTransition();
  const [saveBusyItemId, setSaveBusyItemId] = useState(null);
  const [saveErrorsByItemId, setSaveErrorsByItemId] = useState({});
  const [catalogActionBusy, setCatalogActionBusy] = useState(false);
  const [imageBusyId, setImageBusyId] = useState(null);
  const [aiBusyId, setAiBusyId] = useState(null);
  const [aiSuggestionsByItemId, setAiSuggestionsByItemId] = useState({});
  const [readingClubs, setReadingClubs] = useState([]);
  const [readingClubsLoading, setReadingClubsLoading] = useState(false);
  const [newReadingClub, setNewReadingClub] = useState(createReadingClubDraft());
  const [editingReadingClubId, setEditingReadingClubId] = useState(null);
  const [draftReadingClub, setDraftReadingClub] = useState(createReadingClubDraft());
  const [readingClubBusy, startReadingClubTransition] = useTransition();
  const [analytics, setAnalytics] = useState(EMPTY_ANALYTICS);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState("");
  const [analyticsDraft, setAnalyticsDraft] = useState({ startDate: analyticsFilter.startDate || getArgentinaToday(), endDate: analyticsFilter.endDate || getArgentinaToday() });
  const activeItems = items.filter((item) => item.availability_status !== "hidden");
  const hiddenItems = items.filter((item) => item.availability_status === "hidden");
  const hasActiveFilters = Boolean(titleQuery.trim() || authorQuery.trim());
  const canAutocompleteWithAi = canUseAiAutocomplete(me?.current_plan_code);
  const billingAccess = getBillingAccessState(me?.billing);
  const analyticsMinimumDate = getAnalyticsMinimumDate(getArgentinaToday());
  const reactivationIsPending = me?.billing?.status === "payment_pending" && !me.billing.trial_ends_at;
  const catalogMutationBusy = catalogActionBusy || saveBusyItemId !== null || aiBusyId !== null || imageBusyId !== null;

  function loadAnalytics() {
    const params = new URLSearchParams();
    const period = analyticsFilter.mode === "custom"
      ? { startDate: analyticsFilter.startDate, endDate: analyticsFilter.endDate }
      : getMonthBounds(analyticsFilter.month);
    if (period.startDate) params.set("start_date", period.startDate);
    if (period.endDate) params.set("end_date", period.endDate);
    setAnalyticsLoading(true);
    setAnalyticsError("");
    apiFetch(`/dashboard/analytics?${params.toString()}`)
      .then((data) => { setAnalytics({ ...EMPTY_ANALYTICS, ...data, totals: { ...EMPTY_ANALYTICS.totals, ...(data.totals || {}) }, top_books: data.top_books || [], top_reading_clubs: data.top_reading_clubs || [] }); setAnalyticsError(""); })
      .catch((fetchError) => { setAnalytics(EMPTY_ANALYTICS); setAnalyticsError(fetchError.message || "No pudimos cargar las metricas."); })
      .finally(() => setAnalyticsLoading(false));
  }
  function loadReadingClubs() {
    setReadingClubsLoading(true);
    apiFetch("/dashboard/reading-clubs")
      .then((data) => { setReadingClubs(data.items || []); setError(""); })
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setReadingClubsLoading(false));
  }

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

  useEffect(() => { if (me?.bookstore) { loadCatalog(); loadReadingClubs(); } }, [me]);
  useEffect(() => { setAnalyticsDraft({ startDate: analyticsFilter.startDate || getArgentinaToday(), endDate: analyticsFilter.endDate || getArgentinaToday() }); }, [analyticsFilter.startDate, analyticsFilter.endDate, analyticsFilter.mode]);
  useEffect(() => { if (me?.bookstore && section === "metrics") loadAnalytics(); }, [me, section, analyticsFilter.mode, analyticsFilter.month, analyticsFilter.startDate, analyticsFilter.endDate]);

  if (me === undefined) {
    return <div className="page-state"><div className="loading-mark" /><p>Preparando tu panel...</p></div>;
  }

  if (!me) {
    return <div className="page-state"><EmptyState title="Necesitas iniciar sesion">Ingresa con los datos de tu libreria para administrar el catalogo.</EmptyState><button className="primary-button" onClick={() => navigate("/login")}>Ingresar</button></div>;
  }

  if (!me.bookstore) {
    return <div className="page-state"><EmptyState title="Tu cuenta lectora esta activa">El panel de catalogo es exclusivo para librerias. Podes seguir explorando libros desde la busqueda.</EmptyState><button className="primary-button" onClick={() => navigate("/")}>Explorar libros</button></div>;
  }
  function updateItem(itemId, payload) {
    if (catalogMutationBusy) return;
    setCatalogActionBusy(true);
    apiFetch(`/dashboard/catalog/${itemId}`, { method: "PATCH", body: JSON.stringify(payload) })
      .then(() => loadCatalog())
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setCatalogActionBusy(false));
  }

  function toggleFeatured(item) {
    updateItem(item.id, { is_featured: !Boolean(item.is_featured) });
  }

  function updateAvailability(itemId, availabilityStatus) {
    if (catalogMutationBusy) return;
    setCatalogActionBusy(true);
    apiFetch(`/dashboard/catalog/${itemId}/availability`, { method: "PATCH", body: JSON.stringify({ availability_status: availabilityStatus }) })
      .then(() => loadCatalog())
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setCatalogActionBusy(false));
  }

  function hideItem(itemId) {
    updateAvailability(itemId, "hidden");
  }

  function autocompleteItem(item) {
    if (catalogMutationBusy) return;
    const isCurrentEditing = editingItemId === item.id;
    const baseDraft = isCurrentEditing ? draftItem : buildDraftFromCatalogItem(item);
    setAiBusyId(item.id);
    apiFetch(`/dashboard/catalog/${item.id}/ai-autocomplete`, {
      method: "POST",
      body: JSON.stringify({
        title: baseDraft.title,
        author: baseDraft.author,
        publisher: baseDraft.publisher || null,
        language: baseDraft.language || null,
        description: baseDraft.description || null,
        genre_ids: baseDraft.genre_ids || [],
      }),
    })
      .then((data) => {
        const suggestion = data?.suggestion || {};
        setEditingItemId(item.id);
        setDraftItem((current) => mergeAiAutocompleteSuggestion(isCurrentEditing ? current : baseDraft, suggestion, { overwriteExisting: true }));
        setAiSuggestionsByItemId((current) => ({ ...current, [item.id]: suggestion }));
        setError("");
      })
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setAiBusyId(null));
  }

  function uploadItemImages(itemId, files) {
    if (catalogMutationBusy) return;
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
    if (catalogMutationBusy) return;
    setImageBusyId(itemId);
    apiFetch(`/dashboard/catalog/${itemId}/images/${imageId}`, { method: "PATCH", body: JSON.stringify({ is_primary: true }) })
      .then(() => { setError(""); loadCatalog(); })
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setImageBusyId(null));
  }

  function deleteItemImage(itemId, imageId) {
    if (catalogMutationBusy) return;
    setImageBusyId(itemId);
    apiFetch(`/dashboard/catalog/${itemId}/images/${imageId}`, { method: "DELETE" })
      .then(() => { setError(""); loadCatalog(); })
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setImageBusyId(null));
  }

  function startEditing(item) {
    setEditingItemId(item.id);
    setDraftItem(buildDraftFromCatalogItem(item));
    setSaveErrorsByItemId((current) => ({ ...current, [item.id]: "" }));
  }

  function cancelEditing() {
    setEditingItemId(null);
    setDraftItem(EMPTY_ITEM);
  }

  function saveItem(item) {
    if (catalogMutationBusy) return;
    const payload = buildCatalogItemUpdatePayload(item, draftItem);
    const nextAvailabilityStatus = normalizeEditableAvailability(draftItem.availability_status);
    const shouldUpdateCatalog = Object.keys(payload).length > 0;
    const shouldUpdateAvailability = hasCatalogItemAvailabilityChanged(item, draftItem);

    setSaveBusyItemId(item.id);
    setSaveErrorsByItemId((current) => ({ ...current, [item.id]: "" }));
    const catalogUpdate = shouldUpdateCatalog
      ? apiFetch(`/dashboard/catalog/${item.id}`, { method: "PATCH", body: JSON.stringify(payload) })
      : Promise.resolve(null);

    catalogUpdate.then(() => {
      if (shouldUpdateAvailability) {
        return apiFetch(`/dashboard/catalog/${item.id}/availability`, {
          method: "PATCH",
          body: JSON.stringify({ availability_status: nextAvailabilityStatus }),
        });
      }
      return null;
    }).then(() => {
      cancelEditing();
      setError("");
      setSaveErrorsByItemId((current) => ({ ...current, [item.id]: "" }));
      loadCatalog();
    }).catch((fetchError) => {
      const saveError = buildCatalogSaveErrorMessage(fetchError.message);
      setSaveErrorsByItemId((current) => ({ ...current, [item.id]: saveError }));
    }).finally(() => setSaveBusyItemId((current) => current === item.id ? null : current));
  }

  function createItem(event) {
    event.preventDefault();
    startCreateTransition(() => {
      apiFetch("/dashboard/catalog", { method: "POST", body: JSON.stringify(newItem) }).then(() => {
        setNewItem(EMPTY_ITEM);
        setTitleQuery("");
        setAuthorQuery("");
        setError("");
        loadCatalog({ title: "", author: "" });
        navigate(buildDashboardUrl("catalog", "active"));
      }).catch((fetchError) => setError(fetchError.message));
    });
  }

  function createReadingClub(event) {
    event.preventDefault();
    startReadingClubTransition(() => {
      apiFetch("/dashboard/reading-clubs", { method: "POST", body: JSON.stringify(buildReadingClubPayload(newReadingClub)) })
        .then(() => {
          setNewReadingClub(createReadingClubDraft());
          setError("");
          loadReadingClubs();
        })
        .catch((fetchError) => setError(fetchError.message));
    });
  }

  function startEditingReadingClub(club) {
    setEditingReadingClubId(club.id);
    setDraftReadingClub(createReadingClubDraft(club));
  }

  function cancelEditingReadingClub() {
    setEditingReadingClubId(null);
    setDraftReadingClub(createReadingClubDraft());
  }

  function saveReadingClub(clubId) {
    startReadingClubTransition(() => {
      apiFetch(`/dashboard/reading-clubs/${clubId}`, { method: "PATCH", body: JSON.stringify(buildReadingClubPayload(draftReadingClub)) })
        .then(() => {
          cancelEditingReadingClub();
          setError("");
          loadReadingClubs();
        })
        .catch((fetchError) => setError(fetchError.message));
    });
  }

  return (
    <section className="dashboard-shell">
      <header className="dashboard-top">
        <div><p className="section-label">Gestiona tu vidriera</p><h1>{me.bookstore.name}</h1><p>Gestiona tu vidriera y lo que ven los lectores en Bookia.</p></div>
        <div className="dashboard-actions">
          <div className="dashboard-actions-buttons">
            <a className="secondary-button" href="https://t.me/bookia_ext_bot" target="_blank" rel="noreferrer">🤖 Usar bot de Telegram</a>
            {billingAccess.catalogIsPublic ? <button className="primary-button" onClick={() => navigate(`/bookstores/${me.bookstore.slug}`)}>🏬 Ver vidriera digital <ArrowIcon /></button> : <span className="secondary-button button-disabled" aria-disabled="true">Vidriera oculta</span>}
          </div>
          <p className="dashboard-telegram-help">Iniciá sesión en el bot con el correo y la contraseña de tu librería para cargar libros desde Telegram.</p>
        </div>
      </header>

      {registrationPending && me.billing?.status !== "payment_pending" ? <p className="feedback success">Registramos tu libreria.</p> : null}
      {me.billing?.status === "payment_pending" && billingAccess.canManageCatalog ? <p className="feedback success">Tu prueba gratis está activa hasta el {formatBillingDate(me.billing.trial_ends_at)}. Confirmá el medio de pago antes de esa fecha para conservar el acceso.</p> : null}
      {!billingAccess.canManageCatalog && billingAccess.catalogIsPublic ? <p className="feedback error">La prueba o suscripción necesita regularizarse. Tu catálogo sigue público, pero no podés modificarlo hasta confirmar el pago.</p> : null}
      {!billingAccess.canManageCatalog && !billingAccess.catalogIsPublic && !reactivationIsPending ? <p className="feedback error">Tu librería y su catálogo no están visibles públicamente. Podés reactivar la suscripción desde este panel.</p> : null}
      {reactivationIsPending ? <p className="feedback error">Tu librería y su catálogo no están visibles públicamente. La reactivación está pendiente. Confirmá el medio de pago desde Suscripción.</p> : null}
      {error ? <p className="feedback error">{error}</p> : null}

      <DashboardTabs section={section} />

      <div className="dashboard-workspace">
        <div className="dashboard-tab-panel" hidden={section !== "profile"}>
          <BookstoreProfileEditor bookstore={me.bookstore} genres={genres} genresLoading={genresLoading} genresError={genresError} onSaved={() => refreshMe({ preserveOnError: true })} onError={setError} />
        </div>

      <DashboardPanel
        label="Alta de libros"
        title="Agregar libro manualmente"
        description="Usa este formulario cuando quieras cargar un libro desde cero."
        isActive={section === "new-book"}
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
      </DashboardPanel>

      <div className="dashboard-catalog-shell" hidden={section !== "catalog"}>
        <nav className="dashboard-subtabs" aria-label="Vistas del catalogo">
          <AppLink
            href={buildDashboardUrl("catalog", "active")}
            className={`dashboard-subtab${catalogView === "active" ? " is-active" : ""}`}
            aria-current={catalogView === "active" ? "page" : undefined}
          >
            Catalogo activo <span>{activeItems.length}</span>
          </AppLink>
          <AppLink
            href={buildDashboardUrl("catalog", "sold-out")}
            className={`dashboard-subtab${catalogView === "sold-out" ? " is-active" : ""}`}
            aria-current={catalogView === "sold-out" ? "page" : undefined}
          >
            Agotados <span>{hiddenItems.length}</span>
          </AppLink>
        </nav>

      <DashboardPanel
        label="Catalogo activo"
        title="Tus publicaciones"
        countLabel={`${activeItems.length} ${activeItems.length === 1 ? "libro" : "libros"}`}
        isActive={catalogView === "active"}
        className="dashboard-catalog-panel"
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
        {!loading && activeItems.length === 0 ? <EmptyState title={hasActiveFilters ? "No hay coincidencias" : "Tu catalogo esta listo para crecer"}>{hasActiveFilters ? "Proba con otros filtros." : "Agrega el primer libro desde Alta de libros."}</EmptyState> : null}
        {!loading && activeItems.length > 0 ? <div className="dashboard-list dashboard-list-active">{activeItems.map((item) => {
          const coverUrl = resolveApiUrl(item.cover_image_url);
          const isEditing = editingItemId === item.id;
          const statusLabel = AVAILABILITY_LABELS[item.availability_status] || AVAILABILITY_LABELS[normalizeEditableAvailability(item.availability_status)];
          const bookStatusLabel = BOOK_STATUS_LABELS[normalizeBookStatus(item.book_status)] || BOOK_STATUS_LABELS.usado;
          const aiSuggestion = aiSuggestionsByItemId[item.id];
          const aiSourceState = getAiAutocompleteSourceState(aiSuggestion);
          const isAiBusy = aiBusyId === item.id;
          const saveUiState = getCatalogSaveUiState(saveBusyItemId, item.id);
          const catalogActionsBusy = catalogMutationBusy;
          const saveError = saveErrorsByItemId[item.id] || "";
          return (
            <article key={item.id} className={`dashboard-card catalog-item${isEditing ? " is-editing" : ""}`}>
              <div className="catalog-item-summary">{coverUrl ? <img src={coverUrl} alt={`Tapa de ${item.title}`} onError={(event) => { event.currentTarget.hidden = true; }} /> : <span className="catalog-cover-placeholder"><BookIcon /></span>}<div><span className="catalog-id">Libro #{item.id}</span>{item.is_featured ? <span className="status-pill">Destacado</span> : null}<h3>{item.title}</h3><p>{item.author || "Autor no visible"}</p><p>Estado: {isEditing ? BOOK_STATUS_LABELS[normalizeBookStatus(draftItem.book_status)] : bookStatusLabel}</p></div>{isEditing ? <span className={`status-pill status-${draftItem.availability_status}`}>{AVAILABILITY_LABELS[draftItem.availability_status] || statusLabel}</span> : <span className={`status-pill status-${normalizeEditableAvailability(item.availability_status)}`}>{statusLabel}</span>}</div>
              {item.genres?.length ? <div className="store-tags" aria-label="Generos del libro">{item.genres.map((genre) => <span key={genre.id} className="store-tag">{genre.name}</span>)}</div> : null}
              {item.description ? <p className="catalog-item-description">{item.description}</p> : null}
              {isEditing ? <fieldset className="dashboard-form-grid dashboard-form-grid-extended catalog-edit-fields" disabled={catalogActionsBusy}><label>Titulo<input value={draftItem.title} onChange={(event) => setDraftItem((current) => ({ ...current, title: event.target.value }))} /></label><label>Autor<input value={draftItem.author} onChange={(event) => setDraftItem((current) => ({ ...current, author: event.target.value }))} /></label><label>Disponibilidad<select value={draftItem.availability_status} onChange={(event) => setDraftItem((current) => ({ ...current, availability_status: event.target.value }))}>{EDITABLE_AVAILABILITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><label>Editorial<input value={draftItem.publisher} onChange={(event) => setDraftItem((current) => ({ ...current, publisher: event.target.value }))} /></label><label>Idioma<input value={draftItem.language} onChange={(event) => setDraftItem((current) => ({ ...current, language: event.target.value }))} /></label><label>Estado<select value={draftItem.book_status} onChange={(event) => setDraftItem((current) => ({ ...current, book_status: event.target.value }))}>{EDITABLE_BOOK_STATUS_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}</select></label><GenreSelector genres={genres} genresLoading={genresLoading} genresError={genresError} selectedGenreIds={draftItem.genre_ids || []} onChange={(genreIds) => setDraftItem((current) => ({ ...current, genre_ids: genreIds }))} /><label className="dashboard-field-wide">Descripcion<textarea value={draftItem.description} onChange={(event) => setDraftItem((current) => ({ ...current, description: event.target.value }))} rows={4} /></label></fieldset> : null}
              {isEditing ? (
                <div className="catalog-image-editor">
                  <div className="catalog-image-editor-head">
                    <div><h4>Fotos del libro</h4><p>{(item.images || []).length} de {MAX_CATALOG_IMAGES} imagenes cargadas.</p></div>
                    <label className={`secondary-button${(item.images || []).length >= MAX_CATALOG_IMAGES || catalogActionsBusy ? " button-disabled" : ""}`}>
                      {imageBusyId === item.id ? "Subiendo..." : "Subir fotos"}
                      <input type="file" accept="image/png,image/jpeg,image/webp" multiple disabled={(item.images || []).length >= MAX_CATALOG_IMAGES || catalogActionsBusy} onChange={(event) => { uploadItemImages(item.id, event.target.files); event.target.value = ""; }} />
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
                              {isCatalogImage && !image.is_primary ? <button type="button" className="secondary-button" onClick={() => markPrimaryImage(item.id, image.id)} disabled={catalogActionsBusy || imageBusyId === item.id}>Marcar principal</button> : null}
                              {isCatalogImage ? <button type="button" className="danger-button" onClick={() => deleteItemImage(item.id, image.id)} disabled={catalogActionsBusy || imageBusyId === item.id}>Quitar foto</button> : null}
                              {isCurrentCover ? <span className="status-pill">Foto actual</span> : null}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : <p className="catalog-image-empty">Todavia no cargaste fotos propias para este libro.</p>}
                </div>
              ) : null}
              {isEditing && aiSourceState.shouldShow ? (
                <div className="catalog-ai-sources">
                  <span>Fuentes consultadas</span>
                  {aiSourceState.sources.map((source) => <a key={source.url} href={source.url} target="_blank" rel="noreferrer">{source.title}</a>)}
                </div>
              ) : null}
              {isEditing && saveError ? <p className="feedback error catalog-save-error" role="alert">{saveError}</p> : null}
              <div className="card-actions"><div className="card-actions-main">{isEditing ? <button type="button" className="secondary-button" onClick={cancelEditing} disabled={catalogActionsBusy}>Cancelar</button> : <><button type="button" className="secondary-button" onClick={() => startEditing(item)} disabled={catalogActionsBusy}>Editar</button><button type="button" className="secondary-button" onClick={() => toggleFeatured(item)} disabled={catalogActionsBusy}>{item.is_featured ? "Quitar destacado" : "Destacar"}</button><BookShareMenu item={item} bookstore={me.bookstore} /></>}{canAutocompleteWithAi ? <button type="button" className="secondary-button" onClick={() => autocompleteItem(item)} disabled={catalogActionsBusy}>{isAiBusy ? <><SparkleIcon size={16} /> Autocompletando...</> : <><SparkleIcon size={16} /> Autocompletar con IA</>}</button> : null}{isEditing ? <button type="button" className="primary-button" onClick={() => saveItem(item)} disabled={catalogActionsBusy}>{saveUiState.isCurrentItemSaving ? "Guardando..." : "Guardar"}</button> : null}</div><button type="button" className="danger-button" onClick={() => hideItem(item.id)} disabled={catalogActionsBusy}>Eliminar</button></div>
            </article>
          );
        })}</div> : null}
      </DashboardPanel>

        <DashboardPanel
          label="Agotados"
          title="Libros agotados"
          countLabel={`${hiddenItems.length} ${hiddenItems.length === 1 ? "libro" : "libros"}`}
          isActive={catalogView === "sold-out"}
          className="dashboard-catalog-panel"
        >
          {hiddenItems.length === 0 ? <EmptyState title="No hay libros agotados">Los libros que marques como agotados apareceran aca.</EmptyState> : null}
          {hiddenItems.length > 0 ? <div className="dashboard-list">{hiddenItems.map((item) => {
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
                <div className="card-actions"><button type="button" className="primary-button" onClick={() => updateAvailability(item.id, "available")} disabled={catalogMutationBusy}>Volver a publicar</button><button type="button" className="secondary-button" onClick={() => navigate(`/bookstores/${me.bookstore.slug}`)}>Ver vidriera digital</button></div>
              </article>
            );
          })}</div> : null}
        </DashboardPanel>
      </div>

      <DashboardPanel
        label="Encuentros"
        title="Club de lectura"
        description="Carga los clubes que organiza tu libreria y controla cuales aparecen en la vidriera digital."
        countLabel={`${readingClubs.length} ${readingClubs.length === 1 ? "club" : "clubes"}`}
        isActive={section === "clubs"}
      >
        <form onSubmit={createReadingClub}>
          <div className="dashboard-card-head dashboard-card-head-inline">
            <p>Titulo, descripcion y genero son obligatorios. Fecha y lugar pueden quedar a confirmar.</p>
            <button className="primary-button" type="submit" disabled={readingClubBusy}>{readingClubBusy ? "Guardando..." : "Crear club"}</button>
          </div>
          <div className="dashboard-form-grid dashboard-form-grid-extended">
            <label>Titulo *<input value={newReadingClub.title} onChange={(event) => setNewReadingClub((current) => ({ ...current, title: event.target.value }))} required /></label>
            <ReadingClubGenreField genres={genres} genresLoading={genresLoading} genresError={genresError} value={newReadingClub.genre_id} onChange={(genreId) => setNewReadingClub((current) => ({ ...current, genre_id: genreId }))} />
            <label>Fecha<input type="date" value={newReadingClub.meeting_date} onChange={(event) => setNewReadingClub((current) => ({ ...current, meeting_date: event.target.value }))} /></label>
            <label>Lugar<input value={newReadingClub.location} onChange={(event) => setNewReadingClub((current) => ({ ...current, location: event.target.value }))} placeholder="Ej: Sala del fondo" /></label>
            <label>Página externa<input value={newReadingClub.external_url} onChange={(event) => setNewReadingClub((current) => ({ ...current, external_url: event.target.value }))} placeholder="Ej: sitio.com/club" /></label>
            <label className="dashboard-field-wide">Descripcion *<textarea value={newReadingClub.description} onChange={(event) => setNewReadingClub((current) => ({ ...current, description: event.target.value }))} rows={4} required /></label>
            <label className="dashboard-checkbox-field"><input type="checkbox" checked={newReadingClub.is_visible} onChange={(event) => setNewReadingClub((current) => ({ ...current, is_visible: event.target.checked }))} /> Publicar en vidriera digital</label>
          </div>
        </form>

        {readingClubsLoading ? <div className="loading-list"><span /><span /><span /></div> : null}
        {!readingClubsLoading && readingClubs.length === 0 ? <EmptyState title="Todavia no hay clubes cargados">Cuando crees un club visible, va a aparecer en la vidriera digital.</EmptyState> : null}
        {!readingClubsLoading && readingClubs.length > 0 ? <div className="dashboard-list reading-club-list">{readingClubs.map((club) => {
          const isEditingClub = editingReadingClubId === club.id;
          return (
            <article key={club.id} className="dashboard-card reading-club-item">
              {isEditingClub ? (
                <div className="dashboard-form-grid dashboard-form-grid-extended">
                  <label>Titulo *<input value={draftReadingClub.title} onChange={(event) => setDraftReadingClub((current) => ({ ...current, title: event.target.value }))} required /></label>
                  <ReadingClubGenreField genres={genres} genresLoading={genresLoading} genresError={genresError} value={draftReadingClub.genre_id} onChange={(genreId) => setDraftReadingClub((current) => ({ ...current, genre_id: genreId }))} />
                  <label>Fecha<input type="date" value={draftReadingClub.meeting_date} onChange={(event) => setDraftReadingClub((current) => ({ ...current, meeting_date: event.target.value }))} /></label>
                  <label>Lugar<input value={draftReadingClub.location} onChange={(event) => setDraftReadingClub((current) => ({ ...current, location: event.target.value }))} /></label>
                  <label>Página externa<input value={draftReadingClub.external_url} onChange={(event) => setDraftReadingClub((current) => ({ ...current, external_url: event.target.value }))} placeholder="Ej: sitio.com/club" /></label>
                  <label className="dashboard-field-wide">Descripcion *<textarea value={draftReadingClub.description} onChange={(event) => setDraftReadingClub((current) => ({ ...current, description: event.target.value }))} rows={4} required /></label>
                  <label className="dashboard-checkbox-field"><input type="checkbox" checked={draftReadingClub.is_visible} onChange={(event) => setDraftReadingClub((current) => ({ ...current, is_visible: event.target.checked }))} /> Publicar en vidriera digital</label>
                </div>
              ) : (
                <>
                  <div className="catalog-item-summary reading-club-summary">
                    <span className={`status-pill${club.is_visible ? "" : " status-hidden"}`}>{club.is_visible ? "Publicado" : "Oculto"}</span>
                    <div><span className="catalog-id">{club.genre?.name || "Sin genero"}</span><h3>{club.title}</h3><p>{displayReadingClubDate(club.meeting_date)}{club.location ? ` / ${club.location}` : ""}</p></div>
                  </div>
                  <p className="catalog-item-description">{club.description}</p>
                </>
              )}
              <div className="card-actions"><div className="card-actions-main">{isEditingClub ? <button type="button" className="secondary-button" onClick={cancelEditingReadingClub}>Cancelar</button> : <><button type="button" className="secondary-button" onClick={() => startEditingReadingClub(club)}>Editar</button>{club.is_visible && me?.bookstore ? <ReadingClubShareMenu club={club} host={{ type: "bookstore", slug: me.bookstore.slug }} hostName={me.bookstore.name} bookstoreId={me.bookstore.id} source="dashboard_reading_clubs" /> : null}</>}{isEditingClub ? <button type="button" className="primary-button" onClick={() => saveReadingClub(club.id)} disabled={readingClubBusy}>{readingClubBusy ? "Guardando..." : "Guardar"}</button> : null}</div></div>
            </article>
          );
        })}</div> : null}

      </DashboardPanel>

      <DashboardPanel
        label="Metricas"
        title="Interes de lectores"
        description={formatAnalyticsPeriod(analytics)}
        isActive={section === "metrics"}
        className="dashboard-metrics-panel"
      >
        <div className="dashboard-analytics-filters">
          <label>
            Período
            <select value={analyticsFilter.mode} onChange={(event) => {
              const mode = event.target.value;
              const today = getArgentinaToday();
              navigate(buildDashboardUrl("metrics", "active", mode === "custom" ? { mode, startDate: today, endDate: today } : { mode, month: null }));
            }}>
              <option value="month">Mes</option>
              <option value="custom">Rango personalizado</option>
            </select>
          </label>
          {analyticsFilter.mode === "month" ? <label>
            Mes
            <select value={analyticsFilter.month || getArgentinaToday().slice(0, 7)} onChange={(event) => navigate(buildDashboardUrl("metrics", "active", { mode: "month", month: event.target.value }))}>
              {getAnalyticsMonthOptions().map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label> : <>
            <label>Desde<input type="date" value={analyticsDraft.startDate} min={analyticsMinimumDate} max={analyticsDraft.endDate || getArgentinaToday()} onChange={(event) => setAnalyticsDraft((draft) => ({ ...draft, startDate: event.target.value }))} /></label>
            <label>Hasta<input type="date" value={analyticsDraft.endDate} min={analyticsDraft.startDate || analyticsMinimumDate} max={getArgentinaToday()} onChange={(event) => setAnalyticsDraft((draft) => ({ ...draft, endDate: event.target.value }))} /></label>
            <button type="button" className="secondary-button" disabled={!analyticsDraft.startDate || !analyticsDraft.endDate || analyticsDraft.startDate < analyticsMinimumDate || analyticsDraft.startDate > analyticsDraft.endDate} onClick={() => navigate(buildDashboardUrl("metrics", "active", { mode: "custom", ...analyticsDraft }))}>Aplicar</button>
          </>}
        </div>
        {analyticsLoading ? <div className="loading-list" role="status" aria-label="Actualizando métricas"><span /><span /><span /></div> : null}
        {analyticsError ? <p className="feedback error" role="alert">{analyticsError}</p> : null}
        {!analyticsLoading ? (
          <>
            <div className="metrics-summary-grid">
              <article><span>Aperturas de libros</span><strong>{formatMetricValue(analytics.totals.book_detail_opened)}</strong></article>
              <article><span>Visitas a libreria</span><strong>{formatMetricValue(analytics.totals.bookstore_opened)}</strong></article>
              <article><span>Clicks en WhatsApp</span><strong>{formatMetricValue(analytics.totals.whatsapp_clicked)}</strong></article>
              <article><span>Libros compartidos</span><strong>{formatMetricValue(analytics.totals.book_shared)}</strong></article>
              <article><span>Clubes compartidos</span><strong>{formatMetricValue(analytics.totals.reading_club_shared)}</strong></article>
              <article><span>Compartidos por WhatsApp</span><strong>{formatMetricValue(analytics.share_channels?.whatsapp)}</strong></article>
              <article><span>Compartidos por Instagram</span><strong>{formatMetricValue(analytics.share_channels?.instagram)}</strong></article>
              <article><span>Compartidos por Telegram</span><strong>{formatMetricValue(analytics.share_channels?.telegram)}</strong></article>
              <article><span>Enlaces copiados</span><strong>{formatMetricValue(analytics.share_channels?.copy_link)}</strong></article>
            </div>
            {analytics.top_books.length === 0 ? <EmptyState title="Todavia no hay metricas">Cuando las personas interactuen con tu vidriera, vas a ver los libros con mas interes aca.</EmptyState> : (
              <div className="dashboard-list metrics-book-list">
                {analytics.top_books.map((book) => (
                  <article key={book.id} className="dashboard-card metrics-book-item">
                    <div><span className="catalog-id">Libro #{book.id}</span><h3>{book.title}</h3><p>{book.author || "Autor no visible"}</p></div>
                    <dl>
                      <div><dt>Aperturas</dt><dd>{formatMetricValue(book.book_detail_opened)}</dd></div>
                      <div><dt>WhatsApp</dt><dd>{formatMetricValue(book.whatsapp_clicked)}</dd></div>
                      <div><dt>Compartidos por WhatsApp</dt><dd>{formatMetricValue(book.shares_by_channel?.whatsapp)}</dd></div>
                      <div><dt>Compartidos por Instagram</dt><dd>{formatMetricValue(book.shares_by_channel?.instagram)}</dd></div>
                      <div><dt>Compartidos por Telegram</dt><dd>{formatMetricValue(book.shares_by_channel?.telegram)}</dd></div>
                      <div><dt>Enlaces copiados</dt><dd>{formatMetricValue(book.shares_by_channel?.copy_link)}</dd></div>
                    </dl>
                  </article>
                ))}
              </div>
            )}
            {analytics.top_reading_clubs.length > 0 ? <div className="dashboard-list metrics-book-list">{analytics.top_reading_clubs.map((club) => <article key={club.id} className="dashboard-card metrics-book-item"><div><span className="catalog-id">Club de lectura</span><h3>{club.title}</h3></div><dl><div><dt>WhatsApp</dt><dd>{formatMetricValue(club.shares_by_channel?.whatsapp)}</dd></div><div><dt>Instagram</dt><dd>{formatMetricValue(club.shares_by_channel?.instagram)}</dd></div><div><dt>Telegram</dt><dd>{formatMetricValue(club.shares_by_channel?.telegram)}</dd></div><div><dt>Enlaces copiados</dt><dd>{formatMetricValue(club.shares_by_channel?.copy_link)}</dd></div></dl></article>)}</div> : null}
          </>
        ) : null}
      </DashboardPanel>

      <DashboardPanel
        label="Facturacion"
        title="Tu suscripcion"
        description="Consulta el proximo cobro, programa cambios o cancela la renovacion. Bookia no almacena los datos de tu tarjeta."
        isActive={section === "subscription"}
        className="dashboard-subscription-panel"
      >
        <BillingSubscriptionPanel initialBilling={me.billing} onBillingChange={() => refreshMe({ preserveOnError: true })} />
      </DashboardPanel>
      </div>
    </section>
  );
}
