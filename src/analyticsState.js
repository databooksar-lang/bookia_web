import { apiFetch } from "./api.js";

export function buildWebInteractionEventPayload({ eventType, bookstoreId, catalogItemId, source, metadata }) {
  const payload = {
    event_type: eventType,
    bookstore_id: bookstoreId,
  };

  if (catalogItemId !== undefined && catalogItemId !== null) {
    payload.catalog_item_id = catalogItemId;
  }
  if (source && String(source).trim()) {
    payload.source = String(source).trim();
  }
  if (metadata && Object.keys(metadata).length > 0) {
    payload.metadata = metadata;
  }

  return payload;
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