import { useId, useState } from "react";

import { trackWebInteractionEvent } from "../analyticsState";
import { basePath } from "../routing";
import { buildTelegramShareHref, buildWhatsAppShareHref } from "../bookSharingState";
import { buildReadingClubShareMessage, buildReadingClubShareUrl, copyReadingClubShareUrl, createReadingClubInstagramStoryFile, shareInstagramStoryFile, shareReadingClubToInstagram } from "../readingClubSharingState";
import { BookIcon, InstagramIcon, TelegramIcon, WhatsAppIcon } from "./Icons";

export function ReadingClubShareMenu({ club, host, hostName, bookstoreId, source }) {
  const [isOpen, setIsOpen] = useState(false); const [message, setMessage] = useState(""); const [storyBusy, setStoryBusy] = useState(false); const menuId = useId();
  if (!club?.id || !host?.slug) return null;
  const data = { title: club.title, text: buildReadingClubShareMessage({ club, hostName }), url: buildReadingClubShareUrl({ origin: window.location.origin, basePath, host, clubId: club.id }) };
  const record = (channel) => { if (bookstoreId) trackWebInteractionEvent({ eventType: "reading_club_shared", bookstoreId, readingClubId: club.id, source, metadata: { channel } }); };
  const close = (nextMessage) => { setMessage(nextMessage); setIsOpen(false); };
  async function instagram() { try { const result = await shareReadingClubToInstagram(data); record("instagram"); close(result === "shared" ? "Se abrió el menú para compartir." : "Enlace copiado: abrí Instagram y pegalo."); } catch { setMessage("No pudimos compartir el club. Intentá copiar el enlace."); } }
  async function story() { setStoryBusy(true); try { const file = await createReadingClubInstagramStoryFile({ club, hostName }); const result = await shareInstagramStoryFile({ file, title: club.title }); if (result === "cancelled") { setMessage("Se canceló el compartir de la Story."); return; } record("instagram"); close(result === "shared" ? "Elegí Instagram y luego Historia para publicar la imagen." : "Imagen descargada: abrí Instagram y subila como Historia."); } catch { setMessage("No pudimos crear la imagen para la Story. Intentá de nuevo."); } finally { setStoryBusy(false); } }
  async function copy() { try { await copyReadingClubShareUrl(data.url); record("copy_link"); close("Enlace copiado."); } catch { setMessage("No pudimos copiar el enlace en este navegador."); } }
  return <div className="book-share-menu"><button type="button" className="secondary-button book-share-trigger" aria-expanded={isOpen} aria-controls={menuId} onClick={() => { setIsOpen((open) => !open); setMessage(""); }}>Compartir</button>{isOpen ? <div id={menuId} className="book-share-options" role="group" aria-label={`Compartir ${club.title}`}><a className="book-share-icon-button" href={buildWhatsAppShareHref(data)} target="_blank" rel="noreferrer" aria-label="Compartir por WhatsApp" onClick={() => { record("whatsapp"); close("Abriendo WhatsApp..."); }}><WhatsAppIcon size={21} /></a><button type="button" className="book-share-icon-button" aria-label="Compartir por Instagram" onClick={instagram}><InstagramIcon size={21} /></button><button type="button" className="book-share-story-button" onClick={story} disabled={storyBusy}><InstagramIcon size={19} /><BookIcon size={17} /><span>{storyBusy ? "Creando Story..." : "Historia de Instagram"}</span></button><a className="book-share-icon-button" href={buildTelegramShareHref(data)} target="_blank" rel="noreferrer" aria-label="Compartir por Telegram" onClick={() => { record("telegram"); close("Abriendo Telegram..."); }}><TelegramIcon size={21} /></a><button type="button" onClick={copy}>Copiar enlace</button></div> : null}{message ? <p className="book-share-feedback" role="status">{message}</p> : null}</div>;
}
