import { describe, expect, it } from "vitest";
import { formatBirthdayCs, formatDayMonth, formatRelativeDays, formatReminderSummary } from "./format";

describe("relative days", () => {
  it.each([
    [0, "dnes"],
    [1, "zítra"],
    [2, "za 2 dny"],
    [12, "za 12 dní"],
    [30, "za 30 dní"],
    [-1, "včera"],
    [-3, "před 3 dny"],
    [-7, "před 7 dny"],
  ])("%i → %s", (days, text) => expect(formatRelativeDays(days)).toBe(text));

  it("formats day and month and the notification summary", () => {
    expect(formatDayMonth({ month: 5, day: 14 })).toBe("14. května");
    expect(
      formatReminderSummary([
        { name: "Petr", daysUntil: 0 },
        { name: "Jana", daysUntil: 30 },
      ]),
    ).toBe("Petr: narozeniny dnes · Jana: narozeniny za 30 dní");
  });
});

describe("Czech birthday formatting", () => {
  it.each([
    ["1990-05-14", "14. května 1990"],
    ["--05-14", "14. května"],
    ["--02-29", "29. února"],
    ["2001-12-01", "1. prosince 2001"],
    ["nesmysl", ""],
  ])("%s → %s", (birthday, text) => expect(formatBirthdayCs(birthday)).toBe(text));
});
