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
    if (context.measureText(word).width > maxWidth) {
      if (line) {
        lines.push(line);
        line = "";
      }
      let chunk = "";
      for (const character of Array.from(word)) {
        const candidate = `${chunk}${character}`;
        if (chunk && context.measureText(candidate).width > maxWidth) {
          lines.push(chunk);
          chunk = character;
        } else {
          chunk = candidate;
        }
      }
      line = chunk;
      continue;
    }
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);

  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines && visibleLines.length) {
    let lastLine = visibleLines.at(-1).replace(/…$/, "").trimEnd();
    while (lastLine && context.measureText(`${lastLine}…`).width > maxWidth) lastLine = lastLine.slice(0, -1).trimEnd();
    visibleLines[visibleLines.length - 1] = `${lastLine}…`;
  }
  visibleLines.forEach((currentLine, index) => context.fillText(currentLine, x, y + (index * lineHeight)));
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

function storyCoverRequestCredentials(coverUrl) {
  try {
    const pathname = new URL(coverUrl, "https://bookia.invalid").pathname;
    return /^\/(?:api\/)?catalog\/\d+\/cover$/.test(pathname) ? "omit" : "include";
  } catch {
    return "include";
  }
}

export async function loadInstagramStoryCover({ coverUrl, fetchLike = globalThis.fetch, imageFactory = () => globalThis.document?.createElement("img") }) {
  return loadInstagramStoryImage({
    imageUrl: coverUrl,
    credentials: storyCoverRequestCredentials(coverUrl),
    fetchLike,
    imageFactory,
    loadError: "No pudimos cargar la tapa del libro.",
    decodeError: "No pudimos leer la tapa del libro.",
  });
}

