import { useId, useState } from "react";
import { useApp } from "../../app/AppContext";
import { StatusMessage } from "../../components/StatusMessage";
import { useLoad } from "../../lib/useLoad";
import { backgroundCheckState, syncBackgroundCheck, type BackgroundCheckState } from "./backgroundCheck";
import { notificationSupport, requestNotificationPermission, type NotificationSupport } from "./reminders";

const SUPPORT_NOTES: Record<NotificationSupport, string> = {
  granted:
    "Připomínky se ukážou jako oznámení i přímo v aplikaci. Aplikace je kontroluje, když ji otevřete nebo se do ní vrátíte.",
  denied:
    "Systémová oznámení jsou zablokovaná. Připomínky uvidíte v aplikaci. Oznámení můžete povolit v nastavení telefonu.",
  default: "Oznámení nejsou povolená. Připomínky uvidíte v aplikaci.",
  unsupported: "Tento prohlížeč systémová oznámení nepodporuje. Připomínky uvidíte v aplikaci.",
};

/** Honest description of what happens while the app is closed (never a promise). */
const BACKGROUND_NOTES: Record<BackgroundCheckState, string> = {
  active:
    "Když je aplikace zavřená, telefon ji může zhruba jednou denně probudit a připomínky zkontrolovat. Přesný čas ani doručení zaručit nejde – rozhoduje telefon (např. úspora baterie).",
  unavailable:
    "Když je aplikace zavřená, připomínky se zkontrolují až při jejím dalším otevření. Kontrola na pozadí funguje jen v nainstalované aplikaci v Chrome nebo Edge na Androidu.",
};

/** "Upozornění na narozeniny" switch; asks for notification permission when turned on (PRODUCT.md §12). */
export function BirthdayNotificationsSetting() {
  const { metadata, updatePreferences } = useApp();
  const id = useId();
  const [support, setSupport] = useState<NotificationSupport>(notificationSupport);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const enabled = metadata.birthdayNotificationsEnabled;
  const initialBackground = useLoad(backgroundCheckState);
  const [background, setBackground] = useState<BackgroundCheckState | null>(null);
  const backgroundState = background ?? (initialBackground.status === "ready" ? initialBackground.data : null);

  async function toggle(next: boolean) {
    setBusy(true);
    setFailed(false);
    try {
      // The permission prompt must start from this tap; the setting stays on whatever the answer.
      if (next) setSupport(await requestNotificationPermission());
      await updatePreferences({ birthdayNotificationsEnabled: next });
      setBackground(await syncBackgroundCheck(next));
    } catch {
      setFailed(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="section" aria-labelledby={`${id}-heading`}>
      <div className="switch-row">
        <span className="switch-row__text">
          <h2 id={`${id}-heading`} className="switch-row__title">
            Upozornění na narozeniny
          </h2>
          <span className="field__hint">30 dní předem a v den narozenin.</span>
        </span>
        <input
          type="checkbox"
          role="switch"
          className="switch"
          aria-labelledby={`${id}-heading`}
          checked={enabled}
          disabled={busy}
          onChange={(event) => void toggle(event.target.checked)}
        />
      </div>
      {enabled && <p className="field__hint">{SUPPORT_NOTES[support]}</p>}
      {enabled && backgroundState !== null && <p className="field__hint">{BACKGROUND_NOTES[backgroundState]}</p>}
      {failed && <StatusMessage kind="error" message="Nastavení se nepodařilo uložit." />}
    </section>
  );
}
