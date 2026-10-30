import { parseBirthday, type BirthdayParts } from "./birthday";
import type { Person, ReminderType } from "./entities";
import { comparePeopleByName } from "./sorting";

/**
 * A calendar date in the user's local calendar. Birthday math works on these
 * (never on timestamps), so time zones and DST cannot shift a birthday.
 */
export type LocalDate = { year: number; month: number; day: number };

const MS_PER_DAY = 86_400_000;

/** Days a BEFORE_30 reminder is due before the birthday. */
export const BEFORE_DAYS = 30;
/** Days after the birthday a DAY reminder stays relevant. */
export const DAY_RELEVANCE_DAYS = 7;
/** Upcoming birthdays: today … today + this many days (inclusive). */
export const UPCOMING_WINDOW_DAYS = 30;

type BirthdayPerson = Pick<Person, "id" | "name" | "birthday">;

/** The local calendar date of a moment, as the user sees it on their device. */
export function localDateOf(moment: Date): LocalDate {
  return { year: moment.getFullYear(), month: moment.getMonth() + 1, day: moment.getDate() };
}

// UTC is used only as a neutral day counter for local calendar dates.
function dayNumber(date: LocalDate): number {
  return Date.UTC(date.year, date.month - 1, date.day) / MS_PER_DAY;
}

/** Whole days from `from` to `to` (negative when `to` is earlier). */
export function daysBetween(from: LocalDate, to: LocalDate): number {
  return dayNumber(to) - dayNumber(from);
}

export function addDays(date: LocalDate, days: number): LocalDate {
  const moment = new Date((dayNumber(date) + days) * MS_PER_DAY);
  return { year: moment.getUTCFullYear(), month: moment.getUTCMonth() + 1, day: moment.getUTCDate() };
}

/** "YYYY-MM-DD" */
export function formatIsoDate(date: LocalDate): string {
  return [String(date.year).padStart(4, "0"), String(date.month).padStart(2, "0"), String(date.day).padStart(2, "0")].join(
    "-",
  );
}

function isLeapYear(year: number): boolean {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

/** The birthday in a given year; 29 February falls on 28 February in non-leap years. */
export function occurrenceInYear(parts: BirthdayParts, year: number): LocalDate {
  if (parts.month === 2 && parts.day === 29 && !isLeapYear(year)) return { year, month: 2, day: 28 };
  return { year, month: parts.month, day: parts.day };
}

/** The next birthday on or after `today`, or null for no/invalid birthday. */
export function nextOccurrence(birthday: string | null, today: LocalDate): LocalDate | null {
  const parts = birthday === null ? null : parseBirthday(birthday);
  if (parts === null) return null;
  const thisYear = occurrenceInYear(parts, today.year);
  return daysBetween(today, thisYear) >= 0 ? thisYear : occurrenceInYear(parts, today.year + 1);
}

/** Age reached on `occurrence`; null when the birth year is unknown. */
export function ageAt(birthday: string | null, occurrence: LocalDate): number | null {
  const parts = birthday === null ? null : parseBirthday(birthday);
  if (parts === null || parts.year === null) return null;
  const age = occurrence.year - parts.year;
  return age > 0 ? age : null;
}

export type UpcomingBirthday<P extends BirthdayPerson> = {
  person: P;
  occurrence: LocalDate;
  /** 0 = today */
  daysUntil: number;
  age: number | null;
};

/** Birthdays from today to today + windowDays (inclusive), soonest first; people without a birthday are skipped. */
export function upcomingBirthdays<P extends BirthdayPerson>(
  people: readonly P[],
  today: LocalDate,
  windowDays = UPCOMING_WINDOW_DAYS,
): UpcomingBirthday<P>[] {
  const upcoming: UpcomingBirthday<P>[] = [];
  for (const person of people) {
    const occurrence = nextOccurrence(person.birthday, today);
    if (occurrence === null) continue;
    const daysUntil = daysBetween(today, occurrence);
    if (daysUntil <= windowDays) {
      upcoming.push({ person, occurrence, daysUntil, age: ageAt(person.birthday, occurrence) });
    }
  }
  return upcoming.sort((a, b) => a.daysUntil - b.daysUntil || comparePeopleByName(a.person, b.person));
}

/** NotificationLog key: "<personId>:<type>:<occurrenceDate>". */
export function reminderKey(personId: number, type: ReminderType, occurrenceDate: string): string {
  return `${personId}:${type}:${occurrenceDate}`;
}

export type DueReminder<P extends BirthdayPerson> = {
  key: string;
  person: P;
  type: ReminderType;
  occurrence: LocalDate;
  /** "YYYY-MM-DD" of the birthday occurrence the reminder belongs to. */
  occurrenceDate: string;
  /** Days from today to the birthday; negative when it has passed. */
  daysUntil: number;
  age: number | null;
};

/**
 * Reminders that are due (due date ≤ today), still relevant, and not yet shown
 * (PRODUCT.md §12):
 * - BEFORE_30: due 30 days before the birthday, relevant until the day before it;
 * - DAY: due on the birthday, relevant until 7 days after it.
 */
export function dueReminders<P extends BirthdayPerson>(
  people: readonly P[],
  today: LocalDate,
  alreadyShown: ReadonlySet<string>,
): DueReminder<P>[] {
  const reminders: DueReminder<P>[] = [];
  for (const person of people) {
    const parts = person.birthday === null ? null : parseBirthday(person.birthday);
    if (parts === null) continue;
    // Neighbouring years cover reminders across the new year.
    for (const year of [today.year - 1, today.year, today.year + 1]) {
      const occurrence = occurrenceInYear(parts, year);
      const daysUntil = daysBetween(today, occurrence);
      let type: ReminderType | null = null;
      if (daysUntil > 0 && daysUntil <= BEFORE_DAYS) type = "BEFORE_30";
      else if (daysUntil <= 0 && daysUntil >= -DAY_RELEVANCE_DAYS) type = "DAY";
      if (type === null) continue;
      const occurrenceDate = formatIsoDate(occurrence);
      const key = reminderKey(person.id, type, occurrenceDate);
      if (alreadyShown.has(key)) continue;
      reminders.push({
        key,
        person,
        type,
        occurrence,
        occurrenceDate,
        daysUntil,
        age: ageAt(person.birthday, occurrence),
      });
    }
  }
  return reminders.sort((a, b) => a.daysUntil - b.daysUntil || comparePeopleByName(a.person, b.person));
}
