import { useId, useState } from "react";

import { trackWebInteractionEvent } from "../analyticsState";
import { buildBookShareMessage, buildBookShareUrl, buildTelegramShareHref, buildWhatsAppShareHref, copyBookShareUrl, shareBookToInstagram } from "../bookSharingState";
import { basePath } from "../routing";
import { InstagramIcon, TelegramIcon, WhatsAppIcon } from "./Icons";

function getShareData(item, bookstore) {
  const url = buildBookShareUrl({ origin: window.location.origin, basePath, bookstoreSlug: bookstore.slug, itemId: item.id });
  const text = buildBookShareMessage({ title: item.title, author: item.author, bookstoreName: bookstore.name });
  return { title: item.title, text, url };
}

export function BookShareMenu({ item, bookstore }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const menuId = useId();
  const canShare = Boolean(item?.id && bookstore?.id && bookstore?.slug);

  function recordShare(channel) {
    trackWebInteractionEvent({ eventType: "book_shared", bookstoreId: bookstore.id, catalogItemId: item.id, source: "dashboard_catalog", metadata: { channel } });
  }

  async function shareInstagram() {
    try {
      const result = await shareBookToInstagram(getShareData(item, bookstore));
      recordShare("instagram");
      setMessage(result === "shared" ? "Se abrió el menú para compartir." : "Enlace copiado: abrí Instagram y pegalo.");
      setIsOpen(false);
    } catch {
      setMessage("No pudimos compartir el libro. Intentá copiar el enlace.");
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
      <button type="button" className="book-share-icon-button" aria-label="Compartir por Instagram" title="Compartir por Instagram" onClick={shareInstagram}><InstagramIcon size={21} /></button>
      <a className="book-share-icon-button" href={buildTelegramShareHref(data)} target="_blank" rel="noreferrer" aria-label="Compartir por Telegram" title="Compartir por Telegram" onClick={() => { recordShare("telegram"); setMessage("Abriendo Telegram..."); setIsOpen(false); }}><TelegramIcon size={21} /></a>
      <button type="button" onClick={copyLink}>Copiar enlace</button>
    </div> : null}
    {message ? <p className="book-share-feedback" role="status">{message}</p> : null}
  </div>;
}
