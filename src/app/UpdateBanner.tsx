import { useEffect, useState } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import { syncBackgroundCheck } from "../features/notifications/backgroundCheck";

/** How often an open app looks for a new version (a cheap request for sw.js). */
const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Registers the service worker, keeps the background reminder check in sync
 * with the setting, and shows "Je dostupná nová verze" instead of reloading
 * silently (registerType "prompt").
 */
export function UpdateBanner({ remindersEnabled }: { remindersEnabled: boolean }) {
  const [registered, setRegistered] = useState(false);
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError(error: unknown) {
      // The app works without the service worker (just not offline); keep the reason visible for debugging.
      console.warn("Service worker registration failed", error);
    },
    onRegisteredSW(_url, registration) {
      setRegistered(true);
      if (registration !== undefined) {
        window.setInterval(() => void registration.update().catch(() => undefined), UPDATE_CHECK_INTERVAL_MS);
      }
    },
  });

  useEffect(() => {
    if (registered) void syncBackgroundCheck(remindersEnabled);
  }, [registered, remindersEnabled]);

  if (!needRefresh) return null;
  return (
    <div className="update-banner" role="status">
      <span>Je dostupná nová verze.</span>
      <button type="button" className="button button--primary button--compact" onClick={() => void updateServiceWorker(true)}>
        Načíst znovu
      </button>
      <button
        type="button"
        className="icon-button update-banner__close"
        aria-label="Zavřít oznámení o nové verzi"
        onClick={() => setNeedRefresh(false)}
      >
        ×
      </button>
    </div>
  );
}
