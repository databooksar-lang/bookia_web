import { useEffect, useState, useTransition } from "react";

import { apiFetch, resolveApiUrl } from "./api";

function navigate(path) {
  window.history.pushState({}, "", path);
  window.dispatchEvent(new PopStateEvent("popstate"));
}

function AppLink({ href, className, children }) {
  return (
    <a
      href={href}
      className={className}
      onClick={(event) => {
        event.preventDefault();
        navigate(href);
      }}
    >
      {children}
    </a>
  );
}

function useLocationState() {
  const [locationState, setLocationState] = useState({
    pathname: window.location.pathname,
    search: window.location.search,
  });

  useEffect(() => {
    const onChange = () => {
      setLocationState({
        pathname: window.location.pathname,
        search: window.location.search,
      });
    };

    window.addEventListener("popstate", onChange);
    return () => window.removeEventListener("popstate", onChange);
  }, []);

  return locationState;
}

function normalizePhonePart(value) {
  if (value === null || value === undefined) {
    return "";
  }

  return String(value).replace(/\s+/g, "").trim();
}

function buildWhatsAppHref(phoneCountryCd, phone) {
  const normalizedCountry = normalizePhonePart(phoneCountryCd);
  const normalizedPhone = normalizePhonePart(phone);

  if (!normalizedCountry || !normalizedPhone) {
    return null;
  }

  return `https://wa.me/${normalizedCountry}${normalizedPhone}`;
}

function formatDisplayPhone(phoneCountryCd, phone) {
  const normalizedCountry = normalizePhonePart(phoneCountryCd);
  const normalizedPhone = normalizePhonePart(phone);

  if (!normalizedCountry || !normalizedPhone) {
    return phone || "No disponible";
  }

  return `+${normalizedCountry}${normalizedPhone}`;
}

function WhatsAppButton({ className = "primary-button", phoneCountryCd, phone, children }) {
  const href = buildWhatsAppHref(phoneCountryCd, phone);

  if (!href) {
    return (
      <span className={`${className} button-disabled`} aria-disabled="true">
        {children}
      </span>
    );
  }

  return (
    <a className={className} href={href} target="_blank" rel="noreferrer">
      {children}
    </a>
  );
}

function Header({ me }) {
  return (
    <header className="site-header">
      <button className="brand" onClick={() => navigate("/")}>
        <span className="brand-mark">B</span>
        <span>
          <strong>Bookia</strong>
          <small> Conectando lectores, librerias y emprendedores</small>
        </span>
      </button>
      <nav className="header-links">
        <button onClick={() => navigate("/")}>Buscar</button>
        <button onClick={() => navigate("/login")}>{me ? "Mi catalogo" : "Para librerias"}</button>
      </nav>
    </header>
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
        <p className="eyebrow">Encontra libros cerca tuyo</p>
        <h1>Bookia hace posible encontrar ese libro que tanto buscabas</h1>
        <p>Bookia reune catalogos de librerias de de nuevos y usados y emprendimientos personales para ayudarte a encontrar tu proxima lectura.</p>
      </div>
      <form className="search-panel" onSubmit={submit}>
        <label className="search-field search-field-type">
          Tipo de busqueda
          <select value={field} onChange={(event) => setField(event.target.value)}>
            <option value="general">Titulo, autor o editorial</option>
            <option value="title">Solo titulo</option>
            <option value="author">Autor</option>
            <option value="publisher">Editorial</option>
          </select>
        </label>
        <label className="search-field search-field-query">
          Busca por palabra clave
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Ej: Rayuela, Borges o Sudamericana"
          />
        </label>
        <button className="primary-button search-submit" type="submit">
          Buscar libros
        </button>
      </form>
    </section>
  );
}

