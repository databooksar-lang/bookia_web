export function isActiveAuthor(authorProfile) {
  return authorProfile?.is_active === true;
}

export function getAuthorProfileView({ authorProfile } = {}) {
  if (!isActiveAuthor(authorProfile)) return "inactive";
  return "active_public";
}

export async function activateAuthorProfile(apiFetch) {
  const data = await apiFetch("/dashboard/author-profile/activate", {
    method: "POST",
    body: JSON.stringify({ rights_declaration_accepted: true }),
  });
  return data.author_profile;
}

export async function deactivateAuthorProfile(apiFetch) {
  const data = await apiFetch("/dashboard/author-profile/deactivate", { method: "POST" });
  return data.author_profile;
}

export async function updateAuthorProfileWhatsApp(apiFetch, whatsappPhone) {
  const data = await apiFetch("/dashboard/author-profile", { method: "PATCH", body: JSON.stringify({ whatsapp_phone: String(whatsappPhone || "").trim() || null }) });
  return data.author_profile;
}
