const NEWS_CATEGORY_LABELS = {
  offer: "Oferta",
  event: "Evento",
  news: "Novedad",
};

const MAX_NEWS_IMAGE_BYTES = 5 * 1024 * 1024;
const NEWS_IMAGE_TYPES = new Set(["image/png", "image/jpeg", "image/webp"]);

export function getNewsImageValidationError(file) {
  if (!file) return "";
  if (!NEWS_IMAGE_TYPES.has(file.type)) return "La imagen debe ser PNG, JPEG o WebP.";
  if (file.size > MAX_NEWS_IMAGE_BYTES) return "La imagen no puede superar los 5 MB.";
  return "";
}

export function createNewsDraft(item = null) {
  return {
    id: item?.id ?? null,
    category: item?.category ?? "news",
    title: item?.title ?? "",
    description: item?.description ?? "",
    event_date: item?.event_date ?? "",
    image_url: item?.image_url ?? null,
    image: null,
    remove_image: false,
  };
}

export function buildNewsFormData(draft) {
  const form = new FormData();
  form.append("category", draft.category);
  form.append("title", String(draft.title || "").trim());
  form.append("description", String(draft.description || "").trim());
  form.append("event_date", draft.event_date || "");
  if (!draft.event_date) form.append("clear_event_date", "true");
  if (draft.remove_image) form.append("remove_image", "true");
  if (draft.image && !draft.remove_image) form.append("image", draft.image);
  return form;
}

export function newsCategoryLabel(category) {
  return NEWS_CATEGORY_LABELS[category] || NEWS_CATEGORY_LABELS.news;
}

export function displayNewsDate(value) {
  if (!value) return "";
  const [year, month, day] = String(value).split("-");
  return year && month && day ? `${day}/${month}/${year}` : "";
}

export function getActiveNewsCount(items) {
  return (items || []).filter((item) => item.is_active).length;
}

export function getPublicNewsItems(items) {
  return (items || []).filter((item) => item.is_active).slice(0, 3);
}
