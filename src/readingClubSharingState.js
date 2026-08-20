import { copyBookShareUrl, loadInstagramStoryCover, shareBookToInstagram, shareInstagramStoryFile } from "./bookSharingState.js";
import { displayReadingClubDate } from "./readingClubState.js";

const STORY_WIDTH = 1080;
const STORY_HEIGHT = 1920;
const STORY_TITLE_LIMIT = 72;
const STORY_DESCRIPTION_LIMIT = 180;
const STORY_FIELD_LIMIT = 56;

function cleanStoryText(value, fallback) {
  return String(value || "").trim() || fallback;
}

function truncateStoryText(value, limit) {
  const text = String(value || "").trim();
  if (text.length <= limit) return text;
  return `${text.slice(0, limit - 1).trimEnd()}…`;
}

function fitStoryText(context, value, maxWidth) {
  const text = String(value || "").trim();
  if (!text || context.measureText(text).width <= maxWidth) return text;
  for (let end = text.length - 1; end > 0; end -= 1) {
    const candidate = `${text.slice(0, end).trimEnd()}…`;
    if (context.measureText(candidate).width <= maxWidth) return candidate;
  }
  return "…";
}

function drawStoryText(context, value, x, y, maxWidth, lineHeight, maxLines) {
  const words = String(value || "").trim().split(/\s+/).filter(Boolean);
  const lines = [];
  let line = "";
  words.forEach((word) => {
    const candidate = line ? `${line} ${word}` : word;
    if (context.measureText(candidate).width <= maxWidth) line = candidate;
    else if (!line) line = fitStoryText(context, word, maxWidth);
    else {
      lines.push(line);
      line = fitStoryText(context, word, maxWidth);
    }
  });
  if (line) lines.push(line);
  const visibleLines = lines.slice(0, maxLines);
  if (lines.length > maxLines && visibleLines.length) visibleLines[visibleLines.length - 1] = fitStoryText(context, `${visibleLines[visibleLines.length - 1].trimEnd()}…`, maxWidth);
  visibleLines.forEach((entry, index) => context.fillText(entry, x, y + (index * lineHeight)));
}