function SearchResults({ filters, stores }) {
  const [items, setItems] = useState([]);
  const [selectedStore, setSelectedStore] = useState("");
  const [selectedCover, setSelectedCover] = useState(null);
  const [loading, startTransition] = useTransition();
  const [error, setError] = useState("");
  const hasSearched = filters !== null;

  useEffect(() => {
    if (!selectedCover) {
      return undefined;
    }

    const onKeyDown = (event) => {
      if (event.key === "Escape") {
        setSelectedCover(null);
      }
    };

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
    if (filters.query) {
      params.set("query", filters.query);
    }
    if (filters.field) {
      params.set("field", filters.field);
    }
    if (selectedStore) {
      params.set("bookstore", selectedStore);
    }

    startTransition(() => {
      apiFetch(`/search?${params.toString()}`)
        .then((data) => {
          setItems(data.items);
          setError("");
        })
        .catch((fetchError) => {
          setItems([]);
          setError(fetchError.message);
        });
    });
  }, [filters, hasSearched, selectedStore]);

  if (!hasSearched) {
    return null;
  }

  return (
    <section className="results-shell">
      <div className="results-toolbar">
        <div>
          <h2>Resultados de la busqueda</h2>
          <p>{loading ? "Buscando..." : `${items.length} resultado/s encontrados`}</p>
        </div>
        <label className="compact-filter">
          Libreria
          <select value={selectedStore} onChange={(event) => setSelectedStore(event.target.value)}>
            <option value="">Todas</option>
            {stores.map((store) => (
              <option key={store.id} value={store.slug}>
                {store.name}
              </option>
            ))}
          </select>
        </label>
      </div>
      {error ? <p className="feedback error">{error}</p> : null}
      <div className="search-results-table" role="list">
        <div className="search-results-head" aria-hidden="true">
          <span>Nombre</span>
          <span>Autor</span>
          <span>Libreria</span>
          <span>WhatsApp</span>
        </div>
        <div className="search-results-body">
          {items.map((item) => (
            <article key={item.id} className="search-result-row" role="listitem">
              <div className="search-result-cell search-result-title" data-label="Nombre">
                {item.cover_image_url ? (
                  <button
                    type="button"
                    className="search-result-cover-button"
                    aria-label={`Ampliar tapa de ${item.title}`}
                    onClick={() => setSelectedCover({ title: item.title, url: resolveApiUrl(item.cover_image_url) })}
                  >
                    <img className="search-result-cover" src={resolveApiUrl(item.cover_image_url)} alt={`Tapa de ${item.title}`} />
                  </button>
                ) : null}
                <strong>{item.title}</strong>
              </div>
              <div className="search-result-cell" data-label="Autor">
                <span>{item.author || "Autor no visible"}</span>
              </div>
              <div className="search-result-cell" data-label="Libreria">
                <AppLink className="secondary-button search-result-store" href={`/bookstores/${item.bookstore.slug}`}>
                  {item.bookstore.name}
                </AppLink>
              </div>
              <div className="search-result-cell" data-label="WhatsApp">
                <WhatsAppButton
                  className="primary-button search-result-whatsapp"
                  phoneCountryCd={item.bookstore.phone_country_cd}
                  phone={item.bookstore.phone}
                >
                  Contactar
                </WhatsAppButton>
              </div>
            </article>
          ))}
        </div>
      </div>
      {selectedCover ? (
        <div
          className="search-cover-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`Tapa ampliada de ${selectedCover.title}`}
          onClick={() => setSelectedCover(null)}
        >
          <div className="search-cover-modal-card" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="search-cover-modal-close"
              aria-label="Cerrar imagen ampliada"
              onClick={() => setSelectedCover(null)}
            >
              Cerrar
            </button>
            <img
              className="search-cover-modal-image"
              src={selectedCover.url}
              alt={`Tapa ampliada de ${selectedCover.title}`}
            />
          </div>
        </div>
      ) : null}
    </section>
  );
}

function HomePage() {
  const [stores, setStores] = useState([]);
  const [draftFilters, setDraftFilters] = useState({ query: "", field: "general" });
  const [searchFilters, setSearchFilters] = useState(null);

  useEffect(() => {
    apiFetch("/bookstores")
      .then((data) => setStores(data.items))
      .catch(() => setStores([]));
  }, []);

  return (
    <>
      <HeroSearch
        initialQuery={draftFilters.query}
        initialField={draftFilters.field}
        onSearch={(nextFilters) => {
          setDraftFilters(nextFilters);
          setSearchFilters(nextFilters);
        }}
      />
      <SearchResults filters={searchFilters} stores={stores} />
    </>
  );
}

