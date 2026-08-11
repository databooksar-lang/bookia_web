export function getGoogleOAuthError(code) {
  const messages = {
    existing: "Ya existe una cuenta con ese correo. Ingresa con tu correo y contrasena.",
    register: "Esta cuenta de Google aun no esta registrada. Crea tu cuenta como lector/a.",
    cancelled: "Cancelaste el acceso con Google.",
    invalid: "No pudimos validar el acceso con Google. Intenta nuevamente.",
    failed: "No pudimos completar el acceso con Google. Intenta nuevamente.",
  };
  return messages[code] || "";
}

export function getGoogleOAuthLinkMessage(code) {
  return code === "required" ? "Confirma tu contrasena actual para vincular el acceso con Google." : "";
}

export function getGoogleOAuthCallback(search = "") {
  const value = new URLSearchParams(search).get("google");
  return {
    succeeded: value === "success" || value === "registered",
    registered: value === "registered",
  };
}
