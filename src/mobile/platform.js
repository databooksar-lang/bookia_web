const DEFAULT_WEB_API_BASE = "/api";

export function createMobilePlatform({ native, platform, apiBaseUrl }) {
  const nativeAndroid = Boolean(native && platform === "android");
  const normalizedApiBase = String(apiBaseUrl || "").trim().replace(/\/+$/, "");

  if (nativeAndroid && !normalizedApiBase.startsWith("https://")) {
    throw new Error("La app Android necesita una API HTTPS explícita.");
  }

  return {
    isNativeAndroid: () => nativeAndroid,
    getApiBase: () => (nativeAndroid ? normalizedApiBase : DEFAULT_WEB_API_BASE),
  };
}
