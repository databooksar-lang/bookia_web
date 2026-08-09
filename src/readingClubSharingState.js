import { copyBookShareUrl, shareBookToInstagram, shareInstagramStoryFile } from "./bookSharingState.js";
import { displayReadingClubDate } from "./readingClubState.js";

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

export function buildReadingClubShareMessage({ club, hostName }) {
  const parts = [`Sumate a \"${String(club?.title || "Club de lectura").trim()}\" de ${String(hostName || "Bookia").trim()} en Bookia.`];
  if (club?.genre?.name) parts.push(`Género: ${club.genre.name}.`);
  if (club?.meeting_date) parts.push(`Fecha: ${displayReadingClubDate(club.meeting_date)}.`);
  if (club?.location) parts.push(`Lugar: ${club.location}.`);
  return parts.join(" ");
}

export async function shareReadingClubToInstagram(data) { return shareBookToInstagram(data); }
export async function copyReadingClubShareUrl(url) { return copyBookShareUrl(url); }

export async function createReadingClubInstagramStoryFile({ club, hostName, documentLike = globalThis.document, FileCtor = globalThis.File }) {
  if (!documentLike?.createElement || !FileCtor) throw new Error("No pudimos crear la imagen de la Story.");
  const canvas = documentLike.createElement("canvas");
  canvas.width = 1080; canvas.height = 1920;
  const context = canvas.getContext("2d");
  context.fillStyle = "#f4f0e5"; context.fillRect(0, 0, 1080, 1920);
  context.fillStyle = "#0b2d24"; context.fillRect(70, 70, 940, 1780);
  context.fillStyle = "#f4f0e5"; context.font = "700 30px system-ui, sans-serif"; context.fillText("BOOKIA · CLUB DE LECTURA", 130, 190);
  context.font = "700 68px Georgia, serif";
  const lines = String(club?.title || "Club de lectura").match(/.{1,24}(?:\s|$)|\S+/g) || [];
  lines.slice(0, 3).forEach((line, index) => context.fillText(line.trim(), 130, 350 + (index * 86)));
  context.font = "600 34px system-ui, sans-serif"; context.fillStyle = "#d7d2c8";
  [club?.genre?.name || "Sin género", club?.meeting_date ? displayReadingClubDate(club.meeting_date) : "Fecha a confirmar", club?.location || "Lugar a confirmar", `Organiza: ${hostName || "Bookia"}`].forEach((value, index) => context.fillText(value, 130, 820 + (index * 110)));
  context.fillStyle = "#f4f0e5"; context.fillText("ENCONTRALO EN BOOKIA", 130, 1660);
  const png = await new Promise((resolve, reject) => canvas.toBlob((blob) => blob ? resolve(blob) : reject(new Error("No pudimos crear la imagen de la Story.")), "image/png"));
  return new FileCtor([png], `bookia-club-${club?.id || "lectura"}.png`, { type: "image/png" });
}

export { shareInstagramStoryFile };
