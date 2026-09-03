const ALLOWED_HOSTS = new Set(["mybookia.app", "www.mybookia.app"]);
const ALLOWED_PATHS = [/^\/$/, /^\/profile$/, /^\/dashboard$/, /^\/bookstores\/[a-z0-9-]+$/, /^\/readers\/[a-z0-9-]+$/];

export function resolveBookiaDeepLink(value) {
  const raw = String(value || "").trim();
  try {
    const parsed = new URL(raw);
    const rawPath = raw.slice(parsed.origin.length).split(/[?#]/, 1)[0];
    if (parsed.protocol !== "https:" || !ALLOWED_HOSTS.has(parsed.hostname) || parsed.port || parsed.hash) return null;
    if (rawPath.includes("..") || rawPath.includes("//") || rawPath.includes("\\") || /%2f|%5c/i.test(rawPath)) return null;
    if (!ALLOWED_PATHS.some((pattern) => pattern.test(parsed.pathname))) return null;
    return `${parsed.pathname}${parsed.search}`;
  } catch {
    return null;
  }
}

export async function installBookiaDeepLinkListener({ nativeAndroid, appPlugin, navigate }) {
  if (!nativeAndroid) return { async remove() {} };
  return appPlugin.addListener("appUrlOpen", ({ url }) => {
    const route = resolveBookiaDeepLink(url);
    if (route) navigate(route);
  });
}