function BookstorePage({ slug }) {
  const [store, setStore] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    apiFetch(`/bookstores/${slug}`)
      .then((data) => {
        setStore(data.bookstore);
        setItems(data.items);
        setError("");
      })
      .catch((fetchError) => setError(fetchError.message))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) {
    return <p className="feedback">Cargando libreria...</p>;
  }

  if (error || !store) {
    return <p className="feedback error">{error || "No encontramos esa libreria."}</p>;
  }

  return (
    <section className="store-page">
      <div
        className={`store-hero store-hero-banner${store.hero_image_url ? " has-hero" : ""}`}
        style={
          store.hero_image_url
            ? {
                backgroundImage: `linear-gradient(rgba(35, 22, 13, 0.54), rgba(35, 22, 13, 0.72)), url(${store.hero_image_url})`,
              }
            : undefined
        }
      >
        <div>
          <p className="eyebrow">Libreria adherida</p>
          {store.logo_url ? (
            <img className="store-logo store-logo-large" src={store.logo_url} alt={`Logo de ${store.name}`} />
          ) : null}
          <h1>{store.name}</h1>
          <p>{store.description || "Catalogo publicado desde fotos validadas por la libreria."}</p>
          <p className="details-line">{store.address || "Direccion a confirmar"}</p>
        </div>
        <div className="store-contact-card">
          <p>Telefono: {formatDisplayPhone(store.phone_country_cd, store.phone)}</p>
          <p>Instagram: {store.instagram_handle || "No disponible"}</p>
          <p>Sitio web: {store.website_url || "No disponible"}</p>
          <WhatsAppButton phoneCountryCd={store.phone_country_cd} phone={store.phone}>
            Hablar por WhatsApp
          </WhatsAppButton>
        </div>
      </div>
      <div className="results-shell">
        <div className="results-toolbar">
          <div>
            <h2>Catalogo disponible</h2>
            <p>{items.length} libros publicados</p>
          </div>
          <button className="secondary-button" onClick={() => navigate("/")}>
            Volver a buscar
          </button>
        </div>
        <div className="card-grid">
          {items.map((item) => (
            <article key={item.id} className="book-card">
              <span className="pill">{item.availability_status}</span>
              <h3>{item.title}</h3>
              <p className="muted">{item.author}</p>
              <p className="details-line">
                {item.publisher || "Editorial no visible"}
                {item.language ? ` · ${item.language}` : ""}
              </p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

function LoginPage({ onLogin, me }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, startTransition] = useTransition();

  if (me) {
    return (
      <section className="auth-shell">
        <div className="auth-card">
          <h1>Ya estas dentro</h1>
          <p>Tu catalogo de {me.bookstore.name} esta listo para gestionarse.</p>
          <button className="primary-button" onClick={() => navigate("/dashboard")}>
            Ir al panel
          </button>
        </div>
      </section>
    );
  }

  function submit(event) {
    event.preventDefault();
    startTransition(() => {
      apiFetch("/auth/login", {
        method: "POST",
        body: JSON.stringify({ email, password }),
      })
        .then(() => onLogin())
        .catch((loginError) => setError(loginError.message));
    });
  }

  return (
    <section className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">Para librerias</p>
        <h1 className="auth-title-compact">Gestiona tu perfil de libreria y catalogo</h1>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label>
          Contrasena
          <input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
        </label>
        <button type="button" className="text-link auth-link-button" onClick={() => navigate("/forgot-password")}>
          Olvide mi contrasena
        </button>
        {error ? <p className="feedback error">{error}</p> : null}
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "Ingresando..." : "Entrar al panel"}
        </button>
      </form>
    </section>
  );
}

function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [resetUrl, setResetUrl] = useState("");
  const [busy, startTransition] = useTransition();

  function submit(event) {
    event.preventDefault();
    startTransition(() => {
      apiFetch("/auth/forgot-password", {
        method: "POST",
        body: JSON.stringify({ email }),
      })
        .then((data) => {
          setMessage(data.detail || "Revisa tu email para continuar.");
          setResetUrl(data.reset_url || "");
          setError("");
        })
        .catch((requestError) => {
          setError(requestError.message);
          setMessage("");
          setResetUrl("");
        });
    });
  }

  return (
    <section className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">Recuperacion</p>
        <h1 className="auth-title-compact">Recupera el acceso a tu libreria</h1>
        <p className="muted">Ingresa tu email y te generaremos un enlace para restablecer la contrasena.</p>
        <label>
          Email
          <input type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        {error ? <p className="feedback error">{error}</p> : null}
        {message ? <p className="feedback">{message}</p> : null}
        {resetUrl ? (
          <button type="button" className="secondary-button" onClick={() => navigate(resetUrl)}>
            Abrir enlace de restablecimiento
          </button>
        ) : null}
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "Generando enlace..." : "Generar enlace"}
        </button>
        <button type="button" className="text-link auth-link-button" onClick={() => navigate("/login")}>
          Volver al ingreso
        </button>
      </form>
    </section>
  );
}

