import { AppLink } from "../navigation";
import { isNativeAndroidRuntime } from "../mobile/sessionVault";

const PROFILE_ICON = (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false" style={{ display: "block" }}>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20v-1.5a7 7 0 0 1 14 0V20" />
  </svg>
);

const TABS = [
  { label: "Inicio", href: "/", icon: "⌂" },
  { label: "Buscar", href: "/?focus=search", icon: "⌕" },
  { label: "Favoritos", href: "/profile?section=favorites", icon: "♡" },
];

export function isMobileTabActive(href, pathname, search = "") {
  const [tabPath, tabSearch = ""] = href.split("?");
  if (pathname !== tabPath) return false;

  const params = new URLSearchParams(search);
  const tabParams = new URLSearchParams(tabSearch);
  if (tabPath === "/dashboard") return (params.get("section") || "profile") === tabParams.get("section");
  if (tabPath === "/") return (params.get("focus") === "search") === (tabParams.get("focus") === "search");
  if (tabPath === "/profile") return (params.get("section") === "favorites") === (tabParams.get("section") === "favorites");
  return true;
}

export function MobileTabBar({ me, pathname, search = "", nativeAndroid = isNativeAndroidRuntime() }) {
  if (!nativeAndroid) return null;
  const tabs = me?.bookstore ? [
    { label: "Inicio", href: "/", icon: "⌂" },
    { label: "Alta de libro", href: "/dashboard?section=new-book", icon: "+" },
    { label: "Perfil", href: "/dashboard?section=profile", icon: PROFILE_ICON },
    { label: "Vidriera digital", href: `/bookstores/${encodeURIComponent(me.bookstore.slug)}`, icon: "▦" },
  ] : [...TABS, { label: "Perfil", href: me ? "/profile" : "/login", icon: PROFILE_ICON }];
  return <nav className="mobile-tab-bar" aria-label="Navegación de la app">{tabs.map((tab) => {
    const active = isMobileTabActive(tab.href, pathname, search);
    return <AppLink key={tab.label} href={tab.href} className={`mobile-tab${active ? " is-active" : ""}`} aria-current={active ? "page" : undefined}><span aria-hidden="true">{tab.icon}</span><span>{tab.label}</span></AppLink>;
  })}</nav>;
}