async function loadInstagramStoryImage({ imageUrl, credentials, fetchLike, imageFactory, loadError, decodeError }) {
  if (!imageUrl || typeof fetchLike !== "function") return null;
  const response = await fetchLike(imageUrl, { credentials });
  if (!response.ok) throw new Error(loadError);
  const contentType = String(response.headers?.get?.("content-type") || "").split(";", 1)[0].trim().toLowerCase();
  if (!new Set(["image/jpeg", "image/png", "image/webp"]).has(contentType)) throw new Error("La tapa no tiene un formato de imagen compatible.");
  const blob = await readStoryCoverBlob(response, contentType);
  assertSafeStoryCoverDimensions(await readStoryCoverDimensions(blob, contentType));
  const objectUrl = URL.createObjectURL(blob);
  try {
    const image = imageFactory();
    await new Promise((resolve, reject) => {
      image.onload = resolve;
      image.onerror = () => reject(new Error(decodeError));
      image.src = objectUrl;
    });
    return image;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export async function loadInstagramStoryBookstoreLogo({ logoUrl, fetchLike = globalThis.fetch, imageFactory = () => globalThis.document?.createElement("img") } = {}) {
  try {
    return await loadInstagramStoryImage({
      imageUrl: logoUrl,
      credentials: "omit",
      fetchLike,
      imageFactory,
      loadError: "No pudimos cargar el logo de la librería.",
      decodeError: "No pudimos leer el logo de la librería.",
    });
  } catch {
    return null;
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

function drawStoryImageCover(context, image, x, y, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function buildStoryBookstoreMonogram(bookstoreName) {
  const words = String(bookstoreName || "")
    .trim()
    .split(/\s+/)
    .map((word) => Array.from(word.replace(/[^\p{L}\p{N}]/gu, "")).join(""))
    .filter(Boolean);
  if (!words.length) return "BK";
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join("").toLocaleUpperCase("es-AR");
  return `${Array.from(words[0])[0]}${Array.from(words[1])[0]}`.toLocaleUpperCase("es-AR");
}

function drawStoryBookstoreIdentity(context, logo, bookstoreName) {
  const centerX = 200;
  const centerY = 390;
  const radius = 58;
  context.save();
  context.beginPath();
  context.arc(centerX, centerY, radius, 0, Math.PI * 2);
  context.closePath();
  context.fillStyle = "#f7f1e6";
  context.fill();
  context.clip();
  if (logo) {
    drawStoryImageCover(context, logo, centerX - radius, centerY - radius, radius * 2, radius * 2);
  }
  context.restore();

  if (!logo) {
    context.fillStyle = "#0b2d24";
    context.font = "700 34px Georgia, serif";
    context.textAlign = "center";
    context.fillText(buildStoryBookstoreMonogram(bookstoreName), centerX, centerY + 12);
  }
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
    callToAction: "VER EL LIBRO EN BOOKIA →",
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

  const allowedPath = new RegExp(`^/(?:api/)?(?:dashboard/catalog/${itemId}(?:/cover|/images/\\d+)|catalog/${itemId}/cover)$`);
  return allowedPath.test(pathname) ? coverPath : null;
}

export function buildInstagramStoryBookstoreLogoPath(bookstore, { trustedOrigins = [] } = {}) {
  const bookstoreSlug = String(bookstore?.slug || "").trim();
  const logoPath = String(bookstore?.logo_url || "").trim();
  if (!bookstoreSlug || !logoPath || logoPath.startsWith("//")) return null;

  let pathname = logoPath;
  if (/^https?:\/\//i.test(logoPath)) {
    try {
      const parsedUrl = new URL(logoPath);
      if (!trustedOrigins.includes(parsedUrl.origin)) return null;
      pathname = parsedUrl.pathname;
    } catch {
      return null;
    }
  } else if (!logoPath.startsWith("/")) {
    return null;
  } else {
    pathname = logoPath.split(/[?#]/, 1)[0];
  }

  const expectedPath = `/bookstores/${encodeURIComponent(bookstoreSlug)}/logo`;
  return pathname === expectedPath || pathname === `/api${expectedPath}` ? logoPath : null;
}

export function buildInstagramStoryAssetUrls({ item, bookstore, trustedOrigins = [], resolveUrl = (path) => path }) {
  const coverPath = buildInstagramStoryCoverPath(item, { trustedOrigins });
  const bookstoreLogoPath = buildInstagramStoryBookstoreLogoPath(bookstore, { trustedOrigins });
  const resolveAssetUrl = (path) => {
    if (!path) return null;
    if (/^https?:\/\//i.test(path)) return resolveUrl(path);
    return resolveUrl(path.startsWith("/api/") ? path.slice(4) : path);
  };
  return {
    coverUrl: resolveAssetUrl(coverPath),
    bookstoreLogoUrl: resolveAssetUrl(bookstoreLogoPath),
  };
}

export async function createInstagramStoryFile({ item, bookstore, coverUrl, bookstoreLogoUrl, fetchLike = globalThis.fetch, documentLike = globalThis.document, FileCtor = globalThis.File }) {
  if (!documentLike?.createElement || typeof FileCtor !== "function") throw new Error("Este navegador no puede crear una imagen para Story.");
  const canvas = documentLike.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Este navegador no puede crear una imagen para Story.");

  const metadata = buildInstagramStoryMetadata({ item, bookstore });
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  context.fillStyle = "#0b2d24";
  context.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
  context.fillStyle = "#f7f1e6";
  context.font = "700 64px Georgia, serif";
  context.textAlign = "left";
  context.fillText("bookia", 140, 270);
  context.beginPath();
  context.arc(330, 250, 9, 0, Math.PI * 2);
  context.fillStyle = "#e85d3f";
  context.fill();
  context.fillStyle = "#f7f1e6";
  context.font = "800 22px system-ui, sans-serif";
  context.textAlign = "right";
  context.fillText("LIBRO RECOMENDADO", 940, 260);

  const coverPromise = loadInstagramStoryCover({ coverUrl, fetchLike, imageFactory: () => documentLike.createElement("img") }).catch(() => null);
  const bookstoreLogoPromise = loadInstagramStoryBookstoreLogo({ logoUrl: bookstoreLogoUrl, fetchLike, imageFactory: () => documentLike.createElement("img") });
  const [cover, bookstoreLogo] = await Promise.all([coverPromise, bookstoreLogoPromise]);

  drawStoryBookstoreIdentity(context, bookstoreLogo, metadata.bookstoreName);
  context.textAlign = "left";
  context.fillStyle = "#f7f1e6";
  context.font = "800 20px system-ui, sans-serif";
  context.fillText("DISPONIBLE EN", 290, 372);
  context.font = "700 54px Georgia, serif";
  drawStoryText(context, metadata.bookstoreName, 290, 430, 650, 58, 1);

  context.beginPath();
  context.arc(860, 760, 260, 0, Math.PI * 2);
  context.fillStyle = "#e85d3f";
  context.fill();

  context.save();
  context.translate(540, 850);
  context.rotate(-4 * (Math.PI / 180));
  context.fillStyle = "rgba(247, 241, 230, 0.22)";
  context.fillRect(-280, -340, 600, 720);
  drawStoryCover(context, cover, -310, -370, 600, 720);
  context.restore();

  context.save();
  context.beginPath();
  context.arc(820, 1020, 104, 0, Math.PI * 2);
  context.closePath();
  context.fillStyle = "#f7f1e6";
  context.fill();
  context.fillStyle = "#0b2d24";
  context.font = "900 26px system-ui, sans-serif";
  context.textAlign = "center";
  const availability = metadata.availability.toLocaleUpperCase("es-AR");
  if (availability === "DISPONIBLE") {
    context.fillText("DISPONIBLE", 820, 1012);
    context.fillText("AHORA", 820, 1052);
  } else {
    drawStoryText(context, availability, 820, 1028, 160, 32, 2);
  }
  context.restore();

  context.fillStyle = "#f7f1e6";
  context.textAlign = "left";
  const titleFontSize = metadata.title.length > 42 ? 56 : 68;
  context.font = `700 ${titleFontSize}px Georgia, serif`;
  drawStoryText(context, metadata.title, 140, 1320, 800, titleFontSize + 6, 2);
  context.fillStyle = "#dfe6dc";
  context.font = "400 34px system-ui, sans-serif";
  drawStoryText(context, metadata.author, 140, 1468, 800, 40, 2);

  context.fillStyle = "#e85d3f";
  context.fillRect(140, 1510, 800, 130);
  context.fillStyle = "#0b2d24";
  context.font = "900 28px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(metadata.callToAction, 540, 1590);

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
      if (error?.name === "NotAllowedError") {
        download(file);
        return "downloaded";
      }
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
