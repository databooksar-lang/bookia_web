import assert from "node:assert/strict";

const ATTEMPT_ID = "123e4567-e89b-42d3-a456-426614174000";

import { buildReaderFunnelEventPayload, buildWebInteractionEventPayload, normalizeFollowerMetrics, trackAcquisitionEvent, trackReaderFunnelEvent, trackWebInteractionEvent } from "../src/analyticsState.js";

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

  register("tracks bookstore acquisition events without collecting personal data", async () => {
    const sent = [];
    const ok = await trackAcquisitionEvent("bookstore_demo_requested", {
      send: (path, options) => { sent.push([path, JSON.parse(options.body)]); return Promise.resolve({}); },
    });

    assert.equal(ok, true);
    assert.deepEqual(sent, [["/analytics/acquisition-events", {
      event_type: "bookstore_demo_requested",
      source: "bookstores_landing",
    }]]);
  });

  register("builds and sends reader funnel events to the dedicated endpoint", async () => {
    const sent = [];
    const event = { eventType: "reader_intent_started", actionType: "follow_bookstore", bookstoreId: 4, attemptId: ATTEMPT_ID };

    assert.deepEqual(buildReaderFunnelEventPayload(event), {
      event_type: "reader_intent_started",
      action_type: "follow_bookstore",
      bookstore_id: 4,
      attempt_id: ATTEMPT_ID,
    });
    assert.equal(await trackReaderFunnelEvent(event, { send: async (path, options) => sent.push([path, JSON.parse(options.body)]) }), true);
    assert.deepEqual(sent, [["/analytics/reader-funnel-events", buildReaderFunnelEventPayload(event)]]);
  });

  register("normalizes all four bookstore follower metrics", () => {
    assert.deepEqual(normalizeFollowerMetrics({ active_followers: 18, follows: 6, unfollows: 2, net_change: 4 }), {
      active_followers: 18,
      follows: 6,
      unfollows: 2,
      net_change: 4,
    });
    assert.deepEqual(normalizeFollowerMetrics(), { active_followers: 0, follows: 0, unfollows: 0, net_change: 0 });
  });
}
