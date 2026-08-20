import { useId, useState } from "react";

import { trackWebInteractionEvent } from "../analyticsState";
import { resolveApiUrl } from "../api";
import { basePath } from "../routing";
import { buildTelegramShareHref, buildWhatsAppShareHref } from "../bookSharingState";
import { buildReadingClubShareMessage, buildReadingClubShareUrl, copyReadingClubShareUrl, createReadingClubInstagramStoryFile, resolveReadingClubInstagramStoryCoverUrl, shareInstagramStoryFile } from "../readingClubSharingState";
import { InstagramIcon, TelegramIcon, WhatsAppIcon } from "./Icons";

function getTrustedApiOrigins() {
  const origins = [window.location.origin];
  try {
    origins.push(new URL(resolveApiUrl("/"), window.location.origin).origin);
  } catch {
    // The current origin remains the only trusted source when the API base is invalid.
  }
  return [...new Set(origins)];
}

export function ReadingClubShareMenu({ club, host, hostName, bookstoreId, source }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [storyBusy, setStoryBusy] = useState(false);
  const menuId = useId();

  if (!club?.id || !host?.slug) return null;

  const data = {
    title: club.title,
    text: buildReadingClubShareMessage({ club, hostName }),
    url: buildReadingClubShareUrl({ origin: window.location.origin, basePath, host, clubId: club.id }),
  };
  const record = (channel) => {
    if (bookstoreId) trackWebInteractionEvent({ eventType: "reading_club_shared", bookstoreId, readingClubId: club.id, source, metadata: { channel } });
  };
  const close = (nextMessage) => {
    setMessage(nextMessage);
    setIsOpen(false);
  };

  async function story() {
    setStoryBusy(true);
    try {
      const coverUrl = resolveReadingClubInstagramStoryCoverUrl(club, {
        trustedOrigins: getTrustedApiOrigins(),
        resolveUrl: resolveApiUrl,
      });
      const file = await createReadingClubInstagramStoryFile({ club, hostName, coverUrl });
      const result = await shareInstagramStoryFile({ file, title: club.title });
      if (result === "cancelled") {
        setMessage("Se cancel\u00f3 el compartir de la Story.");
        return;
      }
      record("instagram");
      close(result === "shared" ? "Eleg\u00ed Instagram y luego Historia para publicar la imagen." : "Imagen descargada: abr\u00ed Instagram y subila como Historia.");
    } catch {
      setMessage("No pudimos crear la imagen para la Story. Intent\u00e1 de nuevo.");
    } finally {
      setStoryBusy(false);
    }
  }

  async function copy() {
    try {
      await copyReadingClubShareUrl(data.url);
      record("copy_link");
      close("Enlace copiado.");
    } catch {
      setMessage("No pudimos copiar el enlace en este navegador.");
    }
  }

  return <div className="book-share-menu">
    <button type="button" className="secondary-button book-share-trigger" aria-expanded={isOpen} aria-controls={menuId} onClick={() => { setIsOpen((open) => !open); setMessage(""); }}>Compartir</button>
    {isOpen ? <div id={menuId} className="book-share-options" role="group" aria-label={`Compartir ${club.title}`}>
      <a className="book-share-icon-button" href={buildWhatsAppShareHref(data)} target="_blank" rel="noreferrer" aria-label="Compartir por WhatsApp" title="Compartir por WhatsApp" onClick={() => { record("whatsapp"); close("Abriendo WhatsApp..."); }}><WhatsAppIcon size={21} /></a>
      <button type="button" className="book-share-story-button" aria-label="Compartir Historia de Instagram" title="Compartir Historia de Instagram" onClick={story} disabled={storyBusy}><InstagramIcon size={18} /><span>{storyBusy ? "Creando..." : "Story"}</span></button>
      <a className="book-share-icon-button" href={buildTelegramShareHref(data)} target="_blank" rel="noreferrer" aria-label="Compartir por Telegram" title="Compartir por Telegram" onClick={() => { record("telegram"); close("Abriendo Telegram..."); }}><TelegramIcon size={21} /></a>
      <button type="button" className="book-share-copy-button" onClick={copy}>Copiar enlace</button>
    </div> : null}
    {message ? <p className="book-share-feedback" role="status">{message}</p> : null}
  </div>;
}
