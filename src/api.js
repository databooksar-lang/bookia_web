const RUNTIME_API_BASE = globalThis.__BOOKIA_CONFIG__?.apiBaseUrl || "";
const BUILD_API_BASE = import.meta.env.VITE_API_BASE_URL || "";
const API_BASE = (RUNTIME_API_BASE || BUILD_API_BASE).replace(/\/$/, "");

function buildInvalidApiResponseMessage(path, response, contentType) {
  const resolvedPath = resolveApiUrl(path);
  const isHtmlResponse = contentType.includes("text/html");
  const looksLikeApiRoute = /^\/(search|bookstores|auth|me|dashboard|catalog)(\/|\?|$)/.test(path);

  if (isHtmlResponse && looksLikeApiRoute) {
    if (!API_BASE) {
      return "La web esta intentando consultar el frontend en lugar de la API. Configura VITE_API_BASE_URL y vuelve a publicar el frontend.";
    }
    return `La API devolvio HTML en lugar de JSON para ${resolvedPath}. Revisa VITE_API_BASE_URL y el despliegue del backend.`;
  }

  return `El servidor devolvio una respuesta invalida (${response.status} ${contentType || "sin content-type"}).`;
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

  if (path.startsWith("/")) {
    return `${API_BASE}${path}`;
  }

  return `${API_BASE}/${path}`;
}

export async function apiFetch(path, options = {}) {
  let response;
  try {
    response = await fetch(resolveApiUrl(path), {
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        ...(options.headers || {}),
      },
      ...options,
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
    if (response.ok) {
      throw new Error(buildInvalidApiResponseMessage(path, response, contentType));
    }
    throw new Error("No pudimos completar la accion.");
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
