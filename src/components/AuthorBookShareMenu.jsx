import { useId, useState } from "react";

import { resolveApiUrl } from "../api";
import { buildTelegramShareHref, buildWhatsAppShareHref } from "../bookSharingState";
import { basePath } from "../routing";
import { buildAuthorBookInstagramStoryCoverUrl, buildAuthorBookShareMessage, buildAuthorBookShareUrl, copyBookShareUrl, createAuthorBookInstagramStoryFile, shareAuthorBookInstagramStory } from "../authorBookSharingState";
import { InstagramIcon, ShareIcon, TelegramIcon, WhatsAppIcon } from "./Icons";

export function AuthorBookShareMenu({ book, reader }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [storyBusy, setStoryBusy] = useState(false);
  const menuId = useId();
  if (!book?.id || !reader?.slug) return null;
  const data = { title: book.title, url: buildAuthorBookShareUrl({ origin: globalThis.window?.location?.origin || "https://bookia.invalid", basePath, readerSlug: reader.slug, bookId: book.id }), text: buildAuthorBookShareMessage({ book, authorName: reader.display_name }) };
  const close = (nextMessage) => { setMessage(nextMessage); setIsOpen(false); };
  async function copy() { try { await copyBookShareUrl(data.url); close("Enlace copiado."); } catch { setMessage("No pudimos copiar el enlace en este navegador."); } }
  async function story() {
    setStoryBusy(true);
    try {
      const { result, linkCopied } = await shareAuthorBookInstagramStory({ url: data.url, title: book.title, createFile: () => createAuthorBookInstagramStoryFile({ book, authorName: reader.display_name, coverUrl: buildAuthorBookInstagramStoryCoverUrl(book, { resolveUrl: resolveApiUrl }) }) });
      if (result === "cancelled") { setMessage(linkCopied ? "Se canceló la Story. El enlace quedó copiado." : "Se canceló la Story."); return; }
      close(linkCopied ? "Story lista. En Instagram, agregá el sticker Enlace y pegala." : "Imagen descargada. Podés copiar el enlace desde Compartir.");
    } catch { setMessage("No pudimos crear la imagen para la Story. Intentá de nuevo."); } finally { setStoryBusy(false); }
  }
  return <div className="book-share-menu">
    <button type="button" className="secondary-button book-share-trigger book-share-trigger-icon" aria-label="Compartir" title="Compartir" aria-expanded={isOpen} aria-controls={menuId} onClick={() => { setIsOpen((open) => !open); setMessage(""); }}><ShareIcon size={20} /></button>
    {isOpen ? <div id={menuId} className="book-share-options" role="group" aria-label={`Compartir ${book.title}`}>
      <a className="book-share-icon-button" href={buildWhatsAppShareHref(data)} target="_blank" rel="noreferrer" aria-label="Compartir por WhatsApp" title="Compartir por WhatsApp" onClick={() => close("Abriendo WhatsApp...")}><WhatsAppIcon size={21} /></a>
      <button type="button" className="book-share-story-button" aria-label="Compartir Historia de Instagram" title="Compartir Historia de Instagram" onClick={story} disabled={storyBusy}><InstagramIcon size={18} /></button>
      <a className="book-share-icon-button" href={buildTelegramShareHref(data)} target="_blank" rel="noreferrer" aria-label="Compartir por Telegram" title="Compartir por Telegram" onClick={() => close("Abriendo Telegram...")}><TelegramIcon size={21} /></a>
      <button type="button" className="book-share-copy-button" onClick={copy}>Copiar enlace</button>
    </div> : null}
    {message ? <p className="book-share-feedback" role="status">{message}</p> : null}
  </div>;
}
