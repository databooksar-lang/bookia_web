import assert from "node:assert/strict";

import { buildWebInteractionEventPayload, trackWebInteractionEvent } from "../src/analyticsState.js";

export function registerAnalyticsStateTests(register) {
  register("builds minimal web interaction analytics payloads", () => {
    assert.deepEqual(
      buildWebInteractionEventPayload({
        eventType: "book_detail_opened",
        bookstoreId: 7,
        catalogItemId: 12,
        source: "search_results",
        metadata: { path: "/" },
      }),
      {
        event_type: "book_detail_opened",
        bookstore_id: 7,
        catalog_item_id: 12,
        source: "search_results",
        metadata: { path: "/" },
      },
    );
  });

  register("omits empty analytics fields", () => {
    assert.deepEqual(
      buildWebInteractionEventPayload({ eventType: "bookstore_opened", bookstoreId: 3, source: "" }),
      { event_type: "bookstore_opened", bookstore_id: 3 },
    );
  });

  register("tracks web interaction events without surfacing send failures", async () => {
    const sent = [];
    const ok = await trackWebInteractionEvent(
      { eventType: "whatsapp_clicked", bookstoreId: 4, catalogItemId: 9, source: "book_detail_modal" },
      { send: (path, options) => { sent.push([path, JSON.parse(options.body)]); return Promise.resolve({}); } },
    );
    const failed = await trackWebInteractionEvent(
      { eventType: "whatsapp_clicked", bookstoreId: 4, source: "bookstore_page" },
      { send: () => Promise.reject(new Error("offline")) },
    );

    assert.equal(ok, true);
    assert.equal(failed, false);
    assert.equal(sent[0][0], "/analytics/events");
    assert.deepEqual(sent[0][1], {
      event_type: "whatsapp_clicked",
      bookstore_id: 4,
      catalog_item_id: 9,
      source: "book_detail_modal",
    });
  });
}