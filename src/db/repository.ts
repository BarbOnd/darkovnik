import { isValidBirthday } from "../domain/birthday";
import {
  GIFT_PRIORITIES,
  GIFT_SORT_MODES,
  GIFT_STATUSES,
  isOneOf,
  PEOPLE_SORT_MODES,
  REMINDER_TYPES,
  THEMES,
  type Gift,
  type GiftLink,
  type GiftTag,
  type NotificationLogEntry,
  type Person,
  type Tag,
} from "../domain/entities";
import {
  createBackupDocument,
  datasetError,
  planImport,
  type BackupDocument,
  type Dataset,
  type ImportPlan,
  type Result,
} from "../domain/backup";
import { isValidPrice } from "../domain/gifts";
import { photoFieldsError, type PersonPhotoFields } from "../domain/photo";
import { compareBySortOrder } from "../domain/sorting";
import {
  ALL_STORE_NAMES,
  DATABASE_NAME,
  DATABASE_VERSION,
  openGiftListDatabase,
  STORE_NAMES,
  type StoreName,
} from "./database";
import { requestResult, transactionDone } from "./idb";
import {
  DEFAULT_V2_PREFERENCES,
  METADATA_KEY,
  type AppMetadata,
  type AppPreferences,
  type MetadataRecord,
} from "./metadata";

export type { AppMetadata, AppPreferences } from "./metadata";

const DEFAULT_TAG_NAMES = ["Vánoce", "Narozeniny", "Výročí"] as const;
/** NotificationLog entries older than this may be removed (DATABASE.md → NotificationLog). */
const NOTIFICATION_LOG_RETENTION_MS = 366 * 24 * 60 * 60 * 1000;

type CounterName = "people" | "gifts" | "tags" | "giftLinks";

/** Photo fields are optional (no photo); when given, all three must be given together. `note` defaults to "". */
export type CreatePersonInput = Pick<Person, "name" | "birthday" | "avatarSeed"> &
  Partial<Pick<Person, "note">> &
  PersonPhotoFields;
/**
 * Omitted fields stay unchanged. Photo fields change together: all three set,
 * or all three null to remove the photo.
 */
export type UpdatePersonInput = Partial<Pick<Person, "name" | "birthday" | "avatarSeed" | "note">> &
  PersonPhotoFields;
/** `price` defaults to null (unknown). */
export type CreateGiftInput = Pick<
  Gift,
  "personId" | "name" | "note" | "priority" | "status" | "buyerPersonId"
> &
  Partial<Pick<Gift, "price">>;
export type UpdateGiftInput = Partial<CreateGiftInput>;
/** A link as edited in the gift form; without `id` it is a new link. Array order = link order. */
export type GiftLinkDraft = { id?: number; url: string; title?: string };
/** One independent gift per recipient, each with its own copies of the links. */
export type CreateGiftsInput = Omit<CreateGiftInput, "personId"> & {
  personIds: number[];
  links: GiftLinkDraft[];
  /** Tags assigned to every created gift; defaults to none. */
  tagIds?: number[];
};
export type CreateTagInput = Pick<Tag, "name">;
export type CreateGiftLinkInput = Pick<GiftLink, "giftId" | "url" | "title">;
/** An empty `title` removes the title; an omitted field stays unchanged. */
export type UpdateGiftLinkInput = Partial<Pick<GiftLink, "url" | "title">>;
export type UpdatePreferencesInput = Partial<AppPreferences>;

export type ReminderClaim = Omit<NotificationLogEntry, "shownAt" | "seenAt">;

/** An import was refused because the merged data would be invalid; the message is Czech. */
export class ImportError extends Error {}

const BACKUP_STORES: StoreName[] = [
  STORE_NAMES.people,
  STORE_NAMES.gifts,
  STORE_NAMES.giftLinks,
  STORE_NAMES.tags,
  STORE_NAMES.giftTags,
  STORE_NAMES.metadata,
];

export type PersonDeletionImpact = {
  /** Gifts for this person; they are deleted with the person. */
  giftCount: number;
  /** Other people's gifts where this person is the buyer; they stay, the buyer is cleared. */
  buyerGiftCount: number;
};

export type GiftListRepository = {
  initialize(): Promise<void>;
  close(): void;
  getMetadata(): Promise<AppMetadata>;
  updatePreferences(input: UpdatePreferencesInput): Promise<AppMetadata>;
  /** Fresh = no people and no gifts (DATABASE.md → Fresh installation). */
  isFreshInstallation(): Promise<boolean>;

  getPerson(id: number): Promise<Person | undefined>;
  listPeople(): Promise<Person[]>;
  createPerson(input: CreatePersonInput): Promise<Person>;
  updatePerson(id: number, input: UpdatePersonInput): Promise<Person>;
  /** `personIds` must contain every person exactly once, in the new manual order. */
  reorderPeople(personIds: number[]): Promise<void>;
  /** What deleting the person would remove or change, for the confirmation dialog. */
  getPersonDeletionImpact(id: number): Promise<PersonDeletionImpact>;
  deletePerson(id: number): Promise<void>;

  getGift(id: number): Promise<Gift | undefined>;
  listGifts(): Promise<Gift[]>;
  listGiftsByPerson(personId: number): Promise<Gift[]>;
  createGift(input: CreateGiftInput): Promise<Gift>;
  /** Creates one gift per recipient with its links, all in one transaction (nothing on failure). */
  createGiftsWithLinks(input: CreateGiftsInput): Promise<Gift[]>;
  updateGift(id: number, input: UpdateGiftInput): Promise<Gift>;
  /**
   * Updates the gift and makes its links exactly `links` (and its tags exactly
   * `tagIds` when given), in one transaction.
   */
  saveGiftWithLinks(id: number, input: UpdateGiftInput, links: GiftLinkDraft[], tagIds?: number[]): Promise<Gift>;
  /** `giftIds` must contain every gift of the recipient exactly once, in the new manual order. */
  reorderGifts(personId: number, giftIds: number[]): Promise<void>;
  deleteGift(id: number): Promise<void>;

  listTags(): Promise<Tag[]>;
  createTag(input: CreateTagInput): Promise<Tag>;
  renameTag(id: number, name: string): Promise<Tag>;
  deleteTag(id: number): Promise<void>;

  /** Links of one gift ordered by sortOrder. */
  listGiftLinks(giftId: number): Promise<GiftLink[]>;
  /** Every gift link (for the link shortcut in gift lists); not ordered. */
  listAllGiftLinks(): Promise<GiftLink[]>;
  /** Appends the link at the end of the gift's links. */
  createGiftLink(input: CreateGiftLinkInput): Promise<GiftLink>;
  updateGiftLink(id: number, input: UpdateGiftLinkInput): Promise<GiftLink>;
  /** `linkIds` must contain every link of the gift exactly once, in the new order. */
  reorderGiftLinks(giftId: number, linkIds: number[]): Promise<void>;
  deleteGiftLink(id: number): Promise<void>;

  listGiftTagIds(giftId: number): Promise<number[]>;
  /** Every gift–tag association (for filters and tag usage counts). */
  listAllGiftTags(): Promise<GiftTag[]>;

  /** Keys of reminders already shown on this device. */
  listNotificationLogKeys(): Promise<string[]>;
  /**
   * Records reminders as shown and returns the keys that were not recorded yet
   * (so a reminder is shown once even with two open windows). Entries of deleted
   * people are skipped; entries older than one year are removed.
   */
  claimReminders(entries: ReminderClaim[]): Promise<string[]>;
  /** Reminders recorded on this device that the user has not closed in the app yet. */
  listUnseenReminders(): Promise<NotificationLogEntry[]>;
  /** Marks the reminders as closed in the app (they leave the "Zmeškané připomínky" card). */
  markRemindersSeen(keys: string[]): Promise<void>;

  /** All exportable data, read in one transaction (DATABASE.md → Backup schema). */
  exportBackup(): Promise<BackupDocument>;
  /** What an import would do, without writing; an invalid merged result is reported as an error. */
  previewImport(document: BackupDocument): Promise<Result<ImportPlan>>;
  /**
   * Merges the backup by stable ID in one transaction. Validation of the merged
   * result happens inside it; on any error nothing is written (ImportError).
   */
  importBackup(document: BackupDocument): Promise<ImportPlan>;
  createGiftTag(association: GiftTag): Promise<GiftTag>;
  /** Replaces the gift's tag associations with exactly `tagIds`. */
  setGiftTags(giftId: number, tagIds: number[]): Promise<void>;
};