function ResetPasswordPage({ locationSearch }) {
  const token = new URLSearchParams(locationSearch).get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [busy, startTransition] = useTransition();

  function submit(event) {
    event.preventDefault();
    if (!token) {
      setError("El enlace de restablecimiento no es valido.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Las contrasenas no coinciden.");
      return;
    }

    startTransition(() => {
      apiFetch("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      })
        .then((data) => {
          setMessage(data.detail || "Tu contrasena fue actualizada.");
          setError("");
          setPassword("");
          setConfirmPassword("");
        })
        .catch((requestError) => {
          setError(requestError.message);
          setMessage("");
        });
    });
  }

  if (!token) {
    return (
      <section className="auth-shell">
        <div className="auth-card">
          <p className="eyebrow">Recuperacion</p>
          <h1 className="auth-title-compact">Enlace invalido</h1>
          <p className="feedback error">No encontramos un token valido para restablecer la contrasena.</p>
          <button className="secondary-button" onClick={() => navigate("/forgot-password")}>
            Solicitar un nuevo enlace
          </button>
        </div>
      </section>
    );
  }

  return (
    <section className="auth-shell">
      <form className="auth-card" onSubmit={submit}>
        <p className="eyebrow">Recuperacion</p>
        <h1 className="auth-title-compact">Define tu nueva contrasena</h1>
        <label>
          Nueva contrasena
          <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        <label>
          Confirmar contrasena
          <input type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} />
        </label>
        {error ? <p className="feedback error">{error}</p> : null}
        {message ? <p className="feedback">{message}</p> : null}
        <button className="primary-button" type="submit" disabled={busy}>
          {busy ? "Actualizando..." : "Guardar nueva contrasena"}
        </button>
        <button type="button" className="text-link auth-link-button" onClick={() => navigate("/login")}>
          Volver al ingreso
        </button>
      </form>
    </section>
  );
}

