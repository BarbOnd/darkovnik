import { useId, useState } from "react";
import { useApp } from "../../app/AppContext";
import { StatusMessage } from "../../components/StatusMessage";
import { notificationSupport, requestNotificationPermission, type NotificationSupport } from "./reminders";

const SUPPORT_NOTES: Record<NotificationSupport, string> = {
  granted:
    "Připomínky se ukážou jako oznámení i přímo v aplikaci. Aplikace je kontroluje, když ji otevřete nebo se do ní vrátíte.",
  denied:
    "Systémová oznámení jsou zablokovaná. Připomínky uvidíte v aplikaci. Oznámení můžete povolit v nastavení telefonu.",
  default: "Oznámení nejsou povolená. Připomínky uvidíte v aplikaci.",
  unsupported: "Tento prohlížeč systémová oznámení nepodporuje. Připomínky uvidíte v aplikaci.",
};

/** "Upozornění na narozeniny" switch; asks for notification permission when turned on (PRODUCT.md §12). */
export function BirthdayNotificationsSetting() {
  const { metadata, updatePreferences } = useApp();
  const id = useId();
  const [support, setSupport] = useState<NotificationSupport>(notificationSupport);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const enabled = metadata.birthdayNotificationsEnabled;

  async function toggle(next: boolean) {
    setBusy(true);
    setFailed(false);
    try {
      // The permission prompt must start from this tap; the setting stays on whatever the answer.
      if (next) setSupport(await requestNotificationPermission());
      await updatePreferences({ birthdayNotificationsEnabled: next });
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
      {failed && <StatusMessage kind="error" message="Nastavení se nepodařilo uložit." />}
    </section>
  );
}
