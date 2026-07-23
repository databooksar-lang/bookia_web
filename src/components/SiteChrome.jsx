import { useEffect, useState } from "react";

import { MenuIcon } from "./Icons";
import { AppLink } from "../navigation";

const NAV_ITEMS = [
  { href: "/", label: "Buscar" },
  { href: "/plans", label: "Planes" },
  { href: "/about", label: "Sobre Bookia" },
];

function isActive(pathname, href) {
  return href === "/" ? pathname === "/" : pathname === href;
}

export function SiteHeader({ pathname, me }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const accountHref = me?.bookstore ? "/dashboard" : "/";
  const accountLabel = me?.bookstore ? "Mi cuenta" : me ? "Explorar" : "Ingresar";

  useEffect(() => {
    setMenuOpen(false);
  }, [pathname]);

  return (
    <header className="site-header">
      <div className="header-inner">
        <AppLink className="brand" href="/" aria-label="Bookia, ir al inicio">
          <span className="brand-mark"><span>B</span></span>
          <span className="brand-name">Bookia</span>
        </AppLink>

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
            <span className="brand-mark"><span>B</span></span>
            <span className="brand-name">Bookia</span>
          </AppLink>
          <p>Libros, librerias y lectores mas cerca.</p>
        </div>
        <nav className="footer-links" aria-label="Navegacion secundaria">
          <AppLink href="/">Buscar</AppLink>
          <AppLink href="/plans">Planes</AppLink>
          <AppLink href="/about">Sobre Bookia</AppLink>
          <AppLink href="/privacy">Privacidad</AppLink>
          <AppLink href="/login">Ingreso de librerias</AppLink>
        </nav>
        <p className="footer-note">Una vidriera local para cada historia.</p>
      </div>
    </footer>
  );
}
