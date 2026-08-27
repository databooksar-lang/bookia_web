import { useEffect, useState } from "react";

import { apiFetch, resolveApiUrl } from "../api";
import { formatIntegrationDate, getTiendanubeCallbackMessage, getTiendanubeViewState } from "../tiendanubeIntegrationState";

export function TiendanubeIntegrationPanel({ isActive, callbackResult = "", canManageCatalog = true }) {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState("");
  const [feedback, setFeedback] = useState(getTiendanubeCallbackMessage(callbackResult));

  function loadStatus() {
    setLoading(true);
    apiFetch("/integrations/tiendanube/status")
      .then(setStatus)
      .catch((error) => setFeedback(error.message || "No pudimos consultar la integración."))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    if (isActive) loadStatus();
  }, [isActive]);

  function connect() {
    window.location.assign(resolveApiUrl("/integrations/tiendanube/connect"));
  }

  function sync() {
    setAction("sync");
    setFeedback("");
    apiFetch("/integrations/tiendanube/sync", { method: "POST" })
      .then((stats) => {
        const suffix = stats.failed ? ` ${stats.failed} productos tuvieron errores.` : "";
        setFeedback(`Sincronización lista: ${stats.created} nuevos, ${stats.updated} actualizados y ${stats.deleted} retirados.${suffix}`);
        loadStatus();
      })
      .catch((error) => { setFeedback(error.message || "No pudimos sincronizar Tiendanube."); loadStatus(); })
      .finally(() => setAction(""));
  }

  function disconnect() {
    if (!window.confirm("¿Desconectar Tiendanube? Los libros importados se conservarán en Bookia.")) return;
    setAction("disconnect");
    setFeedback("");
    apiFetch("/integrations/tiendanube", { method: "DELETE" })
      .then(() => { setFeedback("Tiendanube fue desconectada. El catálogo importado se conservó."); loadStatus(); })
      .catch((error) => setFeedback(error.message || "No pudimos desconectar Tiendanube."))
      .finally(() => setAction(""));
  }

  const view = getTiendanubeViewState(status);
  const connected = Boolean(status?.connected);
  const reconnect = view.kind === "reconnect_required";
  const disabledByBilling = !canManageCatalog;

  return (
    <div className={`integration-card integration-${view.kind}`} aria-busy={loading || Boolean(action)}>
      <div className="integration-card-head">
        <div><p className="section-label">Catálogo externo</p><h3>Tiendanube</h3><p>Importá productos de tu tienda y mantenelos actualizados sin duplicados.</p></div>
        <span className={`integration-status is-${view.kind}`}>{loading ? "Consultando…" : view.label}</span>
      </div>
      {connected ? <dl className="integration-summary"><div><dt>Productos importados</dt><dd>{status.imported_products}</dd></div><div><dt>Última sincronización</dt><dd>{formatIntegrationDate(status.last_synced_at)}</dd></div><div><dt>Tienda</dt><dd>#{status.external_store_id}</dd></div></dl> : <p className="integration-empty">Conectá una tienda con acceso de solo lectura a productos. Bookia nunca escribe pedidos ni cambios en Tiendanube.</p>}
      {status?.last_sync_error_code ? <p className="feedback error" role="alert">La última sincronización informó: {status.last_sync_error_code}.</p> : null}
      {disabledByBilling ? <p className="feedback error">Necesitás acceso vigente al catálogo para sincronizar o reconectar.</p> : null}
      {feedback ? <p className={`feedback ${["success", "connected"].includes(callbackResult) || feedback.startsWith("Sincronización lista") || feedback.includes("desconectada") ? "success" : "error"}`} role="status">{feedback}</p> : null}
      <div className="integration-actions">
        {!connected || reconnect ? <button type="button" className="primary-button" onClick={connect} disabled={action || disabledByBilling || status?.enabled === false}>{reconnect ? "Volver a conectar" : "Conectar Tiendanube"}</button> : <button type="button" className="primary-button" onClick={sync} disabled={action || loading || disabledByBilling}>{action === "sync" ? "Sincronizando…" : "Sincronizar ahora"}</button>}
        {connected ? <button type="button" className="danger-button" onClick={disconnect} disabled={action || loading}>{action === "disconnect" ? "Desconectando…" : "Desconectar"}</button> : null}
      </div>
      {status?.enabled === false ? <p className="integration-note">La integración todavía no está configurada en este entorno.</p> : null}
    </div>
  );
}
