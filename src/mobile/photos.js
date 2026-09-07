import { Camera, CameraResultType, CameraSource } from "@capacitor/camera";

export async function photoToFile(photo) {
  if (!photo?.webPath) throw new Error("No pudimos leer la foto. Volvé a seleccionarla.");
  const response = await fetch(photo.webPath);
  if (!response.ok) throw new Error("No pudimos leer la foto seleccionada.");
  const blob = await response.blob();
  return new File([blob], `libros.${photo.format || "jpeg"}`, { type: blob.type || `image/${photo.format || "jpeg"}` });
}

export async function selectNativePhoto(fromCamera) {
  try {
    const photo = await Camera.getPhoto({ source: fromCamera ? CameraSource.Camera : CameraSource.Photos, resultType: CameraResultType.Uri, quality: 90, width: 2400, correctOrientation: true, saveToGallery: false });
    return await photoToFile(photo);
  } catch (error) {
    if (/cancel|canceled|cancelled/i.test(error?.message || "")) return null;
    throw new Error("No pudimos abrir la foto. Revisá el acceso a la cámara o galería en Ajustes y probá nuevamente.");
  }
}
