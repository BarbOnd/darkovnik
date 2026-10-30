import { PERIODIC_SYNC_TAG } from "./evaluate";

/**
 * "active": the browser may wake the service worker roughly daily to check
 * reminders while the app is closed (Chromium on Android, installed app).
 * "unavailable": reminders are checked only when the app is opened.
 */
export type BackgroundCheckState = "active" | "unavailable";

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

async function periodicSyncRegistration(): Promise<ServiceWorkerRegistration | null> {
  if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return null;
  const registration = await navigator.serviceWorker.getRegistration();
  return registration?.periodicSync === undefined ? null : registration;
}

/**
 * Registers the daily background check when reminders are on and the browser
 * allows it; unregisters it when they are off. Never required (PRODUCT.md §12).
 */
export async function syncBackgroundCheck(enabled: boolean): Promise<BackgroundCheckState> {
  try {
    const registration = await periodicSyncRegistration();
    const periodicSync = registration?.periodicSync;
    if (periodicSync === undefined) return "unavailable";
    if (!enabled) {
      await periodicSync.unregister(PERIODIC_SYNC_TAG);
      return "unavailable";
    }
    // Chromium grants this permission only to installed apps the user engages with.
    const permission = await navigator.permissions.query({ name: "periodic-background-sync" as PermissionName });
    if (permission.state !== "granted") return "unavailable";
    await periodicSync.register(PERIODIC_SYNC_TAG, { minInterval: ONE_DAY_MS });
    return "active";
  } catch {
    return "unavailable";
  }
}

export async function backgroundCheckState(): Promise<BackgroundCheckState> {
  try {
    const registration = await periodicSyncRegistration();
    const tags = (await registration?.periodicSync?.getTags()) ?? [];
    return tags.includes(PERIODIC_SYNC_TAG) ? "active" : "unavailable";
  } catch {
    return "unavailable";
  }
}
