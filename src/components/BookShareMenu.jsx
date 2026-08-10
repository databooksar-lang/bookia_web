import { useId, useState } from "react";

import { trackWebInteractionEvent } from "../analyticsState";
import { resolveApiUrl } from "../api";
import { buildBookShareMessage, buildBookShareUrl, buildInstagramStoryCoverPath, buildTelegramShareHref, buildWhatsAppShareHref, copyBookShareUrl, createInstagramStoryFile, shareInstagramStoryFile } from "../bookSharingState";
import { basePath } from "../routing";
import { InstagramIcon, TelegramIcon, WhatsAppIcon } from "./Icons";

function getShareData(item, bookstore) {
  const url = buildBookShareUrl({ origin: window.location.origin, basePath, bookstoreSlug: bookstore.slug, itemId: item.id });
  const text = buildBookShareMessage({ title: item.title, author: item.author, bookstoreName: bookstore.name });
  return { title: item.title, text, url };
}

function getTrustedApiOrigins() {
  const origins = [window.location.origin];
  try {
    origins.push(new URL(resolveApiUrl("/"), window.location.origin).origin);
  } catch {
    // Keep the current origin as the only trusted source when the API base is invalid.
  }
  return [...new Set(origins)];
}

export function BookShareMenu({ item, bookstore }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isStoryBusy, setIsStoryBusy] = useState(false);
  const menuId = useId();
  const canShare = Boolean(item?.id && bookstore?.id && bookstore?.slug);

  function recordShare(channel) {
    trackWebInteractionEvent({ eventType: "book_shared", bookstoreId: bookstore.id, catalogItemId: item.id, source: "dashboard_catalog", metadata: { channel } });
  }

  async function shareInstagramStory() {
    setIsStoryBusy(true);
    setMessage("");
    try {
      const file = await createInstagramStoryFile({
        item,
        bookstore,
        coverUrl: resolveApiUrl(buildInstagramStoryCoverPath(item, { trustedOrigins: getTrustedApiOrigins() })),
      });
      const result = await shareInstagramStoryFile({ file, title: item.title });
      if (result === "cancelled") {
        setMessage("Se cancel\u00f3 el compartir de la Story.");
        return;
      }
      recordShare("instagram");
      setMessage(result === "shared" ? "Eleg\u00ed Instagram y luego Historia para publicar la imagen." : "Imagen descargada: abr\u00ed Instagram y subila como Historia.");
      setIsOpen(false);
    } catch {
      setMessage("No pudimos crear la imagen para la Story. Intent\u00e1 de nuevo.");
    } finally {
      setIsStoryBusy(false);
    }
  }

  async function copyLink() {
    try {
      await copyBookShareUrl(getShareData(item, bookstore).url);
      recordShare("copy_link");
      setMessage("Enlace copiado.");
      setIsOpen(false);
    } catch {
      setMessage("No pudimos copiar el enlace en este navegador.");
    }
  }

  if (!canShare) return null;
  const data = getShareData(item, bookstore);
  return <div className="book-share-menu">
    <button type="button" className="secondary-button book-share-trigger" aria-expanded={isOpen} aria-controls={menuId} onClick={() => { setIsOpen((open) => !open); setMessage(""); }}>Compartir</button>
    {isOpen ? <div id={menuId} className="book-share-options" role="group" aria-label={`Compartir ${item.title}`}>
      <a className="book-share-icon-button" href={buildWhatsAppShareHref(data)} target="_blank" rel="noreferrer" aria-label="Compartir por WhatsApp" title="Compartir por WhatsApp" onClick={() => { recordShare("whatsapp"); setMessage("Abriendo WhatsApp..."); setIsOpen(false); }}><WhatsAppIcon size={21} /></a>
      <button type="button" className="book-share-story-button" aria-label="Compartir Historia de Instagram" title="Compartir Historia de Instagram" onClick={shareInstagramStory} disabled={isStoryBusy}><InstagramIcon size={18} /><span>{isStoryBusy ? "Creando..." : "Story"}</span></button>
      <a className="book-share-icon-button" href={buildTelegramShareHref(data)} target="_blank" rel="noreferrer" aria-label="Compartir por Telegram" title="Compartir por Telegram" onClick={() => { recordShare("telegram"); setMessage("Abriendo Telegram..."); setIsOpen(false); }}><TelegramIcon size={21} /></a>
      <button type="button" className="book-share-copy-button" onClick={copyLink}>Copiar enlace</button>
    </div> : null}
    {message ? <p className="book-share-feedback" role="status">{message}</p> : null}
  </div>;
}
