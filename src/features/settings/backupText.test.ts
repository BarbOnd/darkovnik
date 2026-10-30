import { describe, expect, it } from "vitest";
import { importSummaryText, lastBackupText, overwriteText, shouldSuggestBackup } from "./backupText";

const none = { people: 0, gifts: 0, tags: 0, giftLinks: 0 };
const today = { year: 2026, month: 5, day: 14 };

/** A moment on a local calendar day (noon avoids any time-zone edge). */
function onDay(month: number, day: number): string {
  return new Date(2026, month - 1, day, 12).toISOString();
}

describe("backup texts", () => {
  it("lists overwritten records, links excluded", () => {
    expect(overwriteText({ people: 1, gifts: 2, tags: 5, giftLinks: 7 })).toBe("1 osoba, 2 dárky, 5 štítků");
    expect(overwriteText(none)).toBeNull();
  });

  it("summarizes the import", () => {
    expect(importSummaryText({ people: 2, gifts: 1, tags: 0, giftLinks: 3 }, { ...none, tags: 4 })).toBe(
      "Přidáno: 2 osoby, 1 dárek, 3 odkazy. Aktualizováno: 4 štítky.",
    );
    expect(importSummaryText(none, none)).toBe("Záloha neobsahovala žádná data.");
  });

  it.each([
    [null, "Zatím nezálohováno"],
    [onDay(5, 14), "Poslední záloha: dnes"],
    [onDay(5, 13), "Poslední záloha: včera"],
    [onDay(5, 2), "Poslední záloha: před 12 dny"],
  ])("last backup %s → %s", (lastExportAt, text) => expect(lastBackupText(lastExportAt, today)).toBe(text));

  it("suggests a backup only with data and after 30 days or never", () => {
    expect(shouldSuggestBackup(false, null, today)).toBe(false);
    expect(shouldSuggestBackup(true, null, today)).toBe(true);
    expect(shouldSuggestBackup(true, onDay(4, 14), today)).toBe(false); // 30 days
    expect(shouldSuggestBackup(true, onDay(4, 13), today)).toBe(true); // 31 days
  });
});