export type RepositoryOptions = {
  databaseName?: string;
  now?: () => Date;
};

function isPositiveId(id: number): boolean {
  return Number.isSafeInteger(id) && id > 0;
}

function assertPositiveId(id: number, field: string): void {
  if (!isPositiveId(id)) throw new Error(`${field} musí být kladné celé číslo.`);
}

function assertNonEmpty(value: string, field: string): void {
  if (value.trim().length === 0) throw new Error(`${field} nesmí být prázdný.`);
}

function assertHttpUrl(value: string): void {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error("Odkaz musí být platná HTTP nebo HTTPS adresa.");
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error("Odkaz musí být platná HTTP nebo HTTPS adresa.");
  }
}

function assertBirthday(birthday: string | null): void {
  if (birthday !== null && !isValidBirthday(birthday)) {
    throw new Error("Datum narozenin není platné.");
  }
}

function assertNote(note: string | undefined): void {
  if (note !== undefined && typeof note !== "string") throw new Error("Poznámka musí být text.");
}

function assertPhotoFields(fields: PersonPhotoFields): void {
  const error = photoFieldsError(fields);
  if (error !== null) throw new Error(error);
}

function assertGiftFields(input: UpdateGiftInput): void {
  if (input.personId !== undefined) assertPositiveId(input.personId, "ID příjemce");
  if (input.buyerPersonId !== undefined && input.buyerPersonId !== null) {
    assertPositiveId(input.buyerPersonId, "ID kupujícího");
  }
  if (input.name !== undefined) assertNonEmpty(input.name, "Název dárku");
  if (input.note !== undefined && typeof input.note !== "string") {
    throw new Error("Poznámka musí být text.");
  }
  if (input.price !== undefined && !isValidPrice(input.price)) {
    throw new Error("Cena musí být nezáporné číslo.");
  }
  if (input.priority !== undefined && !isOneOf(GIFT_PRIORITIES, input.priority)) {
    throw new Error("Neplatná priorita dárku.");
  }
  if (input.status !== undefined && !isOneOf(GIFT_STATUSES, input.status)) {
    throw new Error("Neplatný stav dárku.");
  }
}

function assertPreferences(input: UpdatePreferencesInput): void {
  if (
    input.birthdayNotificationsEnabled !== undefined &&
    typeof input.birthdayNotificationsEnabled !== "boolean"
  ) {
    throw new Error("Nastavení upozornění musí být zapnuto nebo vypnuto.");
  }
  if (
    input.lastExportAt !== undefined &&
    input.lastExportAt !== null &&
    (typeof input.lastExportAt !== "string" || Number.isNaN(Date.parse(input.lastExportAt)))
  ) {
    throw new Error("Datum poslední zálohy není platné.");
  }
  if (input.peopleSortMode !== undefined && !isOneOf(PEOPLE_SORT_MODES, input.peopleSortMode)) {
    throw new Error("Neplatné řazení lidí.");
  }
  if (input.giftSortMode !== undefined && !isOneOf(GIFT_SORT_MODES, input.giftSortMode)) {
    throw new Error("Neplatné řazení dárků.");
  }
  if (input.theme !== undefined && !isOneOf(THEMES, input.theme)) {
    throw new Error("Neplatný vzhled.");
  }
}

/** Throws unless `ids` contains every ID of `existingIds` exactly once. */
function assertPermutation(ids: number[], existingIds: number[], message: string): void {
  const expected = new Set(existingIds);
  const seen = new Set<number>();
  for (const id of ids) {
    if (!expected.has(id) || seen.has(id)) throw new Error(message);
    seen.add(id);
  }
  if (seen.size !== expected.size) throw new Error(message);
}

function assertLinkDrafts(links: GiftLinkDraft[], allowIds: boolean): void {
  const ids = new Set<number>();
  for (const link of links) {
    assertHttpUrl(link.url);
    if (link.id === undefined) continue;
    if (!allowIds) throw new Error("Nový dárek nemůže převzít existující odkaz.");
    assertPositiveId(link.id, "ID odkazu");
    if (ids.has(link.id)) throw new Error("Odkaz je v seznamu vícekrát.");
    ids.add(link.id);
  }
}

function normalizeTagName(name: string): string {
  return name.trim().toLocaleLowerCase("cs-CZ");
}

function normalizeLinkTitle(title: string | undefined): string | undefined {
  const trimmed = title?.trim();
  return trimmed === undefined || trimmed.length === 0 ? undefined : trimmed;
}

function createGiftLinkRecord(link: GiftLink): GiftLink {
  const { title, ...rest } = link;
  const normalizedTitle = normalizeLinkTitle(title);
  return normalizedTitle === undefined ? rest : { ...rest, title: normalizedTitle };
}

