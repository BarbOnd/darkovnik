import { useCallback, useEffect, useRef, useState } from "react";
import type { GiftListRepository } from "../../db/repository";
import { localDateOf, type DueReminder } from "../../domain/birthdays";
import type { Person } from "../../domain/entities";
import { evaluateReminders, reminderNotificationBody } from "./evaluate";
import { showSystemNotification } from "./reminders";

/** While the app stays open, reminders are re-checked this often (covers midnight). */
const RECHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Evaluates birthday reminders on start, when the app becomes visible again and
 * hourly while open — only when the setting is on (PRODUCT.md §12). Claimed
 * reminders show one system notification (if permitted) and stay in the
 * "Zmeškané připomínky" card until dismissed.
 */
export function useReminders(repository: GiftListRepository, enabled: boolean) {
  const [missed, setMissed] = useState<DueReminder<Person>[]>([]);
  const running = useRef(false);

  useEffect(() => {
    if (!enabled) return;

    async function run() {
      if (running.current) return;
      running.current = true;
      try {
        const claimed = await evaluateReminders(repository, localDateOf(new Date()));
        if (claimed.length === 0) return;
        void showSystemNotification(reminderNotificationBody(claimed));
        // Claimed reminders are already logged as shown, so they must reach the card
        // even if this effect was cleaned up meanwhile (e.g. React StrictMode).
        setMissed((current) => [...current, ...claimed.filter((reminder) => !current.some((c) => c.key === reminder.key))]);
      } catch {
        // Nothing was claimed; the next trigger tries again.
      } finally {
        running.current = false;
      }
    }

    function handleVisibility() {
      if (document.visibilityState === "visible") void run();
    }

    void run();
    document.addEventListener("visibilitychange", handleVisibility);
    const timer = window.setInterval(() => void run(), RECHECK_INTERVAL_MS);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibility);
      window.clearInterval(timer);
    };
  }, [repository, enabled]);

  const dismiss = useCallback(() => setMissed([]), []);
  return { missed, dismiss };
}
