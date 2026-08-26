import { copyBookShareUrl, loadInstagramStoryCover, loadInstagramStoryLogo, shareBookToInstagram, shareInstagramStoryFile } from "./bookSharingState.js";
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

function roundedStoryRect(context, x, y, width, height, radius) {
  const safeRadius = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + safeRadius, y);
  context.lineTo(x + width - safeRadius, y);
  context.quadraticCurveTo(x + width, y, x + width, y + safeRadius);
  context.lineTo(x + width, y + height - safeRadius);
  context.quadraticCurveTo(x + width, y + height, x + width - safeRadius, y + height);
  context.lineTo(x + safeRadius, y + height);
  context.quadraticCurveTo(x, y + height, x, y + height - safeRadius);
  context.lineTo(x, y + safeRadius);
  context.quadraticCurveTo(x, y, x + safeRadius, y);
  context.closePath();
}

function drawReadingClubStoryCover(context, image, x, y, width, height) {
  context.fillStyle = "#d9cfbf";
  roundedStoryRect(context, x + 12, y + 14, width, height, 36);
  context.fill();
  context.save();
  roundedStoryRect(context, x, y, width, height, 36);
  context.clip();
  const sourceRatio = image.width / image.height;
  const targetRatio = width / height;
  const sourceWidth = sourceRatio > targetRatio ? image.height * targetRatio : image.width;
  const sourceHeight = sourceRatio > targetRatio ? image.height : image.width / targetRatio;
  context.drawImage(image, (image.width - sourceWidth) / 2, (image.height - sourceHeight) / 2, sourceWidth, sourceHeight, x, y, width, height);
  context.restore();
  context.save();
  roundedStoryRect(context, x, y, width, height, 36);
  context.strokeStyle = "#0b2d24";
  context.lineWidth = 3;
  context.stroke();
  context.restore();
}

function drawReadingClubStoryMetadata(context, metadata) {
  context.fillStyle = "#e4e6db";
  context.fillRect(140, 1014, 330, 56);
  context.fillStyle = "#0b2d24";
  context.font = "800 21px Manrope, system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(fitStoryText(context, metadata.genre.toLocaleUpperCase("es-AR"), 294), 305, 1051);
  context.textAlign = "left";
  context.font = "700 66px Fraunces, Georgia, serif";
  drawStoryText(context, metadata.title, 140, 1135, 800, 70, 2);
  context.fillStyle = "#536259";
  context.font = "500 29px Manrope, system-ui, sans-serif";
  drawStoryText(context, metadata.description, 140, 1257, 800, 39, 2);
  drawReadingClubStoryDetails(context, metadata, 1344);
}

function drawReadingClubStoryDetails(context, metadata, detailsTop) {
  [["FECHA", metadata.date], ["LUGAR", metadata.location], ["ORGANIZA", metadata.hostName]].forEach(([label, value], index) => {
    const x = 140 + (index * 274);
    context.fillStyle = "#68736b";
    context.font = "800 17px Manrope, system-ui, sans-serif";
    context.fillText(label, x, detailsTop + 24);
    context.fillStyle = "#0b2d24";
    context.font = "800 23px Manrope, system-ui, sans-serif";
    drawStoryText(context, value.toLocaleUpperCase("es-AR"), x, detailsTop + 59, 240, 28, 1);
  });
}

function drawReadingClubStoryExpandedDetails(context, metadata) {
  context.fillStyle = "#e4e6db";
  context.fillRect(140, 372, 330, 56);
  context.fillStyle = "#0b2d24";
  context.font = "800 21px Manrope, system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(fitStoryText(context, metadata.genre.toLocaleUpperCase("es-AR"), 294), 305, 409);
  context.textAlign = "left";
  context.font = "700 66px Fraunces, Georgia, serif";
  drawStoryText(context, metadata.title, 140, 500, 800, 70, 3);
  context.fillStyle = "#e85d3f";
  context.fillRect(140, 742, 800, 8);
  context.fillStyle = "#68736b";
  context.font = "800 17px Manrope, system-ui, sans-serif";
  context.fillText("SOBRE EL CLUB", 140, 790);
  context.fillStyle = "#536259";
  context.font = "500 29px Manrope, system-ui, sans-serif";
  drawStoryText(context, metadata.description, 140, 842, 800, 39, 5);
  drawReadingClubStoryDetails(context, metadata, 1138);
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
    callToAction: "SUMATE AL CLUB EN BOOKIA",
    linkHint: "AGREGÁ EL STICKER ENLACE",
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

export async function shareReadingClubInstagramStory({ url, title, createFile, copyUrl = copyReadingClubShareUrl, shareFile = shareInstagramStoryFile }) {
  let linkCopied = true;
  try {
    await copyUrl(url);
  } catch {
    linkCopied = false;
  }
  const file = await createFile();
  const result = await shareFile({ file, title });
  return { result, linkCopied };
}

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
  context.fillStyle = "#ede4d5";
  context.fillRect(0, 0, 48, STORY_HEIGHT);
  context.fillStyle = "#e85d3f";
  context.fillRect(48, 0, 10, STORY_HEIGHT);
  context.fillStyle = "#0b2d24";
  context.font = "700 66px Fraunces, Georgia, serif";
  context.textAlign = "left";
  context.fillText("bookia", 140, 278);
  context.font = "800 21px Manrope, system-ui, sans-serif";
  context.fillText("CLUB DE LECTURA", 140, 318);

  const coverPromise = loadInstagramStoryCover({ coverUrl, fetchLike, imageFactory: () => documentLike.createElement("img") }).catch(() => null);
  const logoPromise = loadInstagramStoryLogo({ imageFactory: () => documentLike.createElement("img") });
  const [cover, logo] = await Promise.all([coverPromise, logoPromise]);
  if (logo) context.drawImage(logo, 828, 220, 112, 112);
  const hasCover = Boolean(cover?.width && cover?.height);
  if (hasCover) {
    drawReadingClubStoryCover(context, cover, 140, 372, 800, 600);
    drawReadingClubStoryMetadata(context, metadata);
  } else {
    drawReadingClubStoryExpandedDetails(context, metadata);
  }
  const ctaTop = 1482;
  context.fillStyle = "#e85d3f";
  context.fillRect(140, ctaTop, 800, 150);
  context.fillStyle = "#fffaf0";
  context.font = "800 25px Manrope, system-ui, sans-serif";
  context.textAlign = "center";
  context.fillText(metadata.callToAction, 540, ctaTop + 58);
  context.font = "700 20px Manrope, system-ui, sans-serif";
  context.fillText(metadata.linkHint, 540, ctaTop + 105);

  const png = await canvasToPng(canvas);
  const safeTitle = metadata.title.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "lectura";
  return new FileCtor([png], `bookia-club-${safeTitle}.png`, { type: "image/png" });
}

export { shareInstagramStoryFile };
