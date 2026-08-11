import assert from "node:assert/strict";

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

}
