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

describe("IndexedDB migration v1 → current", () => {
  it("backfills sortOrder, adds metadata defaults and notificationLog, keeps all data", async () => {
    await createVersion1Database();

    repository = createGiftListRepository({ databaseName: DATABASE_NAME });
    await repository.initialize();

    const people = await repository.listPeople();
    const orderByName = [...people].sort((a, b) => a.sortOrder - b.sortOrder).map((p) => p.name);
    expect(orderByName).toEqual(["Adam", "Cyril", "Čeněk", "Zuzana"]);
    people.forEach((person) => {
      const original = v1People.find((p) => p.id === person.id);
      expect(person).toEqual({
        ...original,
        photo: null,
        photoSource: null,
        photoCrop: null,
        sortOrder: person.sortOrder,
      });
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
      schemaVersion: 5,
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
    expect(database.version).toBe(5);
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

const v2People = [
  { id: 1, name: "Jana", birthday: "--05-14", avatarSeed: "s1", sortOrder: 1 },
  { id: 3, name: "Petr", birthday: null, avatarSeed: "s3", sortOrder: 0 },
].map((person) => ({ ...person, createdAt: "2026-01-01T00:00:00.000Z", updatedAt: "2026-01-02T00:00:00.000Z" }));

const v2Metadata = {
  key: "app",
  schemaVersion: 2,
  highestPersonId: 3,
  highestGiftId: 0,
  highestTagId: 3,
  highestGiftLinkId: 0,
  birthdayNotificationsEnabled: false,
  lastExportAt: "2026-01-05T10:00:00.000Z",
  peopleSortMode: "MANUAL",
  giftSortMode: "PRIORITY",
  theme: "DARK",
  initializationComplete: true,
};

/**
 * Creates a version 2, 3 or 4 database (all have the same stores; versions 3
 * and 4 only added person photo fields) with frozen data, independent of the
 * current code.
 */
function createVersion2Or3Database(
  version: 2 | 3 | 4,
  peopleRecords: object[] = v2People,
  metadataRecord: object = v2Metadata,
  logRecords: object[] = [],
): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DATABASE_NAME, version);
    request.onupgradeneeded = () => {
      const db = request.result;
      const people = db.createObjectStore("people", { keyPath: "id" });
      const gifts = db.createObjectStore("gifts", { keyPath: "id" });
      const giftLinks = db.createObjectStore("giftLinks", { keyPath: "id" });
      db.createObjectStore("tags", { keyPath: "id" });
      const giftTags = db.createObjectStore("giftTags", { keyPath: ["giftId", "tagId"] });
      const metadata = db.createObjectStore("metadata", { keyPath: "key" });
      const notificationLog = db.createObjectStore("notificationLog", { keyPath: "key" });
      gifts.createIndex("personId", "personId");
      gifts.createIndex("status", "status");
      gifts.createIndex("buyerPersonId", "buyerPersonId");
      giftLinks.createIndex("giftId", "giftId");
      giftTags.createIndex("giftId", "giftId");
      giftTags.createIndex("tagId", "tagId");
      notificationLog.createIndex("personId", "personId");

      peopleRecords.forEach((person) => people.put(person));
      logRecords.forEach((entry) => notificationLog.put(entry));
      metadata.put(metadataRecord);
    };
    request.onsuccess = () => {
      request.result.close();
      resolve();
    };
    request.onerror = () => reject(request.error);
  });
}

describe("IndexedDB migration v2 → current", () => {
  it("adds photo: null to every person and keeps all other data and preferences", async () => {
    await createVersion2Or3Database(2);

    repository = createGiftListRepository({ databaseName: DATABASE_NAME });
    await repository.initialize();

    const people = await repository.listPeople();
    expect(people).toEqual(
      v2People.map((person) => ({ ...person, photo: null, photoSource: null, photoCrop: null })),
    );

    // toEqual ignores the undefined `key`, which getMetadata() does not return.
    expect(await repository.getMetadata()).toEqual({ ...v2Metadata, key: undefined, schemaVersion: 5 });
  });
});

describe("IndexedDB migration v3 → v4", () => {
  it("makes an existing photo its own source with the initial crop", async () => {
    const photo = "data:image/jpeg;base64,/9j/4AAQSkZJRg==";
    const v3People = [
      { ...v2People[0], photo },
      { ...v2People[1], photo: null },
    ];
    await createVersion2Or3Database(3, v3People, { ...v2Metadata, schemaVersion: 3 });

    repository = createGiftListRepository({ databaseName: DATABASE_NAME });
    await repository.initialize();

    expect(await repository.getPerson(v3People[0].id)).toEqual({
      ...v3People[0],
      photoSource: photo,
      photoCrop: { zoom: 1, dx: 0, dy: 0 },
    });
    expect(await repository.getPerson(v3People[1].id)).toEqual({
      ...v3People[1],
      photoSource: null,
      photoCrop: null,
    });
    expect((await repository.getMetadata()).schemaVersion).toBe(5);
  });
});

describe("IndexedDB migration v4 → v5", () => {
  it("marks reminders shown before the upgrade as seen and keeps everything else", async () => {
    const v4People = v2People.map((person) => ({ ...person, photo: null, photoSource: null, photoCrop: null }));
    const shown = {
      key: "1:DAY:2026-05-14",
      personId: 1,
      type: "DAY",
      occurrenceDate: "2026-05-14",
      shownAt: "2026-05-14T08:00:00.000Z",
    };
    await createVersion2Or3Database(4, v4People, { ...v2Metadata, schemaVersion: 4 }, [shown]);

    repository = createGiftListRepository({ databaseName: DATABASE_NAME });
    await repository.initialize();

    // An old reminder must not reappear in the "Zmeškané připomínky" card after the upgrade.
    expect(await repository.listUnseenReminders()).toEqual([]);
    expect(await repository.listNotificationLogKeys()).toEqual([shown.key]);
    expect(await repository.listPeople()).toEqual(v4People);
    expect(await repository.getMetadata()).toEqual({ ...v2Metadata, key: undefined, schemaVersion: 5 });

    const database = await openGiftListDatabase(DATABASE_NAME);
    expect(database.version).toBe(5);
    database.close();
  });
});
