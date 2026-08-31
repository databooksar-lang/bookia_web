import { useEffect, useState } from "react";

import { apiFetch } from "../api";
import {
  formatGoogleSheetsDate,
  formatNextGoogleSheetsSync,
  getGoogleSheetsCallbackMessage,
  getGoogleSheetsViewState,
} from "../googleSheetsIntegrationState";


export function GoogleSheetsIntegrationPanel({ isActive, callbackResult = "", canManageCatalog = true }) {
  const [status, setStatus] = useState(null);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState("");
  const [feedback, setFeedback] = useState(getGoogleSheetsCallbackMessage(callbackResult));

  function loadStatus() {
    setLoading(true);
    return apiFetch("/integrations/google-sheets/status")
      .then((nextStatus) => {
        setStatus(nextStatus);
        if (nextStatus.spreadsheet_url) setSpreadsheetUrl(nextStatus.spreadsheet_url);
      })
      .catch((error) => setFeedback(error.message || "No pudimos consultar la integración con Google Sheets."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (isActive) loadStatus();
  }, [isActive]);

  function connect(event) {
    event.preventDefault();
    setAction("connect");
    setFeedback("");
    apiFetch("/integrations/google-sheets/connect", {
      method: "POST",
      body: JSON.stringify({ spreadsheet_url: spreadsheetUrl.trim() }),
    })
      .then(({ authorization_url: authorizationUrl }) => window.location.assign(authorizationUrl))
      .catch((error) => setFeedback(error.message || "No pudimos iniciar la conexión con Google Sheets."))
      .finally(() => setAction(""));
  }

  function sync() {
    setAction("sync");
    setFeedback("");
    apiFetch("/integrations/google-sheets/sync", { method: "POST" })
      .then((stats) => {
        setFeedback(`Sincronización lista: ${stats.created} nuevos, ${stats.updated} actualizados y ${stats.hidden} ocultos.`);
        loadStatus();
      })
      .catch((error) => { setFeedback(error.message || "No pudimos sincronizar Google Sheets."); loadStatus(); })
      .finally(() => setAction(""));
  }

  function disconnect() {
    if (!window.confirm("¿Desconectar Google Sheets? Los libros importados se conservarán en Bookia.")) return;
    setAction("disconnect");
    setFeedback("");
    apiFetch("/integrations/google-sheets", { method: "DELETE" })
      .then(() => {
        setSpreadsheetUrl("");
        setFeedback("Google Sheets fue desconectada. El catálogo importado se conservó.");
        loadStatus();
      })
      .catch((error) => setFeedback(error.message || "No pudimos desconectar Google Sheets."))
      .finally(() => setAction(""));
  }

  const view = getGoogleSheetsViewState(status);
  const connected = Boolean(status?.connected);
  const reconnect = view.kind === "reconnect_required";
  const disabledByBilling = !canManageCatalog;
  const successFeedback = callbackResult === "success" || feedback.startsWith("Sincronización lista") || feedback.includes("desconectada");

  return (
    <div className={`integration-card integration-${view.kind}`} aria-busy={loading || Boolean(action)}>
      <div className="integration-card-head">
        <div>
          <p className="section-label">Catálogo desde planilla</p>
          <h3>Google Sheets</h3>
          <p>Actualizá precio, stock y disponibilidad desde una hoja compartida con Bookia.</p>
        </div>
        <span className={`integration-status is-${view.kind}`}>{loading ? "Consultando…" : view.label}</span>
      </div>

      {connected ? (
        <dl className="integration-summary">
          <div><dt>Libros importados</dt><dd>{status.imported_products}</dd></div>
          <div><dt>Última sincronización</dt><dd>{formatGoogleSheetsDate(status.last_synced_at)}</dd></div>
          <div><dt>Próxima automática</dt><dd>{formatNextGoogleSheetsSync(status.next_scheduled_at)}</dd></div>
        </dl>
      ) : <p className="integration-empty">Conectá una planilla con una pestaña llamada Catalogo. Bookia solo solicita acceso de lectura.</p>}

      <p className="integration-note">La sincronización automática se ejecuta los domingos a las 03:00, hora argentina.</p>
      {status?.last_sync_error_code ? <p className="feedback error" role="alert">La última sincronización informó: {status.last_sync_error_code}.</p> : null}
      {disabledByBilling ? <p className="feedback error">Necesitás acceso vigente al catálogo para sincronizar o reconectar.</p> : null}
      {feedback ? <p className={`feedback ${successFeedback ? "success" : "error"}`} role="status">{feedback}</p> : null}

      {!connected || reconnect ? (
        <form className="integration-connect-form" onSubmit={connect}>
          <label>
            <span>URL de Google Sheets</span>
            <input
              type="url"
              value={spreadsheetUrl}
              onChange={(event) => setSpreadsheetUrl(event.target.value)}
              placeholder="https://docs.google.com/spreadsheets/d/.../edit"
              required
              disabled={Boolean(action) || disabledByBilling || status?.enabled === false}
            />
          </label>
          <button type="submit" className="primary-button" disabled={!spreadsheetUrl.trim() || Boolean(action) || disabledByBilling || status?.enabled === false}>
            {action === "connect" ? "Conectando…" : reconnect ? "Volver a conectar" : "Conectar Google Sheets"}
          </button>
        </form>
      ) : (
        <div className="integration-actions">
          <button type="button" className="primary-button" onClick={sync} disabled={Boolean(action) || loading || disabledByBilling}>{action === "sync" ? "Sincronizando…" : "Sincronizar ahora"}</button>
          <a className="secondary-button" href={status.spreadsheet_url} target="_blank" rel="noreferrer">Abrir planilla</a>
          <button type="button" className="danger-button" onClick={disconnect} disabled={Boolean(action) || loading}>{action === "disconnect" ? "Desconectando…" : "Desconectar"}</button>
        </div>
      )}
      {status?.enabled === false ? <p className="integration-note">La integración todavía no está configurada en este entorno.</p> : null}
    </div>
  );
}
