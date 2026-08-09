function normalizedPath(basePath) {
  if (!basePath || basePath === "/") return "";
  return `/${String(basePath).replace(/^\/+|\/+$/g, "")}`;
}

export function buildBookShareUrl({ origin, basePath = "/", bookstoreSlug, itemId }) {
  const path = `${normalizedPath(basePath)}/bookstores/${encodeURIComponent(bookstoreSlug)}`;
  const url = new URL(path, origin);
  url.searchParams.set("book", String(itemId));
  return url.toString();
}

export function buildBookShareMessage({ title, author, bookstoreName }) {
  const book = `\"${String(title || "Libro").trim()}\"`;
  const authorLine = String(author || "").trim() ? ` de ${String(author).trim()}` : "";
  const bookstore = String(bookstoreName || "una libreria de Bookia").trim();
  return `Mira ${book}${authorLine} en ${bookstore} en Bookia.`;
}

export function buildWhatsAppShareHref({ text, url }) {
  return `https://wa.me/?text=${encodeURIComponent(`${text}\n${url}`)}`;
}

export function getSharedBookId(search) {
  const value = new URLSearchParams(search).get("book");
  if (!value || !/^\d+$/.test(value)) return null;
  const itemId = Number(value);
  return Number.isSafeInteger(itemId) && itemId > 0 ? itemId : null;
}

export async function copyBookShareUrl(url, clipboard = globalThis.navigator?.clipboard) {
  if (!clipboard?.writeText) throw new Error("No se puede copiar el enlace en este navegador.");
  await clipboard.writeText(url);
}

export async function shareBookToInstagram({ title, text, url, navigatorLike = globalThis.navigator, copy = copyBookShareUrl }) {
  if (typeof navigatorLike?.share === "function") {
    await navigatorLike.share({ title, text, url });
    return "shared";
  }
  await copy(url);
  return "copied";
}
