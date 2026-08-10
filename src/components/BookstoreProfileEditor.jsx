import { useEffect, useState } from "react";

import { apiFetch, resolveApiUrl } from "../api";
import {
  buildProfileFormData,
  createProfileDraft,
  displayBookstoreDescription,
  displayBookstoreType,
  getBookstoreTagOptions,
  removeProfileImage,
  requireRefreshedBookstore,
  selectProfileImage,
  setProfileDraftField,
} from "../profileEditorState";
import { formatDisplayWhatsApp } from "../formatters";
import { getGenreSelectorState } from "../genreSelectorState";
import { BookstoreDescription } from "./BookstoreDescription";
import { RichDescriptionEditor } from "./RichDescriptionEditor";

const PROFILE_IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";

function profileSummary(bookstore) {
  return [
    { label: "Correo", value: bookstore.correo },
    { label: "Celular con WhatsApp", value: formatDisplayWhatsApp(bookstore.whatsapp_phone) },
    { label: "Instagram", value: bookstore.instagram_handle },
    { label: "Facebook", value: bookstore.facebook_handle },
    { label: "Sitio web", value: bookstore.website_url },
    { label: "Direccion", value: bookstore.address },
    { label: "Tipo de libreria", value: displayBookstoreType(bookstore.bookstore_type) },
  ];
}

