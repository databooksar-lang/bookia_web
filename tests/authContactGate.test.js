import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { createServer } from "vite";
import { PENDING_READER_ACTION_STORAGE_KEY, cancelPendingReaderAction, readPendingReaderAction, savePendingReaderAction } from "../src/pendingReaderAction.js";

const NOW = Date.parse("2026-08-11T12:00:00.000Z");
const ATTEMPT_ID = "123e4567-e89b-42d3-a456-426614174000";

function createMemoryStorage() {
  const values = new Map();
  return {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    removeItem: (key) => values.delete(key),
  };
}

export function registerAuthContactGateTests(test) {
  test("states the authenticated digital-contact and club-interest policy without changing cookie documentation", () => {
    const terms = readFileSync(new URL("../src/pages/TermsPage.jsx", import.meta.url), "utf8");
    const privacy = readFileSync(new URL("../src/pages/PrivacyPage.jsx", import.meta.url), "utf8");

    assert.doesNotMatch(terms, /contactar directamente a las librerias sin crear una cuenta/i);
    assert.match(terms, /cuenta autenticada.*contacto digital/i);
    assert.match(terms, /cuenta autenticada.*inter.s.*club/i);
    assert.match(privacy, /datos de contacto digital.*cuentas autenticadas/i);
    assert.match(privacy, /cuenta autenticada.*inter.s.*club/i);
  });

  test("styles the auth gate and locked contact card for desktop and mobile", () => {
    const styles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

    assert.match(styles, /\.auth-required-dialog\s*\{/);
    assert.match(styles, /\.auth-required-dialog-card\s*\{/);
    assert.match(styles, /\.auth-required-dialog-actions\s*\{/);
    assert.match(styles, /\.store-contact-lock\s*\{/);
    assert.match(styles, /@media \(max-width: 620px\)[\s\S]*\.auth-required-dialog-card/s);
  });


  test("renders an accessible contextual auth-required dialog with three choices", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const module = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
      assert.equal(typeof module.AuthRequiredDialog, "function");
      const markup = renderToStaticMarkup(createElement(module.AuthRequiredDialog, {
        action: { type: "contact_bookstore", target_id: 9 },
        onCancel: () => {},
      }));

      assert.match(markup, /role="dialog"/);
      assert.match(markup, /aria-modal="true"/);
      assert.match(markup, /aria-labelledby="auth-required-title"/);
      assert.match(markup, /Contactá a esta librería/);
      assert.match(markup, />Crear cuenta</);
      assert.match(markup, />Iniciar sesión</);
      assert.match(markup, />Ahora no</);
      assert.ok(markup.indexOf(">Crear cuenta") < markup.indexOf(">Iniciar sesión"));
    } finally {
      await vite.close();
    }
  });

  test("traps focus in both directions at dialog boundaries", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const module = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
      assert.equal(typeof module.trapDialogFocus, "function");
      const focused = [];
      const first = { focus: () => focused.push("first") };
      const last = { focus: () => focused.push("last") };
      const container = { querySelectorAll: () => [first, last] };

      module.trapDialogFocus({ key: "Tab", shiftKey: false, preventDefault: () => focused.push("prevent") }, container, last);
      module.trapDialogFocus({ key: "Tab", shiftKey: true, preventDefault: () => focused.push("prevent") }, container, first);

      assert.deepEqual(focused, ["prevent", "first", "prevent", "last"]);
    } finally {
      await vite.close();
    }
  });

  test("moves focus into the auth dialog, restores its trigger, and consumes Escape before stacked modals", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const module = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
      const focused = [];
      const trigger = { focus: () => focused.push("trigger") };
      const primary = { focus: () => focused.push("primary") };
      let scheduled;
      const cleanup = module.activateDialogFocus?.(primary, trigger, { schedule: (callback) => { scheduled = callback; return 7; }, cancel: (frame) => focused.push(`cancel-${frame}`) });
      scheduled?.();
      cleanup?.();

      const calls = [];
      const storage = createMemoryStorage();
      const action = savePendingReaderAction({ type: "contact_bookstore", targetId: 9, returnPath: "/bookstores/eterna" }, { storage, now: () => NOW, randomUUID: () => ATTEMPT_ID });
      const event = { key: "Escape", preventDefault: () => calls.push("prevent"), stopImmediatePropagation: () => calls.push("stop") };
      const handled = module.handleActionDialogEscape?.(event, () => {
        calls.push("cancel");
        cancelPendingReaderAction(action, { storage, now: () => NOW });
      });

      assert.deepEqual(focused, ["primary", "cancel-7", "trigger"]);
      assert.equal(handled, true);
      assert.deepEqual(calls, ["prevent", "stop", "cancel"]);
      assert.equal(readPendingReaderAction({ storage, now: () => NOW }), null);
    } finally {
      await vite.close();
    }
  });

  test("cancels from the auth backdrop only when the backdrop itself was clicked", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const module = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
      const calls = [];
      const backdrop = {};
      const storage = createMemoryStorage();
      const action = savePendingReaderAction({ type: "contact_bookstore", targetId: 9, returnPath: "/bookstores/eterna" }, { storage, now: () => NOW, randomUUID: () => ATTEMPT_ID });

      assert.equal(module.handleActionDialogBackdrop?.({ target: {}, currentTarget: backdrop }, () => calls.push("cancel")), false);
      assert.equal(readPendingReaderAction({ storage, now: () => NOW })?.attempt_id, ATTEMPT_ID);
      assert.equal(module.handleActionDialogBackdrop?.({ target: backdrop, currentTarget: backdrop }, () => { calls.push("cancel"); cancelPendingReaderAction(action, { storage, now: () => NOW }); }), true);
      assert.deepEqual(calls, ["cancel"]);
      assert.equal(readPendingReaderAction({ storage, now: () => NOW }), null);
    } finally {
      await vite.close();
    }
  });

  test("resolves bookstore continuations from freshly loaded contact and catalog data", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const module = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
      assert.equal(typeof module.resolveBookstoreContactContinuation, "function");
      const store = { id: 9, whatsapp_phone: "5491123456789" };
      const items = [{ id: 21, title: "Rayuela" }];
      const ready = module.resolveBookstoreContactContinuation({ type: "contact_bookstore", target_id: 9, catalog_item_id: 21, source: "book_detail_modal" }, store, items);

      assert.equal(ready.status, "ready");
      assert.equal(ready.catalogItem.id, 21);
      assert.equal(ready.source, "book_detail_modal");
      assert.match(ready.href, /^https:\/\/wa\.me\/5491123456789\?text=/);
      assert.match(decodeURIComponent(ready.href), /Rayuela/);
      assert.equal(module.resolveBookstoreContactContinuation({ type: "contact_bookstore", target_id: 9, catalog_item_id: 99 }, store, items).status, "unavailable");
      assert.equal(module.resolveBookstoreContactContinuation({ type: "contact_bookstore", target_id: 9 }, { id: 9 }, items).status, "unavailable");
      assert.equal(module.resolveBookstoreContactContinuation({ type: "contact_bookstore", target_id: 8 }, store, items), null);
    } finally {
      await vite.close();
    }
  });

  test("clears a matching contact intent only for a terminal bookstore load failure", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const module = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
      for (const status of [undefined, 500, 503]) {
        const storage = createMemoryStorage();
        savePendingReaderAction({ type: "contact_bookstore", targetId: 9, returnPath: "/bookstores/eterna" }, { storage, now: () => NOW, randomUUID: () => ATTEMPT_ID });
        const result = module.handleBookstoreContactLoadFailure?.({ error: Object.assign(new Error("temporary"), { status }), slug: "eterna", storage, now: () => NOW });
        assert.equal(result?.status, "retryable");
        assert.equal(readPendingReaderAction({ storage, now: () => NOW })?.target_id, 9);
      }

      const storage = createMemoryStorage();
      savePendingReaderAction({ type: "contact_bookstore", targetId: 9, returnPath: "/bookstores/eterna" }, { storage, now: () => NOW, randomUUID: () => ATTEMPT_ID });
      const result = module.handleBookstoreContactLoadFailure?.({ error: Object.assign(new Error("missing"), { status: 404 }), slug: "eterna", storage, now: () => NOW });
      assert.equal(result?.status, "unavailable");
      assert.match(result?.message || "", /librería ya no está disponible/i);
      assert.equal(readPendingReaderAction({ storage, now: () => NOW }), null);

      const unrelatedStorage = createMemoryStorage();
      savePendingReaderAction({ type: "contact_bookstore", targetId: 10, returnPath: "/bookstores/otra" }, { storage: unrelatedStorage, now: () => NOW, randomUUID: () => ATTEMPT_ID });
      assert.equal(module.handleBookstoreContactLoadFailure?.({ error: Object.assign(new Error("missing"), { status: 404 }), slug: "eterna", storage: unrelatedStorage, now: () => NOW }), null);
      assert.equal(readPendingReaderAction({ storage: unrelatedStorage, now: () => NOW })?.target_id, 10);
    } finally {
      await vite.close();
    }
  });

  test("renders anonymous bookstore contact without leaking digital fields and gates all profile WhatsApp variants", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const module = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
      assert.equal(typeof module.BookstoreContactCard, "function");
      assert.equal(typeof module.BookstoreWhatsAppAction, "function");
      const store = { id: 9, name: "Eterna", address: "Honduras 5574", whatsapp_phone: "5491123456789", correo: "hola@eterna.test", instagram_handle: "eterna", website_url: "https://eterna.test", contact_requires_auth: true };
      const contactMarkup = renderToStaticMarkup(createElement(module.BookstoreContactCard, { store, me: null, onRequireAuth: () => {} }));

      assert.match(contactMarkup, /Honduras 5574/);
      assert.match(contactMarkup, /cuenta.*contacto digital/i);
      assert.doesNotMatch(contactMarkup, /hola@eterna|2345-6789|instagram\.com|eterna\.test/);

      for (const source of ["bookstore_profile_contact", "bookstore_catalog_card", "book_detail_modal"]) {
        const gated = renderToStaticMarkup(createElement(module.BookstoreWhatsAppAction, { me: null, store, item: source === "bookstore_profile_contact" ? null : { id: 21, title: "Rayuela" }, source, onRequireAuth: () => {} }));
        assert.match(gated, /type="button"/);
        assert.doesNotMatch(gated, /wa\.me/);
      }
      const resolving = renderToStaticMarkup(createElement(module.BookstoreWhatsAppAction, { me: undefined, store, source: "bookstore_profile_contact", onRequireAuth: () => {} }));
      assert.match(resolving, /disabled=""/);
      const authenticated = renderToStaticMarkup(createElement(module.BookstoreWhatsAppAction, { me: { bookstore: { id: 2 } }, store, source: "bookstore_profile_contact", onRequireAuth: () => {} }));
      assert.match(authenticated, /href="https:\/\/wa\.me\//);
    } finally {
      await vite.close();
    }
  });

  test("gates club interest by session state and prefills either account type without phone or consent", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const module = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
      assert.equal(module.getReadingClubInterestMode(undefined), "loading");
      assert.equal(module.getReadingClubInterestMode(null), "auth_required");
      assert.equal(module.getReadingClubInterestMode({ reader_profile: { id: 1 } }), "open_form");
      assert.equal(module.getReadingClubInterestMode({ bookstore: { id: 9 } }), "open_form");
      assert.deepEqual(module.getReadingClubInterestPrefill({ account: { email: "reader@example.com" }, reader_profile: { display_name: "Ana" } }), { name: "Ana", email: "reader@example.com", phone: "", privacy_accepted: false });
      assert.deepEqual(module.getReadingClubInterestPrefill({ account: { email: "store@example.com" }, bookstore: { name: "Eterna" } }), { name: "Eterna", email: "store@example.com", phone: "", privacy_accepted: false });
      assert.deepEqual(module.resolveReadingClubContinuation({ type: "reading_club_interest", target_id: 33 }, [{ id: 33, title: "Narrativas" }]), { status: "ready", club: { id: 33, title: "Narrativas" } });
      assert.equal(module.resolveReadingClubContinuation({ type: "reading_club_interest", target_id: 33 }, []).status, "unavailable");
      assert.equal(module.resolveReadingClubContinuation({ type: "contact_bookstore", target_id: 33 }, []), null);
      const storage = createMemoryStorage();
      const pending = savePendingReaderAction({ type: "reading_club_interest", targetId: 33, returnPath: "/#clubes" }, { storage, now: () => NOW, randomUUID: () => ATTEMPT_ID });
      assert.equal(module.resolveReadingClubContinuation(pending, [], { error: "offline" }).status, "deferred");
      assert.equal(readPendingReaderAction({ storage, now: () => NOW })?.target_id, 33);
      assert.equal(module.resolveReadingClubContinuation(pending, [], { error: "" }).status, "unavailable");
      const unresolvedMarkup = renderToStaticMarkup(createElement(module.ReadingClubPublicCard, { club: { id: 33, title: "Narrativas", meeting_date: "2026-09-10" }, showInterest: true, onOpenDetails: () => {}, onOpenInterest: () => {}, interestDisabled: true }));
      assert.match(unresolvedMarkup, /disabled=""[^>]*>Estoy interesado@/);
    } finally {
      await vite.close();
    }
  });

  test("clears and tracks club continuation only after the authenticated interest request succeeds", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    const storage = createMemoryStorage();
    savePendingReaderAction({ type: "reading_club_interest", targetId: 33, bookstoreId: 9, returnPath: "/#clubes" }, { storage, now: () => NOW, randomUUID: () => ATTEMPT_ID });
    try {
      const module = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
      const calls = [];
      const tracked = [];
      await assert.rejects(module.submitReadingClubInterest({ clubId: 33, draft: { name: "Ana" }, storage, now: () => NOW, send: async () => { throw new Error("offline"); }, track: async () => {} }), /offline/);
      assert.equal(readPendingReaderAction({ storage, now: () => NOW })?.target_id, 33);

      const result = await module.submitReadingClubInterest({ clubId: 33, draft: { name: "Ana", email: "ana@example.com", phone: "111", privacy_accepted: true }, storage, now: () => NOW, send: async (...args) => { calls.push(args); return { detail: "Interés enviado." }; }, track: async (event) => tracked.push(event) });

      assert.equal(result.detail, "Interés enviado.");
      assert.deepEqual(calls, [["/reading-clubs/33/interests", { method: "POST", body: JSON.stringify({ name: "Ana", email: "ana@example.com", phone: "111", privacy_accepted: true }) }]]);
      assert.equal(storage.getItem(PENDING_READER_ACTION_STORAGE_KEY), null);
      assert.deepEqual(tracked, [{ eventType: "reader_action_applied", actionType: "reading_club_interest", bookstoreId: 9, attemptId: ATTEMPT_ID }]);
    } finally {
      await vite.close();
    }
  });

  test("keeps non-profile book contact direct while wiring the three bookstore-profile gates", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const module = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
      assert.equal(typeof module.BookDetailModal, "function");
      const markup = renderToStaticMarkup(createElement(module.BookDetailModal, {
        selectedBook: { id: 21, title: "Rayuela", availability_status: "available", book_status: "usado", bookstore: { id: 9, slug: "eterna", name: "Eterna", whatsapp_phone: "5491123456789" } },
        selectedBookImageUrl: null,
        onImageChange: () => {},
        onClose: () => {},
        favorites: { favoriteIds: new Set(), pendingIds: new Set(), toggleFavorite: () => {} },
        isSessionLoading: false,
      }));
      const source = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");

      assert.match(markup, /href="https:\/\/wa\.me\//);
      assert.match(source, /source="bookstore_profile_contact"/);
      assert.match(source, /source="bookstore_catalog_card"/);
      assert.match(source, /source="book_detail_modal"/);
      assert.match(source, /contactGate=\{\{ me, store, onRequireAuth: requireBookstoreAuth \}\}/);
    } finally {
      await vite.close();
    }
  });

  test("persists each of the three bookstore-profile contact clicks with exact analytics attribution", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const module = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
      const store = { id: 9 };
      const tracked = [];
      for (const [source, item] of [["bookstore_profile_contact", null], ["bookstore_catalog_card", { id: 21, title: "Rayuela" }], ["book_detail_modal", { id: 21, title: "Rayuela" }]]) {
        const storage = createMemoryStorage();
        let requested;
        const button = module.BookstoreWhatsAppAction({ me: null, store, item, source, onRequireAuth: (input) => { requested = input; } });
        let propagationStopped = false;
        button.props.onClick({ stopPropagation: () => { propagationStopped = true; } });
        const action = module.startBookstoreContactIntent?.({ store, ...requested, returnPath: "/bookstores/eterna", storage, now: () => NOW, randomUUID: () => ATTEMPT_ID, track: (event) => tracked.push(event) });
        const stored = readPendingReaderAction({ storage, now: () => NOW });

        assert.equal(propagationStopped, true);
        assert.equal(action?.source, source);
        assert.equal(stored?.target_id, 9);
        assert.equal(stored?.bookstore_id, 9);
        assert.equal(stored?.catalog_item_id, item?.id);
      }
      assert.deepEqual(tracked, [
        { eventType: "reader_intent_started", actionType: "contact_bookstore", bookstoreId: 9, attemptId: ATTEMPT_ID },
        { eventType: "reader_intent_started", actionType: "contact_bookstore", bookstoreId: 9, attemptId: ATTEMPT_ID },
        { eventType: "reader_intent_started", actionType: "contact_bookstore", bookstoreId: 9, attemptId: ATTEMPT_ID },
      ]);
    } finally {
      await vite.close();
    }
  });
}
