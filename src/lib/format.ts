import { parseBirthday } from "../domain/birthday";
import { DAY_FORMS, formatCount } from "./plural";

/** Nominative month names for pickers ("leden" …). */
export const MONTH_NAMES = [
  "leden",
  "únor",
  "březen",
  "duben",
  "květen",
  "červen",
  "červenec",
  "srpen",
  "září",
  "říjen",
  "listopad",
  "prosinec",
] as const;

/** Genitive month names for dates ("14. května"). */
const MONTH_NAMES_GENITIVE = [
  "ledna",
  "února",
  "března",
  "dubna",
  "května",
  "června",
  "července",
  "srpna",
  "září",
  "října",
  "listopadu",
  "prosince",
] as const;

/** "14. května" */
export function formatDayMonth(date: { month: number; day: number }): string {
  return `${date.day}. ${MONTH_NAMES_GENITIVE[date.month - 1]}`;
}

/** "dnes", "zítra", "za 12 dní", "včera", "před 3 dny" */
export function formatRelativeDays(days: number): string {
  if (days === 0) return "dnes";
  if (days === 1) return "zítra";
  if (days === -1) return "včera";
  if (days > 1) return `za ${formatCount(days, DAY_FORMS)}`;
  // Instrumental after "před": "před 2 dny", "před 5 dny".
  return `před ${-days} dny`;
}

/** "Jana: narozeniny za 30 dní · Petr: narozeniny dnes" (gender-neutral). */
export function formatReminderSummary(items: { name: string; daysUntil: number }[]): string {
  return items.map((item) => `${item.name}: narozeniny ${formatRelativeDays(item.daysUntil)}`).join(" · ");
}

const PRICE_FORMAT = new Intl.NumberFormat("cs-CZ", {
  style: "currency",
  currency: "CZK",
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

/** "1 200 Kč", "349,90 Kč" */
export function formatPrice(price: number): string {
  return PRICE_FORMAT.format(price);
}

/** "14. května 1990", or "14. května" when the year is unknown. Empty string for invalid input. */
export function formatBirthdayCs(birthday: string): string {
  const parts = parseBirthday(birthday);
  if (parts === null) return "";
  const date = `${parts.day}. ${MONTH_NAMES_GENITIVE[parts.month - 1]}`;
  return parts.year === null ? date : `${date} ${parts.year}`;
}
