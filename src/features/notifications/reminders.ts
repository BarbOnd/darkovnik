import { NOTIFICATION_TAG, NOTIFICATION_TITLE } from "./evaluate";

/** Browser notification state; "unsupported" when the Notification API is missing. */
export type NotificationSupport = NotificationPermission | "unsupported";

export function notificationSupport(): NotificationSupport {
  return typeof Notification === "undefined" ? "unsupported" : Notification.permission;
}

/**
 * Asks for permission once (browsers block repeated prompts). Must be called
 * from a user gesture, e.g. turning the setting on.
 */
export async function requestNotificationPermission(): Promise<NotificationSupport> {
  const current = notificationSupport();
  if (current !== "default") return current;
  try {
    return await Notification.requestPermission();
  } catch {
    return notificationSupport();
  }
}

/**
 * Shows one system notification. Uses the service worker when one is active
 * (required on Android), otherwise `new Notification`. Returns false when it
 * could not be shown — the in-app card still appears.
 */
export async function showSystemNotification(body: string): Promise<boolean> {
  if (notificationSupport() !== "granted") return false;
  const options: NotificationOptions = { body, tag: NOTIFICATION_TAG, icon: "icons/icon-192.png" };
  try {
    const registration = await navigator.serviceWorker?.getRegistration();
    if (registration !== undefined) {
      await registration.showNotification(NOTIFICATION_TITLE, options);
      return true;
    }
    const notification = new Notification(NOTIFICATION_TITLE, options);
    notification.onclick = () => {
      window.focus();
      notification.close();
    };
    return true;
  } catch {
    // e.g. Android Chrome without a service worker: "Illegal constructor".
    return false;
  }
}
