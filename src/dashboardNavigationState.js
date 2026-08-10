const DASHBOARD_SECTIONS = new Set(["profile", "new-book", "catalog", "clubs", "metrics", "subscription"]);
const CATALOG_VIEWS = new Set(["active", "sold-out"]);
const ANALYTICS_MODES = new Set(["month", "custom"]);

function isIsoDate(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value || "");
}

function isIsoMonth(value) {
  return /^\d{4}-\d{2}$/.test(value || "");
}

export function getAnalyticsMinimumDate(today) {
  const [year, month] = today.slice(0, 7).split("-").map(Number);
  const earliest = new Date(Date.UTC(year, month - 24, 1));
  return `${earliest.getUTCFullYear()}-${String(earliest.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

function normalizeAnalyticsNavigation(params, today) {
  const mode = ANALYTICS_MODES.has(params.get("analytics_mode")) ? params.get("analytics_mode") : "month";
  const month = isIsoMonth(params.get("analytics_month")) ? params.get("analytics_month") : null;
  const startDate = isIsoDate(params.get("analytics_start")) ? params.get("analytics_start") : null;
  const endDate = isIsoDate(params.get("analytics_end")) ? params.get("analytics_end") : null;
  const minimumDate = getAnalyticsMinimumDate(today);
  const minimumMonth = minimumDate.slice(0, 7);
  const maximumMonth = today.slice(0, 7);
  if (mode === "custom" && startDate && endDate && startDate >= minimumDate && startDate <= endDate && endDate <= today) {
    return { mode, month: null, startDate, endDate };
  }
  if (mode === "month" && month && month >= minimumMonth && month <= maximumMonth) {
    return { mode: "month", month, startDate: null, endDate: null };
  }
  return { mode: "month", month: null, startDate: null, endDate: null };
}

function normalizeDashboardSection(value) {
  return DASHBOARD_SECTIONS.has(value) ? value : "profile";
}

function normalizeCatalogView(value) {
  return CATALOG_VIEWS.has(value) ? value : "active";
}

export function parseDashboardNavigation(search = "", today = new Date().toISOString().slice(0, 10)) {
  const params = new URLSearchParams(search);

  return {
    section: normalizeDashboardSection(params.get("section")),
    catalogView: normalizeCatalogView(params.get("view")),
    analytics: normalizeAnalyticsNavigation(params, today),
  };
}

export function buildDashboardUrl(section, catalogView = "active", analytics = null) {
  const normalizedSection = normalizeDashboardSection(section);
  const params = new URLSearchParams({ section: normalizedSection });

  if (normalizedSection === "catalog") {
    params.set("view", normalizeCatalogView(catalogView));
  }
  if (normalizedSection === "metrics" && analytics?.mode === "custom") {
    params.set("analytics_mode", "custom");
    if (isIsoDate(analytics.startDate)) params.set("analytics_start", analytics.startDate);
    if (isIsoDate(analytics.endDate)) params.set("analytics_end", analytics.endDate);
  }
  if (normalizedSection === "metrics" && analytics?.mode === "month" && isIsoMonth(analytics.month)) {
    params.set("analytics_mode", "month");
    params.set("analytics_month", analytics.month);
  }

  return `/dashboard?${params.toString()}`;
}
