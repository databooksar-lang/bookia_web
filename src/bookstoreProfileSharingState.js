import { copyBookShareUrl, loadInstagramStoryBookstoreLogo, shareInstagramStoryFile } from "./bookSharingState.js";

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const STORY_SAFE_LEFT = 140;
const STORY_SAFE_RIGHT = 940;

function normalizedPath(basePath) {
  if (!basePath || basePath === "/") return "";
  return `/${String(basePath).replace(/^\/+|\/+$/g, "")}`;
}

function cleanText(value, fallback) {
  return String(value || "").trim() || fallback;
}

function truncateText(value, limit) {
  const text = String(value || "").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trimEnd()}…`;
}

function slugifyFileName(value) {
  return String(value || "libreria")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || "libreria";
}

function buildMonogram(name) {
  const words = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!words.length) return "BK";
  if (words.length === 1) return Array.from(words[0]).slice(0, 2).join("").toLocaleUpperCase("es-AR");
  return `${Array.from(words[0])[0]}${Array.from(words[1])[0]}`.toLocaleUpperCase("es-AR");
}

function drawImageCover(context, image, x, y, width, height) {
  const scale = Math.max(width / image.width, height / image.height);
  const sourceWidth = width / scale;
  const sourceHeight = height / scale;
  const sourceX = (image.width - sourceWidth) / 2;
  const sourceY = (image.height - sourceHeight) / 2;
  context.drawImage(image, sourceX, sourceY, sourceWidth, sourceHeight, x, y, width, height);
}

function drawWrappedText(context, value, x, y, maxWidth, lineHeight, maxLines) {
  const words = String(value || "").split(/\s+/).filter(Boolean);
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
    if (!line || context.measureText(candidate).width <= maxWidth) {
      line = candidate;
    } else {
      lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines && visibleLines.length) {
    let finalLine = visibleLines.at(-1);
    while (finalLine && context.measureText(`${finalLine}…`).width > maxWidth) finalLine = finalLine.slice(0, -1).trimEnd();
    visibleLines[visibleLines.length - 1] = `${finalLine}…`;
  }
  visibleLines.forEach((currentLine, index) => context.fillText(currentLine, x, y + (index * lineHeight)));
}

function canvasToPng(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("No pudimos crear la imagen de la Story."));
    }, "image/png");
  });
}

function ownedProfileAssetPath(bookstore, role, trustedOrigins) {
  const slug = String(bookstore?.slug || "").trim();
  const rawPath = String(role === "banner" ? bookstore?.hero_image_url : bookstore?.logo_url || "").trim();
  if (!slug || !rawPath) return null;
  const expectedPath = `/bookstores/${encodeURIComponent(slug)}/${role}`;
  try {
    const parsed = new URL(rawPath, "https://bookia.invalid");
    const isAbsolute = /^[a-z][a-z\d+.-]*:/i.test(rawPath);
    if (isAbsolute && !trustedOrigins.includes(parsed.origin)) return null;
    if (parsed.pathname !== expectedPath && parsed.pathname !== `/api${expectedPath}`) return null;
    return rawPath;
  } catch {
    return null;
  }
}

function resolveProfileAsset(path, resolveUrl) {
  if (!path) return null;
  if (/^[a-z][a-z\d+.-]*:/i.test(path)) return path;
  return resolveUrl(path.replace(/^\/api(?=\/)/, ""));
}

export function buildBookstoreProfileShareUrl({ origin, basePath = "/", bookstoreSlug }) {
  return `${String(origin || "").replace(/\/$/, "")}${normalizedPath(basePath)}/bookstores/${encodeURIComponent(bookstoreSlug)}`;
}

export function buildBookstoreProfileShareMessage({ bookstoreName }) {
  return `Descubrí el perfil de ${cleanText(bookstoreName, "esta librería")} en Bookia.`;
}

export function buildBookstoreProfileStoryAssetUrls({ bookstore, trustedOrigins = [], resolveUrl = (path) => path }) {
  return {
    bannerUrl: resolveProfileAsset(ownedProfileAssetPath(bookstore, "banner", trustedOrigins), resolveUrl),
    logoUrl: resolveProfileAsset(ownedProfileAssetPath(bookstore, "logo", trustedOrigins), resolveUrl),
  };
}

export function buildBookstoreProfileInstagramStoryMetadata({ bookstore }) {
  return {
    bookstoreName: truncateText(cleanText(bookstore?.name, "Librería en Bookia"), 54),
    callToAction: "VISITÁ EL PERFIL EN BOOKIA",
    linkHint: "AGREGÁ EL STICKER ENLACE",
  };
}

export async function copyBookstoreProfileShareUrl(url, clipboard = globalThis.navigator?.clipboard) {
  return copyBookShareUrl(url, clipboard);
}

export async function shareBookstoreProfileInstagramStory({ url, title, createFile, copyUrl = copyBookstoreProfileShareUrl, shareFile = shareInstagramStoryFile }) {
  let linkCopied = false;
  try {
    await copyUrl(url);
    linkCopied = true;
  } catch {
    linkCopied = false;
  }
  const file = await createFile();
  const result = await shareFile({ file, title });
  return { result, linkCopied };
}

export async function createBookstoreProfileInstagramStoryFile({ bookstore, bannerUrl, logoUrl, fetchLike = globalThis.fetch, documentLike = globalThis.document, FileCtor = globalThis.File }) {
  if (!documentLike?.createElement || !FileCtor) throw new Error("Este navegador no puede crear la imagen de la Story.");
  const metadata = buildBookstoreProfileInstagramStoryMetadata({ bookstore });
  const canvas = documentLike.createElement("canvas");
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Este navegador no puede crear la imagen de la Story.");

  const [banner, logo] = await Promise.all([
    loadInstagramStoryBookstoreLogo({ logoUrl: bannerUrl, fetchLike, imageFactory: () => documentLike.createElement("img") }),
    loadInstagramStoryBookstoreLogo({ logoUrl, fetchLike, imageFactory: () => documentLike.createElement("img") }),
  ]);

  context.fillStyle = "#0b2d24";
  context.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
  context.fillStyle = "#f7f1e6";
  context.fillRect(STORY_SAFE_LEFT, 300, STORY_SAFE_RIGHT - STORY_SAFE_LEFT, 470);
  if (banner) {
    drawImageCover(context, banner, STORY_SAFE_LEFT, 300, STORY_SAFE_RIGHT - STORY_SAFE_LEFT, 470);
  } else {
    context.fillStyle = "#e7ddcc";
    context.fillRect(STORY_SAFE_LEFT + 20, 320, 760, 430);
    context.fillStyle = "#e85d3f";
    context.fillRect(STORY_SAFE_LEFT + 80, 400, 640, 18);
    context.fillRect(STORY_SAFE_LEFT + 190, 470, 420, 18);
  }

  context.fillStyle = "#e85d3f";
  context.font = "800 34px system-ui, sans-serif";
  context.textAlign = "left";
  context.fillText("bookia", STORY_SAFE_LEFT, 250);
  context.fillStyle = "#f7f1e6";
  context.font = "800 25px system-ui, sans-serif";
  context.textAlign = "right";
  context.fillText("PERFIL DE LIBRERÍA", STORY_SAFE_RIGHT, 250);

  const logoSize = 180;
  const logoX = (STORY_WIDTH - logoSize) / 2;
  const logoY = 680;
  context.fillStyle = "#f7f1e6";
  context.fillRect(logoX - 10, logoY - 10, logoSize + 20, logoSize + 20);
  if (logo) {
    drawImageCover(context, logo, logoX, logoY, logoSize, logoSize);
  } else {
    context.fillStyle = "#e85d3f";
    context.fillRect(logoX, logoY, logoSize, logoSize);
    context.fillStyle = "#f7f1e6";
    context.font = "700 58px Georgia, serif";
    context.textAlign = "center";
    context.fillText(buildMonogram(metadata.bookstoreName), STORY_WIDTH / 2, logoY + 112);
  }

  context.fillStyle = "#f7f1e6";
  context.font = "700 76px Georgia, serif";
  context.textAlign = "center";
  drawWrappedText(context, metadata.bookstoreName, STORY_WIDTH / 2, 1030, 800, 88, 2);
  context.fillStyle = "#f6a38f";
  context.font = "800 31px system-ui, sans-serif";
  context.fillText("DESCUBRÍ SU CATÁLOGO", STORY_WIDTH / 2, 1240);

  context.fillStyle = "#e85d3f";
  context.fillRect(STORY_SAFE_LEFT, 1490, STORY_SAFE_RIGHT - STORY_SAFE_LEFT, 120);
  context.fillStyle = "#fffaf0";
  context.font = "800 30px system-ui, sans-serif";
  context.fillText(metadata.callToAction, STORY_WIDTH / 2, 1564);
  context.fillStyle = "#f7f1e6";
  context.font = "700 24px system-ui, sans-serif";
  context.fillText(metadata.linkHint, STORY_WIDTH / 2, 1640);

  const png = await canvasToPng(canvas);
  return new FileCtor([png], `bookia-perfil-${slugifyFileName(bookstore?.slug || bookstore?.name)}.png`, { type: "image/png" });
}

export { shareInstagramStoryFile };
