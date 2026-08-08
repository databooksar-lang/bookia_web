export const BILLING_LOAD_TIMEOUT_MS = 15_000;
export const BILLING_LOAD_TIMEOUT_MESSAGE = "La carga de la suscripcion tardo demasiado. Reintenta.";

export function createLatestBillingRequestGuard() {
  let latestRequest = 0;

  return {
    begin() {
      latestRequest += 1;
      return latestRequest;
    },
    invalidate() {
      latestRequest += 1;
    },
    isCurrent(requestId) {
      return requestId === latestRequest;
    },
  };
}

export function loadBillingSubscription(
  fetchSubscription,
  {
    timeoutMs = BILLING_LOAD_TIMEOUT_MS,
    setTimeoutFn = setTimeout,
    clearTimeoutFn = clearTimeout,
  } = {},
) {
  const controller = new AbortController();
  let timedOut = false;
  let timeoutId;
  const request = Promise.resolve().then(() => fetchSubscription({ signal: controller.signal }));
  const timeout = new Promise((_, reject) => {
    timeoutId = setTimeoutFn(() => {
      timedOut = true;
      controller.abort();
      reject(new Error(BILLING_LOAD_TIMEOUT_MESSAGE));
    }, timeoutMs);
  });

  return Promise.race([request, timeout])
    .catch((error) => {
      if (timedOut) throw new Error(BILLING_LOAD_TIMEOUT_MESSAGE);
      throw error;
    })
    .finally(() => clearTimeoutFn(timeoutId));
}
