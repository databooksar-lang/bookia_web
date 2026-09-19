import { activateAuthorProfile, deactivateAuthorProfile, updateAuthorAvatar, updateAuthorProfileWhatsApp } from "./authorProfileState.js";

export const READER_ONBOARDING_PATH = "/onboarding/reader";

export function needsReaderOnboarding(session) {
  return ["wanted", "author"].includes(session?.reader_profile?.onboarding_step);
}

// Read the persisted state before retrying: a previous response may have been lost.
export async function saveOnboardingAuthor({ answer, rightsAccepted = false, phone = "", avatar = null, skipOptional = false, send, onSession = () => {} }) {
  if (typeof answer !== "boolean") throw new Error("Respondé si sos autor/a para continuar.");
  if (answer && !rightsAccepted) throw new Error("Aceptá la declaración de derechos para activar Autor/a.");
  let session = await send("/me");
  onSession(session);
  if (session.reader_profile?.onboarding_step === "complete") return { completed: true, session, errors: {} };
  if (answer && !session.author_profile?.is_active) {
    const author = await activateAuthorProfile(send);
    session = { ...session, author_profile: author };
    onSession(session);
  } else if (!answer && session.author_profile?.is_active) {
    const author = await deactivateAuthorProfile(send);
    session = { ...session, author_profile: author };
    onSession(session);
  }
  const errors = {};
  const saved = {};
  if (answer && !skipOptional) {
    // These writes touch the same profile, so keep them sequential.
    if (phone.trim()) {
      try {
        const author = await updateAuthorProfileWhatsApp(send, phone);
        session = { ...session, author_profile: author };
        onSession(session);
        saved.phone = true;
      } catch (error) {
        if (error.status === 401 || error.status === 403) throw error;
        errors.phone = error.message;
      }
    }
    if (avatar) {
      try {
        const author = await updateAuthorAvatar(send, avatar);
        session = { ...session, author_profile: author };
        onSession(session);
        saved.avatar = true;
      } catch (error) {
        if (error.status === 401 || error.status === 403) throw error;
        errors.avatar = error.message;
      }
    }
  }
  if (Object.keys(errors).length) {
    return { completed: false, session, errors, saved };
  }
  const data = await send("/dashboard/reader-onboarding", { method: "PATCH", body: JSON.stringify({ step: "complete", is_author: answer }) });
  session = { ...session, reader_profile: data.reader_profile };
  onSession(session);
  return { completed: true, session, errors, saved };
}
