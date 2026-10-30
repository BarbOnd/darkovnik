import type { GiftListRepository } from "../../db/repository";
import { dueReminders, type DueReminder, type LocalDate } from "../../domain/birthdays";
import type { Person } from "../../domain/entities";
import { formatReminderSummary } from "../../lib/format";

/** Browser notification state; "unsupported" when the Notification API is missing. */
export type NotificationSupport = NotificationPermission | "unsupported";

export const NOTIFICATION_TITLE = "Narozeniny – GiftList";
const NOTIFICATION_TAG = "giftlist-birthdays";

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
 * (required on Android; added in phase 8), otherwise `new Notification`.
 * Returns false when it could not be shown — the in-app card still appears.
 */
export async function showSystemNotification(body: string): Promise<boolean> {
  if (notificationSupport() !== "granted") return false;
  const options: NotificationOptions = { body, tag: NOTIFICATION_TAG, icon: "icons/giftlist.svg" };
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

/**
 * Finds due, relevant, not-yet-shown reminders, records them in NotificationLog
 * and returns the ones this call claimed (PRODUCT.md §12). Pure logic lives in
 * domain/birthdays so the phase 8 background check can reuse it.
 */
export async function evaluateReminders(
  repository: GiftListRepository,
  today: LocalDate,
): Promise<DueReminder<Person>[]> {
  const [people, shownKeys] = await Promise.all([repository.listPeople(), repository.listNotificationLogKeys()]);
  const due = dueReminders(people, today, new Set(shownKeys));
  if (due.length === 0) return [];
  const claimed = new Set(
    await repository.claimReminders(
      due.map(({ key, person, type, occurrenceDate }) => ({ key, personId: person.id, type, occurrenceDate })),
    ),
  );
  return due.filter((reminder) => claimed.has(reminder.key));
}

export function reminderNotificationBody(reminders: DueReminder<Person>[]): string {
  return formatReminderSummary(
    reminders.map((reminder) => ({ name: reminder.person.name, daysUntil: reminder.daysUntil })),
  );
}
