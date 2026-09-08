export function normalizeAuthorDiscoveryItems(items = [], limit = 12) {
  const maximum = Number.isFinite(limit) ? Math.max(0, Math.floor(limit)) : 12;
  return items
    .filter((item) => item && String(item.display_name || "").trim() && String(item.slug || "").trim())
    .slice(0, maximum)
    .map((item) => ({
      display_name: String(item.display_name).trim(),
      slug: String(item.slug).trim(),
      description: item.description || null,
      avatar_url: item.avatar_url || null,
    }));
}
