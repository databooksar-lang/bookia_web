import assert from "node:assert/strict";

import * as pendingActions from "../src/pendingReaderAction.js";
import {
  PENDING_READER_ACTION_STORAGE_KEY,
  applyPendingReaderAction,
  createPendingReaderAction,
  getPendingReaderActionCopy,
  readPendingReaderAction,
  savePendingReaderAction,
} from "../src/pendingReaderAction.js";
import { apiFetch } from "../src/api.js";

const NOW = Date.parse("2026-08-11T12:00:00.000Z");
const ATTEMPT_ID = "123e4567-e89b-42d3-a456-426614174000";

function createMemoryStorage(initialValue) {
  const values = new Map();
  if (initialValue !== undefined) values.set(PENDING_READER_ACTION_STORAGE_KEY, initialValue);
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

export function registerPendingReaderActionTests(test) {
  test("stores a versioned favorite intent with a safe same-origin return path", () => {
    const storage = createMemoryStorage();

    const saved = savePendingReaderAction({
      type: "favorite_book",
      targetId: 12,
      bookstoreId: 7,
      returnPath: "https://mybookia.app/bookstores/el-lector?book=12#detalle",
    }, { storage, origin: "https://mybookia.app", now: () => NOW, randomUUID: () => ATTEMPT_ID });

    assert.deepEqual(saved, {
      version: 2,
      type: "favorite_book",
      target_id: 12,
      bookstore_id: 7,
      return_path: "/bookstores/el-lector?book=12#detalle",
      attempt_id: ATTEMPT_ID,
      created_at: "2026-08-11T12:00:00.000Z",
    });
    assert.deepEqual(readPendingReaderAction({ storage, origin: "https://mybookia.app", now: () => NOW }), saved);
  });

  test("rejects invalid action ids, unsupported types and cross-origin returns", () => {
    assert.equal(createPendingReaderAction({ type: "favorite_book", targetId: 0, returnPath: "/" }), null);
    assert.equal(createPendingReaderAction({ type: "follow_bookstore", targetId: 2.5, returnPath: "/" }), null);
    assert.equal(createPendingReaderAction({ type: "delete_account", targetId: 2, returnPath: "/" }), null);
    assert.equal(createPendingReaderAction({ type: "favorite_book", targetId: 2, returnPath: "//evil.example/path" }), null);
    assert.equal(createPendingReaderAction({ type: "favorite_book", targetId: 2, returnPath: "/\\evil.example/path" }), null);
    assert.equal(createPendingReaderAction({ type: "favorite_book", targetId: 2, returnPath: "https://evil.example/path", origin: "https://mybookia.app" }), null);
  });

  test("drops malformed or obsolete stored intents", () => {
    const malformed = createMemoryStorage("not-json");
    const obsolete = createMemoryStorage(JSON.stringify({ version: 0, type: "favorite_book", target_id: 4, return_path: "/" }));

    assert.equal(readPendingReaderAction({ storage: malformed }), null);
    assert.equal(readPendingReaderAction({ storage: obsolete }), null);
    assert.equal(malformed.getItem(PENDING_READER_ACTION_STORAGE_KEY), null);
    assert.equal(obsolete.getItem(PENDING_READER_ACTION_STORAGE_KEY), null);
  });

  test("drops pending intents after the thirty minute TTL", () => {
    const storage = createMemoryStorage();
    savePendingReaderAction({ type: "favorite_book", targetId: 5, returnPath: "/" }, {
      storage,
      now: () => NOW,
      randomUUID: () => ATTEMPT_ID,
    });

    assert.equal(readPendingReaderAction({ storage, now: () => NOW + (30 * 60 * 1000) + 1 }), null);
    assert.equal(storage.getItem(PENDING_READER_ACTION_STORAGE_KEY), null);
  });

  test("applies a pending action once, clears it after success and emits non-PII analytics", async () => {
    const storage = createMemoryStorage();
    savePendingReaderAction({ type: "follow_bookstore", targetId: 9, bookstoreId: 9, returnPath: "/bookstores/eterna" }, { storage, now: () => NOW, randomUUID: () => ATTEMPT_ID });
    const calls = [];
    const tracked = [];

    const result = await applyPendingReaderAction({
      storage,
      now: () => NOW,
      send: async (path, options) => calls.push([path, options.method]),
      track: async (event) => tracked.push(event),
    });
    const second = await applyPendingReaderAction({ storage, now: () => NOW, send: async () => assert.fail("must not repeat") });

    assert.deepEqual(calls, [["/dashboard/favorites/bookstores/9", "POST"]]);
    assert.deepEqual(tracked, [{ eventType: "reader_action_applied", actionType: "follow_bookstore", bookstoreId: 9, attemptId: ATTEMPT_ID }]);
    assert.equal(storage.getItem(PENDING_READER_ACTION_STORAGE_KEY), null);
    assert.equal(result.status, "applied");
    assert.equal(result.returnPath, "/bookstores/eterna");
    assert.equal(second.status, "none");
  });

  test("keeps a pending action when its API request fails so retry is user-driven", async () => {
    const storage = createMemoryStorage();
    savePendingReaderAction({ type: "favorite_book", targetId: 21, bookstoreId: 3, returnPath: "/?q=ficciones" }, { storage });

    await assert.rejects(
      applyPendingReaderAction({ storage, send: async () => { throw new Error("offline"); } }),
      /offline/,
    );

    assert.equal(readPendingReaderAction({ storage })?.target_id, 21);
  });

  test("clears pending actions after terminal API responses", async () => {
    for (const status of [404, 410, 422]) {
      const storage = createMemoryStorage();
      savePendingReaderAction({ type: "favorite_book", targetId: 21, returnPath: "/" }, { storage });
      const error = Object.assign(new Error("terminal"), { status });

      await assert.rejects(applyPendingReaderAction({ storage, send: async () => { throw error; } }), /terminal/);
      assert.equal(readPendingReaderAction({ storage }), null);
    }
  });

  test("preserves HTTP status on API errors used for terminal classification", async () => {
    const previousFetch = globalThis.fetch;
    globalThis.fetch = async () => ({
      status: 410,
      ok: false,
      headers: { get: () => "application/json" },
      json: async () => ({ detail: "Ya no existe." }),
    });
    try {
      await assert.rejects(apiFetch("/dashboard/favorites/books/8", { method: "POST" }), (error) => error.message === "Ya no existe." && error.status === 410);
    } finally {
      globalThis.fetch = previousFetch;
    }
  });

  test("retains pending actions after transient API responses", async () => {
    const storage = createMemoryStorage();
    savePendingReaderAction({ type: "favorite_book", targetId: 21, returnPath: "/" }, { storage });
    const error = Object.assign(new Error("temporary"), { status: 503 });

    await assert.rejects(applyPendingReaderAction({ storage, send: async () => { throw error; } }), /temporary/);
    assert.equal(readPendingReaderAction({ storage })?.target_id, 21);
  });

  test("deduplicates concurrent post-auth attempts for the same browser session", async () => {
    const storage = createMemoryStorage();
    savePendingReaderAction({ type: "favorite_book", targetId: 31, returnPath: "/" }, { storage });
    let release;
    let calls = 0;
    const send = () => {
      calls += 1;
      return new Promise((resolve) => { release = resolve; });
    };

    const first = applyPendingReaderAction({ storage, send });
    const second = applyPendingReaderAction({ storage, send });
    assert.equal(calls, 1);
    release({});
    const [firstResult, secondResult] = await Promise.all([first, second]);

    assert.equal(firstResult.status, "applied");
    assert.equal(secondResult.status, "applied");
    assert.equal(calls, 1);
  });

  test("provides contextual, action-specific auth copy", () => {
    assert.match(getPendingReaderActionCopy({ type: "favorite_book" }).description, /guardar este libro/i);
    assert.match(getPendingReaderActionCopy({ type: "follow_bookstore" }).description, /seguir esta librer/i);
  });

  test("stores only validated identifiers for resumable contact and club intents", () => {
    const storage = createMemoryStorage();
    const contact = savePendingReaderAction({
      type: "contact_bookstore",
      targetId: 9,
      catalogItemId: 21,
      source: "book_detail_modal",
      returnPath: "/bookstores/eterna",
      phone: "1112345678",
      message: "private",
      externalUrl: "https://wa.me/1112345678",
    }, { storage, now: () => NOW, randomUUID: () => ATTEMPT_ID });

    assert.deepEqual(contact, {
      version: 2,
      type: "contact_bookstore",
      target_id: 9,
      catalog_item_id: 21,
      source: "book_detail_modal",
      return_path: "/bookstores/eterna",
      attempt_id: ATTEMPT_ID,
      created_at: "2026-08-11T12:00:00.000Z",
    });
    assert.doesNotMatch(storage.getItem(PENDING_READER_ACTION_STORAGE_KEY), /1112345678|private|wa\.me/);

    const club = createPendingReaderAction({ type: "reading_club_interest", targetId: 33, bookstoreId: 9, returnPath: "/#clubes", attemptId: ATTEMPT_ID, createdAt: "2026-08-11T12:00:00.000Z" });
    assert.equal(club.target_id, 33);
    assert.equal(club.bookstore_id, 9);
    assert.equal(createPendingReaderAction({ type: "contact_bookstore", targetId: 9, catalogItemId: 0, returnPath: "/" }), null);
    assert.equal(createPendingReaderAction({ type: "contact_bookstore", targetId: 9, source: "search_result", returnPath: "/" }), null);
    assert.equal(createPendingReaderAction({ type: "reading_club_interest", targetId: 33, catalogItemId: 21, returnPath: "/" }), null);
  });

  test("classifies legacy actions for auto-apply and new actions for explicit continuation", () => {
    assert.equal(pendingActions.isAutoAppliedPendingReaderAction?.({ type: "favorite_book" }), true);
    assert.equal(pendingActions.isAutoAppliedPendingReaderAction?.({ type: "follow_bookstore" }), true);
    assert.equal(pendingActions.isAutoAppliedPendingReaderAction?.({ type: "contact_bookstore" }), false);
    assert.equal(pendingActions.isResumablePendingReaderAction?.({ type: "contact_bookstore" }), true);
    assert.equal(pendingActions.isResumablePendingReaderAction?.({ type: "reading_club_interest" }), true);
    assert.equal(pendingActions.isResumablePendingReaderAction?.({ type: "favorite_book" }), false);
  });

  test("routes post-auth actions by action kind and supports both active account types for continuations", () => {
    const reader = { account: { email: "reader@example.com" }, reader_profile: { id: 1 } };
    const bookstore = { account: { email: "store@example.com" }, bookstore: { id: 9 } };

    assert.equal(pendingActions.getPendingActionAuthenticationMode?.({ type: "favorite_book" }, reader), "auto_apply");
    assert.equal(pendingActions.getPendingActionAuthenticationMode?.({ type: "favorite_book" }, bookstore), "wrong_account");
    assert.equal(pendingActions.getPendingActionAuthenticationMode?.({ type: "contact_bookstore" }, reader), "resume");
    assert.equal(pendingActions.getPendingActionAuthenticationMode?.({ type: "contact_bookstore" }, bookstore), "resume");
    assert.equal(pendingActions.getPendingActionAuthenticationMode?.({ type: "reading_club_interest" }, bookstore), "resume");
  });

  test("provides contextual auth and continuation copy for resumable actions", () => {
    const contact = getPendingReaderActionCopy({ type: "contact_bookstore", catalog_item_id: 21 });
    const club = getPendingReaderActionCopy({ type: "reading_club_interest" });

    assert.match(contact.title, /consult. por este libro/i);
    assert.match(contact.description, /cuenta/i);
    assert.match(contact.continuationDescription, /WhatsApp/i);
    assert.match(club.title, /club de lectura/i);
    assert.match(club.continuationTitle, /inter.s/i);
  });

  test("clears and tracks a matching resumable action once after explicit success", async () => {
    const storage = createMemoryStorage();
    savePendingReaderAction({ type: "reading_club_interest", targetId: 33, bookstoreId: 9, returnPath: "/#clubes" }, { storage, now: () => NOW, randomUUID: () => ATTEMPT_ID });
    const tracked = [];

    const first = await pendingActions.completeResumablePendingReaderAction?.({
      type: "reading_club_interest",
      targetId: 33,
      storage,
      now: () => NOW,
      track: async (event) => tracked.push(event),
    });
    const second = await pendingActions.completeResumablePendingReaderAction?.({ type: "reading_club_interest", targetId: 33, storage, now: () => NOW, track: async () => assert.fail("must not track twice") });

    assert.equal(first?.status, "completed");
    assert.equal(second?.status, "none");
    assert.deepEqual(tracked, [{ eventType: "reader_action_applied", actionType: "reading_club_interest", bookstoreId: 9, attemptId: ATTEMPT_ID }]);
    assert.equal(storage.getItem(PENDING_READER_ACTION_STORAGE_KEY), null);
  });

  test("cancels only the pending action created by the open auth dialog", () => {
    const storage = createMemoryStorage();
    const first = savePendingReaderAction({ type: "contact_bookstore", targetId: 9, returnPath: "/bookstores/eterna" }, { storage, now: () => NOW, randomUUID: () => ATTEMPT_ID });
    const replacement = savePendingReaderAction({ type: "reading_club_interest", targetId: 33, returnPath: "/#clubes" }, { storage, now: () => NOW, randomUUID: () => "223e4567-e89b-42d3-a456-426614174000" });

    assert.equal(pendingActions.cancelPendingReaderAction?.(first, { storage, now: () => NOW }), false);
    assert.equal(readPendingReaderAction({ storage, now: () => NOW })?.attempt_id, replacement.attempt_id);
    assert.equal(pendingActions.cancelPendingReaderAction?.(replacement, { storage, now: () => NOW }), true);
    assert.equal(readPendingReaderAction({ storage, now: () => NOW }), null);
  });

}
