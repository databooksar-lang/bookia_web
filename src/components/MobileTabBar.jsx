import { AppLink } from "../navigation";
import { isNativeAndroidRuntime } from "../mobile/sessionVault";

const TABS = [
  { label: "Inicio", href: "/", icon: "⌂" },
  { label: "Buscar", href: "/?focus=search", icon: "⌕" },
  { label: "Favoritos", href: "/profile?section=favorites", icon: "♡" },
];

export function MobileTabBar({ me, pathname, nativeAndroid = isNativeAndroidRuntime() }) {
  if (!nativeAndroid) return null;
  const accountTab = me?.bookstore
    ? { label: "Panel", href: "/dashboard", icon: "▦" }
    : { label: "Perfil", href: me ? "/profile" : "/login", icon: "○" };
  return <nav className="mobile-tab-bar" aria-label="Navegación de la app">{[...TABS, accountTab].map((tab) => {
    const active = tab.href === "/" ? pathname === "/" : pathname === tab.href.split("?", 1)[0];
    return <AppLink key={tab.label} href={tab.href} className={`mobile-tab${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}><span aria-hidden="true">{tab.icon}</span><span>{tab.label}</span></AppLink>;
  })}</nav>;
}
