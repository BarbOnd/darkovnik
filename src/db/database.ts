import type { Gift, Person } from "../domain/entities";
import { compareGiftsByPriority, comparePeopleByName } from "../domain/sorting";
import { requestResult } from "./idb";
import { DEFAULT_V2_PREFERENCES, METADATA_KEY, type MetadataRecord } from "./metadata";

export const DATABASE_NAME = "giftlist";
export const DATABASE_VERSION = 2;

export const STORE_NAMES = {
  people: "people",
  gifts: "gifts",
  giftLinks: "giftLinks",
  tags: "tags",
  giftTags: "giftTags",
  metadata: "metadata",
  notificationLog: "notificationLog",
} as const;

export type StoreName = (typeof STORE_NAMES)[keyof typeof STORE_NAMES];

export const ALL_STORE_NAMES: StoreName[] = Object.values(STORE_NAMES);

function createVersion1Schema(database: IDBDatabase): void {
  database.createObjectStore(STORE_NAMES.people, { keyPath: "id" });
  const gifts = database.createObjectStore(STORE_NAMES.gifts, { keyPath: "id" });
  const giftLinks = database.createObjectStore(STORE_NAMES.giftLinks, { keyPath: "id" });
  database.createObjectStore(STORE_NAMES.tags, { keyPath: "id" });
  const giftTags = database.createObjectStore(STORE_NAMES.giftTags, {
    keyPath: ["giftId", "tagId"],
  });
  database.createObjectStore(STORE_NAMES.metadata, { keyPath: "key" });

  gifts.createIndex("personId", "personId");
  gifts.createIndex("status", "status");
  gifts.createIndex("buyerPersonId", "buyerPersonId");
  giftLinks.createIndex("giftId", "giftId");
  giftTags.createIndex("giftId", "giftId");
  giftTags.createIndex("tagId", "tagId");
}

/**
 * Version 2: notificationLog store, Person/Gift sortOrder, new metadata preferences.
 * Existing records are kept; sortOrder is backfilled from the default sort modes.
 */
async function migrateToVersion2(database: IDBDatabase, transaction: IDBTransaction): Promise<void> {
  const notificationLog = database.createObjectStore(STORE_NAMES.notificationLog, { keyPath: "key" });
  notificationLog.createIndex("personId", "personId");

  const peopleStore = transaction.objectStore(STORE_NAMES.people);
  const people = await requestResult(peopleStore.getAll() as IDBRequest<Omit<Person, "sortOrder">[]>);
  people
    .sort(comparePeopleByName)
    .forEach((person, index) => peopleStore.put({ ...person, sortOrder: index }));

  const giftsStore = transaction.objectStore(STORE_NAMES.gifts);
  const gifts = await requestResult(giftsStore.getAll() as IDBRequest<Omit<Gift, "sortOrder">[]>);
  const giftsByPerson = new Map<number, Omit<Gift, "sortOrder">[]>();
  gifts.forEach((gift) => {
    const list = giftsByPerson.get(gift.personId) ?? [];
    list.push(gift);
    giftsByPerson.set(gift.personId, list);
  });
  giftsByPerson.forEach((list) =>
    list
      .sort(compareGiftsByPriority)
      .forEach((gift, index) => giftsStore.put({ ...gift, sortOrder: index })),
  );

  const metadataStore = transaction.objectStore(STORE_NAMES.metadata);
  const metadata = await requestResult(
    metadataStore.get(METADATA_KEY) as IDBRequest<Partial<MetadataRecord> | undefined>,
  );
  if (metadata !== undefined) {
    metadataStore.put({ ...DEFAULT_V2_PREFERENCES, ...metadata, schemaVersion: 2 });
  }
}

export function openGiftListDatabase(name = DATABASE_NAME): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, DATABASE_VERSION);

    request.onupgradeneeded = (event) => {
      const database = request.result;
      const upgradeTransaction = request.transaction;
      if (upgradeTransaction === null) throw new Error("Chybí transakce aktualizace schématu.");

      const runMigrations = async () => {
        if (event.oldVersion < 1) createVersion1Schema(database);
        if (event.oldVersion < 2) await migrateToVersion2(database, upgradeTransaction);
      };
      runMigrations().catch(() => {
        try {
          upgradeTransaction.abort();
        } catch {
          // The transaction has already finished; request.onerror reports the failure.
        }
      });
    };

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Databázi se nepodařilo otevřít."));
  });
}

export function deleteGiftListDatabase(name = DATABASE_NAME): Promise<void> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.deleteDatabase(name);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error ?? new Error("Databázi se nepodařilo odstranit."));
    request.onblocked = () => reject(new Error("Databáze je stále otevřená."));
  });
}
