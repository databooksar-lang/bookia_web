import assert from "node:assert/strict";
import { getAccountDestination } from "../src/accountDestination.js";
import { applyPendingReaderAction, completePendingReaderAuthentication, readPendingReaderAction, savePendingReaderAction } from "../src/pendingReaderAction.js";
import { needsReaderOnboarding, saveOnboardingAuthor } from "../src/readerOnboardingState.js";

export function registerReaderOnboardingStateTests(test) {
  test("preserves favorite and contact intents across onboarding and resumes only once", async () => {
    for (const type of ["favorite_book", "contact_author"]) {
      const values = new Map();
      const storage = { getItem: (key) => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: (key) => values.delete(key) };
      const origin = "https://mybookia.app";
      const now = () => Date.parse("2026-09-19T12:00:00Z");
      const action = savePendingReaderAction({ type, targetId: 12, bookstoreId: 7, returnPath: "/readers/ana?book=12" }, { storage, origin, now, randomUUID: () => "123e4567-e89b-42d3-a456-426614174000" });
      assert.ok(action);
      let writes = 0;
      const options = { storage, origin, now, fallbackPath: "/", track: async () => {}, apply: (args) => applyPendingReaderAction({ ...args, send: async () => { writes++; }, track: async () => {} }) };
      const pending = await completePendingReaderAuthentication({ ...options, registered: true, sessionData: { reader_profile: { onboarding_step: "author" } } });
      assert.equal(pending.status, "onboarding");
      assert.equal(writes, 0);
      assert.deepEqual(readPendingReaderAction({ storage, origin, now }), action);
      const completed = await completePendingReaderAuthentication({ ...options, sessionData: { reader_profile: { onboarding_step: "complete" } } });
      assert.equal(completed.returnPath, action.return_path);
      assert.equal(writes, type === "favorite_book" ? 1 : 0);
      await completePendingReaderAuthentication({ ...options, sessionData: { reader_profile: { onboarding_step: "complete" } } });
      assert.equal(writes, type === "favorite_book" ? 1 : 0);
    }
  });
  test("routes pending readers to onboarding and leaves existing accounts alone", () => {
    for (const step of ["wanted", "author"]) {
      assert.equal(needsReaderOnboarding({ reader_profile: { onboarding_step: step } }), true);
      assert.equal(getAccountDestination({ reader_profile: { onboarding_step: step } }), "/onboarding/reader");
    }
    for (const step of [undefined, "exempt", "complete"]) {
      assert.equal(needsReaderOnboarding({ reader_profile: { onboarding_step: step } }), false);
      assert.equal(getAccountDestination({ reader_profile: { onboarding_step: step } }), "/profile");
    }
    assert.equal(getAccountDestination({ bookstore: {} }), "/dashboard");
  });

  test("authentication defers pending actions until onboarding has finished", async () => {
    const navigations = [];
    let applications = 0;
    const result = await completePendingReaderAuthentication({
      sessionData: { reader_profile: { onboarding_step: "wanted" } },
      storage: null, fallbackPath: "/profile", navigateTo: (path) => navigations.push(path),
      apply: async () => { applications++; },
    });
    assert.equal(result.status, "onboarding");
    assert.deepEqual(navigations, ["/onboarding/reader"]);
    assert.equal(applications, 0);
  });

  test("requires an explicit author answer and rights before activation", async () => {
    const send = async () => { throw new Error("unexpected API request"); };
    await assert.rejects(saveOnboardingAuthor({ answer: null, send }), /Respondé/);
    await assert.rejects(saveOnboardingAuthor({ answer: true, rightsAccepted: false, send }), /declaración/);
  });

  test("keeps author active on optional failure and allows completion without failed data", async () => {
    const requests = [];
    const session = { reader_profile: { onboarding_step: "author" }, author_profile: null };
    const send = async (path, options = {}) => {
      requests.push(path);
      if (path === "/me") return session;
      if (path.endsWith("/activate")) { session.author_profile = { is_active: true }; return { author_profile: session.author_profile }; }
      if (path === "/dashboard/author-profile") throw new Error("Teléfono inválido");
      if (path === "/dashboard/reader-onboarding") { session.reader_profile.onboarding_step = "complete"; return { reader_profile: session.reader_profile }; }
      throw new Error(`unexpected ${path}`);
    };
    const partial = await saveOnboardingAuthor({ answer: true, rightsAccepted: true, phone: "invalid", send });
    assert.match(partial.errors.phone, /Teléfono/);
    assert.equal(session.author_profile.is_active, true);
    assert.equal(session.reader_profile.onboarding_step, "author");
    const complete = await saveOnboardingAuthor({ answer: true, rightsAccepted: true, phone: "invalid", skipOptional: true, send });
    assert.equal(complete.completed, true);
    assert.equal(requests.filter((path) => path.endsWith("/activate")).length, 1);
    assert.equal(requests.filter((path) => path === "/dashboard/author-profile").length, 1);
  });

  test("reconciles a lost completion response without repeating writes", async () => {
    const calls = [];
    const session = { reader_profile: { onboarding_step: "complete" }, author_profile: { is_active: true } };
    const result = await saveOnboardingAuthor({ answer: true, rightsAccepted: true, send: async (path) => { calls.push(path); return session; } });
    assert.equal(result.completed, true);
    assert.deepEqual(calls, ["/me"]);
  });
}
