import { useEffect, useState } from "react";

import { apiFetch, resolveApiUrl } from "../api";
import {
  buildProfileFormData,
  createProfileDraft,
  displayBookstoreDescription,
  removeProfileImage,
  requireRefreshedBookstore,
  selectProfileImage,
} from "../profileEditorState";

const PROFILE_IMAGE_ACCEPT = "image/png,image/jpeg,image/webp";

export default function BookstoreProfileEditor({ bookstore, onSaved, onError }) {
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
    return (
      <section className="bookstore-profile-section dashboard-card" aria-labelledby="bookstore-profile-title">
        <div className="bookstore-profile-heading">
          <div>
            <p className="section-label">Perfil de la libreria</p>
            <h2 id="bookstore-profile-title">Tu vidriera digital</h2>
            <p>{displayBookstoreDescription(bookstore.description)}</p>
          </div>
          <button type="button" className="secondary-button" onClick={startEditing}>Editar perfil</button>
        </div>
        <div className="bookstore-profile-media-grid">
          <div>
            <span className="bookstore-profile-media-label">Logo</span>
            <div className="bookstore-profile-logo">
              {renderLogoUrl ? <img src={renderLogoUrl} alt={`Logo de ${bookstore.name}`} onError={() => markImageFailed("logo", renderLogoUrl)} /> : <span>Sin logo</span>}
            </div>
          </div>
          <div>
            <span className="bookstore-profile-media-label">Banner</span>
            <div className="bookstore-profile-banner">
              {renderBannerUrl ? <img src={renderBannerUrl} alt={`Banner de ${bookstore.name}`} onError={() => markImageFailed("banner", renderBannerUrl)} /> : <span>Sin banner</span>}
            </div>
          </div>
        </div>
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

        <label className="bookstore-profile-description">
          <span>Descripcion</span>
          <textarea
            value={draft.description}
            onChange={(event) => setDraft((current) => ({ ...current, description: event.target.value }))}
            rows={4}
            disabled={isSaving}
            placeholder="Conta que hace especial a tu libreria."
          />
        </label>

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
      </form>
    </section>
  );
}
