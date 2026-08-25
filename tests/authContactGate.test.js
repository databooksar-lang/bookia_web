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
    assert.match(terms, /Vigente desde el 24 de agosto de 2026/);
    assert.match(privacy, /Vigente desde el 24 de agosto de 2026/);
    assert.match(terms, /contacto digital.*WhatsApp.*cuenta autenticada.*todas las superficies de descubrimiento/is);
    assert.match(terms, /inter.s.*club de lectura.*cuenta autenticada/is);
    assert.doesNotMatch(terms, /Esta regla no alcanza al descubrimiento anonimo/i);
    assert.match(privacy, /contacto digital.*WhatsApp.*cuenta autenticada.*todas las superficies de descubrimiento/is);
    assert.match(terms, /autoras.*celular con WhatsApp.*cuenta autenticada/is);
    assert.match(privacy, /celular con WhatsApp.*personas autoras.*cuentas autenticadas/is);
    assert.match(privacy, /inter.s.*club.*cuenta autenticada/is);
    assert.doesNotMatch(privacy, /Esta regla no alcanza al descubrimiento anonimo/i);
  });

  test("styles the auth gate and locked contact card for desktop and mobile", () => {
    const styles = readFileSync(new URL("../src/editorial.css", import.meta.url), "utf8");

    assert.match(styles, /\.auth-required-dialog\s*\{/);
    assert.match(styles, /\.auth-required-dialog-card\s*\{/);
    assert.match(styles, /\.auth-required-dialog-card\s*\{[^}]*isolation:\s*isolate;/s);
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

  test("sends the auth-gate create-account CTA to the base registration route", () => {
    const dialog = readFileSync(new URL("../src/components/AuthRequiredDialog.jsx", import.meta.url), "utf8");

    assert.match(dialog, /onClick=\{\(\) => navigate\("\/register"\)\}>Crear cuenta/);
    assert.doesNotMatch(dialog, /buildRegisterPath\(\{ profileType: "reader" \}\)/);
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

  test("dismisses an auth or continuation dialog without reviving its action on a later login", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const module = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
      const storage = createMemoryStorage();
      const action = savePendingReaderAction({ type: "contact_bookstore", targetId: 9, returnPath: "/bookstores/eterna" }, { storage, now: () => NOW, randomUUID: () => ATTEMPT_ID });
      let dialogOpen = true;

      assert.equal(typeof module.dismissReaderActionDialog, "function");
      assert.equal(module.dismissReaderActionDialog(action, () => { dialogOpen = false; }, { storage, now: () => NOW }), true);
      assert.equal(dialogOpen, false);
      assert.equal(readPendingReaderAction({ storage, now: () => NOW }), null);

      const replacement = savePendingReaderAction({ type: "reading_club_interest", targetId: 33, returnPath: "/#clubes" }, { storage, now: () => NOW, randomUUID: () => "223e4567-e89b-42d3-a456-426614174000" });
      let staleDialogOpen = true;
      assert.equal(module.dismissReaderActionDialog(action, () => { staleDialogOpen = false; }, { storage, now: () => NOW }), false);
      assert.equal(staleDialogOpen, false);
      assert.equal(readPendingReaderAction({ storage, now: () => NOW })?.attempt_id, replacement.attempt_id);
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

  test("treats the loaded backend contact flag as authoritative after session hydration", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const module = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
      const staleMe = { account: { email: "expired@example.com" }, reader_profile: { id: 4 } };
      const lockedStore = { id: 9, name: "Eterna", address: "Honduras 5574", whatsapp_phone: null, correo: null, contact_requires_auth: true };
      const contactSession = module.resolveBookstoreContactSession?.(staleMe, lockedStore);
      const contactMarkup = renderToStaticMarkup(createElement(module.BookstoreContactCard, { store: lockedStore, me: contactSession, onRequireAuth: () => {} }));

      assert.equal(contactSession, null);
      assert.match(contactMarkup, /is-locked/);
      assert.match(contactMarkup, /contacto digital/i);
      assert.doesNotMatch(contactMarkup, /mailto:|wa\.me/);
      assert.equal(module.resolveBookstoreContactSession?.(undefined, { ...lockedStore, contact_requires_auth: false }), undefined);
      assert.equal(module.getBookstoreSessionReconciliationKey?.(staleMe, lockedStore), "9");
      assert.equal(module.getBookstoreSessionReconciliationKey?.(staleMe, lockedStore, "9"), null);

      for (const source of ["bookstore_profile_contact", "bookstore_catalog_card", "book_detail_modal"]) {
        const markup = renderToStaticMarkup(createElement(module.BookstoreWhatsAppAction, {
          me: contactSession,
          store: lockedStore,
          item: source === "bookstore_profile_contact" ? null : { id: 21, title: "Rayuela" },
          source,
          onRequireAuth: () => {},
        }));
        assert.match(markup, /type="button"/);
        assert.doesNotMatch(markup, /wa\.me/);
      }

      const appSource = readFileSync(new URL("../src/App.jsx", import.meta.url), "utf8");
      assert.match(appSource, /<BookstorePage[^>]*refreshSession=\{refreshMe\}/);
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
      assert.deepEqual(tracked, [{ eventType: "reader_action_applied", actionType: "reading_club_interest", bookstoreId: 9, readingClubId: 33, attemptId: ATTEMPT_ID }]);
    } finally {
      await vite.close();
    }
  });

  test("gates WhatsApp from every public book-discovery surface", async () => {
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
        contactGate: { me: null, onRequireAuth: () => {} },
      }));
      const source = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");

      assert.match(markup, /type="button"/);
      assert.doesNotMatch(markup, /href="https:\/\/wa\.me\//);
      assert.match(source, /source="bookstore_profile_contact"/);
      assert.match(source, /source="bookstore_catalog_card"/);
      assert.match(source, /source="book_detail_modal"/);
      assert.match(source, /contactGate=\{\{ me: contactSession, store, onRequireAuth: requireBookstoreAuth \}\}/);
      assert.match(source, /function InitialBookDiscovery[\s\S]*contactGate=/);
      assert.match(source, /function SearchResults[\s\S]*BookstoreWhatsAppAction[\s\S]*source="search_results"/);
      assert.match(source, /function SearchResults[\s\S]*contactGate=/);
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

  test("isolates and restores every background layer beneath a stacked action dialog", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    try {
      const module = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
      function element(initial = {}) {
        const attributes = new Map(Object.entries(initial));
        return {
          children: [],
          parentElement: null,
          ownerDocument: null,
          hasAttribute: (name) => attributes.has(name),
          getAttribute: (name) => attributes.get(name) ?? null,
          setAttribute: (name, value) => attributes.set(name, String(value)),
          removeAttribute: (name) => attributes.delete(name),
        };
      }
      function append(parent, ...children) {
        parent.children.push(...children);
        for (const child of children) child.parentElement = parent;
      }
      const body = element();
      const app = element();
      const header = element({ "aria-hidden": "false" });
      const main = element();
      const footer = element();
      const page = element();
      const content = element();
      const bookModal = element({ "aria-hidden": "true", inert: "" });
      const authDialog = element();
      const doc = { body };
      for (const node of [body, app, header, main, footer, page, content, bookModal, authDialog]) node.ownerDocument = doc;
      append(body, app);
      append(app, header, main, footer);
      append(main, page);
      append(page, content, bookModal, authDialog);

      const restore = module.isolateDialogBackground?.(authDialog);
      for (const node of [content, bookModal, header, footer]) {
        assert.equal(node.getAttribute("aria-hidden"), "true");
        assert.equal(node.hasAttribute("inert"), true);
      }
      assert.equal(authDialog.hasAttribute("aria-hidden"), false);
      bookModal.removeAttribute("aria-hidden");
      bookModal.removeAttribute("inert");
      restore?.();
      assert.equal(header.getAttribute("aria-hidden"), "false");
      for (const node of [content, bookModal, footer]) {
        assert.equal(node.hasAttribute("aria-hidden"), false);
        assert.equal(node.hasAttribute("inert"), false);
      }

      const bookMarkup = renderToStaticMarkup(createElement(module.BookDetailModal, {
        selectedBook: { id: 21, title: "Rayuela", availability_status: "available", book_status: "usado", bookstore: { id: 9, slug: "eterna", name: "Eterna", whatsapp_phone: "5491123456789" } },
        selectedBookImageUrl: null,
        onImageChange: () => {},
        onClose: () => {},
        favorites: { favoriteIds: new Set(), pendingIds: new Set(), toggleFavorite: () => {} },
        isSessionLoading: false,
        isBackgroundObscured: true,
      }));
      const authMarkup = renderToStaticMarkup(createElement(module.AuthRequiredDialog, { action: { type: "contact_bookstore", target_id: 9 }, onCancel: () => {} }));
      assert.match(bookMarkup, /role="dialog"[^>]*aria-hidden="true"[^>]*inert=""/);
      assert.doesNotMatch(bookMarkup, /aria-modal="true"/);
      assert.equal((`${bookMarkup}${authMarkup}`.match(/aria-modal="true"/g) || []).length, 1);
    } finally {
      await vite.close();
    }
  });

  test("reports pending-action persistence failures without clearing an existing action", async () => {
    const vite = await createServer({ server: { middlewareMode: true }, appType: "custom" });
    const storage = createMemoryStorage();
    const existing = savePendingReaderAction({ type: "contact_bookstore", targetId: 8, returnPath: "/bookstores/existing" }, { storage, now: () => NOW, randomUUID: () => ATTEMPT_ID });
    const throwingStorage = { ...storage, setItem: () => { throw new Error("blocked"); } };
    try {
      const module = await vite.ssrLoadModule("/src/pages/PublicPages.jsx");
      const tracked = [];
      const contact = module.startBookstoreContactIntent?.({
        store: { id: 9 },
        source: "bookstore_profile_contact",
        returnPath: "/bookstores/eterna",
        storage: throwingStorage,
        now: () => NOW,
        randomUUID: () => "223e4567-e89b-42d3-a456-426614174000",
        track: (event) => tracked.push(event),
      });
      const club = module.startReadingClubInterestIntent?.({
        club: { id: 33, bookstore_id: null },
        host: { type: "reader" },
        returnPath: "/#clubes",
        storage: throwingStorage,
        now: () => NOW,
        randomUUID: () => "323e4567-e89b-42d3-a456-426614174000",
        track: (event) => tracked.push(event),
      });
      const missingUuid = module.startReadingClubInterestIntent?.({
        club: { id: 34, bookstore_id: null },
        host: { type: "reader" },
        returnPath: "/#clubes",
        storage,
        now: () => NOW,
        randomUUID: () => "",
        track: (event) => tracked.push(event),
      });

      assert.equal(contact, null);
      assert.equal(club, null);
      assert.equal(missingUuid, null);
      assert.deepEqual(tracked, []);
      assert.equal(readPendingReaderAction({ storage, now: () => NOW })?.attempt_id, existing.attempt_id);
      assert.match(module.PENDING_ACTION_PERSISTENCE_ERROR || "", /intent.+guardar|acci.n.+guardar/i);
      const modalMarkup = renderToStaticMarkup(createElement(module.BookDetailModal, {
        selectedBook: { id: 21, title: "Rayuela", availability_status: "available", book_status: "usado", bookstore: { id: 9, slug: "eterna", name: "Eterna" } },
        selectedBookImageUrl: null,
        onImageChange: () => {},
        onClose: () => {},
        favorites: { favoriteIds: new Set(), pendingIds: new Set(), toggleFavorite: () => {} },
        isSessionLoading: false,
        contactGate: { me: null, store: { id: 9, name: "Eterna", contact_requires_auth: true }, onRequireAuth: () => {} },
        contactError: module.PENDING_ACTION_PERSISTENCE_ERROR,
      }));
      assert.match(modalMarkup, /role="alert"/);
      assert.match(modalMarkup, /acci.n no se pudo guardar/i);
      const source = readFileSync(new URL("../src/pages/PublicPages.jsx", import.meta.url), "utf8");
      assert.match(source, /setActionError\(PENDING_ACTION_PERSISTENCE_ERROR\)/);
    } finally {
      await vite.close();
    }
  });
}
