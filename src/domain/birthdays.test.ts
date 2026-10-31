import { describe, expect, it } from "vitest";
import {
  addDays,
  ageAt,
  daysBetween,
  dueReminders,
  formatIsoDate,
  localDateOf,
  missedReminders,
  nextOccurrence,
  reminderKey,
  upcomingBirthdays,
  type LocalDate,
} from "./birthdays";

function date(iso: string): LocalDate {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month, day };
}

function person(id: number, name: string, birthday: string | null) {
  return { id, name, birthday };
}

describe("local dates", () => {
  it("uses the local calendar date of a moment", () => {
    // 23:30 local time stays on that local day, whatever the time zone.
    expect(localDateOf(new Date(2026, 4, 14, 23, 30))).toEqual(date("2026-05-14"));
  });

  it("counts days across months, years and DST changes", () => {
    expect(daysBetween(date("2026-03-28"), date("2026-03-30"))).toBe(2);
    expect(daysBetween(date("2026-12-31"), date("2027-01-01"))).toBe(1);
    expect(daysBetween(date("2026-05-14"), date("2026-05-10"))).toBe(-4);
    expect(addDays(date("2028-02-28"), 1)).toEqual(date("2028-02-29"));
    expect(addDays(date("2026-01-01"), -1)).toEqual(date("2025-12-31"));
    expect(formatIsoDate(date("2026-05-04"))).toBe("2026-05-04");
  });
});

describe("next birthday occurrence and age", () => {
  it.each([
    ["1990-05-14", "2026-05-10", "2026-05-14"],
    ["1990-05-14", "2026-05-14", "2026-05-14"],
    ["1990-05-14", "2026-05-15", "2027-05-14"],
    ["--01-05", "2026-12-20", "2027-01-05"],
    // 29 February → 28 February in non-leap years, 29 in leap years.
    ["2000-02-29", "2026-01-10", "2026-02-28"],
    ["--02-29", "2027-03-01", "2028-02-29"],
    ["--02-29", "2026-02-28", "2026-02-28"],
  ])("%s seen on %s → %s", (birthday, today, expected) => {
    expect(nextOccurrence(birthday, date(today))).toEqual(date(expected));
  });

  it("has no occurrence without a birthday", () => {
    expect(nextOccurrence(null, date("2026-01-01"))).toBeNull();
  });

  it("shows age only when the year is known", () => {
    expect(ageAt("1990-05-14", date("2026-05-14"))).toBe(36);
    expect(ageAt("--05-14", date("2026-05-14"))).toBeNull();
    expect(ageAt(null, date("2026-05-14"))).toBeNull();
  });
});

describe("upcoming birthdays", () => {
  const today = date("2026-12-20");
  const people = [
    person(1, "Zdeněk", "1980-12-20"), // today
    person(2, "Adam", "--01-19"), // in 30 days → included
    person(3, "Bára", "--01-20"), // in 31 days → excluded
    person(4, "Cyril", null),
    person(5, "Dana", "2010-12-25"), // in 5 days
    person(6, "Eva", "1999-12-19"), // yesterday → next year, excluded
  ];

  it("lists today … today + 30 soonest first, across the new year", () => {
    expect(
      upcomingBirthdays(people, today).map((item) => [item.person.name, item.daysUntil, item.age]),
    ).toEqual([
      ["Zdeněk", 0, 46],
      ["Dana", 5, 16],
      ["Adam", 30, null],
    ]);
  });
});

describe("due reminders", () => {
  const jana = person(1, "Jana", "1990-05-14");

  function types(today: string, shown: string[] = []) {
    return dueReminders([jana], date(today), new Set(shown)).map((reminder) => [
      reminder.type,
      reminder.occurrenceDate,
      reminder.daysUntil,
    ]);
  }

  it("BEFORE_30 is due 30 days before and relevant until the day before the birthday", () => {
    expect(types("2026-04-13")).toEqual([]); // 31 days before
    expect(types("2026-04-14")).toEqual([["BEFORE_30", "2026-05-14", 30]]);
    expect(types("2026-05-13")).toEqual([["BEFORE_30", "2026-05-14", 1]]);
  });

  it("DAY is due on the birthday and relevant for 7 more days", () => {
    expect(types("2026-05-14")).toEqual([["DAY", "2026-05-14", 0]]);
    expect(types("2026-05-21")).toEqual([["DAY", "2026-05-14", -7]]);
    expect(types("2026-05-22")).toEqual([]);
  });

  it("is never shown twice (NotificationLog)", () => {
    expect(types("2026-04-20", [reminderKey(1, "BEFORE_30", "2026-05-14")])).toEqual([]);
    expect(types("2026-05-14", [reminderKey(1, "BEFORE_30", "2026-05-14")])).toEqual([
      ["DAY", "2026-05-14", 0],
    ]);
  });

  it("handles the year boundary and 29 February", () => {
    const newYear = person(2, "Nový", "--01-03");
    expect(
      dueReminders([newYear], date("2025-12-31"), new Set()).map((reminder) => reminder.key),
    ).toEqual(["2:BEFORE_30:2026-01-03"]);
    expect(
      dueReminders([newYear], date("2026-01-05"), new Set()).map((reminder) => reminder.key),
    ).toEqual(["2:DAY:2026-01-03"]);
    const leap = person(3, "Přestupný", "2000-02-29");
    expect(dueReminders([leap], date("2026-02-28"), new Set()).map((reminder) => reminder.key)).toEqual([
      "3:DAY:2026-02-28",
    ]);
  });

  it("skips people without a birthday and sorts by date, then name", () => {
    const reminders = dueReminders(
      [person(4, "Petr", "--05-20"), person(5, "Bez data", null), jana, person(6, "Adam", "--05-14")],
      date("2026-05-14"),
      new Set(),
    );
    expect(reminders.map((reminder) => [reminder.person.name, reminder.type])).toEqual([
      ["Adam", "DAY"],
      ["Jana", "DAY"],
      ["Petr", "BEFORE_30"],
    ]);
    expect(reminders[1].age).toBe(36);
  });
});

describe("missed reminders (card contents from NotificationLog)", () => {
  it("joins unseen log entries with people, skips deleted people and sorts soonest first", () => {
    const people = [person(1, "Jana", "1990-05-14"), person(2, "Petr", "--06-13")];
    const entries = [
      { key: "2:BEFORE_30:2026-06-13", personId: 2, type: "BEFORE_30" as const, occurrenceDate: "2026-06-13" },
      { key: "1:DAY:2026-05-14", personId: 1, type: "DAY" as const, occurrenceDate: "2026-05-14" },
      { key: "9:DAY:2026-05-10", personId: 9, type: "DAY" as const, occurrenceDate: "2026-05-10" },
      { key: "1:DAY:bad", personId: 1, type: "DAY" as const, occurrenceDate: "--05-14" },
    ];

    const missed = missedReminders(entries, people, date("2026-05-16"));
    expect(missed.map((reminder) => [reminder.key, reminder.person.name, reminder.daysUntil, reminder.age])).toEqual([
      ["1:DAY:2026-05-14", "Jana", -2, 36],
      ["2:BEFORE_30:2026-06-13", "Petr", 28, null],
    ]);
    expect(missed[0].occurrence).toEqual(date("2026-05-14"));
  });
});
