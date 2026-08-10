import { useEffect, useState } from "react";

import { BookIcon, SearchIcon, SparkleIcon, StoreIcon } from "./Icons";
import { HOME_SECTION_INDEX_ITEMS } from "../sectionIndexState";

const SECTION_ICONS = { buscar: SearchIcon, librerias: StoreIcon, clubes: BookIcon, novedades: SparkleIcon };

export function SectionIndex() {
  const [activeId, setActiveId] = useState("buscar");
  const [isFooterVisible, setIsFooterVisible] = useState(false);

  useEffect(() => {
    const sections = HOME_SECTION_INDEX_ITEMS
      .map((item) => document.getElementById(item.id))
      .filter(Boolean);
    const footer = document.querySelector(".site-footer");
    const sectionObserver = new IntersectionObserver((entries) => {
      const activeEntry = entries.find((entry) => entry.isIntersecting);
      if (activeEntry) setActiveId(activeEntry.target.id);
    }, { rootMargin: "-32% 0px -56%", threshold: 0 });
    const footerObserver = footer
      ? new IntersectionObserver(([entry]) => setIsFooterVisible(entry.isIntersecting), { threshold: 0 })
      : null;

    sections.forEach((section) => sectionObserver.observe(section));
    if (footer) footerObserver.observe(footer);
    return () => {
      sectionObserver.disconnect();
      footerObserver?.disconnect();
    };
  }, []);

  return (
    <nav className={`section-index${isFooterVisible ? " is-hidden" : ""}`} aria-label="Secciones de Buscar">
      {HOME_SECTION_INDEX_ITEMS.map(({ id, label }) => {
        const Icon = SECTION_ICONS[id];
        return (
        <a key={id} href={`#${id}`} className={activeId === id ? "is-active" : undefined} aria-current={activeId === id ? "true" : undefined}>
          <Icon size={18} />
          <span>{label}</span>
        </a>
        );
      })}
    </nav>
  );
}
