import { useState } from "react";

import { resolveApiUrl } from "../api";
import { deriveReaderMonogram, hasReaderTraits, READER_TRAIT_GROUPS, readerTraitLabel } from "../readerIdentityState";
import { getPublicWantedBooksView, normalizePublicWantedBooks } from "../readerWantedBooksState";

export function ReaderMonogram({ displayName, className = "" }) {
  return <span className={`reader-monogram${className ? ` ${className}` : ""}`} aria-label={`Iniciales de ${displayName || "lector"}`}>{deriveReaderMonogram(displayName)}</span>;
}

export function ReaderAuthorBadge({ isAuthor }) {
  return isAuthor ? <span className="reader-author-badge">Autor/a en Bookia</span> : null;
}

export function ReaderPassport({ reader }) {
  if (!hasReaderTraits(reader?.traits)) return null;
  return (
    <section className="reader-passport" aria-labelledby="reader-passport-title">
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

export function ReaderAuthorBooks({ reader, books = [] }) {
  if (!books.length) return null;
  return <section className="reader-public-author-books" aria-labelledby="reader-author-books-title">
    <div className="section-heading results-heading"><div><p className="section-label">OBRAS PROPIAS</p><h2 id="reader-author-books-title">Libros de {reader.display_name}</h2></div></div>
    <div className="reader-public-author-books-grid">{books.map((book) => <article key={book.cover_url} className="reader-public-author-book-card">
      <img src={resolveApiUrl(book.cover_url)} alt={`Portada de ${book.title}`} />
      <div><p className="reader-public-author-book-genre">{book.genre?.name || "Sin género"}</p><h3>{book.title}</h3>{book.publisher || book.publication_year ? <p className="reader-public-author-book-meta">{[book.publisher, book.publication_year].filter(Boolean).join(" · ")}</p> : null}<p>{book.synopsis}</p></div>
    </article>)}</div>
  </section>;
}
