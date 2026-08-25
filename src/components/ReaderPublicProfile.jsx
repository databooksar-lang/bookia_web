import { useEffect, useRef, useState } from "react";

import { resolveApiUrl } from "../api";
import { deriveReaderMonogram, hasReaderTraits, READER_TRAIT_GROUPS, readerTraitLabel } from "../readerIdentityState";
import { getPublicWantedBooksView, normalizePublicWantedBooks } from "../readerWantedBooksState";
import { GoodreadsIcon, InstagramIcon, LinkIcon, TikTokIcon, YouTubeIcon } from "./Icons";
import { AuthorBookShareMenu } from "./AuthorBookShareMenu";

const SOCIAL_LINK_DETAILS = {
  instagram: { label: "Instagram", Icon: InstagramIcon },
  tiktok: { label: "TikTok", Icon: TikTokIcon },
  youtube: { label: "YouTube", Icon: YouTubeIcon },
  goodreads: { label: "Goodreads", Icon: GoodreadsIcon },
  website: { label: "Sitio web", Icon: LinkIcon },
};

export function ReaderSocialLinks({ links = [] }) {
  if (!links.length) return null;
  return <nav className="reader-social-links" aria-label="Enlaces sociales"><span className="reader-social-links-label">Encontrame en</span>{links.map((link) => {
    const details = SOCIAL_LINK_DETAILS[link.platform];
    if (!details || !link.url) return null;
    const { Icon, label } = details;
    return <a key={`${link.platform}:${link.url}`} href={link.url} target="_blank" rel="noopener noreferrer" aria-label={`${label} de este lector`} title={label}><Icon size={19} /><span>{label}</span></a>;
  })}</nav>;
}

export function ReaderMonogram({ displayName, className = "" }) {
  return <span className={`reader-monogram${className ? ` ${className}` : ""}`} aria-label={`Iniciales de ${displayName || "lector"}`}>{deriveReaderMonogram(displayName)}</span>;
}

export function ReaderAuthorBadge({ isAuthor }) {
  return isAuthor ? <span className="reader-author-badge">Autor/a en Bookia</span> : null;
}

export function ReaderPassport({ reader }) {
  if (!hasReaderTraits(reader?.traits)) return null;
  return (
    <section className="reader-passport reader-passport-book" aria-labelledby="reader-passport-title">
      <div className="reader-passport-heading">
        <div><p className="section-label">MI IDENTIDAD</p><h2 id="reader-passport-title">Pasaporte lector</h2></div>
      </div>
      <div className="reader-passport-groups">
        {READER_TRAIT_GROUPS.map((group) => reader.traits?.[group.key]?.length ? (
          <div key={group.key} className="reader-passport-group">
            <h3>{group.label}</h3>
            <div className="reader-trait-list">{reader.traits[group.key].map((code) => <span key={code} className="reader-trait-chip">{readerTraitLabel(group.key, code)}</span>)}</div>
          </div>
        ) : null)}
      </div>
    </section>
  );
}

export function ReaderWantedBooksPublic({ items = [] }) {
  const [expanded, setExpanded] = useState(false);
  const wantedBooks = normalizePublicWantedBooks(items);
  if (!wantedBooks.length) return null;
  const visibleItems = getPublicWantedBooksView(wantedBooks, expanded);
  return (
    <section className="reader-public-wanted" aria-labelledby="reader-wanted-title">
      <div className="section-heading results-heading"><div><p className="section-label">MI LISTA DE DESEOS</p><h2 id="reader-wanted-title">Libros que estoy buscando</h2><p>Estas son las próximas historias que me gustaría encontrar.</p></div></div>
      <div className="reader-public-wanted-list">
        {visibleItems.map((item, index) => <article key={`${item.title}\u0000${item.author || ""}`} className="reader-public-wanted-item"><span className="reader-wanted-index" aria-hidden="true">{String(index + 1).padStart(2, "0")}</span><div><h3>{item.title}</h3>{item.author ? <p>{item.author}</p> : null}{item.details ? <p className="reader-wanted-details">{item.details}</p> : null}</div></article>)}
      </div>
      {wantedBooks.length > 3 ? <button type="button" className="secondary-button reader-wanted-expand" aria-expanded={expanded} onClick={() => setExpanded((current) => !current)}>{expanded ? "Mostrar menos" : "Ver lista completa"}</button> : null}
    </section>
  );
}

