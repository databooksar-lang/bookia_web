import { useState } from "react";

import { resolveApiUrl } from "../api";
import { BookIcon } from "./Icons";

export function BookCover({ item, className = "book-cover", interactive = false, onOpen, loading }) {
  const [broken, setBroken] = useState(false);
  const coverUrl = item.cover_image_url ? resolveApiUrl(item.cover_image_url) : null;
  const image = coverUrl && !broken ? (
    <img className={className} src={coverUrl} alt={`Tapa de ${item.title}`} loading={loading} decoding="async" onError={() => setBroken(true)} />
  ) : (
    <span className={`${className} book-cover-placeholder`} aria-label={`Sin tapa disponible para ${item.title}`}>
      <BookIcon size={24} />
      <small>Sin tapa</small>
    </span>
  );

  if (!interactive || !coverUrl || broken) {
    return image;
  }

  return (
    <button type="button" className="book-cover-button" aria-label={`Ampliar tapa de ${item.title}`} onClick={() => onOpen({ title: item.title, url: coverUrl })}>
      {image}
    </button>
  );
}
