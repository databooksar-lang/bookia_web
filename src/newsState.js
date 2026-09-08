const NEWS_CATEGORY_LABELS = {
  offer: "Oferta",
  event: "Evento",
  news: "Novedad",
};

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

export function getPublicNewsItems(items) {
  return (items || []).filter((item) => item.is_active).slice(0, 3);
}
