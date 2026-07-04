const API_BASE = (import.meta.env.VITE_API_BASE_URL || "").replace(/\/$/, "");

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
      throw new Error("El servidor devolvio una respuesta invalida.");
    }
    throw new Error("No pudimos completar la accion.");
  }

  let data = null;
  try {
    data = await response.json();
  } catch (error) {
    throw new Error(response.ok ? "El servidor devolvio una respuesta invalida." : "No pudimos completar la accion.");
  }

  if (!response.ok) {
    throw new Error(data?.detail || "No pudimos completar la accion.");
  }
  return data;
}
