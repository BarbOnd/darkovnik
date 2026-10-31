import { useCallback, useEffect, useRef, useState } from "react";
import type { GiftListRepository } from "../../db/repository";
import { localDateOf, missedReminders, type DueReminder } from "../../domain/birthdays";
import type { Person } from "../../domain/entities";
import { evaluateReminders, reminderNotificationBody } from "./evaluate";
import { showSystemNotification } from "./reminders";

/** While the app stays open, reminders are re-checked this often (covers midnight). */
const RECHECK_INTERVAL_MS = 60 * 60 * 1000;

/**
 * Evaluates birthday reminders on start, when the app becomes visible again and
 * hourly while open — only when the setting is on (PRODUCT.md §12). Claimed
 * reminders show one system notification (if permitted). The "Zmeškané
 * připomínky" card lists every reminder recorded on this device (also by the
 * background check) until the user closes it; that state lives in NotificationLog,
 * so it survives reloads.
 */
export function useReminders(repository: GiftListRepository, enabled: boolean) {
  const [missed, setMissed] = useState<DueReminder<Person>[]>([]);
  const running = useRef(false);

  const refresh = useCallback(async () => {
    const [entries, people] = await Promise.all([repository.listUnseenReminders(), repository.listPeople()]);
    setMissed(missedReminders(entries, people, localDateOf(new Date())));
  }, [repository]);

  useEffect(() => {
    if (!enabled) return;

    async function run() {
      if (running.current) return;
      running.current = true;
      try {
        const claimed = await evaluateReminders(repository, localDateOf(new Date()));
        if (claimed.length > 0) void showSystemNotification(reminderNotificationBody(claimed));
      } catch {
        // Nothing was claimed; the next trigger tries again.
      }
      try {
        // Also picks up reminders the background check recorded while the app was closed.
        await refresh();
      } catch {
        // The card stays as it is; the next trigger tries again.
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
  }, [repository, enabled, refresh]);

  const dismiss = useCallback(() => {
    const keys = missed.map((reminder) => reminder.key);
    setMissed([]);
    repository.markRemindersSeen(keys).catch(() => {
      // Not recorded: show the card again so the reminders are not lost.
      refresh().catch(() => undefined);
    });
  }, [missed, repository, refresh]);

  return { missed: enabled ? missed : [], dismiss };
}