function createMetadata(): MetadataRecord {
  return {
    key: METADATA_KEY,
    schemaVersion: DATABASE_VERSION,
    highestPersonId: 0,
    highestGiftId: 0,
    highestTagId: 0,
    highestGiftLinkId: 0,
    birthdayNotificationsEnabled: false,
    ...DEFAULT_V2_PREFERENCES,
    initializationComplete: true,
  };
}

function toAppMetadata(metadata: MetadataRecord): AppMetadata {
  return {
    schemaVersion: metadata.schemaVersion,
    highestPersonId: metadata.highestPersonId,
    highestGiftId: metadata.highestGiftId,
    highestTagId: metadata.highestTagId,
    highestGiftLinkId: metadata.highestGiftLinkId,
    birthdayNotificationsEnabled: metadata.birthdayNotificationsEnabled,
    lastExportAt: metadata.lastExportAt,
    peopleSortMode: metadata.peopleSortMode,
    giftSortMode: metadata.giftSortMode,
    theme: metadata.theme,
    initializationComplete: metadata.initializationComplete,
  };
}

function counterField(counter: CounterName): keyof Pick<
  AppMetadata,
  "highestPersonId" | "highestGiftId" | "highestTagId" | "highestGiftLinkId"
> {
  const fields = {
    people: "highestPersonId",
    gifts: "highestGiftId",
    tags: "highestTagId",
    giftLinks: "highestGiftLinkId",
  } as const;
  return fields[counter];
}

function allocateId(metadata: MetadataRecord, counter: CounterName): number {
  const field = counterField(counter);
  const nextId = metadata[field] + 1;
  if (!Number.isSafeInteger(nextId)) throw new Error("Byl dosažen limit lokálních identifikátorů.");
  metadata[field] = nextId;
  return nextId;
}

/** Writes `records` with sortOrder 0..n-1 in the given order (only changed records are written). */
function writeSortOrder<T extends { sortOrder: number }>(store: IDBObjectStore, records: T[], offset = 0): void {
  records.forEach((record, index) => {
    if (record.sortOrder !== index + offset) store.put({ ...record, sortOrder: index + offset });
  });
}

