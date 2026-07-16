const API_ROOTS = ["/search", "/auth", "/me", "/catalog", "/genres"];

function getPathname(path) {
  return (path || "").split(/[?#]/, 1)[0] || "/";
}

function isRootedAt(pathname, root) {
  return pathname === root || pathname.startsWith(`${root}/`);
}

export function isBookiaApiRoute(path) {
  const pathname = getPathname(path);

  if (isRootedAt(pathname, "/api")) {
    return true;
  }

  if (pathname.startsWith("/dashboard/")) {
    return true;
  }

  if (pathname === "/bookstores") {
    return true;
  }

  if (/^\/bookstores\/[^/]+\/(logo|banner)$/.test(pathname)) {
    return true;
  }

  return API_ROOTS.some((root) => isRootedAt(pathname, root));
}
