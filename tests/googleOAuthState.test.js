import assert from "node:assert/strict";
import { getGoogleOAuthError } from "../src/googleOAuthState.js";

export function registerGoogleOAuthStateTests(addTest) {
  addTest("explains when a password account already owns the Google email", () => {
    assert.equal(getGoogleOAuthError("existing"), "Ya existe una cuenta con ese correo. Ingresa con tu correo y contrasena.");
  });
}