function drawReadingClubStoryCover(context, image, x, y, width, height) {
  context.save();
  if (!image?.width || !image?.height) {
    context.fillStyle = "#e4e6db";
    context.fillRect(x, y, width, height);
    context.strokeStyle = "#0b2d24";
    context.lineWidth = 3;
    context.strokeRect(x, y, width, height);
    context.fillStyle = "#0b2d24";
    context.font = "700 30px Georgia, serif";
    context.textAlign = "center";
    context.fillText("CLUB DE LECTURA", x + (width / 2), y + (height / 2) - 12);
    context.font = "600 20px system-ui, sans-serif";
    context.fillText("una conversación para compartir", x + (width / 2), y + (height / 2) + 28);
    context.restore();
    return;
  }
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  const sourceWidth = sourceRatio > targetRatio ? image.height * targetRatio : image.width;
  const sourceHeight = sourceRatio > targetRatio ? image.height : image.width / targetRatio;
  context.drawImage(image, (image.width - sourceWidth) / 2, (image.height - sourceHeight) / 2, sourceWidth, sourceHeight, x, y, width, height);
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

function normalizedPath(basePath) {
  if (!basePath || basePath === "/") return "";
  return `/${String(basePath).replace(/^\/+|\/+$/g, "")}`;
}

export function buildReadingClubShareUrl({ origin, basePath = "/", host, clubId }) {
  const segment = host?.type === "reader" ? "readers" : "bookstores";
  const url = new URL(`${normalizedPath(basePath)}/${segment}/${encodeURIComponent(host?.slug || "")}`, origin);
  url.searchParams.set("club", String(clubId));
  return url.toString();
}

export function getSharedReadingClubId(search) {
  const value = new URLSearchParams(search).get("club");
  if (!value || !/^\d+$/.test(value)) return null;
  const id = Number(value);
  return Number.isSafeInteger(id) && id > 0 ? id : null;
}

export function buildReadingClubInstagramStoryMetadata({ club, hostName }) {
  return {
    title: truncateStoryText(cleanStoryText(club?.title, "Club de lectura"), STORY_TITLE_LIMIT),
    description: truncateStoryText(cleanStoryText(club?.description, "Una invitación para compartir lecturas."), STORY_DESCRIPTION_LIMIT),
    genre: truncateStoryText(cleanStoryText(club?.genre?.name, "Sin género"), STORY_FIELD_LIMIT),
    date: club?.meeting_date ? displayReadingClubDate(club.meeting_date) : "Fecha a confirmar",
    location: truncateStoryText(cleanStoryText(club?.location, "Lugar a confirmar"), STORY_FIELD_LIMIT),
    hostName: truncateStoryText(cleanStoryText(hostName, "Bookia"), STORY_FIELD_LIMIT),
    callToAction: "MÁS DETALLES EN BOOKIA",
  };
}

export function buildReadingClubInstagramStoryCoverPath(club, { trustedOrigins = [] } = {}) {
  const clubId = club?.id;
  const coverPath = String(club?.cover_url || "").trim();
  if (!Number.isSafeInteger(clubId) || clubId <= 0 || !coverPath || coverPath.startsWith("//")) return null;

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

  const allowedPath = new RegExp(`^/(?:api/)?(?:dashboard/)?reading-clubs/${clubId}/cover$`);
  return allowedPath.test(pathname) ? coverPath : null;
}

export function resolveReadingClubInstagramStoryCoverUrl(club, { trustedOrigins = [], resolveUrl = (path) => path } = {}) {
  const coverPath = buildReadingClubInstagramStoryCoverPath(club, { trustedOrigins });
  return coverPath ? resolveUrl(coverPath) : null;
}

export function buildReadingClubShareMessage({ club, hostName }) {
  const parts = [`Sumate a \"${String(club?.title || "Club de lectura").trim()}\" de ${String(hostName || "Bookia").trim()} en Bookia.`];
  if (club?.genre?.name) parts.push(`Género: ${club.genre.name}.`);
  if (club?.meeting_date) parts.push(`Fecha: ${displayReadingClubDate(club.meeting_date)}.`);
  if (club?.location) parts.push(`Lugar: ${club.location}.`);
  return parts.join(" ");
}

export async function shareReadingClubToInstagram(data) { return shareBookToInstagram(data); }
export async function copyReadingClubShareUrl(url) { return copyBookShareUrl(url); }

export async function createReadingClubInstagramStoryFile({ club, hostName, coverUrl, fetchLike = globalThis.fetch, documentLike = globalThis.document, FileCtor = globalThis.File }) {
  if (!documentLike?.createElement || typeof FileCtor !== "function") throw new Error("No pudimos crear la imagen de la Story.");
  const canvas = documentLike.createElement("canvas");
  const context = canvas.getContext("2d");
  if (!context) throw new Error("No pudimos crear la imagen de la Story.");
  const metadata = buildReadingClubInstagramStoryMetadata({ club, hostName });
  canvas.width = STORY_WIDTH;
  canvas.height = STORY_HEIGHT;
  context.fillStyle = "#f7f1e6";
  context.fillRect(0, 0, STORY_WIDTH, STORY_HEIGHT);
  context.fillStyle = "#0b2d24";
  context.font = "700 68px Georgia, serif";
  context.textAlign = "left";
  context.fillText("bookia", 88, 130);
  context.font = "700 24px system-ui, sans-serif";
  context.fillText("CLUB DE LECTURA", 88, 180);

  const cover = await loadInstagramStoryCover({ coverUrl, fetchLike, imageFactory: () => documentLike.createElement("img") }).catch(() => null);
  drawReadingClubStoryCover(context, cover, 180, 242, 720, 700);

  context.fillStyle = "#e4e6db";
  context.fillRect(88, 1002, 320, 58);
  context.fillStyle = "#0b2d24";
  context.font = "800 23px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(fitStoryText(context, metadata.genre.toLocaleUpperCase("es-AR"), 284), 248, 1040);
  context.textAlign = "left";
  context.font = "700 70px Georgia, serif";
  drawStoryText(context, metadata.title, 88, 1160, 904, 80, 2);
  context.fillStyle = "#536259";
  context.font = "400 34px system-ui, sans-serif";
  drawStoryText(context, metadata.description, 88, 1336, 904, 46, 3);
  context.strokeStyle = "#c9c6b9";
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(88, 1510);
  context.lineTo(992, 1510);
  context.stroke();
  [["FECHA", metadata.date], ["LUGAR", metadata.location], ["ORGANIZA", metadata.hostName]].forEach(([label, value], index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 88 + (column * 452);
    const y = 1564 + (row * 98);
    context.fillStyle = "#68736b";
    context.font = "700 18px system-ui, sans-serif";
    context.fillText(label, x, y);
    context.fillStyle = "#0b2d24";
    context.font = "700 27px system-ui, sans-serif";
    drawStoryText(context, value.toLocaleUpperCase("es-AR"), x, y + 34, 380, 30, 1);
  });
  context.strokeStyle = "#0b2d24";
  context.lineWidth = 3;
  context.strokeRect(88, 1832, 904, 62);
  context.fillStyle = "#0b2d24";
  context.font = "800 22px system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(metadata.callToAction, 540, 1872);

  const png = await canvasToPng(canvas);
  const safeTitle = metadata.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "lectura";
  return new FileCtor([png], `bookia-club-${safeTitle}.png`, { type: "image/png" });
}

export { shareInstagramStoryFile };
