import assert from "node:assert/strict";
import { getGoogleOAuthCallback, getGoogleOAuthError, getGoogleOAuthLinkMessage } from "../src/googleOAuthState.js";

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
}
