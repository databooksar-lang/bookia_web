import assert from "node:assert/strict";
import { buildGoogleOAuthStartPayload, canStartGoogleOAuth, getGoogleOAuthCallback, getGoogleOAuthError, getGoogleOAuthLinkMessage } from "../src/googleOAuthState.js";

export function registerGoogleOAuthStateTests(addTest) {
  addTest("explains when a password account already owns the Google email", () => {
    assert.equal(getGoogleOAuthError("existing"), "Ya existe una cuenta con ese correo. Ingresa con tu correo y contrasena.");
  });

  addTest("explains when a bookstore owner must confirm their password to link Google", () => {
    assert.equal(getGoogleOAuthLinkMessage("required"), "Confirma tu contrasena actual para vincular el acceso con Google.");
  });

  addTest("distinguishes a new Google registration from an existing-account login", () => {
    assert.deepEqual(getGoogleOAuthCallback("?google=registered"), { succeeded: true, registered: true });
    assert.deepEqual(getGoogleOAuthCallback("?google=success"), { succeeded: true, registered: false });
    assert.deepEqual(getGoogleOAuthCallback("?google=unknown"), { succeeded: false, registered: false });
  });

  addTest("sends the author selection and rights declaration when registering with Google", () => {
    assert.deepEqual(
      buildGoogleOAuthStartPayload({ intent: "register", privacyAccepted: true, isAuthor: true, authorRightsDeclarationAccepted: true }),
      { intent: "register", privacy_accepted: true, is_author: true, author_rights_declaration_accepted: true },
    );
  });

  addTest("requires registration consents before starting Google OAuth", () => {
    assert.equal(canStartGoogleOAuth({ intent: "login" }), true);
    assert.equal(canStartGoogleOAuth({ intent: "register" }), false);
    assert.equal(canStartGoogleOAuth({ intent: "register", privacyAccepted: true }), true);
    assert.equal(canStartGoogleOAuth({ intent: "register", privacyAccepted: true, isAuthor: true }), false);
    assert.equal(canStartGoogleOAuth({ intent: "register", privacyAccepted: true, isAuthor: true, authorRightsDeclarationAccepted: true }), true);
  });
}