function DashboardPage({ me, refreshMe }) {
  const [items, setItems] = useState([]);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [newItem, setNewItem] = useState({ title: "", author: "", publisher: "", language: "" });
  const [createBusy, startCreateTransition] = useTransition();

  function loadCatalog(search = "") {
    const params = new URLSearchParams();
    if (search) {
      params.set("query", search);
    }
    apiFetch(`/dashboard/catalog?${params.toString()}`)
      .then((data) => {
        setItems(data.items);
        setError("");
      })
      .catch((fetchError) => setError(fetchError.message));
  }

  useEffect(() => {
    if (me) {
      loadCatalog();
    }
  }, [me]);

  if (!me) {
    return (
      <section className="auth-shell">
        <div className="auth-card">
          <h1>Sesion requerida</h1>
          <button className="primary-button" onClick={() => navigate("/login")}>
            Ingresar
          </button>
        </div>
      </section>
    );
  }

  function updateItem(itemId, payload) {
    apiFetch(`/dashboard/catalog/${itemId}`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    })
      .then(() => loadCatalog(query))
      .catch((fetchError) => setError(fetchError.message));
  }

  function updateAvailability(itemId, availabilityStatus) {
    apiFetch(`/dashboard/catalog/${itemId}/availability`, {
      method: "PATCH",
      body: JSON.stringify({ availability_status: availabilityStatus }),
    })
      .then(() => loadCatalog(query))
      .catch((fetchError) => setError(fetchError.message));
  }

  function deleteItem(itemId) {
    apiFetch(`/dashboard/catalog/${itemId}`, { method: "DELETE" })
      .then(() => loadCatalog(query))
      .catch((fetchError) => setError(fetchError.message));
  }

  function createItem(event) {
    event.preventDefault();
    startCreateTransition(() => {
      apiFetch("/dashboard/catalog", {
        method: "POST",
        body: JSON.stringify(newItem),
      })
        .then(() => {
          setNewItem({ title: "", author: "", publisher: "", language: "" });
          setError("");
          loadCatalog(query);
        })
        .catch((fetchError) => setError(fetchError.message));
    });
  }

  function logout() {
    apiFetch("/auth/logout", { method: "POST" }).finally(() => {
      refreshMe();
      navigate("/");
    });
  }

  return (
    <section className="dashboard-shell">
      <div className="dashboard-top">
        <div>
          <p className="eyebrow">Panel de libreria</p>
          <h1>{me.bookstore.name}</h1>
          <p>Gestiona los libros publicados desde las fotos aprobadas en Telegram.</p>
        </div>
        <div className="dashboard-actions">
          <button className="secondary-button" onClick={() => navigate(`/bookstores/${me.bookstore.slug}`)}>
            Ver ficha publica
          </button>
          <button className="text-link" onClick={logout}>
            Cerrar sesion
          </button>
        </div>
      </div>

      <div className="dashboard-search">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Buscar en mi catalogo"
        />
        <button className="primary-button" onClick={() => loadCatalog(query)}>
          Filtrar
        </button>
      </div>

      <form className="dashboard-card dashboard-create-form" onSubmit={createItem}>
        <div className="dashboard-card-head">
          <div>
            <h3>Agregar libro manualmente</h3>
            <p className="muted">Usa este formulario cuando el libro se publique sin imagen o quieras cargarlo desde cero.</p>
          </div>
          <button className="primary-button" type="submit" disabled={createBusy}>
            {createBusy ? "Guardando..." : "Crear libro"}
          </button>
        </div>
        <div className="dashboard-form-grid">
          <label>
            Titulo
            <input
              value={newItem.title}
              onChange={(event) => setNewItem((current) => ({ ...current, title: event.target.value }))}
            />
          </label>
          <label>
            Autor
            <input
              value={newItem.author}
              onChange={(event) => setNewItem((current) => ({ ...current, author: event.target.value }))}
            />
          </label>
          <label>
            Editorial
            <input
              value={newItem.publisher}
              onChange={(event) => setNewItem((current) => ({ ...current, publisher: event.target.value }))}
            />
          </label>
          <label>
            Idioma
            <input
              value={newItem.language}
              onChange={(event) => setNewItem((current) => ({ ...current, language: event.target.value }))}
            />
          </label>
        </div>
      </form>

      {error ? <p className="feedback error">{error}</p> : null}

      <div className="dashboard-list">
        {items.map((item) => (
          <article key={item.id} className="dashboard-card">
            <div className="dashboard-card-head">
              <div>
                <h3>{item.title}</h3>
                <p className="muted">{item.author}</p>
              </div>
              <select
                value={item.availability_status}
                onChange={(event) => updateAvailability(item.id, event.target.value)}
              >
                <option value="available">Disponible</option>
                <option value="reserved">Reservado</option>
                <option value="sold_out">Agotado</option>
                <option value="hidden">Oculto</option>
              </select>
            </div>
            <div className="dashboard-form-grid">
              <label>
                Titulo
                <input
                  defaultValue={item.title}
                  onBlur={(event) => updateItem(item.id, { title: event.target.value })}
                />
              </label>
              <label>
                Autor
                <input
                  defaultValue={item.author}
                  onBlur={(event) => updateItem(item.id, { author: event.target.value })}
                />
              </label>
              <label>
                Editorial
                <input
                  defaultValue={item.publisher || ""}
                  onBlur={(event) => updateItem(item.id, { publisher: event.target.value || null })}
                />
              </label>
              <label>
                Idioma
                <input
                  defaultValue={item.language || ""}
                  onBlur={(event) => updateItem(item.id, { language: event.target.value || null })}
                />
              </label>
            </div>
            <div className="card-actions">
              <button className="secondary-button" onClick={() => navigate(`/bookstores/${me.bookstore.slug}`)}>
                Ver en sitio publico
              </button>
              <button className="danger-button" onClick={() => deleteItem(item.id)}>
                Eliminar
              </button>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

export default function App() {
  const locationState = useLocationState();
  const { pathname, search } = locationState;
  const [me, setMe] = useState(null);

  function refreshMe() {
    apiFetch("/me")
      .then((data) => setMe(data))
      .catch(() => setMe(null));
  }

  useEffect(() => {
    refreshMe();
  }, []);

  let page = <HomePage />;
  if (pathname === "/login") {
    page = <LoginPage onLogin={refreshMe} me={me} />;
  } else if (pathname === "/forgot-password") {
    page = <ForgotPasswordPage />;
  } else if (pathname === "/reset-password") {
    page = <ResetPasswordPage locationSearch={search} />;
  } else if (pathname === "/dashboard") {
    page = <DashboardPage me={me} refreshMe={refreshMe} />;
  } else if (pathname.startsWith("/bookstores/")) {
    page = <BookstorePage slug={pathname.replace("/bookstores/", "")} />;
  }

  return (
    <div className="app-shell">
      <Header me={me} />
      <main>{page}</main>
    </div>
  );
}



