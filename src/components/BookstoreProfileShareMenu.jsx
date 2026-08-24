import { useId, useState } from "react";

import { trackWebInteractionEvent } from "../analyticsState";
import { resolveApiUrl } from "../api";
import { buildTelegramShareHref, buildWhatsAppShareHref } from "../bookSharingState";
import { buildBookstoreProfileShareMessage, buildBookstoreProfileShareUrl, buildBookstoreProfileStoryAssetUrls, copyBookstoreProfileShareUrl, createBookstoreProfileInstagramStoryFile, shareBookstoreProfileInstagramStory } from "../bookstoreProfileSharingState";
import { basePath } from "../routing";
import { InstagramIcon, ShareIcon, TelegramIcon, WhatsAppIcon } from "./Icons";

function getTrustedApiOrigins() {
  const origins = [window.location.origin];
  try {
    origins.push(new URL(resolveApiUrl("/"), window.location.origin).origin);
  } catch {
    // The current origin remains the only trusted source when the API base is invalid.
  }
  return [...new Set(origins)];
}

export function BookstoreProfileShareMenu({ bookstore }) {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [storyBusy, setStoryBusy] = useState(false);
  const menuId = useId();

  if (!bookstore?.id || !bookstore?.slug || !bookstore?.name) return null;

  const data = {
    title: bookstore.name,
    text: buildBookstoreProfileShareMessage({ bookstoreName: bookstore.name }),
    url: buildBookstoreProfileShareUrl({ origin: window.location.origin, basePath, bookstoreSlug: bookstore.slug }),
  };
  const record = (channel) => trackWebInteractionEvent({ eventType: "bookstore_profile_shared", bookstoreId: bookstore.id, source: "bookstore_profile", metadata: { channel } });
  const close = (nextMessage) => {
    setMessage(nextMessage);
    setIsOpen(false);
  };

  async function story() {
    setStoryBusy(true);
    setMessage("");
    try {
      const assets = buildBookstoreProfileStoryAssetUrls({ bookstore, trustedOrigins: getTrustedApiOrigins(), resolveUrl: resolveApiUrl });
      const { result, linkCopied } = await shareBookstoreProfileInstagramStory({
        url: data.url,
        title: bookstore.name,
        createFile: () => createBookstoreProfileInstagramStoryFile({ bookstore, ...assets }),
      });
      if (result === "cancelled") {
        setMessage(linkCopied ? "Se canceló el compartir de la Story. La URL del perfil quedó copiada." : "Se canceló el compartir de la Story.");
        return;
      }
      record("instagram");
      if (linkCopied) {
        close(result === "shared" ? "URL copiada. En Instagram, agregá el sticker Enlace y pegala." : "Imagen descargada y URL copiada. Subila a Instagram y agregá el sticker Enlace.");
      } else {
        close(result === "shared" ? "En Instagram, agregá el sticker Enlace. Podés copiar la URL desde Compartir Perfil." : "Imagen descargada. Subila a Instagram y copiá la URL desde Compartir Perfil.");
      }
    } catch {
      setMessage("No pudimos crear la imagen para la Story. Intentá de nuevo.");
    } finally {
      setStoryBusy(false);
    }
  }

  async function copy() {
    try {
      await copyBookstoreProfileShareUrl(data.url);
      record("copy_link");
      close("Enlace copiado.");
    } catch {
      setMessage("No pudimos copiar el enlace en este navegador.");
    }
  }

  return <div className="book-share-menu bookstore-profile-share-menu">
    <button type="button" className="secondary-button book-share-trigger bookstore-profile-share-trigger" aria-label={`Compartir el perfil de ${bookstore.name}`} aria-expanded={isOpen} aria-controls={menuId} onClick={() => { setIsOpen((open) => !open); setMessage(""); }}><ShareIcon size={19} /> Compartir Perfil</button>
    {isOpen ? <div id={menuId} className="book-share-options" role="group" aria-label={`Compartir el perfil de ${bookstore.name}`}>
      <a className="book-share-icon-button" href={buildWhatsAppShareHref(data)} target="_blank" rel="noreferrer" aria-label="Compartir por WhatsApp" title="Compartir por WhatsApp" onClick={() => { record("whatsapp"); close("Abriendo WhatsApp..."); }}><WhatsAppIcon size={21} /></a>
      <button type="button" className="book-share-story-button" aria-label="Compartir Historia de Instagram" title="Compartir Historia de Instagram" onClick={story} disabled={storyBusy}><InstagramIcon size={18} /></button>
      <a className="book-share-icon-button" href={buildTelegramShareHref(data)} target="_blank" rel="noreferrer" aria-label="Compartir por Telegram" title="Compartir por Telegram" onClick={() => { record("telegram"); close("Abriendo Telegram..."); }}><TelegramIcon size={21} /></a>
      <button type="button" className="book-share-copy-button" onClick={copy}>Copiar enlace</button>
    </div> : null}
    {message ? <p className="book-share-feedback" role="status">{message}</p> : null}
  </div>;
}
