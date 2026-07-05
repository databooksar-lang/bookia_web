const baseUrl = import.meta.env.BASE_URL || "/";

function normalizeBasePath(value) {
  if (!value || value === "/") {
    return "/";
  }

  const trimmed = value.replace(/\/+$/, "");
  return trimmed.startsWith("/") ? `${trimmed}/` : `/${trimmed}/`;
}

export const basePath = normalizeBasePath(baseUrl);

export function withBasePath(path) {
  if (!path || path === "/") {
    return basePath;
  }

  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return `${basePath}${normalizedPath}`;
}

export function stripBasePath(pathname) {
  if (basePath === "/") {
    return pathname || "/";
  }

  if (pathname === basePath.slice(0, -1)) {
    return "/";
  }

  if (pathname.startsWith(basePath)) {
    const stripped = pathname.slice(basePath.length - 1);
    return stripped || "/";
  }

  return pathname || "/";
}
