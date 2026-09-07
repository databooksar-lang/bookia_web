import { App } from "@capacitor/app";
import { isNativeAndroidRuntime } from "./sessionVault";

let restoredPhoto = null;
let consumer = null;
// Register at startup, before the lazy photo panel mounts after Android recreates the process.
if (isNativeAndroidRuntime()) {
  App.addListener("appRestoredResult", (result) => {
    if (result.pluginId !== "Camera" || !result.success || !result.data?.webPath) return;
    if (consumer) consumer(result.data);
    else restoredPhoto = result.data;
  }).catch(() => {});
}

export function subscribeToRestoredPhoto(callback) {
  consumer = callback;
  if (restoredPhoto) { const photo = restoredPhoto; restoredPhoto = null; callback(photo); }
  return () => { if (consumer === callback) consumer = null; };
}
