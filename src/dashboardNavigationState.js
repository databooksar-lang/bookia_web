const DASHBOARD_SECTIONS = new Set(["profile", "new-book", "catalog", "clubs", "metrics"]);
const CATALOG_VIEWS = new Set(["active", "sold-out"]);

function normalizeDashboardSection(value) {
  return DASHBOARD_SECTIONS.has(value) ? value : "profile";
}

function normalizeCatalogView(value) {
  return CATALOG_VIEWS.has(value) ? value : "active";
}

export function parseDashboardNavigation(search = "") {
  const params = new URLSearchParams(search);

  return {
    section: normalizeDashboardSection(params.get("section")),
    catalogView: normalizeCatalogView(params.get("view")),
  };
}

export function buildDashboardUrl(section, catalogView = "active") {
  const normalizedSection = normalizeDashboardSection(section);
  const params = new URLSearchParams({ section: normalizedSection });

  if (normalizedSection === "catalog") {
    params.set("view", normalizeCatalogView(catalogView));
  }

  return `/dashboard?${params.toString()}`;
}
