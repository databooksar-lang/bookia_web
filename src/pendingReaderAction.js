import { apiFetch } from "./api.js";
import { trackReaderFunnelEvent } from "./analyticsState.js";

export const PENDING_READER_ACTION_STORAGE_KEY = "bookia.pending_reader_action";
const PENDING_READER_ACTION_VERSION = 2;
const READER_AUTH_TTL_MS = 30 * 60 * 1000;
const ACTION_TYPES = new Set(["favorite_book", "follow_bookstore"]);
const pendingApplications = new WeakMap();

function currentOrigin() {
  return typeof window !== "undefined" ? window.location.origin : "";
}

function currentStorage() {
  return typeof window !== "undefined" ? window.sessionStorage : null;
}

function positiveInteger(value) {
  return Number.isInteger(value) && value > 0;
}

function currentTime() {
  return Date.now();
}

function createUuid() {
  return globalThis.crypto?.randomUUID?.() || "";
}

function validUuid(value) {
  return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function validTimestamp(value) {
  return typeof value === "string" && Number.isFinite(Date.parse(value));
}

export function normalizePendingReturnPath(value, origin = currentOrigin()) {
  if (typeof value !== "string" || !value.trim()) return null;
  const candidate = value.trim();
  if (/[\\\u0000-\u001f\u007f]/.test(candidate)) return null;
  if (candidate.startsWith("/") && !candidate.startsWith("//")) return candidate;
  if (!origin) return null;
  try {
    const url = new URL(candidate, origin);
    if (url.origin !== origin) return null;
    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return null;
  }
}

export function createPendingReaderAction({ type, targetId, bookstoreId, returnPath, origin = currentOrigin(), attemptId, createdAt } = {}, { now = currentTime, randomUUID = createUuid } = {}) {
  const safeReturnPath = normalizePendingReturnPath(returnPath, origin);
  const safeAttemptId = attemptId || randomUUID();
  const safeCreatedAt = createdAt || new Date(now()).toISOString();
  if (!ACTION_TYPES.has(type) || !positiveInteger(targetId) || !safeReturnPath || !validUuid(safeAttemptId) || !validTimestamp(safeCreatedAt)) return null;
  if (bookstoreId !== undefined && bookstoreId !== null && !positiveInteger(bookstoreId)) return null;
  return {
    version: PENDING_READER_ACTION_VERSION,
    type,
    target_id: targetId,
    ...(positiveInteger(bookstoreId) ? { bookstore_id: bookstoreId } : {}),
    return_path: safeReturnPath,
    attempt_id: safeAttemptId,
    created_at: safeCreatedAt,
  };
}

function validateStoredAction(value, origin) {
  if (!value || value.version !== PENDING_READER_ACTION_VERSION) return null;
  return createPendingReaderAction({
    type: value.type,
    targetId: value.target_id,
    bookstoreId: value.bookstore_id,
    returnPath: value.return_path,
    origin,
    attemptId: value.attempt_id,
    createdAt: value.created_at,
  }, { randomUUID: () => "" });
}

export function savePendingReaderAction(input, { storage = currentStorage(), origin = currentOrigin(), now = currentTime, randomUUID = createUuid } = {}) {
  const action = createPendingReaderAction({ ...input, origin }, { now, randomUUID });
  if (!action || !storage) return null;
  try {
    storage.setItem(PENDING_READER_ACTION_STORAGE_KEY, JSON.stringify(action));
    return action;
  } catch {
    return null;
  }
}

export function clearPendingReaderAction({ storage = currentStorage() } = {}) {
  try {
    storage?.removeItem(PENDING_READER_ACTION_STORAGE_KEY);
  } catch {
    // Storage can be unavailable in hardened browser contexts.
  }
}

export function readPendingReaderAction({ storage = currentStorage(), origin = currentOrigin(), now = currentTime } = {}) {
  if (!storage) return null;
  try {
    const serialized = storage.getItem(PENDING_READER_ACTION_STORAGE_KEY);
    if (!serialized) return null;
    const action = validateStoredAction(JSON.parse(serialized), origin);
    const createdAt = action ? Date.parse(action.created_at) : NaN;
    const age = now() - createdAt;
    if (!action || !Number.isFinite(createdAt) || age < 0 || age > READER_AUTH_TTL_MS) {
      clearPendingReaderAction({ storage });
      return null;
    }
    return action;
  } catch {
    clearPendingReaderAction({ storage });
    return null;
  }
}

export function getPendingReaderActionCopy(action) {
  if (action?.type === "favorite_book") {
    return {
      title: "Guardá este libro en tu cuenta",
      description: "Creá tu perfil lector o ingresá para guardar este libro y volver a encontrarlo cuando quieras.",
      confirmation: "Libro guardado en tus favoritos.",
    };
  }
  if (action?.type === "follow_bookstore") {
    return {
      title: "Seguí esta librería",
      description: "Creá tu perfil lector o ingresá para seguir esta librería y encontrarla fácilmente.",
      confirmation: "Ahora seguís esta librería.",
    };
  }
  return { title: "Continuá en Bookia", description: "Ingresá o creá tu cuenta para continuar.", confirmation: "Acción completada." };
}

export function applyPendingReaderAction({ storage = currentStorage(), origin = currentOrigin(), now = currentTime, send = apiFetch, track = trackReaderFunnelEvent } = {}) {
  const inFlight = storage ? pendingApplications.get(storage) : null;
  if (inFlight) return inFlight;
  const application = (async () => {
    const action = readPendingReaderAction({ storage, origin, now });
    if (!action) return { status: "none" };
    const resource = action.type === "favorite_book" ? "books" : "bookstores";
    try {
      await send(`/dashboard/favorites/${resource}/${action.target_id}`, { method: "POST" });
    } catch (error) {
      if ([404, 410, 422].includes(error?.status)) clearPendingReaderAction({ storage });
      throw error;
    }
    clearPendingReaderAction({ storage });
    try {
      await track({
        eventType: "reader_action_applied",
        actionType: action.type,
        bookstoreId: action.bookstore_id,
        attemptId: action.attempt_id,
      });
    } catch {
      // Analytics must never undo a successfully applied reader action.
    }
    return {
      status: "applied",
      action,
      returnPath: action.return_path,
      message: getPendingReaderActionCopy(action).confirmation,
    };
  })();
  if (!storage) return application;
  pendingApplications.set(storage, application);
  return application.finally(() => {
    if (pendingApplications.get(storage) === application) pendingApplications.delete(storage);
  });
}
