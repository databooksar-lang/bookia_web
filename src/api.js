import { isBookiaApiRoute } from "./apiRoutes.js";

const DEFAULT_SAME_ORIGIN_API_BASE = "/api";
const RUNTIME_API_BASE = globalThis.__BOOKIA_CONFIG__?.apiBaseUrl || "";
const BUILD_API_BASE = import.meta.env?.VITE_API_BASE_URL || "";
const API_BASE = normalizeApiBase(RUNTIME_API_BASE || BUILD_API_BASE || DEFAULT_SAME_ORIGIN_API_BASE);

function normalizeApiBase(value) {
  const trimmed = String(value || "").trim();
  if (!trimmed || trimmed === "/") {
    return "";
  }
  return trimmed.replace(/\/+$/, "");
}

function isDefaultApiPath(path) {
  return path === DEFAULT_SAME_ORIGIN_API_BASE || path.startsWith(`${DEFAULT_SAME_ORIGIN_API_BASE}/`);
}

function readCookie(name) {
  if (typeof document === "undefined") {
    return "";
  }

  const encodedName = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie.split("; ").find((entry) => entry.startsWith(encodedName));
  if (!cookie) {
    return "";
  }

  return decodeURIComponent(cookie.slice(encodedName.length));
}

function buildInvalidApiResponseMessage(path, response, contentType) {
  const resolvedPath = resolveApiUrl(path);
  const isHtmlResponse = contentType.includes("text/html");
  const looksLikeApiRoute = isBookiaApiRoute(path) || isBookiaApiRoute(resolvedPath);

  if (isHtmlResponse && looksLikeApiRoute) {
    if (!API_BASE) {
      return "La web esta intentando consultar el frontend en lugar de la API. Configura VITE_API_BASE_URL y vuelve a publicar el frontend.";
    }
    return `La API devolvio HTML en lugar de JSON para ${resolvedPath}. Revisa VITE_API_BASE_URL y el despliegue del backend.`;
  }

  return `El servidor devolvio una respuesta invalida (${response.status} ${contentType || "sin content-type"}).`;
}

function buildNonJsonErrorMessage(path, response, contentType, bodyText) {
  const trimmedBody = bodyText.trim();
  const looksLikeHtml = contentType.includes("text/html") || /^<!doctype html/i.test(trimmedBody) || /^<html/i.test(trimmedBody);
  const resolvedPath = resolveApiUrl(path);
  const looksLikeApiRoute = isBookiaApiRoute(path) || isBookiaApiRoute(resolvedPath);

  if (looksLikeHtml && looksLikeApiRoute) {
    return buildInvalidApiResponseMessage(path, response, contentType || "text/html");
  }

  if (trimmedBody) {
    return `La API respondio ${response.status} y no devolvio JSON. ${trimmedBody.slice(0, 180)}`;
  }

  if (response.status >= 500) {
    return `La API respondio con error ${response.status}. Revisa el backend o el proxy de /api/auth/login.`;
  }

  return `La API respondio ${response.status} sin un error legible (${contentType || "sin content-type"}).`;
}

export function resolveApiUrl(path) {
  if (!path) {
    return path;
  }

  if (/^https?:\/\//i.test(path)) {
    return path;
  }

  if (!API_BASE) {
    return path;
  }

  if (API_BASE === DEFAULT_SAME_ORIGIN_API_BASE && path.startsWith("/") && isDefaultApiPath(path)) {
    return path;
  }

  if (path.startsWith("/")) {
    return `${API_BASE}${path}`;
  }

  return `${API_BASE}/${path}`;
}

export function buildRequestHeaders(options = {}, csrfToken = "") {
  const isFormData = typeof FormData !== "undefined" && options.body instanceof FormData;

  return {
    ...(options.body !== undefined && !isFormData ? { "Content-Type": "application/json" } : {}),
    ...(csrfToken ? { "X-CSRF-Token": csrfToken } : {}),
    ...(options.headers || {}),
  };
}

export async function apiFetch(path, options = {}) {
  let response;
  const method = (options.method || "GET").toUpperCase();
  const csrfToken = method === "GET" ? "" : readCookie("bookia_csrf");
  const defaultHeaders = buildRequestHeaders(options, csrfToken);

  try {
    response = await fetch(resolveApiUrl(path), {
      ...options,
      credentials: "include",
      headers: defaultHeaders,
    });
  } catch (error) {
    throw new Error("No pudimos conectar con el servidor.");
  }

  if (response.status === 204) {
    return null;
  }

  const contentType = response.headers.get("content-type") || "";
  const expectsJson = contentType.includes("application/json");

  if (!expectsJson) {
    const responseText = await response.text().catch(() => "");
    if (response.ok) {
      throw new Error(buildInvalidApiResponseMessage(path, response, contentType));
    }
    throw new Error(buildNonJsonErrorMessage(path, response, contentType, responseText));
  }

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error(response.ok ? buildInvalidApiResponseMessage(path, response, contentType) : "No pudimos completar la accion.");
  }

  if (!response.ok) {
    throw new Error(data?.detail || "No pudimos completar la accion.");
  }
  return data;
}
