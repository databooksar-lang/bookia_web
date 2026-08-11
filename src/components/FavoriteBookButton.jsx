import { HeartIcon } from "./Icons";

export function FavoriteBookButton({ itemId, bookstoreId, isFavorite, isPending, isSessionLoading, onToggle }) {
  const label = isFavorite ? "Quitar de favoritos" : "Guardar en favoritos";

  return (
    <button
      className={`favorite-book-button${isFavorite ? " is-favorite" : ""}`}
      type="button"
      aria-label={isFavorite ? "Quitar de favoritos" : "Guardar en favoritos"}
      aria-pressed={isFavorite}
      aria-busy={isPending}
      disabled={isPending || isSessionLoading}
      onClick={(event) => onToggle(itemId, event, bookstoreId)}
    >
      <HeartIcon size={18} filled={isFavorite} />
      <span className="favorite-book-label">Favoritos</span>
    </button>
  );
}
