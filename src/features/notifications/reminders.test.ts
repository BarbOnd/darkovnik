import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { deleteGiftListDatabase } from "../../db/database";
import { createGiftListRepository, type GiftListRepository } from "../../db/repository";
import { evaluateReminders, reminderNotificationBody } from "./reminders";

const DATABASE_NAME = "giftlist-reminders-test";
let repository: GiftListRepository | undefined;

afterEach(async () => {
  repository?.close();
  repository = undefined;
  await deleteGiftListDatabase(DATABASE_NAME);
});

describe("reminder evaluation", () => {
  it("returns due reminders once and records them, so they are never shown twice", async () => {
    repository = createGiftListRepository({ databaseName: DATABASE_NAME });
    await repository.initialize();
    await repository.createPerson({ name: "Jana", birthday: "1990-05-14", avatarSeed: "a" });
    await repository.createPerson({ name: "Petr", birthday: "--06-13", avatarSeed: "b" });
    await repository.createPerson({ name: "Bez data", birthday: null, avatarSeed: "c" });
    const today = { year: 2026, month: 5, day: 14 };

    const first = await evaluateReminders(repository, today);
    expect(first.map((reminder) => [reminder.person.name, reminder.type, reminder.daysUntil])).toEqual([
      ["Jana", "DAY", 0],
      ["Petr", "BEFORE_30", 30],
    ]);
    expect(reminderNotificationBody(first)).toBe("Jana: narozeniny dnes · Petr: narozeniny za 30 dní");

    expect(await evaluateReminders(repository, today)).toEqual([]);
    expect(await evaluateReminders(repository, { year: 2026, month: 5, day: 15 })).toEqual([]);
  });
});
