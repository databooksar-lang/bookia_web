import { useState } from "react";

import { isNativeAndroidRuntime } from "../mobile/sessionVault";
import { pushNotificationsController } from "../mobile/pushNotifications";

export function NotificationPreferences({ nativeAndroid = isNativeAndroidRuntime(), controller = pushNotificationsController }) {
  const [status, setStatus] = useState("inactive");
  const [message, setMessage] = useState("");
  if (!nativeAndroid) return null;

  async function activate() {
    setStatus("pending");
    setMessage("");
    try {
      const result = await controller.initialize();
      setStatus(result.status);
      if (result.status === "denied") setMessage("Podés habilitarlas más tarde desde los ajustes de Android.");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "No pudimos activar las notificaciones.");
    }
  }

  async function disable() {
    setStatus("pending");
    setMessage("");
    try {
      await controller.disable();
      setStatus("inactive");
    } catch (error) {
      setStatus("error");
      setMessage(error.message || "No pudimos desactivar las notificaciones.");
    }
  }

  const enabled = status === "enabled";
  const blocked = status === "denied";
  return (
    <section className="notification-preferences" aria-labelledby="notification-preferences-title">
      <div><p className="section-label">Android</p><h2 id="notification-preferences-title">Notificaciones</h2><p>Recibí novedades relevantes de tus libros y conexiones en Bookia.</p>{message ? <p className={status === "error" ? "feedback error" : "notification-preferences-help"} role={status === "error" ? "alert" : "status"}>{message}</p> : null}</div>
      {enabled ? <button type="button" className="secondary-button" onClick={disable}>Desactivar</button> : <button type="button" className="primary-button" onClick={activate} disabled={status === "pending"}>{status === "pending" ? "Procesando..." : blocked ? "Bloqueadas por Android" : "Activar"}</button>}
    </section>
  );
}
