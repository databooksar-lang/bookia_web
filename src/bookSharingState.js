function normalizedPath(basePath) {
  if (!basePath || basePath === "/") return "";
  return `/${String(basePath).replace(/^\/+|\/+$/g, "")}`;
}

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const STORY_TITLE_LIMIT = 56;
const STORY_COVER_MAX_BYTES = 10 * 1024 * 1024;
const STORY_COVER_MAX_EDGE = 6000;
const STORY_COVER_MAX_PIXELS = 24 * 1024 * 1024;
const STORY_LOGO_URL = "/images/logo-cuadrado.png";

const STORY_AVAILABILITY_LABELS = {
  available: "Disponible",
  reserved: "Reservado",
  sold: "Vendido",
  hidden: "No disponible",
};

const STORY_BOOK_STATUS_LABELS = {
  nuevo: "Nuevo",
  usado: "Usado",
};

function cleanStoryText(value, fallback) {
  return String(value || "").trim() || fallback;
}

function truncateStoryText(value, limit = STORY_TITLE_LIMIT) {
  const text = String(value || "").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trimEnd()}…`;
}

function drawStoryText(context, text, x, y, maxWidth, lineHeight, maxLines) {
  const words = String(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";

  for (const word of words) {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth || !line) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);

  lines.slice(0, maxLines).forEach((currentLine, index) => context.fillText(currentLine, x, y + (index * lineHeight)));
}

function drawStoryCoverPlaceholder(context, x, y, width, height) {
  context.fillStyle = "#d7d2c8";
  context.fillRect(x, y, width, height);
  context.strokeStyle = "#0b2d24";
  context.lineWidth = 5;
  context.strokeRect(x + 16, y + 16, width - 32, height - 32);
  context.fillStyle = "#0b2d24";
  context.font = "700 46px Georgia, serif";
  context.textAlign = "center";
  context.fillText("BOOKIA", x + (width / 2), y + (height / 2) - 18);
  context.font = "500 25px system-ui, sans-serif";
  context.fillText("LIBRO SIN TAPA", x + (width / 2), y + (height / 2) + 34);
}

async function readStoryCoverBlob(response, contentType) {
  const declaredLength = Number(response.headers?.get?.("content-length") || 0);
  if (Number.isFinite(declaredLength) && declaredLength > STORY_COVER_MAX_BYTES) {
    throw new Error("La tapa es demasiado grande para una Story.");
  }
  if (!response.body?.getReader) {
    const blob = await response.blob();
    if (blob.size > STORY_COVER_MAX_BYTES) throw new Error("La tapa es demasiado grande para una Story.");
    return blob;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let bytesRead = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      bytesRead += value.byteLength;
      if (bytesRead > STORY_COVER_MAX_BYTES) throw new Error("La tapa es demasiado grande para una Story.");
      chunks.push(value);
    }
  } finally {
    reader.releaseLock?.();
  }
  return new Blob(chunks, { type: contentType });
}

function readPngDimensions(view) {
  if (view.byteLength < 24 || view.getUint32(0) !== 0x89504e47 || view.getUint32(12) !== 0x49484452) return null;
  return { width: view.getUint32(16), height: view.getUint32(20) };
}

function readWebpDimensions(view) {
  if (view.byteLength < 30 || view.getUint32(0) !== 0x52494646 || view.getUint32(8) !== 0x57454250) return null;
  const variant = view.getUint32(12);
  if (variant === 0x56503858 && view.byteLength >= 30) {
    return { width: 1 + view.getUint8(24) + (view.getUint8(25) << 8) + (view.getUint8(26) << 16), height: 1 + view.getUint8(27) + (view.getUint8(28) << 8) + (view.getUint8(29) << 16) };
  }
  if (variant === 0x5650384c && view.byteLength >= 25 && view.getUint8(20) === 0x2f) {
    const bits = view.getUint32(21, true);
    return { width: 1 + (bits & 0x3fff), height: 1 + ((bits >> 14) & 0x3fff) };
  }
  for (let index = 20; index + 6 < view.byteLength; index += 1) {
    if (view.getUint8(index) === 0x9d && view.getUint8(index + 1) === 0x01 && view.getUint8(index + 2) === 0x2a) {
      return { width: view.getUint16(index + 3, true) & 0x3fff, height: view.getUint16(index + 5, true) & 0x3fff };
    }
  }
  return null;
}

function readJpegDimensions(view) {
  if (view.byteLength < 4 || view.getUint16(0) !== 0xffd8) return null;
  const startOfFrame = new Set([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf]);
  let index = 2;
  while (index + 8 < view.byteLength) {
    if (view.getUint8(index) !== 0xff) { index += 1; continue; }
    while (index < view.byteLength && view.getUint8(index) === 0xff) index += 1;
    const marker = view.getUint8(index);
    index += 1;
    if (marker === 0xd8 || marker === 0xd9) continue;
    const segmentLength = view.getUint16(index);
    if (segmentLength < 2 || index + segmentLength > view.byteLength) return null;
    if (startOfFrame.has(marker)) return { width: view.getUint16(index + 5), height: view.getUint16(index + 3) };
    index += segmentLength;
  }
  return null;
}

async function readStoryCoverDimensions(blob, contentType) {
  const view = new DataView(await blob.arrayBuffer());
  const dimensions = contentType === "image/png" ? readPngDimensions(view) : contentType === "image/webp" ? readWebpDimensions(view) : readJpegDimensions(view);
  if (!dimensions?.width || !dimensions?.height) throw new Error("La tapa no tiene un formato de imagen compatible.");
  return dimensions;
}

function assertSafeStoryCoverDimensions({ width, height }) {
  if (width > STORY_COVER_MAX_EDGE || height > STORY_COVER_MAX_EDGE || (width * height) > STORY_COVER_MAX_PIXELS) {
    throw new Error("La tapa es demasiado grande para una Story.");
  }
}

export async function loadInstagramStoryCover({ coverUrl, fetchLike = globalThis.fetch, imageFactory = () => globalThis.document?.createElement("img") }) {
  if (!coverUrl || typeof fetchLike !== "function") return null;
  const response = await fetchLike(coverUrl, { credentials: "include" });
  if (!response.ok) throw new Error("No pudimos cargar la tapa del libro.");
  const contentType = String(response.headers?.get?.("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(contentType)) throw new Error("La tapa no tiene un formato de imagen compatible.");
  const blob = await readStoryCoverBlob(response, contentType);
  assertSafeStoryCoverDimensions(await readStoryCoverDimensions(blob, contentType));
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = imageFactory();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error("No pudimos leer la tapa del libro."));
      image.src = objectUrl;
    });
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function loadInstagramStoryLogo({ imageFactory = () => globalThis.document?.createElement("img") } = {}) {
  try {
    const image = imageFactory();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = reject;
      image.src = STORY_LOGO_URL;
    });
    return image;
  } catch {
    return null;
  }
}

function drawStoryCover(context, image, x, y, width, height) {
  context.save();
  context.shadowColor = "rgba(11, 45, 36, 0.28)";
  context.shadowBlur = 32;
  context.shadowOffsetY = 18;
  if (!image) {
    drawStoryCoverPlaceholder(context, x, y, width, height);
    context.restore();
    return;
  }

  const scale = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
  context.restore();
}

function canvasToPng(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No pudimos crear la imagen de la Story."));
    }, "image/png");
  });
}

export function buildInstagramStoryMetadata({ item, bookstore }) {
  const title = truncateStoryText(cleanStoryText(item?.title, "Libro"));
  const bookstoreName = truncateStoryText(cleanStoryText(bookstore?.name, "Bookia"), 32);
  const genres = Array.isArray(item?.genres) ? item.genres.map((genre) => String(genre?.name || "").trim()).filter(Boolean) : [];

  return {
    title,
    author: truncateStoryText(cleanStoryText(item?.author, "Autor no visible"), 48),
    availability: STORY_AVAILABILITY_LABELS[item?.availability_status] || "Disponible",
    genre: truncateStoryText(genres.join(", ") || "Sin género", 44),
    publisher: truncateStoryText(cleanStoryText(item?.publisher, "Editorial no visible"), 44),
    language: truncateStoryText(cleanStoryText(item?.language, "Idioma no visible"), 32),
    bookStatus: STORY_BOOK_STATUS_LABELS[item?.book_status] || "Usado",
    bookstoreName,
    callToAction: `ENCONTRALO EN ${bookstoreName.toLocaleUpperCase("es-AR")}`,
  };
}

export function buildInstagramStoryCoverPath(item, { trustedOrigins = [] } = {}) {
  const itemId = item?.id;
  const coverPath = String(item?.cover_image_url || "").trim();
  if (!Number.isSafeInteger(itemId) || itemId <= 0) return null;
  if (!coverPath || coverPath.startsWith("//")) return null;

  let pathname = coverPath;
  if (/^https?:\/\//i.test(coverPath)) {
    try {
      const parsedUrl = new URL(coverPath);
      if (!trustedOrigins.includes(parsedUrl.origin)) return null;
      pathname = parsedUrl.pathname;
    } catch {
      return null;
    }
  } else if (!coverPath.startsWith("/")) {
    return null;
  } else {
    pathname = coverPath.split(/[?#]/, 1)[0];
  }

  const allowedPath = new RegExp(`^/(?:api/)?dashboard/catalog/${itemId}(?:/cover|/images/\\d+)$`);
  return allowedPath.test(pathname) ? coverPath : null;
}

export async function createInstagramStoryFile({ item, bookstore, coverUrl, fetchLike = globalThis.fetch, documentLike = globalThis.document, FileCtor = globalThis.File }) {
  if (!documentLike?.createElement || typeof FileCtor !== "function") throw new Error("Este navegador no puede crear una imagen para Story.");
  const canvas = documentLike.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Este navegador no puede crear una imagen para Story.");

  const metadata = buildInstagramStoryMetadata({ item, bookstore });
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  context.fillStyle = "#f7f1e6";
  context.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
  context.fillStyle = "#0b2d24";
  context.font = "700 68px Georgia, serif";
  context.textAlign = "left";
  context.fillText("bookia", 88, 130);
  context.font = "700 24px system-ui, sans-serif";
  context.fillText("LIBRO RECOMENDADO", 88, 180);

  const coverPromise = loadInstagramStoryCover({ coverUrl, fetchLike, imageFactory: () => documentLike.createElement("img") }).catch(() => null);
  const logoPromise = loadInstagramStoryLogo({ imageFactory: () => documentLike.createElement("img") });
  const [cover, logo] = await Promise.all([coverPromise, logoPromise]);
  if (logo) context.drawImage(logo, 860, 44, 112, 112);
  drawStoryCover(context, cover, 180, 250, 720, 820);

  context.fillStyle = "#e4e6db";
  context.fillRect(88, 1134, 258, 58);
  context.fillStyle = "#0b2d24";
  context.font = "800 23px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(metadata.availability.toLocaleUpperCase("es-AR"), 217, 1172);

  context.textAlign = "left";
  context.font = "700 82px Georgia, serif";
  drawStoryText(context, metadata.title, 88, 1318, 904, 90, 2);
  context.fillStyle = "#536259";
  context.font = "400 38px system-ui, sans-serif";
  drawStoryText(context, metadata.author, 88, 1502, 904, 48, 2);

  context.strokeStyle = "#c9c6b9";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(88, 1610);
  context.lineTo(992, 1610);
  context.stroke();
  const fields = [["GÉNERO", metadata.genre], ["EDITORIAL", metadata.publisher], ["IDIOMA", metadata.language], ["ESTADO", metadata.bookStatus]];
  fields.forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 88 + (column * 450);
    const y = 1664 + (row * 90);
    context.fillStyle = "#68736b";
    context.font = "700 18px system-ui, sans-serif";
    context.fillText(label, x, y);
    context.fillStyle = "#0b2d24";
    context.font = "700 25px system-ui, sans-serif";
    drawStoryText(context, value, x, y + 32, 380, 28, 1);
  });
  context.strokeStyle = "#0b2d24";
  context.lineWidth = 3;
  context.strokeRect(88, 1832, 904, 62);
  context.fillStyle = "#0b2d24";
  context.font = "800 22px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(metadata.callToAction, 540, 1872);

  const png = await canvasToPng(canvas);
  const filename = `bookia-story-${metadata.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "libro"}.png`;
  return new FileCtor([png], filename, { type: "image/png" });
}

export function downloadInstagramStoryFile(file, documentLike = globalThis.document) {
  if (!documentLike?.createElement) throw new Error("No pudimos descargar la imagen de la Story.");
  const url = URL.createObjectURL(file);
  const link = documentLike.createElement("a");
  link.href = url;
  link.download = file.name || "bookia-story.png";
  link.click();
  URL.revokeObjectURL(url);
}

export async function shareInstagramStoryFile({ file, title, navigatorLike = globalThis.navigator, download = downloadInstagramStoryFile }) {
  const payload = { files: [file], title };
  if (typeof navigatorLike?.canShare === "function" && navigatorLike.canShare({ files: payload.files }) && typeof navigatorLike.share === "function") {
    try {
      await navigatorLike.share(payload);
      return "shared";
    } catch (error) {
      if (error?.name === "AbortError") return "cancelled";
      throw error;
    }
  }
  download(file);
  return "downloaded";
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

export function buildTelegramShareHref({ text, url }) {
  return `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`;
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
