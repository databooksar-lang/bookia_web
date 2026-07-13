const API_ROUTE_PATTERN = /^\/(search|bookstores|auth|me|dashboard|catalog|genres)(\/|\?|$)/;

export function isBookiaApiRoute(path) {
  return API_ROUTE_PATTERN.test(path);
}