export function ReaderAuthorBooks({ reader, books = [], onOpenDetails }) {
  if (!books.length) return null;
  return <section className="reader-public-author-books" aria-labelledby="reader-author-books-title">
    <div className="section-heading results-heading"><div><p className="section-label">OBRAS PROPIAS</p><h2 id="reader-author-books-title">Libros de {reader.display_name}</h2></div></div>
    <div className="reader-public-author-books-grid">{books.map((book) => <article key={book.cover_url} className="reader-public-author-book-card">
      <img src={resolveApiUrl(book.cover_url)} alt={`Portada de ${book.title}`} />
      <div><p className="reader-public-author-book-genre">{book.genre?.name || "Sin género"}</p><h3>{book.title}</h3>{book.publisher || book.publication_year ? <p className="reader-public-author-book-meta">{[book.publisher, book.publication_year].filter(Boolean).join(" · ")}</p> : null}<p className="reader-public-author-book-synopsis">{book.synopsis}</p><div className="reader-public-author-book-actions"><button type="button" className="secondary-button" aria-label={`Ver detalles de ${book.title}`} onClick={() => onOpenDetails?.(book)}>Ver detalles</button><AuthorBookShareMenu book={book} reader={reader} /></div></div>
    </article>)}</div>
  </section>;
}

export function ReaderAuthorBookDetailModal({ reader, book, onClose }) {
  const modalCardRef = useRef(null);
  const closeButtonRef = useRef(null);
  useEffect(() => {
    if (!book) return undefined;
    const previousFocus = document.activeElement;
    const frame = globalThis.requestAnimationFrame?.(() => closeButtonRef.current?.focus());
    const onKeyDown = (event) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKeyDown);
    return () => { window.removeEventListener("keydown", onKeyDown); if (frame !== undefined) globalThis.cancelAnimationFrame?.(frame); previousFocus?.focus?.(); };
  }, [book]);
  if (!book) return null;
  function trapDialogFocus(event) {
    if (event.key !== "Tab") return;
    const focusable = [...(modalCardRef.current?.querySelectorAll('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])') || [])];
    if (!focusable.length) return;
    const first = focusable[0]; const last = focusable.at(-1);
    if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
  }
  return <div className="book-detail-modal reader-author-book-detail-modal" role="dialog" aria-modal="true" aria-labelledby="author-book-detail-title" onClick={onClose}>
    <div ref={modalCardRef} className="book-detail-modal-card" onClick={(event) => event.stopPropagation()} onKeyDown={trapDialogFocus}>
      <button ref={closeButtonRef} type="button" className="book-detail-modal-close" onClick={onClose}>Cerrar</button>
      <div className="book-detail-modal-layout"><img className="book-detail-cover" src={resolveApiUrl(book.cover_url)} alt={`Portada de ${book.title}`} /><div className="book-detail-copy">
        <p className="reader-public-author-book-genre">{book.genre?.name || "Sin género"}</p><h2 id="author-book-detail-title">{book.title}</h2><p className="book-detail-author">{reader.display_name}</p>
        <div className="book-detail-section"><span>Sinopsis</span><p>{book.synopsis}</p></div>
        <dl className="book-detail-meta"><div><dt>Editorial</dt><dd>{book.publisher || "Editorial no visible"}</dd></div><div><dt>Año</dt><dd>{book.publication_year || "Año no visible"}</dd></div></dl>
        <div className="reader-author-book-detail-actions"><AuthorBookShareMenu book={book} reader={reader} /></div>
      </div></div>
    </div>
  </div>;
}
