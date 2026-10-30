import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { deleteGiftListDatabase, openGiftListDatabase, STORE_NAMES } from "./database";
import { createGiftListRepository, type GiftListRepository } from "./repository";

const DATABASE_NAME = "giftlist-migration-test";
let repository: GiftListRepository | undefined;

afterEach(async () => {
  repository?.close();
  repository = undefined;
  await deleteGiftListDatabase(DATABASE_NAME);
});

const v1People = [
  { id: 1, name: "Zuzana", birthday: "1990-05-14", avatarSeed: "s1" },
  { id: 2, name: "Čeněk", birthday: null, avatarSeed: "s2" },
  { id: 4, name: "Adam", birthday: null, avatarSeed: "s4" },
  { id: 5, name: "Cyril", birthday: "--02-29", avatarSeed: "s5" },
].map((person) => ({ ...person, createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z" }));

function v1Gift(id: number, personId: number, priority: string, createdAt: string, buyerPersonId: number | null = null) {
  return { id, personId, name: `Dárek ${id}`, note: "", priority, status: "NEW", buyerPersonId, createdAt, updatedAt: createdAt };
}

const v1Gifts = [
  v1Gift(1, 1, "LOW", "2025-03-01T00:00:00.000Z"),
  v1Gift(2, 1, "MEDIUM", "2025-01-01T00:00:00.000Z"),
  v1Gift(3, 1, "HIGH", "2025-01-01T00:00:00.000Z", 2),
  v1Gift(5, 1, "MEDIUM", "2025-02-01T00:00:00.000Z"),
  v1Gift(6, 4, "LOW", "2025-01-01T00:00:00.000Z"),
  v1Gift(7, 4, "HIGH", "2025-01-01T00:00:00.000Z"),
];

/** Creates a database with the frozen version 1 schema and data, independent of the current code. */
function createVersion1Database(): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      const people = db.createObjectStore("people", { keyPath: "id" });
      const gifts = db.createObjectStore("gifts", { keyPath: "id" });
      const giftLinks = db.createObjectStore("giftLinks", { keyPath: "id" });
      const tags = db.createObjectStore("tags", { keyPath: "id" });
      const giftTags = db.createObjectStore("giftTags", { keyPath: ["giftId", "tagId"] });
      const metadata = db.createObjectStore("metadata", { keyPath: "key" });
      gifts.createIndex("personId", "personId");
      gifts.createIndex("status", "status");
      gifts.createIndex("buyerPersonId", "buyerPersonId");
      giftLinks.createIndex("giftId", "giftId");
      giftTags.createIndex("giftId", "giftId");
      giftTags.createIndex("tagId", "tagId");

      v1People.forEach((person) => people.put(person));
      v1Gifts.forEach((gift) => gifts.put(gift));
      giftLinks.put({ id: 3, giftId: 3, url: "https://example.test/a", sortOrder: 0 });
      tags.put({ id: 2, name: "Narozeniny", createdAt: "2025-01-01T00:00:00.000Z", updatedAt: "2025-01-01T00:00:00.000Z" });
      giftTags.put({ giftId: 3, tagId: 2 });
      metadata.put({
        key: "app",
        schemaVersion: 1,
        highestPersonId: 6,
        highestGiftId: 9,
        highestTagId: 3,
        highestGiftLinkId: 4,
        birthdayNotificationsEnabled: true,
        initializationComplete: true,
      });
    };
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

describe("IndexedDB migration v1 → v2", () => {
  it("backfills sortOrder, adds metadata defaults and notificationLog, keeps all data", async () => {
    await createVersion1Database();

    repository = createGiftListRepository({ databaseName: DATABASE_NAME });
    await repository.initialize();

    const people = await repository.listPeople();
    const orderByName = [...people].sort((a, b) => a.sortOrder - b.sortOrder).map((p) => p.name);
    expect(orderByName).toEqual(["Adam", "Cyril", "Čeněk", "Zuzana"]);
    people.forEach((person) => {
      const original = v1People.find((p) => p.id === person.id);
      expect(person).toEqual({ ...original, sortOrder: person.sortOrder });
    });

    const giftsOfZuzana = await repository.listGiftsByPerson(1);
    expect([...giftsOfZuzana].sort((a, b) => a.sortOrder - b.sortOrder).map((g) => g.id)).toEqual([3, 5, 2, 1]);
    expect(giftsOfZuzana.map((g) => g.sortOrder).sort()).toEqual([0, 1, 2, 3]);
    const giftsOfAdam = await repository.listGiftsByPerson(4);
    expect([...giftsOfAdam].sort((a, b) => a.sortOrder - b.sortOrder).map((g) => g.id)).toEqual([7, 6]);
    expect(await repository.getGift(3)).toMatchObject({ buyerPersonId: 2, priority: "HIGH", status: "NEW" });

    expect(await repository.listGiftLinks(3)).toEqual([
      { id: 3, giftId: 3, url: "https://example.test/a", sortOrder: 0 },
    ]);
    expect(await repository.listGiftTagIds(3)).toEqual([2]);
    expect((await repository.listTags()).map((tag) => tag.name)).toEqual(["Narozeniny"]);

    expect(await repository.getMetadata()).toEqual({
      schemaVersion: 2,
      highestPersonId: 6,
      highestGiftId: 9,
      highestTagId: 3,
      highestGiftLinkId: 4,
      birthdayNotificationsEnabled: true,
      lastExportAt: null,
      peopleSortMode: "ALPHABETICAL",
      giftSortMode: "PRIORITY",
      theme: "SYSTEM",
      initializationComplete: true,
    });

    const database = await openGiftListDatabase(DATABASE_NAME);
    expect(database.version).toBe(2);
    const transaction = database.transaction(STORE_NAMES.notificationLog, "readonly");
    expect([...transaction.objectStore(STORE_NAMES.notificationLog).indexNames]).toEqual(["personId"]);
    database.close();
  });

  it("keeps allocating IDs after the migrated counters", async () => {
    await createVersion1Database();
    repository = createGiftListRepository({ databaseName: DATABASE_NAME });
    await repository.initialize();

    const person = await repository.createPerson({ name: "Nová", birthday: null, avatarSeed: "n" });
    expect(person.id).toBe(7);
    expect(person.sortOrder).toBe(0);
  });
});
