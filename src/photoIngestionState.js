export const PHOTO_ACCEPT = "image/jpeg,image/png,image/webp";
export function validatePhoto(file) {
  if (!file || !PHOTO_ACCEPT.split(",").includes(file.type)) return "Elegí una foto JPG, PNG o WebP.";
  if (!file.size || file.size > 10 * 1024 * 1024) return "La foto debe pesar entre 1 byte y 10 MB.";
  return "";
}
export function getPhotoPublishState(drafts, selected, availableSlots) {
  const chosen = drafts.filter((draft) => draft.status === "pending_store_review" && selected.includes(draft.id));
  const invalid = chosen.some((draft) => !String(draft.title || "").trim() || !String(draft.author || "").trim());
  const overLimit = Number.isFinite(availableSlots) && chosen.length > availableSlots;
  return { ids: chosen.map((draft) => draft.id), invalid, overLimit, canPublish: chosen.length > 0 && !invalid && !overLimit };
}
