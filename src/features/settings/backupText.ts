import { daysBetween, localDateOf, type LocalDate } from "../../domain/birthdays";
import type { EntityCounts } from "../../domain/backup";
import { formatRelativeDays } from "../../lib/format";
import { formatCount, GIFT_FORMS, LINK_FORMS, PERSON_FORMS, TAG_FORMS } from "../../lib/plural";

/** Days after the last export when Settings gently suggests a new backup. */
export const BACKUP_REMINDER_DAYS = 30;

function countList(counts: EntityCounts, withLinks: boolean): string[] {
  return [
    counts.people > 0 ? formatCount(counts.people, PERSON_FORMS) : null,
    counts.gifts > 0 ? formatCount(counts.gifts, GIFT_FORMS) : null,
    counts.tags > 0 ? formatCount(counts.tags, TAG_FORMS) : null,
    withLinks && counts.giftLinks > 0 ? formatCount(counts.giftLinks, LINK_FORMS) : null,
  ].filter((item): item is string => item !== null);
}

/** "1 osoba, 2 dárky, 5 štítků" overwritten by records with the same ID; null when nothing is. */
export function overwriteText(updated: EntityCounts): string | null {
  const items = countList(updated, false);
  return items.length === 0 ? null : items.join(", ");
}

/** "Přidáno: 2 osoby, 1 dárek. Aktualizováno: 3 štítky." */
export function importSummaryText(added: EntityCounts, updated: EntityCounts): string {
  const addedItems = countList(added, true);
  const updatedItems = countList(updated, true);
  if (addedItems.length === 0 && updatedItems.length === 0) return "Záloha neobsahovala žádná data.";
  return [
    addedItems.length > 0 ? `Přidáno: ${addedItems.join(", ")}.` : null,
    updatedItems.length > 0 ? `Aktualizováno: ${updatedItems.join(", ")}.` : null,
  ]
    .filter((part) => part !== null)
    .join(" ");
}

function daysSinceExport(lastExportAt: string, today: LocalDate): number {
  return daysBetween(localDateOf(new Date(lastExportAt)), today);
}

/** "Poslední záloha: dnes / včera / před 12 dny" or "Zatím nezálohováno". */
export function lastBackupText(lastExportAt: string | null, today: LocalDate): string {
  if (lastExportAt === null) return "Zatím nezálohováno";
  return `Poslední záloha: ${formatRelativeDays(-Math.max(0, daysSinceExport(lastExportAt, today)))}`;
}

/** Gentle hint when there is data and the last export is older than 30 days, or never happened. */
export function shouldSuggestBackup(hasData: boolean, lastExportAt: string | null, today: LocalDate): boolean {
  if (!hasData) return false;
  return lastExportAt === null || daysSinceExport(lastExportAt, today) > BACKUP_REMINDER_DAYS;
}
