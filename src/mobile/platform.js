const DEFAULT_WEB_API_BASE = "/api";
export const DEFAULT_NATIVE_ANDROID_API_BASE = "https://bookia-api-production.up.railway.app";

function removeTrailingSlashes(value) {
  let normalized = value;
  while (normalized.endsWith("/")) normalized = normalized.slice(0, -1);
  return normalized;
}

export function createMobilePlatform({ native, platform, apiBaseUrl }) {
  const nativeAndroid = Boolean(native && platform === "android");
  const configuredApiBase = removeTrailingSlashes(String(apiBaseUrl || "").trim());
  const normalizedApiBase = nativeAndroid && !configuredApiBase
    ? DEFAULT_NATIVE_ANDROID_API_BASE
    : configuredApiBase;

  if (nativeAndroid && !normalizedApiBase.startsWith("https://")) {
    throw new Error("La app Android necesita una API HTTPS explícita.");
  }

  return {
    isNativeAndroid: () => nativeAndroid,
    getApiBase: () => (nativeAndroid ? normalizedApiBase : DEFAULT_WEB_API_BASE),
  };
}
