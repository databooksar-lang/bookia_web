export function getAccountDestination(session) {
  return session?.reader_profile ? "/profile" : "/dashboard";
}
