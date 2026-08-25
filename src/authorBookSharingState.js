import { copyBookShareUrl, loadInstagramStoryCover, loadInstagramStoryLogo, shareInstagramStoryFile } from "./bookSharingState.js";

function normalizedPath(basePath) {
  if (!basePath || basePath === "/") return "";
  return `/${String(basePath).replace(/^\/+|\/+$/g, "")}`;
}

function clean(value, fallback) {
  return String(value || "").trim() || fallback;
}

function truncate(value, limit) {
  const text = String(value || "").trim();
  return text.length <= limit ? text : `${text.slice(0, limit - 1).trimEnd()}…`;
}

export function buildAuthorBookShareUrl({ origin, basePath = "/", readerSlug, bookId }) {
  const url = new URL(`${normalizedPath(basePath)}/readers/${encodeURIComponent(readerSlug || "")}`, origin);
  url.searchParams.set("book", String(bookId));
  return url.toString();
}

export function getSharedAuthorBookId(search) {
  const value = new URLSearchParams(search).get("book");
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function buildAuthorBookShareMessage({ book, authorName }) {
  const parts = [`Conocé "${clean(book?.title, "esta obra")}" de ${clean(authorName, "un autor/a de Bookia")} en Bookia.`];
  if (book?.genre?.name) parts.push(`Género: ${book.genre.name}.`);
  if (book?.publisher) parts.push(`Editorial: ${book.publisher}.`);
  if (book?.publication_year) parts.push(`Año: ${book.publication_year}.`);
  return parts.join(" ");
}

export function buildAuthorBookInstagramStoryMetadata({ book, authorName }) {
  return {
    title: truncate(clean(book?.title, "Obra"), 72),
    authorName: truncate(clean(authorName, "Autor/a en Bookia"), 48),
    genre: truncate(clean(book?.genre?.name, "Sin género"), 40),
    publisher: truncate(clean(book?.publisher, "Editorial no visible"), 44),
    year: book?.publication_year ? String(book.publication_year) : "Año no visible",
    synopsis: truncate(clean(book?.synopsis, "Una obra para descubrir."), 160),
  };
}

export function buildAuthorBookInstagramStoryCoverUrl(book, { resolveUrl = (path) => path } = {}) {
  const id = book?.id;
  const cover = String(book?.cover_url || "").trim();
  if (!Number.isSafeInteger(id) || id <= 0 || !cover || cover.startsWith("//")) return null;
  const pathname = cover.split(/[?#]/, 1)[0].replace(/^\/api/, "");
  if (!new RegExp(`^/readers/[^/]+/author-books/${id}/cover$`).test(pathname)) return null;
  return resolveUrl(cover);
}

function drawCover(context, image, x, y, width, height) {
  context.fillStyle = "#0b2d24";
  context.fillRect(x, y, width, height);
  if (!image?.width || !image?.height) return;
  const scale = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  context.drawImage(image, (image.width - sourceWidth) / 2, (image.height - sourceHeight) / 2, sourceWidth, sourceHeight, x, y, width, height);
}

function drawLines(context, value, x, y, width, lineHeight, lines) {
  const words = String(value).split(/\s+/).filter(Boolean);
  const rendered = [];
  let line = "";
  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= width) line = candidate;
    else { if (line) rendered.push(line); line = word; }
  }
  if (line) rendered.push(line);
  rendered.slice(0, lines).forEach((entry, index) => context.fillText(entry, x, y + (index * lineHeight)));
}

export async function createAuthorBookInstagramStoryFile({ book, authorName, coverUrl, fetchLike = globalThis.fetch, documentLike = globalThis.document, FileCtor = globalThis.File }) {
  if (!documentLike?.createElement || typeof FileCtor !== "function") throw new Error("No pudimos crear la imagen para la Story.");
  const canvas = documentLike.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No pudimos crear la imagen para la Story.");
  const metadata = buildAuthorBookInstagramStoryMetadata({ book, authorName });
  canvas.width = 1080; canvas.height = 1920;
  context.fillStyle = "#f7f1e6"; context.fillRect(0, 0, 1080, 1920);
  context.fillStyle = "#e85d3f"; context.fillRect(48, 0, 10, 1920);
  context.fillStyle = "#0b2d24"; context.font = "700 64px Georgia, serif"; context.fillText("bookia", 140, 235);
  context.font = "800 21px system-ui, sans-serif"; context.fillText("OBRA DE AUTOR/A", 140, 280);
  const [cover, logo] = await Promise.all([
    coverUrl ? loadInstagramStoryCover({ coverUrl, fetchLike, imageFactory: () => documentLike.createElement("img") }).catch(() => null) : Promise.resolve(null),
    loadInstagramStoryLogo({ imageFactory: () => documentLike.createElement("img") }),
  ]);
  if (logo) context.drawImage(logo, 830, 150, 108, 108);
  drawCover(context, cover, 140, 350, 350, 525);
  context.fillStyle = "#0b2d24"; context.font = "700 58px Georgia, serif"; drawLines(context, metadata.title, 540, 430, 390, 68, 3);
  context.fillStyle = "#536259"; context.font = "600 28px system-ui, sans-serif"; drawLines(context, metadata.authorName, 540, 665, 390, 38, 2);
  context.fillStyle = "#e4e6db"; context.fillRect(140, 940, 800, 58);
  context.fillStyle = "#0b2d24"; context.font = "800 20px system-ui, sans-serif"; context.fillText(`${metadata.genre.toLocaleUpperCase("es-AR")} · ${metadata.year}`, 170, 978);
  context.font = "700 29px Georgia, serif"; drawLines(context, metadata.synopsis, 140, 1080, 800, 42, 4);
  context.fillStyle = "#536259"; context.font = "700 22px system-ui, sans-serif"; context.fillText(metadata.publisher, 140, 1320);
  context.fillStyle = "#e85d3f"; context.fillRect(140, 1480, 800, 140);
  context.fillStyle = "#fffaf0"; context.font = "800 25px system-ui, sans-serif"; context.fillText("DESCUBRÍ ESTA OBRA EN BOOKIA", 220, 1545);
  const png = await new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("No pudimos crear la imagen para la Story.")), "image/png"));
  const filename = metadata.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "obra";
  return new FileCtor([png], `bookia-obra-${filename}.png`, { type: "image/png" });
}

export async function shareAuthorBookInstagramStory({ url, title, createFile, copyUrl = copyBookShareUrl, shareFile = shareInstagramStoryFile }) {
  let linkCopied = true;
  try { await copyUrl(url); } catch { linkCopied = false; }
  return { result: await shareFile({ file: await createFile(), title }), linkCopied };
}

export { copyBookShareUrl };
