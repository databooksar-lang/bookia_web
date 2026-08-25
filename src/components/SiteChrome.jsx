import { useEffect, useState } from "react";

import { MenuIcon } from "./Icons";
import { AppLink, navigate } from "../navigation";
import { apiFetch } from "../api";

const NAV_ITEMS = [
  { href: "/", label: "Buscar libros" },
  { href: "/para-librerias", label: "Para librerias" },
  { href: "/about", label: "Sobre Bookia" },
];

const BOOKIA_LOGO_SRC = "/images/bookia-logo-circular-transparent.png";
const FOOTER_LOGO_SRC = "/images/logo-cuadrado.png";

function isActive(pathname, href) {
  return href === "/" ? pathname === "/" : pathname === href;
}

export function SiteHeader({ pathname, me, refreshMe }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const accountHref = me?.bookstore ? "/dashboard" : me ? "/profile" : "/login";
  const accountLabel = me?.bookstore ? "Mi cuenta" : me ? "Mi Perfil" : "Ingresar";
  const greetingName = (me?.bookstore?.name ?? me?.reader_profile?.display_name ?? "").trim();
  const greeting = greetingName ? `Hola ${greetingName}!` : "Hola!";

  function logout() {
    apiFetch("/auth/logout", { method: "POST" })
      .catch(() => null)
      .then(() => refreshMe())
      .finally(() => navigate("/"));
  }

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="site-header">
      <div className="header-inner">
        <AppLink className="brand" href="/" aria-label="Bookia, ir al inicio">
          <span className="brand-mark"><img src={BOOKIA_LOGO_SRC} alt="" /></span>
          <span className="brand-name">Bookia</span>
        </AppLink>
        {me ? <span className="header-greeting">{greeting}</span> : null}

        <button
          className="menu-toggle"
          type="button"
          aria-expanded={menuOpen}
          aria-controls="site-navigation"
          aria-label={menuOpen ? "Cerrar menu" : "Abrir menu"}
          onClick={() => setMenuOpen((current) => !current)}
        >
          <MenuIcon open={menuOpen} />
        </button>

        <nav id="site-navigation" className={`header-links${menuOpen ? " is-open" : ""}`} aria-label="Navegacion principal">
          {NAV_ITEMS.map((item) => (
            <AppLink key={item.href} href={item.href} className={isActive(pathname, item.href) ? "is-active" : undefined} aria-current={isActive(pathname, item.href) ? "page" : undefined}>
              {item.label}
            </AppLink>
          ))}
          {!me ? <AppLink href="/register" className="header-account">Registrate</AppLink> : null}
          {me ? <button className="header-logout" type="button" onClick={logout}>Cerrar sesion</button> : null}
          <AppLink href={accountHref} className={`header-account${pathname === accountHref || pathname === "/dashboard" ? " is-active" : ""}`}>
            {accountLabel}
          </AppLink>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="footer-inner">
        <div>
          <AppLink className="brand footer-brand" href="/">
            <span className="brand-mark"><img src={FOOTER_LOGO_SRC} alt="" /></span>
            <span className="brand-name">Bookia</span>
          </AppLink>
          <p>Libros, librerias y lectores mas cerca.</p>
          <div className="footer-payment-badge">
            <img src="/images/mercado-pago-logo.svg" alt="Mercado Pago" />
            <span>Suscripciones con Mercado Pago</span>
          </div>
          <p className="footer-copyright">© 2026 Bookia. Todos los derechos reservados.</p>
        </div>
        <nav className="footer-links" aria-label="Navegacion secundaria">
          <AppLink href="/para-librerias">Para librerias</AppLink>
          <AppLink href="/">Buscar libros</AppLink>
          <AppLink href="/about">Sobre Bookia</AppLink>
          <AppLink href="/privacy">Privacidad</AppLink>
          <AppLink href="/terms">Terminos</AppLink>
          <AppLink href="/cookies">Cookies</AppLink>
          <AppLink href="/login">Ingresar</AppLink>
        </nav>
        <section className="footer-contact" aria-labelledby="footer-contact-title">
          <h2 id="footer-contact-title">Contacto</h2>
          <a href="mailto:bookia.app.admin@gmail.com">bookia.app.admin@gmail.com</a>
          <a href="mailto:bookia.app.admin@gmail.com?subject=Reporte%20o%20comentario%20sobre%20Bookia">Informar un problema</a>
          <a href="https://wa.me/5491162366344">+54 9 11 6236-6344</a>
          <a href="https://www.instagram.com/bookia_app?igsh=MWRveTNhanV4Y3J4eg==" target="_blank" rel="noreferrer">Instagram</a>
        </section>
        <p className="footer-note">Conectados por los libros.</p>
      </div>
    </footer>
  );
}
