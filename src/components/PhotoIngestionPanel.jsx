import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch, apiFetchBlob } from "../api";
import { PHOTO_ACCEPT, getPhotoPublishState, validatePhoto } from "../photoIngestionState";
import { isNativeAndroidRuntime } from "../mobile/sessionVault";
import { AppLink } from "../navigation";
import { subscribeToRestoredPhoto } from "../mobile/photoRestoration";

const BASE = "/dashboard/photo-ingestions";

function PhotoPreview({ file, ingestionId }) {
  const [url, setUrl] = useState("");
  useEffect(() => {
    let active = true;
    let objectUrl;
    setUrl("");
    (async () => {
      try {
        const blob = file || (ingestionId ? await apiFetchBlob(`${BASE}/${ingestionId}/image`) : null);
        if (!active || !blob) return;
        objectUrl = URL.createObjectURL(blob);
        setUrl(objectUrl);
      } catch { /* The draft remains usable when its retained image is unavailable. */ }
    })();
    return () => { active = false; if (objectUrl) URL.revokeObjectURL(objectUrl); };
  }, [file, ingestionId]);
  return url ? <img className="photo-ingestion-preview" src={url} alt="Foto de los libros para revisar" /> : null;
}

export default function PhotoIngestionPanel({ canUse, onPublished }) {
  const [items, setItems] = useState([]);
  const [nextOffset, setNextOffset] = useState(null);
  const [current, setCurrent] = useState(null);
  const [drafts, setDrafts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [slots, setSlots] = useState(null);
  const [serverAllowed, setServerAllowed] = useState(canUse);
  const [file, setFile] = useState(null);
  const [requestKey, setRequestKey] = useState("");
  const [uploadAttempted, setUploadAttempted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [pollRound, setPollRound] = useState(0);
  const actionLock = useRef(false);
  const allowed = canUse && serverAllowed;
  const native = isNativeAndroidRuntime();
  const apply = useCallback((item) => {
    setCurrent(item);
    setDrafts(item.drafts || []);
    setSelected((previous) => previous.filter((id) => item.drafts?.some((draft) => draft.id === id && draft.status === "pending_store_review")));
  }, []);
  const refresh = useCallback(async () => {
    const result = await apiFetch(BASE);
    setItems(result.items || []);
    setNextOffset(result.next_offset ?? null);
    setSlots(result.available_slots);
    setServerAllowed(result.can_use_photo_ingestion === true);
    return result;
  }, []);
  useEffect(() => { refresh().catch((failure) => setError(failure.message)); }, [refresh]);

  useEffect(() => {
    if (current?.status !== "processing") return;
    let stopped = false;
    let timer;
    let attempts = 0;
    async function poll() {
      try {
        const item = await apiFetch(`${BASE}/${current.id}`);
        if (stopped) return;
        apply(item);
        if (item.status !== "processing") { await refresh(); return; }
        if (++attempts < 40) timer = setTimeout(poll, 3000);
        else setMessage("La foto sigue en proceso. Podés consultar el estado más tarde sin volver a enviarla.");
      } catch (failure) { if (!stopped) setError(failure.message); }
    }
    timer = setTimeout(poll, 2000);
    return () => { stopped = true; clearTimeout(timer); };
  }, [current?.id, current?.status, pollRound, apply, refresh]);

  function chooseFile(next) {
    if (!next) return;
    const validation = validatePhoto(next);
    if (validation) { setError(validation); return; }
    setFile(next); setRequestKey(crypto.randomUUID()); setUploadAttempted(false); setCurrent(null); setDrafts([]); setSelected([]); setError(""); setMessage("");
  }
  useEffect(() => {
    if (!native) return;
    let disposed = false;
    const unsubscribe = subscribeToRestoredPhoto(async (photo) => {
      try { const { photoToFile } = await import("../mobile/photos"); const restored = await photoToFile(photo); if (!disposed) chooseFile(restored); }
      catch (failure) { if (!disposed) setError(failure.message); }
    });
    return () => { disposed = true; unsubscribe(); };
  }, [native]);
  async function act(operation) {
    if (actionLock.current) return;
    actionLock.current = true; setBusy(true); setError(""); setMessage("");
    try { await operation(); } catch (failure) { setError(failure.message); if ([403, 409].includes(failure.status)) await refresh().catch(() => {}); }
    finally { actionLock.current = false; setBusy(false); }
  }
  async function upload() {
    setUploadAttempted(true);
    await act(async () => {
      // Recover a lost response before an explicit retry; never create a new request key here.
      const recovered = await apiFetch(`${BASE}?request_key=${encodeURIComponent(requestKey)}`);
      const existing = recovered.items?.find((item) => item.request_key === requestKey);
      if (existing) { apply(existing); setFile(null); await refresh(); return; }
      const body = new FormData(); body.append("image", file); body.append("source", native ? "android" : "web"); body.append("request_key", requestKey);
      const item = await apiFetch(BASE, { method: "POST", body });
      apply(item); setFile(null); await refresh();
    });
  }
  const publishState = getPhotoPublishState(drafts, selected, slots);
  async function publish() {
    await act(async () => {
      const latest = await apiFetch(`${BASE}/${current.id}`);
      if (latest.drafts.some((draft) => publishState.ids.includes(draft.id) && draft.status === "omitted_by_store")) {
        setCurrent(latest);
        setDrafts((previous) => previous.map((row) => ({ ...row, status: latest.drafts.find((draft) => draft.id === row.id)?.status || row.status })));
        throw new Error("Un libro seleccionado fue descartado en otra sesión. Revisá la selección.");
      }
      for (const draft of drafts.filter((row) => publishState.ids.includes(row.id))) {
        if (latest.drafts.some((row) => row.id === draft.id && row.status === "published")) continue;
        const { title, author, publisher, language } = draft;
        await apiFetch(`${BASE}/${current.id}/drafts/${draft.id}`, { method: "PATCH", body: JSON.stringify({ title, author, publisher, language }) });
      }
      apply(await apiFetch(`${BASE}/${current.id}/publish`, { method: "POST", body: JSON.stringify({ draft_ids: publishState.ids }) }));
      await refresh(); onPublished?.(); setMessage("Los libros seleccionados ya están publicados.");
    });
  }
  return <div className="photo-ingestion-panel">
    <div><h3>Cargar libros desde una foto</h3><p>Fotografiá tapas o lomos legibles. La IA propone los datos; revisalos y elegí qué publicar.</p></div>
    {!allowed ? <p role="status">La carga por foto está disponible en Plus AI y durante la prueba gratis activa. Podés consultar tus cargas anteriores.</p> : null}
    <p>{Number.isFinite(slots) ? `Espacios disponibles en tu catálogo: ${slots}.` : "Consultando capacidad del catálogo…"}</p>
    <div className="photo-ingestion-actions">
      {native ? <><button className="secondary-button" disabled={!allowed || busy || current?.status === "processing"} onClick={() => act(async () => { const { selectNativePhoto } = await import("../mobile/photos"); chooseFile(await selectNativePhoto(true)); })}>Tomar foto</button><button className="secondary-button" disabled={!allowed || busy || current?.status === "processing"} onClick={() => act(async () => { const { selectNativePhoto } = await import("../mobile/photos"); chooseFile(await selectNativePhoto(false)); })}>Elegir de galería</button></> : <><label>Elegir foto<input type="file" accept={PHOTO_ACCEPT} disabled={!allowed || busy || current?.status === "processing"} onChange={(event) => { chooseFile(event.target.files?.[0]); event.target.value = ""; }} /></label><label>Tomar foto<input type="file" accept={PHOTO_ACCEPT} capture="environment" disabled={!allowed || busy || current?.status === "processing"} onChange={(event) => { chooseFile(event.target.files?.[0]); event.target.value = ""; }} /></label></>}
    </div>
    <small>Una foto por carga. JPG, PNG o WebP, hasta 10 MB. No incluyas datos personales.</small>
    <small>Al elegir «Analizar foto», enviás la imagen a OpenAI para identificar los libros. Consultá cómo guardamos y eliminamos las fotos en la <AppLink href="/privacy">Política de Privacidad</AppLink>.</small>
    <PhotoPreview file={file} ingestionId={current?.image_url ? current.id : null} />
    {current && current.status !== "completed" ? <button className="danger-button" disabled={busy} onClick={() => act(async () => { apply(await apiFetch(`${BASE}/${current.id}`, { method: "DELETE" })); setFile(null); await refresh(); setMessage("Carga descartada. Los libros que ya publicaste se conservan."); })}>Descartar carga</button> : null}
    {file ? <button className="primary-button" disabled={busy || !allowed} onClick={upload}>{busy ? "Enviando…" : uploadAttempted ? "Reintentar envío" : "Analizar foto"}</button> : null}
    {error ? <p className="error-message" role="alert">{error}</p> : null}
    {message ? <p role="status">{message}</p> : null}
    {current?.status === "processing" ? <div role="status"><progress aria-label="Analizando foto" /><p>Analizando la foto. Podés salir del panel y retomar esta carga después.</p><button className="secondary-button" disabled={busy} onClick={() => { setPollRound((value) => value + 1); setMessage(""); }}>Consultar estado</button></div> : null}
    {current?.status === "failed" ? <p role="alert">{current.error || "No pudimos analizar esta foto. Elegí otra foto más nítida para una nueva carga."}</p> : null}
    {drafts.length ? <div className="photo-ingestion-drafts"><h3>Revisar libros detectados</h3><p>Completá título y autor. Seleccioná los libros que querés publicar; no se publica ninguno automáticamente.</p>
      {drafts.map((draft, index) => <fieldset key={draft.id} disabled={busy || !allowed || draft.status !== "pending_store_review"} className="photo-ingestion-draft"><legend>Libro {index + 1}{draft.status === "published" ? " · Publicado" : draft.status === "omitted_by_store" ? " · Descartado" : ""}</legend>
        {draft.status === "pending_store_review" ? <label className="photo-ingestion-select"><input type="checkbox" checked={selected.includes(draft.id)} onChange={(event) => setSelected((previous) => event.target.checked ? [...previous, draft.id] : previous.filter((id) => id !== draft.id))} />Seleccionar para publicar</label> : null}
        <div className="dashboard-form-grid">{[["title", "Título *"], ["author", "Autor *"], ["publisher", "Editorial"], ["language", "Idioma"]].map(([field, label]) => <label key={field}>{label}<input value={draft[field] || ""} maxLength={{ title: 500, author: 255, publisher: 255, language: 100 }[field]} onChange={(event) => setDrafts((previous) => previous.map((row) => row.id === draft.id ? { ...row, [field]: event.target.value } : row))} /></label>)}</div>
        {draft.notes ? <p>{draft.notes}</p> : null}
        {draft.status === "pending_store_review" ? <div className="photo-ingestion-actions"><button className="secondary-button" onClick={() => act(async () => { const { title, author, publisher, language } = draft; const item = await apiFetch(`${BASE}/${current.id}/drafts/${draft.id}`, { method: "PATCH", body: JSON.stringify({ title, author, publisher, language }) }); setCurrent(item); setMessage("Datos guardados para continuar después."); })}>Guardar datos</button><button className="danger-button" onClick={() => act(async () => { const item = await apiFetch(`${BASE}/${current.id}/discard`, { method: "POST", body: JSON.stringify({ draft_ids: [draft.id] }) }); setCurrent(item); setDrafts((previous) => previous.map((row) => row.id === draft.id ? { ...row, status: "omitted_by_store" } : row)); setSelected((previous) => previous.filter((id) => id !== draft.id)); await refresh(); })}>Descartar libro</button></div> : null}
      </fieldset>)}
      {publishState.invalid ? <p role="status">Completá título y autor de los libros seleccionados.</p> : null}
      {publishState.overLimit ? <p role="status">La selección supera los espacios disponibles. Reducila o ampliá tu plan.</p> : null}
      <button className="primary-button" disabled={!allowed || busy || !publishState.canPublish || !Number.isFinite(slots)} onClick={publish}>{busy ? "Guardando…" : `Publicar seleccionados (${publishState.ids.length})`}</button>
    </div> : null}
    <div className="photo-ingestion-history"><h3>Cargas guardadas</h3><p>Retomá tus fotos de la web, Android o Telegram.</p><button className="secondary-button" disabled={busy} onClick={() => act(refresh)}>Actualizar lista</button>{items.length ? <ul>{items.map((item) => <li key={item.id}><button className="secondary-button" disabled={busy} onClick={() => act(async () => { apply(await apiFetch(`${BASE}/${item.id}`)); setFile(null); })}>{new Date(item.created_at).toLocaleDateString("es-AR")} · {item.source} · {({ processing: "En proceso", ready: "Para revisar", completed: "Completada", failed: "No procesada" })[item.status] || item.status}</button></li>)}</ul> : <p>No hay cargas guardadas.</p>}{nextOffset !== null ? <button className="secondary-button" disabled={busy} onClick={() => act(async () => { const page = await apiFetch(`${BASE}?offset=${nextOffset}`); setItems((previous) => [...new Map([...previous, ...page.items].map((item) => [item.id, item])).values()]); setNextOffset(page.next_offset ?? null); })}>Cargar más</button> : null}</div>
  </div>;
}