function BookstoreTagField({ label, value, otherValue, genres, genresLoading, genresError, isSaving, onChange }) {
  const state = getGenreSelectorState({ genresLoading, genresError, genres });
  const options = getBookstoreTagOptions(genres, value, otherValue);
  const isDisabled = isSaving || state.kind !== "ready";

  return (
    <label>
      <span>{label}</span>
      <select value={value} onChange={(event) => onChange(event.target.value)} disabled={isDisabled}>
        <option value="">Sin etiqueta</option>
        {options.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select>
      {state.kind !== "ready" ? <small className={`bookstore-tag-status is-${state.kind}`} role={state.kind === "error" ? "alert" : undefined}>{state.message}</small> : null}
    </label>
  );
}

export default function BookstoreProfileEditor({ bookstore, onSaved, onError, genres = [], genresLoading = false, genresError = "" }) {
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [draft, setDraft] = useState(() => createProfileDraft(bookstore));
  const [logoPreviewUrl, setLogoPreviewUrl] = useState("");
  const [bannerPreviewUrl, setBannerPreviewUrl] = useState("");
  const [failedLogoUrl, setFailedLogoUrl] = useState("");
  const [failedBannerUrl, setFailedBannerUrl] = useState("");
  const logoFile = draft.logoFile;
  const bannerFile = draft.bannerFile;
  const savedLogoUrl = resolveApiUrl(bookstore.logo_url);
  const savedBannerUrl = resolveApiUrl(bookstore.hero_image_url || bookstore.banner_url);
  const visibleLogoUrl = draft.removeLogo ? "" : logoPreviewUrl || savedLogoUrl;
  const visibleBannerUrl = draft.removeBanner ? "" : bannerPreviewUrl || savedBannerUrl;
  const renderLogoUrl = visibleLogoUrl && visibleLogoUrl !== failedLogoUrl ? visibleLogoUrl : "";
  const renderBannerUrl = visibleBannerUrl && visibleBannerUrl !== failedBannerUrl ? visibleBannerUrl : "";
  const logoUploadLabel = visibleLogoUrl ? "Cambiar logo" : "Subir logo";
  const bannerUploadLabel = visibleBannerUrl ? "Cambiar banner" : "Subir banner";

  useEffect(() => {
    if (!logoFile) {
      setLogoPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(logoFile);
    setLogoPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [logoFile]);

  useEffect(() => {
    if (!bannerFile) {
      setBannerPreviewUrl("");
      return undefined;
    }

    const objectUrl = URL.createObjectURL(bannerFile);
    setBannerPreviewUrl(objectUrl);
    return () => URL.revokeObjectURL(objectUrl);
  }, [bannerFile]);

  function startEditing() {
    setFailedLogoUrl("");
    setFailedBannerUrl("");
    setDraft(createProfileDraft(bookstore));
    setIsEditing(true);
  }

  function cancelEditing() {
    setFailedLogoUrl("");
    setFailedBannerUrl("");
    setLogoPreviewUrl("");
    setBannerPreviewUrl("");
    setDraft(createProfileDraft(bookstore));
    setIsEditing(false);
  }

  function selectImage(role, event) {
    const file = event.currentTarget.files?.[0];
    event.currentTarget.value = "";
    if (file) {
      if (role === "logo") {
        setFailedLogoUrl("");
      } else {
        setFailedBannerUrl("");
      }
      setDraft((current) => selectProfileImage(current, role, file));
    }
  }

  function removeImage(role) {
    if (role === "logo") {
      setFailedLogoUrl("");
    } else {
      setFailedBannerUrl("");
    }
    setDraft((current) => removeProfileImage(current, role));
  }

  function markImageFailed(role, source) {
    if (role === "logo") {
      setFailedLogoUrl(source);
    } else {
      setFailedBannerUrl(source);
    }
  }

  function changeField(field, value) {
    setDraft((current) => setProfileDraftField(current, field, value));
  }

  async function saveProfile(event) {
    event.preventDefault();
    setIsSaving(true);

    try {
      await apiFetch("/dashboard/bookstore-profile", {
        method: "PATCH",
        body: buildProfileFormData(draft),
      });
      const refreshedSession = await onSaved();
      requireRefreshedBookstore(refreshedSession);
      onError("");
      setFailedLogoUrl("");
      setFailedBannerUrl("");
      setLogoPreviewUrl("");
      setBannerPreviewUrl("");
      setDraft(createProfileDraft());
      setIsEditing(false);
    } catch (error) {
      onError(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  if (!isEditing) {
    const summaryItems = profileSummary(bookstore);
    const completedItems = summaryItems.filter((item) => String(item.value || "").trim());
    const missingItems = summaryItems.filter((item) => !String(item.value || "").trim());
    return (
      <section className="bookstore-profile-section dashboard-card" aria-labelledby="bookstore-profile-title">
        <div className="bookstore-profile-heading">
          <div>
            <p className="section-label">Perfil de la libreria</p>
            <h2 id="bookstore-profile-title">Tu vidriera digital</h2>
            <BookstoreDescription value={displayBookstoreDescription(bookstore.description)} />
          </div>
          <button type="button" className="secondary-button" onClick={startEditing}>Editar perfil</button>
        </div>
        {completedItems.length > 0 ? <dl className="bookstore-profile-summary-grid">{completedItems.map((item) => <div key={item.label}><dt>{item.label}</dt><dd>{item.value}</dd></div>)}</dl> : null}
        {missingItems.length > 0 ? <p className="bookstore-profile-missing"><strong>Datos por completar:</strong> {missingItems.map((item) => item.label).join(", ")}.</p> : null}
      </section>
    );
  }

  return (
    <section className="bookstore-profile-section dashboard-card" aria-labelledby="bookstore-profile-title">
      <form onSubmit={saveProfile}>
        <div className="bookstore-profile-heading">
          <div>
            <p className="section-label">Perfil de la libreria</p>
            <h2 id="bookstore-profile-title">Editar vidriera digital</h2>
            <p>Actualiza la descripcion y las imagenes que ven tus lectores.</p>
          </div>
          <div className="bookstore-profile-actions">
            <button type="button" className="secondary-button" onClick={cancelEditing} disabled={isSaving}>Cancelar</button>
            <button type="submit" className="primary-button" disabled={isSaving}>{isSaving ? "Guardando..." : "Guardar cambios"}</button>
          </div>
        </div>

        <fieldset className="bookstore-profile-group">
          <legend>Presentacion</legend>
          <div className="bookstore-profile-fields">
            <label className="bookstore-profile-field-wide">
              <span>Descripcion</span>
              <RichDescriptionEditor value={draft.description} onChange={(value) => changeField("description", value)} disabled={isSaving} placeholder="Conta que hace especial a tu libreria." />
            </label>
            <label className="bookstore-profile-field-wide"><span>Tipo de libreria</span><select value={draft.bookstoreType} onChange={(event) => changeField("bookstoreType", event.target.value)} disabled={isSaving} required><option value="">Selecciona una opcion</option><option value="physical">Libreria fisica</option><option value="virtual">Libreria virtual</option><option value="hybrid">Libreria fisica y virtual</option></select></label>
            <BookstoreTagField label="Etiqueta 1" value={draft.tag1} otherValue={draft.tag2} genres={genres} genresLoading={genresLoading} genresError={genresError} isSaving={isSaving} onChange={(value) => changeField("tag1", value)} />
            <BookstoreTagField label="Etiqueta 2" value={draft.tag2} otherValue={draft.tag1} genres={genres} genresLoading={genresLoading} genresError={genresError} isSaving={isSaving} onChange={(value) => changeField("tag2", value)} />
          </div>
        </fieldset>

        <fieldset className="bookstore-profile-group">
          <legend>Contacto</legend>
          <div className="bookstore-profile-fields">
            <label className="bookstore-profile-field-wide"><span>Direccion</span><input value={draft.address} onChange={(event) => changeField("address", event.target.value)} disabled={isSaving} placeholder="Calle, numero, ciudad" /></label>
            <label><span>Correo publico</span><input type="email" value={draft.contactEmail} onChange={(event) => changeField("contactEmail", event.target.value)} maxLength={255} disabled={isSaving} placeholder="contacto@libreria.com" /></label>
            <label><span>Celular con WhatsApp</span><input type="tel" value={draft.whatsappPhone} onChange={(event) => changeField("whatsappPhone", event.target.value)} maxLength={50} disabled={isSaving} required placeholder="11 2222-3333" /><small>Podes escribirlo en formato local argentino.</small></label>
          </div>
        </fieldset>

        <fieldset className="bookstore-profile-group">
          <legend>Presencia online</legend>
          <div className="bookstore-profile-fields">
            <label><span>Instagram</span><input value={draft.instagramHandle} onChange={(event) => changeField("instagramHandle", event.target.value)} maxLength={255} disabled={isSaving} placeholder="@libreria o URL completa" /></label>
            <label><span>Facebook</span><input value={draft.facebookHandle} onChange={(event) => changeField("facebookHandle", event.target.value)} maxLength={255} disabled={isSaving} placeholder="usuario o URL completa" /></label>
            <label className="bookstore-profile-field-wide"><span>Sitio web</span><input type="text" inputMode="url" value={draft.websiteUrl} onChange={(event) => changeField("websiteUrl", event.target.value)} maxLength={500} disabled={isSaving} placeholder="libreria.com" /></label>
          </div>
        </fieldset>

        <fieldset className="bookstore-profile-group">
          <legend>Identidad visual</legend>
          <div className="bookstore-profile-media-grid">
          <div className="bookstore-profile-upload">
            <span className="bookstore-profile-media-label">Logo</span>
            <div className="bookstore-profile-logo">
              {renderLogoUrl ? <img src={renderLogoUrl} alt="Vista previa del logo" onError={() => markImageFailed("logo", renderLogoUrl)} /> : <span>Sin logo</span>}
            </div>
            <div className="bookstore-profile-preview-actions">
              <input
                id={`bookstore-profile-logo-upload-${bookstore.id || "current"}`}
                className="bookstore-profile-file-input"
                type="file"
                accept={PROFILE_IMAGE_ACCEPT}
                onChange={(event) => selectImage("logo", event)}
                disabled={isSaving}
              />
              <label className="secondary-button bookstore-profile-upload-button" htmlFor={`bookstore-profile-logo-upload-${bookstore.id || "current"}`}>
                {logoUploadLabel}
              </label>
              {visibleLogoUrl ? <button type="button" className="text-link" onClick={() => removeImage("logo")} disabled={isSaving}>Quitar</button> : null}
            </div>
            <small>PNG, JPEG o WebP &middot; m&aacute;ximo 5 MB. Recomendado: 512 x 512 px.</small>
          </div>

          <div className="bookstore-profile-upload">
            <span className="bookstore-profile-media-label">Banner</span>
            <div className="bookstore-profile-banner">
              {renderBannerUrl ? <img src={renderBannerUrl} alt="Vista previa del banner" onError={() => markImageFailed("banner", renderBannerUrl)} /> : <span>Sin banner</span>}
            </div>
            <div className="bookstore-profile-preview-actions">
              <input
                id={`bookstore-profile-banner-upload-${bookstore.id || "current"}`}
                className="bookstore-profile-file-input"
                type="file"
                accept={PROFILE_IMAGE_ACCEPT}
                onChange={(event) => selectImage("banner", event)}
                disabled={isSaving}
              />
              <label className="secondary-button bookstore-profile-upload-button" htmlFor={`bookstore-profile-banner-upload-${bookstore.id || "current"}`}>
                {bannerUploadLabel}
              </label>
              {visibleBannerUrl ? <button type="button" className="text-link" onClick={() => removeImage("banner")} disabled={isSaving}>Quitar</button> : null}
            </div>
            <small>PNG, JPEG o WebP &middot; m&aacute;ximo 5 MB. Recomendado: 1600 x 600 px.</small>
          </div>
          </div>
        </fieldset>
      </form>
    </section>
  );
}
