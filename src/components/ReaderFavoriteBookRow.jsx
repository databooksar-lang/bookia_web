import { BookCover } from "./BookCover";

export function ReaderFavoriteBookRow({ item, onRemove }) {
  return (
    <article className="search-result-row">
      <div className="search-result-book-button">
        <BookCover item={item} className="search-result-cover" />
        <div className="search-result-main">
          <strong>{item.title}</strong>
          <span>{item.author || "Autor no visible"}</span>
          <span>{item.bookstore?.name}</span>
          {item.favorite_unavailable ? <span>Ya no está disponible</span> : null}
        </div>
      </div>
      <button className="secondary-button" type="button" onClick={() => onRemove(item.id)}>Quitar de favoritos</button>
    </article>
  );
}
