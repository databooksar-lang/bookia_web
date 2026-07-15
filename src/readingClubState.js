export function createReadingClubDraft(club = null) {
  return {
    id: club?.id ?? null,
    title: club?.title ?? "",
    description: club?.description ?? "",
    genre_id: club?.genre_id != null ? String(club.genre_id) : "",
    meeting_date: club?.meeting_date ?? "",
    location: club?.location ?? "",
    is_visible: club?.is_visible ?? true,
  };
}

export function buildReadingClubPayload(draft) {
  return {
    title: String(draft.title || "").trim(),
    description: String(draft.description || "").trim(),
    genre_id: Number(draft.genre_id),
    meeting_date: draft.meeting_date || null,
    location: String(draft.location || "").trim() || null,
    is_visible: Boolean(draft.is_visible),
  };
}

export function displayReadingClubDate(value) {
  if (!value) {
    return "Fecha a confirmar";
  }
  const [year, month, day] = String(value).split("-");
  if (!year || !month || !day) {
    return "Fecha a confirmar";
  }
  return `${day}/${month}/${year}`;
}
