import { needsReaderOnboarding, READER_ONBOARDING_PATH } from "./readerOnboardingState.js";

export function getAccountDestination(session) {
  if (needsReaderOnboarding(session)) return READER_ONBOARDING_PATH;
  return session?.reader_profile ? "/profile" : "/dashboard";
}