export function createGiftListRepository(options: RepositoryOptions = {}): GiftListRepository {
  const databaseName = options.databaseName ?? DATABASE_NAME;
  const now = options.now ?? (() => new Date());
  let database: IDBDatabase | undefined;

  async function connection(): Promise<IDBDatabase> {
    database ??= await openGiftListDatabase(databaseName);
    return database;
  }

  async function getMetadataFromStore(store: IDBObjectStore): Promise<MetadataRecord> {
    const metadata = await requestResult(store.get(METADATA_KEY) as IDBRequest<MetadataRecord | undefined>);
    if (metadata === undefined) throw new Error("Databáze není inicializována.");
    return metadata;
  }

  async function readOne<T>(storeName: StoreName, id: IDBValidKey): Promise<T | undefined> {
    const db = await connection();
    const transaction = db.transaction(storeName, "readonly");
    const done = transactionDone(transaction);
    const entity = await requestResult(
      transaction.objectStore(storeName).get(id) as IDBRequest<T | undefined>,
    );
    await done;
    return entity;
  }

  async function readAll<T>(storeName: StoreName, indexName?: string, query?: IDBValidKey): Promise<T[]> {
    const db = await connection();
    const transaction = db.transaction(storeName, "readonly");
    const done = transactionDone(transaction);
    const store = transaction.objectStore(storeName);
    const source = indexName === undefined ? store : store.index(indexName);
    const entities = await requestResult(source.getAll(query) as IDBRequest<T[]>);
    await done;
    return entities;
  }

  async function entityMustExist<T>(store: IDBObjectStore, id: number, message: string): Promise<T> {
    const entity = await requestResult(store.get(id) as IDBRequest<T | undefined>);
    if (entity === undefined) throw new Error(message);
    return entity;
  }

  async function linksOfGift(store: IDBObjectStore, giftId: number): Promise<GiftLink[]> {
    const links = await requestResult(store.index("giftId").getAll(giftId) as IDBRequest<GiftLink[]>);
    return links.sort(compareBySortOrder);
  }

  async function giftsOfPerson(store: IDBObjectStore, personId: number): Promise<Gift[]> {
    const gifts = await requestResult(store.index("personId").getAll(personId) as IDBRequest<Gift[]>);
    return gifts.sort(compareBySortOrder);
  }

  /**
   * Runs `work` in one readwrite transaction. If it throws, the transaction is
   * aborted so no partial writes are committed.
   */
  async function inTransaction<T>(
    storeNames: StoreName[],
    work: (transaction: IDBTransaction) => Promise<T>,
  ): Promise<T> {
    const db = await connection();
    const transaction = db.transaction(storeNames, "readwrite");
    const done = transactionDone(transaction);
    let result: T;
    try {
      result = await work(transaction);
    } catch (error) {
      try {
        transaction.abort();
      } catch {
        // Already finished; nothing was written after the failure.
      }
      await done.catch(() => undefined);
      throw error;
    }
    await done;
    return result;
  }

  /** Creates one gift at the top of the recipient's manual order (recipient and buyer must exist). */
  async function insertGift(
    transaction: IDBTransaction,
    metadata: MetadataRecord,
    input: CreateGiftInput,
    timestamp: string,
  ): Promise<Gift> {
    const giftsStore = transaction.objectStore(STORE_NAMES.gifts);
    const recipientGifts = await giftsOfPerson(giftsStore, input.personId);
    const gift: Gift = {
      id: allocateId(metadata, "gifts"),
      personId: input.personId,
      name: input.name,
      note: input.note,
      priority: input.priority,
      status: input.status,
      buyerPersonId: input.buyerPersonId,
      price: input.price ?? null,
      sortOrder: 0,
      createdAt: timestamp,
      updatedAt: timestamp,
    };
    writeSortOrder(giftsStore, recipientGifts, 1);
    giftsStore.put(gift);
    return gift;
  }

  /** Applies a gift update; a new recipient puts the gift at the top of their manual order. */
  async function applyGiftUpdate(transaction: IDBTransaction, id: number, input: UpdateGiftInput): Promise<Gift> {
    const people = transaction.objectStore(STORE_NAMES.people);
    const giftsStore = transaction.objectStore(STORE_NAMES.gifts);
    const gift = await entityMustExist<Gift>(giftsStore, id, "Dárek neexistuje.");
    const updated: Gift = {
      ...gift,
      personId: input.personId ?? gift.personId,
      name: input.name ?? gift.name,
      note: input.note ?? gift.note,
      priority: input.priority ?? gift.priority,
      status: input.status ?? gift.status,
      buyerPersonId: input.buyerPersonId !== undefined ? input.buyerPersonId : gift.buyerPersonId,
      price: input.price !== undefined ? input.price : gift.price,
      updatedAt: now().toISOString(),
    };
    if (updated.buyerPersonId !== null && updated.buyerPersonId !== gift.buyerPersonId) {
      await entityMustExist<Person>(people, updated.buyerPersonId, "Kupující dárku neexistuje.");
    }
    if (updated.personId !== gift.personId) {
      await entityMustExist<Person>(people, updated.personId, "Příjemce dárku neexistuje.");
      writeSortOrder(giftsStore, await giftsOfPerson(giftsStore, updated.personId), 1);
      updated.sortOrder = 0;
    }
    giftsStore.put(updated);
    return updated;
  }

  /**
   * Makes the gift's links exactly `drafts`, in that order (sortOrder 0..n-1):
   * drafts with an ID update that link, drafts without one create a link,
   * links missing from `drafts` are deleted.
   */
  async function replaceLinks(
    transaction: IDBTransaction,
    metadata: MetadataRecord,
    giftId: number,
    drafts: GiftLinkDraft[],
  ): Promise<void> {
    const giftLinksStore = transaction.objectStore(STORE_NAMES.giftLinks);
    const existing = new Map((await linksOfGift(giftLinksStore, giftId)).map((link) => [link.id, link]));
    const keptIds = new Set<number>();
    for (const draft of drafts) {
      if (draft.id === undefined) continue;
      if (!existing.has(draft.id)) throw new Error("Odkaz nepatří k tomuto dárku.");
      keptIds.add(draft.id);
    }
    existing.forEach((link) => {
      if (!keptIds.has(link.id)) giftLinksStore.delete(link.id);
    });
    drafts.forEach((draft, index) => {
      giftLinksStore.put(
        createGiftLinkRecord({
          id: draft.id ?? allocateId(metadata, "giftLinks"),
          giftId,
          url: draft.url,
          title: draft.title,
          sortOrder: index,
        }),
      );
    });
  }

  async function readDataset(transaction: IDBTransaction): Promise<Dataset> {
    const getAll = <T,>(storeName: StoreName) =>
      requestResult(transaction.objectStore(storeName).getAll() as IDBRequest<T[]>);
    const [people, gifts, giftLinks, tags, giftTags] = await Promise.all([
      getAll<Person>(STORE_NAMES.people),
      getAll<Gift>(STORE_NAMES.gifts),
      getAll<GiftLink>(STORE_NAMES.giftLinks),
      getAll<Tag>(STORE_NAMES.tags),
      getAll<GiftTag>(STORE_NAMES.giftTags),
    ]);
    const metadata = await getMetadataFromStore(transaction.objectStore(STORE_NAMES.metadata));
    return {
      people,
      gifts,
      giftLinks,
      tags,
      giftTags,
      counters: {
        highestPersonId: metadata.highestPersonId,
        highestGiftId: metadata.highestGiftId,
        highestTagId: metadata.highestTagId,
        highestGiftLinkId: metadata.highestGiftLinkId,
      },
      birthdayNotificationsEnabled: metadata.birthdayNotificationsEnabled,
    };
  }

  async function assertTagsExist(transaction: IDBTransaction, tagIds: number[]): Promise<void> {
    const tagsStore = transaction.objectStore(STORE_NAMES.tags);
    for (const tagId of new Set(tagIds)) {
      await entityMustExist<Tag>(tagsStore, tagId, "Štítek neexistuje.");
    }
  }

  /** Makes the gift's tag associations exactly `tagIds` (tags must exist). */
  async function replaceGiftTags(transaction: IDBTransaction, giftId: number, tagIds: number[]): Promise<void> {
    const wanted = new Set(tagIds);
    const giftTags = transaction.objectStore(STORE_NAMES.giftTags);
    const current = await requestResult(giftTags.index("giftId").getAll(giftId) as IDBRequest<GiftTag[]>);
    const currentTagIds = new Set(current.map((association) => association.tagId));
    current
      .filter((association) => !wanted.has(association.tagId))
      .forEach((association) => giftTags.delete([association.giftId, association.tagId]));
    wanted.forEach((tagId) => {
      if (!currentTagIds.has(tagId)) giftTags.put({ giftId, tagId } satisfies GiftTag);
    });
  }

  async function deleteGiftDependencies(
    transaction: IDBTransaction,
    giftId: number,
  ): Promise<void> {
    const giftLinks = transaction.objectStore(STORE_NAMES.giftLinks);
    const giftTags = transaction.objectStore(STORE_NAMES.giftTags);
    const links = await requestResult(
      giftLinks.index("giftId").getAll(giftId) as IDBRequest<GiftLink[]>,
    );
    const associations = await requestResult(
      giftTags.index("giftId").getAll(giftId) as IDBRequest<GiftTag[]>,
    );
    links.forEach((link) => giftLinks.delete(link.id));
    associations.forEach((association) => giftTags.delete([association.giftId, association.tagId]));
  }

  async function assertUniqueTagName(store: IDBObjectStore, name: string, ownId?: number): Promise<void> {
    const existingTags = await requestResult(store.getAll() as IDBRequest<Tag[]>);
    if (
      existingTags.some(
        (tag) => tag.id !== ownId && normalizeTagName(tag.name) === normalizeTagName(name),
      )
    ) {
      throw new Error("Štítek s tímto názvem už existuje.");
    }
  }

  const repository: GiftListRepository = {
    async initialize(): Promise<void> {
      const db = await connection();
      const transaction = db.transaction([STORE_NAMES.metadata, STORE_NAMES.tags], "readwrite");
      const done = transactionDone(transaction);
      const metadataStore = transaction.objectStore(STORE_NAMES.metadata);
      const metadata = await requestResult(
        metadataStore.get(METADATA_KEY) as IDBRequest<MetadataRecord | undefined>,
      );

      if (metadata === undefined) {
        const initialMetadata = createMetadata();
        const tags = transaction.objectStore(STORE_NAMES.tags);
        const timestamp = now().toISOString();
        DEFAULT_TAG_NAMES.forEach((name) => {
          const id = allocateId(initialMetadata, "tags");
          tags.put({ id, name, createdAt: timestamp, updatedAt: timestamp } satisfies Tag);
        });
        metadataStore.put(initialMetadata);
      }

      await done;
    },

    close(): void {
      database?.close();
      database = undefined;
    },

    async getMetadata(): Promise<AppMetadata> {
      const db = await connection();
      const transaction = db.transaction(STORE_NAMES.metadata, "readonly");
      const done = transactionDone(transaction);
      const metadata = await getMetadataFromStore(transaction.objectStore(STORE_NAMES.metadata));
      await done;
      return toAppMetadata(metadata);
    },

    async updatePreferences(input: UpdatePreferencesInput): Promise<AppMetadata> {
      assertPreferences(input);
      const db = await connection();
      const transaction = db.transaction(STORE_NAMES.metadata, "readwrite");
      const done = transactionDone(transaction);
      const metadataStore = transaction.objectStore(STORE_NAMES.metadata);
      const metadata = await getMetadataFromStore(metadataStore);
      if (input.birthdayNotificationsEnabled !== undefined) {
        metadata.birthdayNotificationsEnabled = input.birthdayNotificationsEnabled;
      }
      if (input.lastExportAt !== undefined) metadata.lastExportAt = input.lastExportAt;
      if (input.peopleSortMode !== undefined) metadata.peopleSortMode = input.peopleSortMode;
      if (input.giftSortMode !== undefined) metadata.giftSortMode = input.giftSortMode;
      if (input.theme !== undefined) metadata.theme = input.theme;
      metadataStore.put(metadata);
      await done;
      return toAppMetadata(metadata);
    },

    async isFreshInstallation(): Promise<boolean> {
      const db = await connection();
      const transaction = db.transaction([STORE_NAMES.people, STORE_NAMES.gifts], "readonly");
      const done = transactionDone(transaction);
      const peopleCount = await requestResult(transaction.objectStore(STORE_NAMES.people).count());
      const giftCount = await requestResult(transaction.objectStore(STORE_NAMES.gifts).count());
      await done;
      return peopleCount === 0 && giftCount === 0;
    },

    getPerson(id: number): Promise<Person | undefined> {
      assertPositiveId(id, "ID osoby");
      return readOne<Person>(STORE_NAMES.people, id);
    },

    listPeople(): Promise<Person[]> {
      return readAll<Person>(STORE_NAMES.people);
    },

    async createPerson(input: CreatePersonInput): Promise<Person> {
      assertNonEmpty(input.name, "Jméno");
      assertBirthday(input.birthday);
      assertNonEmpty(input.avatarSeed, "Avatar seed");
      assertPhotoFields(input);
      assertNote(input.note);
      const db = await connection();
      const transaction = db.transaction([STORE_NAMES.people, STORE_NAMES.metadata], "readwrite");
      const done = transactionDone(transaction);
      const peopleStore = transaction.objectStore(STORE_NAMES.people);
      const metadataStore = transaction.objectStore(STORE_NAMES.metadata);
      const metadata = await getMetadataFromStore(metadataStore);
      const existingPeople = await requestResult(peopleStore.getAll() as IDBRequest<Person[]>);
      const timestamp = now().toISOString();
      const person: Person = {
        id: allocateId(metadata, "people"),
        name: input.name.trim(),
        birthday: input.birthday,
        avatarSeed: input.avatarSeed,
        photo: input.photo ?? null,
        photoSource: input.photoSource ?? null,
        photoCrop: input.photoCrop ?? null,
        note: input.note?.trim() ?? "",
        sortOrder: 0,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      writeSortOrder(peopleStore, existingPeople.sort(compareBySortOrder), 1);
      peopleStore.put(person);
      metadataStore.put(metadata);
      await done;
      return person;
    },

    async updatePerson(id: number, input: UpdatePersonInput): Promise<Person> {
      assertPositiveId(id, "ID osoby");
      if (input.name !== undefined) assertNonEmpty(input.name, "Jméno");
      if (input.birthday !== undefined) assertBirthday(input.birthday);
      if (input.avatarSeed !== undefined) assertNonEmpty(input.avatarSeed, "Avatar seed");
      assertPhotoFields(input);
      assertNote(input.note);
      const db = await connection();
      const transaction = db.transaction(STORE_NAMES.people, "readwrite");
      const done = transactionDone(transaction);
      const peopleStore = transaction.objectStore(STORE_NAMES.people);
      const person = await entityMustExist<Person>(peopleStore, id, "Osoba neexistuje.");
      const updated: Person = {
        ...person,
        name: input.name?.trim() ?? person.name,
        birthday: input.birthday !== undefined ? input.birthday : person.birthday,
        avatarSeed: input.avatarSeed ?? person.avatarSeed,
        note: input.note !== undefined ? input.note.trim() : person.note,
        // Validated above: the three photo fields are either all given or all omitted.
        ...(input.photo !== undefined && {
          photo: input.photo,
          photoSource: input.photoSource ?? null,
          photoCrop: input.photoCrop ?? null,
        }),
        updatedAt: now().toISOString(),
      };
      peopleStore.put(updated);
      await done;
      return updated;
    },

    async reorderPeople(personIds: number[]): Promise<void> {
      const db = await connection();
      const transaction = db.transaction(STORE_NAMES.people, "readwrite");
      const done = transactionDone(transaction);
      const peopleStore = transaction.objectStore(STORE_NAMES.people);
      const people = await requestResult(peopleStore.getAll() as IDBRequest<Person[]>);
      assertPermutation(
        personIds,
        people.map((person) => person.id),
        "Nové pořadí musí obsahovat každou osobu právě jednou.",
      );
      const byId = new Map(people.map((person) => [person.id, person]));
      writeSortOrder(peopleStore, personIds.map((personId) => byId.get(personId) as Person));
      await done;
    },

    async getPersonDeletionImpact(id: number): Promise<PersonDeletionImpact> {
      assertPositiveId(id, "ID osoby");
      const db = await connection();
      const transaction = db.transaction(STORE_NAMES.gifts, "readonly");
      const done = transactionDone(transaction);
      const giftsStore = transaction.objectStore(STORE_NAMES.gifts);
      const giftCount = await requestResult(giftsStore.index("personId").count(id));
      const buyerGifts = await requestResult(
        giftsStore.index("buyerPersonId").getAll(id) as IDBRequest<Gift[]>,
      );
      await done;
      return {
        giftCount,
        buyerGiftCount: buyerGifts.filter((gift) => gift.personId !== id).length,
      };
    },

    async deletePerson(id: number): Promise<void> {
      assertPositiveId(id, "ID osoby");
      const db = await connection();
      const transaction = db.transaction(ALL_STORE_NAMES, "readwrite");
      const done = transactionDone(transaction);
      const people = transaction.objectStore(STORE_NAMES.people);
      await entityMustExist<Person>(people, id, "Osoba neexistuje.");
      const giftsStore = transaction.objectStore(STORE_NAMES.gifts);
      const recipientGifts = await requestResult(
        giftsStore.index("personId").getAll(id) as IDBRequest<Gift[]>,
      );
      const buyerGifts = await requestResult(
        giftsStore.index("buyerPersonId").getAll(id) as IDBRequest<Gift[]>,
      );
      for (const gift of recipientGifts) {
        await deleteGiftDependencies(transaction, gift.id);
        giftsStore.delete(gift.id);
      }
      const timestamp = now().toISOString();
      buyerGifts
        .filter((gift) => gift.personId !== id)
        .forEach((gift) => giftsStore.put({ ...gift, buyerPersonId: null, updatedAt: timestamp }));
      const notificationLog = transaction.objectStore(STORE_NAMES.notificationLog);
      const logEntries = await requestResult(
        notificationLog.index("personId").getAll(id) as IDBRequest<NotificationLogEntry[]>,
      );
      logEntries.forEach((entry) => notificationLog.delete(entry.key));
      people.delete(id);
      await done;
    },

    getGift(id: number): Promise<Gift | undefined> {
      assertPositiveId(id, "ID dárku");
      return readOne<Gift>(STORE_NAMES.gifts, id);
    },

    listGifts(): Promise<Gift[]> {
      return readAll<Gift>(STORE_NAMES.gifts);
    },

    listGiftsByPerson(personId: number): Promise<Gift[]> {
      assertPositiveId(personId, "ID osoby");
      return readAll<Gift>(STORE_NAMES.gifts, "personId", personId);
    },

    async createGift(input: CreateGiftInput): Promise<Gift> {
      const { personId, ...gift } = input;
      const [created] = await repository.createGiftsWithLinks({ ...gift, personIds: [personId], links: [] });
      return created;
    },

    async createGiftsWithLinks(input: CreateGiftsInput): Promise<Gift[]> {
      const { personIds, links, tagIds = [], ...fields } = input;
      if (personIds.length === 0) throw new Error("Vyberte alespoň jednoho příjemce.");
      if (new Set(personIds).size !== personIds.length) throw new Error("Příjemce je vybraný vícekrát.");
      personIds.forEach((personId) => assertGiftFields({ ...fields, personId }));
      assertLinkDrafts(links, false);
      tagIds.forEach((tagId) => assertPositiveId(tagId, "ID štítku"));
      return inTransaction(
        [STORE_NAMES.people, STORE_NAMES.gifts, STORE_NAMES.giftLinks, STORE_NAMES.tags, STORE_NAMES.giftTags, STORE_NAMES.metadata],
        async (transaction) => {
          // Check every reference before the first write.
          const people = transaction.objectStore(STORE_NAMES.people);
          for (const personId of personIds) {
            await entityMustExist<Person>(people, personId, "Příjemce dárku neexistuje.");
          }
          if (fields.buyerPersonId !== null) {
            await entityMustExist<Person>(people, fields.buyerPersonId, "Kupující dárku neexistuje.");
          }
          await assertTagsExist(transaction, tagIds);
          const metadataStore = transaction.objectStore(STORE_NAMES.metadata);
          const metadata = await getMetadataFromStore(metadataStore);
          const timestamp = now().toISOString();
          const created: Gift[] = [];
          // Independent records: every recipient gets its own gift, own link copies and own tags.
          for (const personId of personIds) {
            const gift = await insertGift(transaction, metadata, { ...fields, personId }, timestamp);
            await replaceLinks(transaction, metadata, gift.id, links);
            await replaceGiftTags(transaction, gift.id, tagIds);
            created.push(gift);
          }
          metadataStore.put(metadata);
          return created;
        },
      );
    },

    async updateGift(id: number, input: UpdateGiftInput): Promise<Gift> {
      assertPositiveId(id, "ID dárku");
      assertGiftFields(input);
      return inTransaction([STORE_NAMES.people, STORE_NAMES.gifts], (transaction) =>
        applyGiftUpdate(transaction, id, input),
      );
    },

    async saveGiftWithLinks(
      id: number,
      input: UpdateGiftInput,
      links: GiftLinkDraft[],
      tagIds?: number[],
    ): Promise<Gift> {
      assertPositiveId(id, "ID dárku");
      assertGiftFields(input);
      assertLinkDrafts(links, true);
      tagIds?.forEach((tagId) => assertPositiveId(tagId, "ID štítku"));
      return inTransaction(
        [STORE_NAMES.people, STORE_NAMES.gifts, STORE_NAMES.giftLinks, STORE_NAMES.tags, STORE_NAMES.giftTags, STORE_NAMES.metadata],
        async (transaction) => {
          if (tagIds !== undefined) await assertTagsExist(transaction, tagIds);
          const metadataStore = transaction.objectStore(STORE_NAMES.metadata);
          const metadata = await getMetadataFromStore(metadataStore);
          const gift = await applyGiftUpdate(transaction, id, input);
          await replaceLinks(transaction, metadata, id, links);
          if (tagIds !== undefined) await replaceGiftTags(transaction, id, tagIds);
          metadataStore.put(metadata);
          return gift;
        },
      );
    },

    async reorderGifts(personId: number, giftIds: number[]): Promise<void> {
      assertPositiveId(personId, "ID osoby");
      const db = await connection();
      const transaction = db.transaction(STORE_NAMES.gifts, "readwrite");
      const done = transactionDone(transaction);
      const giftsStore = transaction.objectStore(STORE_NAMES.gifts);
      const gifts = await giftsOfPerson(giftsStore, personId);
      assertPermutation(
        giftIds,
        gifts.map((gift) => gift.id),
        "Nové pořadí musí obsahovat každý dárek osoby právě jednou.",
      );
      const byId = new Map(gifts.map((gift) => [gift.id, gift]));
      writeSortOrder(giftsStore, giftIds.map((giftId) => byId.get(giftId) as Gift));
      await done;
    },

    async deleteGift(id: number): Promise<void> {
      assertPositiveId(id, "ID dárku");
      const db = await connection();
      const transaction = db.transaction(
        [STORE_NAMES.gifts, STORE_NAMES.giftLinks, STORE_NAMES.giftTags],
        "readwrite",
      );
      const done = transactionDone(transaction);
      await entityMustExist<Gift>(transaction.objectStore(STORE_NAMES.gifts), id, "Dárek neexistuje.");
      await deleteGiftDependencies(transaction, id);
      transaction.objectStore(STORE_NAMES.gifts).delete(id);
      await done;
    },

    listTags(): Promise<Tag[]> {
      return readAll<Tag>(STORE_NAMES.tags);
    },

    async createTag(input: CreateTagInput): Promise<Tag> {
      assertNonEmpty(input.name, "Název štítku");
      const db = await connection();
      const transaction = db.transaction([STORE_NAMES.tags, STORE_NAMES.metadata], "readwrite");
      const done = transactionDone(transaction);
      const tagsStore = transaction.objectStore(STORE_NAMES.tags);
      await assertUniqueTagName(tagsStore, input.name);
      const metadataStore = transaction.objectStore(STORE_NAMES.metadata);
      const metadata = await getMetadataFromStore(metadataStore);
      const timestamp = now().toISOString();
      const tag: Tag = {
        id: allocateId(metadata, "tags"),
        name: input.name.trim(),
        createdAt: timestamp,
        updatedAt: timestamp,
      };
      tagsStore.put(tag);
      metadataStore.put(metadata);
      await done;
      return tag;
    },

    async renameTag(id: number, name: string): Promise<Tag> {
      assertPositiveId(id, "ID štítku");
      assertNonEmpty(name, "Název štítku");
      const db = await connection();
      const transaction = db.transaction(STORE_NAMES.tags, "readwrite");
      const done = transactionDone(transaction);
      const tagsStore = transaction.objectStore(STORE_NAMES.tags);
      const tag = await entityMustExist<Tag>(tagsStore, id, "Štítek neexistuje.");
      await assertUniqueTagName(tagsStore, name, id);
      const updated: Tag = { ...tag, name: name.trim(), updatedAt: now().toISOString() };
      tagsStore.put(updated);
      await done;
      return updated;
    },

    async deleteTag(id: number): Promise<void> {
      assertPositiveId(id, "ID štítku");
      const db = await connection();
      const transaction = db.transaction([STORE_NAMES.tags, STORE_NAMES.giftTags], "readwrite");
      const done = transactionDone(transaction);
      const tags = transaction.objectStore(STORE_NAMES.tags);
      await entityMustExist<Tag>(tags, id, "Štítek neexistuje.");
      const giftTags = transaction.objectStore(STORE_NAMES.giftTags);
      const associations = await requestResult(
        giftTags.index("tagId").getAll(id) as IDBRequest<GiftTag[]>,
      );
      associations.forEach((association) => giftTags.delete([association.giftId, association.tagId]));
      tags.delete(id);
      await done;
    },

    async listGiftLinks(giftId: number): Promise<GiftLink[]> {
      assertPositiveId(giftId, "ID dárku");
      const links = await readAll<GiftLink>(STORE_NAMES.giftLinks, "giftId", giftId);
      return links.sort(compareBySortOrder);
    },

    async createGiftLink(input: CreateGiftLinkInput): Promise<GiftLink> {
      assertPositiveId(input.giftId, "ID dárku");
      assertHttpUrl(input.url);
      const db = await connection();
      const transaction = db.transaction(
        [STORE_NAMES.gifts, STORE_NAMES.giftLinks, STORE_NAMES.metadata],
        "readwrite",
      );
      const done = transactionDone(transaction);
      await entityMustExist<Gift>(
        transaction.objectStore(STORE_NAMES.gifts),
        input.giftId,
        "Dárek pro odkaz neexistuje.",
      );
      const giftLinksStore = transaction.objectStore(STORE_NAMES.giftLinks);
      const existingLinks = await linksOfGift(giftLinksStore, input.giftId);
      const metadataStore = transaction.objectStore(STORE_NAMES.metadata);
      const metadata = await getMetadataFromStore(metadataStore);
      const link = createGiftLinkRecord({
        id: allocateId(metadata, "giftLinks"),
        giftId: input.giftId,
        url: input.url,
        title: input.title,
        sortOrder: existingLinks.length,
      });
      writeSortOrder(giftLinksStore, existingLinks);
      giftLinksStore.put(link);
      metadataStore.put(metadata);
      await done;
      return link;
    },

    async updateGiftLink(id: number, input: UpdateGiftLinkInput): Promise<GiftLink> {
      assertPositiveId(id, "ID odkazu");
      if (input.url !== undefined) assertHttpUrl(input.url);
      const db = await connection();
      const transaction = db.transaction(STORE_NAMES.giftLinks, "readwrite");
      const done = transactionDone(transaction);
      const giftLinksStore = transaction.objectStore(STORE_NAMES.giftLinks);
      const link = await entityMustExist<GiftLink>(giftLinksStore, id, "Odkaz neexistuje.");
      const updated = createGiftLinkRecord({
        ...link,
        url: input.url ?? link.url,
        title: input.title !== undefined ? input.title : link.title,
      });
      giftLinksStore.put(updated);
      await done;
      return updated;
    },

    async reorderGiftLinks(giftId: number, linkIds: number[]): Promise<void> {
      assertPositiveId(giftId, "ID dárku");
      const db = await connection();
      const transaction = db.transaction(STORE_NAMES.giftLinks, "readwrite");
      const done = transactionDone(transaction);
      const giftLinksStore = transaction.objectStore(STORE_NAMES.giftLinks);
      const links = await linksOfGift(giftLinksStore, giftId);
      assertPermutation(
        linkIds,
        links.map((link) => link.id),
        "Nové pořadí musí obsahovat každý odkaz dárku právě jednou.",
      );
      const byId = new Map(links.map((link) => [link.id, link]));
      writeSortOrder(giftLinksStore, linkIds.map((linkId) => byId.get(linkId) as GiftLink));
      await done;
    },

    async deleteGiftLink(id: number): Promise<void> {
      assertPositiveId(id, "ID odkazu");
      const db = await connection();
      const transaction = db.transaction(STORE_NAMES.giftLinks, "readwrite");
      const done = transactionDone(transaction);
      const giftLinksStore = transaction.objectStore(STORE_NAMES.giftLinks);
      const link = await entityMustExist<GiftLink>(giftLinksStore, id, "Odkaz neexistuje.");
      giftLinksStore.delete(id);
      const remaining = (await linksOfGift(giftLinksStore, link.giftId)).filter(
        (other) => other.id !== id,
      );
      writeSortOrder(giftLinksStore, remaining);
      await done;
    },

    listAllGiftLinks(): Promise<GiftLink[]> {
      return readAll<GiftLink>(STORE_NAMES.giftLinks);
    },

    async listGiftTagIds(giftId: number): Promise<number[]> {
      assertPositiveId(giftId, "ID dárku");
      const associations = await readAll<GiftTag>(STORE_NAMES.giftTags, "giftId", giftId);
      return associations.map((association) => association.tagId).sort((a, b) => a - b);
    },

    async createGiftTag(association: GiftTag): Promise<GiftTag> {
      assertPositiveId(association.giftId, "ID dárku");
      assertPositiveId(association.tagId, "ID štítku");
      const db = await connection();
      const transaction = db.transaction([STORE_NAMES.gifts, STORE_NAMES.tags, STORE_NAMES.giftTags], "readwrite");
      const done = transactionDone(transaction);
      await entityMustExist<Gift>(
        transaction.objectStore(STORE_NAMES.gifts),
        association.giftId,
        "Dárek pro štítek neexistuje.",
      );
      await entityMustExist<Tag>(
        transaction.objectStore(STORE_NAMES.tags),
        association.tagId,
        "Štítek neexistuje.",
      );
      transaction.objectStore(STORE_NAMES.giftTags).put(association);
      await done;
      return association;
    },

    async setGiftTags(giftId: number, tagIds: number[]): Promise<void> {
      assertPositiveId(giftId, "ID dárku");
      tagIds.forEach((tagId) => assertPositiveId(tagId, "ID štítku"));
      await inTransaction([STORE_NAMES.gifts, STORE_NAMES.tags, STORE_NAMES.giftTags], async (transaction) => {
        await entityMustExist<Gift>(
          transaction.objectStore(STORE_NAMES.gifts),
          giftId,
          "Dárek pro štítek neexistuje.",
        );
        await assertTagsExist(transaction, tagIds);
        await replaceGiftTags(transaction, giftId, tagIds);
      });
    },

    listAllGiftTags(): Promise<GiftTag[]> {
      return readAll<GiftTag>(STORE_NAMES.giftTags);
    },

    async exportBackup(): Promise<BackupDocument> {
      const db = await connection();
      const transaction = db.transaction(BACKUP_STORES, "readonly");
      const done = transactionDone(transaction);
      const dataset = await readDataset(transaction);
      await done;
      return createBackupDocument(dataset, now());
    },

    async previewImport(document: BackupDocument): Promise<Result<ImportPlan>> {
      const db = await connection();
      const transaction = db.transaction(BACKUP_STORES, "readonly");
      const done = transactionDone(transaction);
      const local = await readDataset(transaction);
      await done;
      const plan = planImport(local, document);
      const error = datasetError(plan.merged);
      return error === null ? { ok: true, value: plan } : { ok: false, error };
    },

    importBackup(document: BackupDocument): Promise<ImportPlan> {
      return inTransaction(BACKUP_STORES, async (transaction) => {
        // Re-plan inside the write transaction so it works on the current data.
        const plan = planImport(await readDataset(transaction), document);
        const error = datasetError(plan.merged);
        if (error !== null) throw new ImportError(error);

        const tagsStore = transaction.objectStore(STORE_NAMES.tags);
        const giftTagsStore = transaction.objectStore(STORE_NAMES.giftTags);
        for (const tagId of plan.removedTagIds) {
          const associations = await requestResult(
            giftTagsStore.index("tagId").getAll(tagId) as IDBRequest<GiftTag[]>,
          );
          associations.forEach((association) => giftTagsStore.delete([association.giftId, association.tagId]));
          tagsStore.delete(tagId);
        }

        const peopleStore = transaction.objectStore(STORE_NAMES.people);
        const giftsStore = transaction.objectStore(STORE_NAMES.gifts);
        const giftLinksStore = transaction.objectStore(STORE_NAMES.giftLinks);
        document.people.forEach((person) => peopleStore.put(person));
        document.gifts.forEach((gift) => giftsStore.put(gift));
        document.tags.forEach((tag) => tagsStore.put(tag));
        const relinked = new Set(plan.relinkedGiftIds);
        plan.merged.giftLinks
          .filter((link) => relinked.has(link.giftId))
          .forEach((link) => giftLinksStore.put(link));
        document.giftTags.forEach((association) => giftTagsStore.put(association));

        const metadataStore = transaction.objectStore(STORE_NAMES.metadata);
        const metadata = await getMetadataFromStore(metadataStore);
        metadataStore.put({
          ...metadata,
          ...plan.merged.counters,
          birthdayNotificationsEnabled: plan.merged.birthdayNotificationsEnabled,
        });
        return plan;
      });
    },

    async listNotificationLogKeys(): Promise<string[]> {
      const entries = await readAll<NotificationLogEntry>(STORE_NAMES.notificationLog);
      return entries.map((entry) => entry.key);
    },

    async claimReminders(entries: ReminderClaim[]): Promise<string[]> {
      entries.forEach((entry) => {
        assertPositiveId(entry.personId, "ID osoby");
        if (!isOneOf(REMINDER_TYPES, entry.type)) throw new Error("Neplatný typ připomínky.");
      });
      const shownAt = now();
      const oldestKept = new Date(shownAt.getTime() - NOTIFICATION_LOG_RETENTION_MS).toISOString();
      return inTransaction([STORE_NAMES.people, STORE_NAMES.notificationLog], async (transaction) => {
        const people = transaction.objectStore(STORE_NAMES.people);
        const log = transaction.objectStore(STORE_NAMES.notificationLog);
        const claimed: string[] = [];
        for (const entry of entries) {
          const existing = await requestResult(log.get(entry.key) as IDBRequest<NotificationLogEntry | undefined>);
          const person = await requestResult(people.get(entry.personId) as IDBRequest<Person | undefined>);
          if (existing !== undefined || person === undefined) continue;
          log.put({ ...entry, shownAt: shownAt.toISOString(), seenAt: null } satisfies NotificationLogEntry);
          claimed.push(entry.key);
        }
        const all = await requestResult(log.getAll() as IDBRequest<NotificationLogEntry[]>);
        all.filter((entry) => entry.shownAt < oldestKept).forEach((entry) => log.delete(entry.key));
        return claimed;
      });
    },

    async listUnseenReminders(): Promise<NotificationLogEntry[]> {
      const entries = await readAll<NotificationLogEntry>(STORE_NAMES.notificationLog);
      return entries.filter((entry) => entry.seenAt === null);
    },

    markRemindersSeen(keys: string[]): Promise<void> {
      const seenAt = now().toISOString();
      return inTransaction([STORE_NAMES.notificationLog], async (transaction) => {
        const log = transaction.objectStore(STORE_NAMES.notificationLog);
        for (const key of new Set(keys)) {
          const entry = await requestResult(log.get(key) as IDBRequest<NotificationLogEntry | undefined>);
          if (entry !== undefined && entry.seenAt === null) log.put({ ...entry, seenAt });
        }
      });
    },
  };

  return repository;
}
