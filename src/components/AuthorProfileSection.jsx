import { getAuthorProfileView } from "../authorProfileState";
import { resolveApiUrl } from "../api";
import { AuthorBooksManager } from "./AuthorBooksManager";

const RIGHTS_DECLARATION = "Declaro que soy autor/a o que cuento con autorización suficiente para publicar en Bookia las obras que incorpore, y acepto ser responsable por la veracidad y los derechos del contenido.";

export function AuthorProfileSection({ authorProfile, genres = [], accepted, onAcceptedChange, onActivate, onDeactivate, onSaveWhatsApp, onUploadAvatar, onRemoveAvatar, whatsappPhone = "", onWhatsAppPhoneChange, pending, feedback }) {
  const view = getAuthorProfileView({ authorProfile });
  if (view === "inactive") {
    return <section className="reader-profile-tab-panel author-profile-panel" aria-labelledby="author-profile-title"><div className="dashboard-card author-profile-card"><p className="section-label">AUTORES EN BOOKIA</p><h2 id="author-profile-title">Publicá tus libros en Bookia</h2><p>Activá gratis tu perfil de autor/a. Tu nombre, alias y biografía serán los mismos que ya usás en tu perfil lector.</p><form onSubmit={onActivate}><label className="author-rights-declaration" htmlFor="rights-declaration"><input id="rights-declaration" type="checkbox" checked={accepted} onChange={(event) => onAcceptedChange(event.target.checked)} required disabled={pending} /><span>{RIGHTS_DECLARATION}</span></label><button className="primary-button" type="submit" disabled={pending || !accepted}>{pending ? "Activando..." : "Activar perfil de autor/a"}</button></form>{feedback ? <p className="feedback" role="status">{feedback}</p> : null}</div></section>;
  }
  return <section className="reader-profile-tab-panel author-profile-panel" aria-labelledby="author-profile-title">
    <div className="dashboard-card author-profile-card is-active">
      <p className="section-label">AUTORES EN BOOKIA</p>
      <h2 id="author-profile-title">Tu perfil de autor/a está activo</h2>
      <p>Tu perfil público ya muestra la insignia Autor/a en Bookia.</p>
    </div>
    <div className="dashboard-card author-profile-public-settings" aria-labelledby="author-profile-public-title">
      <div className="author-profile-public-settings-heading">
        <p className="section-label">TU PERFIL PÚBLICO</p>
        <h3 id="author-profile-public-title">Foto y contacto</h3>
        <p>Completá estos datos para que quienes descubran tus obras puedan reconocerte y consultarte.</p>
      </div>
      <div className="author-profile-public-settings-grid">
        <div className="author-avatar-editor">
          {authorProfile?.avatar_url ? <img className="author-profile-avatar-preview" src={resolveApiUrl(authorProfile.avatar_url)} alt="Tu foto de perfil" /> : <div className="author-profile-avatar-placeholder" aria-hidden="true">Foto</div>}
          <div className="author-avatar-copy"><h4>Foto de perfil <small>(opcional)</small></h4><p>Se mostrará junto a tu nombre en Bookia.</p><label className="secondary-button author-avatar-upload"><input type="file" accept="image/png,image/jpeg,image/webp" disabled={pending} onChange={(event) => { const [file] = event.target.files || []; if (file) onUploadAvatar?.(file); event.target.value = ""; }} /><span>{pending ? "Actualizando..." : authorProfile?.avatar_url ? "Cambiar foto" : "Elegir foto"}</span></label>{authorProfile?.avatar_url ? <button className="author-avatar-remove" type="button" onClick={onRemoveAvatar} disabled={pending}>Quitar foto</button> : null}</div>
        </div>
        <form className="author-whatsapp-form" onSubmit={onSaveWhatsApp}>
          <label><span>Celular con WhatsApp <small>(opcional)</small></span><input type="tel" value={whatsappPhone} onChange={(event) => onWhatsAppPhoneChange?.(event.target.value)} maxLength={50} placeholder="11 2222-3333" disabled={pending} /><small>Solo se comparte con cuentas que hayan iniciado sesión.</small></label>
          <button className="primary-button" type="submit" disabled={pending}>{pending ? "Guardando..." : "Guardar WhatsApp"}</button>
        </form>
      </div>
      {feedback ? <p className="feedback" role="status">{feedback}</p> : null}
    </div>
    <AuthorBooksManager genres={genres} />
    <aside className="dashboard-card author-profile-danger-zone" aria-labelledby="author-profile-danger-title">
      <div><p className="section-label">PERFIL DE AUTOR/A</p><h3 id="author-profile-danger-title">Desactivar perfil</h3><p>Conservaremos tus libros para que puedas volver a administrarlos cuando reactives tu perfil.</p></div>
      <button className="secondary-button" type="button" onClick={onDeactivate} disabled={pending}>{pending ? "Desactivando..." : "Desactivar perfil"}</button>
    </aside>
  </section>;
}
