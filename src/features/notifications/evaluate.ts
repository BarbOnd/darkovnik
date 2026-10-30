import type { GiftListRepository } from "../../db/repository";
import { dueReminders, type DueReminder, type LocalDate } from "../../domain/birthdays";
import type { Person } from "../../domain/entities";
import { formatReminderSummary } from "../../lib/format";

// No window/DOM APIs here: this module also runs in the service worker
// (Periodic Background Sync, phase 8).

export const NOTIFICATION_TITLE = "Narozeniny – GiftList";
export const NOTIFICATION_TAG = "giftlist-birthdays";
/** Periodic Background Sync tag registered by the app and handled by the service worker. */
export const PERIODIC_SYNC_TAG = "giftlist-birthday-reminders";

/**
 * Finds due, relevant, not-yet-shown reminders, records them in NotificationLog
 * and returns the ones this call claimed (PRODUCT.md §12).
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
