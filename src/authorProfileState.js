export function isActiveAuthor(authorProfile) {
  return authorProfile?.is_active === true;
}

export function getAuthorProfileView({ authorProfile, readerProfile } = {}) {
  if (!isActiveAuthor(authorProfile)) return "inactive";
  return readerProfile?.is_public === true ? "active_public" : "active_private";
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
