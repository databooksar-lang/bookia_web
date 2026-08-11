import { apiFetch } from "./api.js";

export function normalizeFollowerMetrics(metrics = {}) {
  return {
    active_followers: Number(metrics.active_followers || 0),
    follows: Number(metrics.follows || 0),
    unfollows: Number(metrics.unfollows || 0),
    net_change: Number(metrics.net_change || 0),
  };
}

export function buildWebInteractionEventPayload({ eventType, bookstoreId, catalogItemId, readingClubId, source, metadata }) {
  const payload = {
    event_type: eventType,
    bookstore_id: bookstoreId,
  };

  if (catalogItemId !== undefined && catalogItemId !== null) {
    payload.catalog_item_id = catalogItemId;
  }
  if (readingClubId !== undefined && readingClubId !== null) payload.reading_club_id = readingClubId;
  if (source && String(source).trim()) {
    payload.source = String(source).trim();
  }
  if (metadata && Object.keys(metadata).length > 0) {
    payload.metadata = metadata;
  }

  return payload;
}

export function buildReaderFunnelEventPayload({ eventType, actionType, bookstoreId, attemptId }) {
  return {
    event_type: eventType,
    action_type: actionType,
    ...(bookstoreId !== undefined && bookstoreId !== null ? { bookstore_id: bookstoreId } : {}),
    attempt_id: attemptId,
  };
}

export async function trackReaderFunnelEvent(event, { send = apiFetch } = {}) {
  try {
    await send("/analytics/reader-funnel-events", {
      method: "POST",
      body: JSON.stringify(buildReaderFunnelEventPayload(event)),
    });
    return true;
  } catch {
    return false;
  }
}

export async function trackWebInteractionEvent(event, { send = apiFetch } = {}) {
  try {
    await send("/analytics/events", {
      method: "POST",
      body: JSON.stringify(buildWebInteractionEventPayload(event)),
    });
    return true;
  } catch (error) {
    return false;
  }
}

export async function trackAcquisitionEvent(eventType, { send = apiFetch } = {}) {
  try {
    await send("/analytics/acquisition-events", {
      method: "POST",
      body: JSON.stringify({ event_type: eventType, source: "bookstores_landing" }),
    });
    return true;
  } catch (error) {
    return false;
  }
}
