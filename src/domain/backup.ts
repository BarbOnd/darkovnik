import { isValidBirthday } from "./birthday";
import {
  GIFT_PRIORITIES,
  GIFT_STATUSES,
  isOneOf,
  type Gift,
  type GiftLink,
  type GiftTag,
  type Person,
  type Tag,
} from "./entities";
import { isHttpUrl } from "./links";
import { photoFieldsError, type CropView } from "./photo";
import { compareBySortOrder } from "./sorting";

/** Version of the backup file format (DATABASE.md → Backup schema), independent of the IndexedDB version. */
export const BACKUP_SCHEMA_VERSION = 1;

export type BackupCounters = {
  highestPersonId: number;
  highestGiftId: number;
  highestTagId: number;
  highestGiftLinkId: number;
};

/** All exported data; device preferences and NotificationLog are not part of it. */
export type Dataset = {
  people: Person[];
  gifts: Gift[];
  giftLinks: GiftLink[];
  tags: Tag[];
  giftTags: GiftTag[];
  counters: BackupCounters;
  birthdayNotificationsEnabled: boolean;
};

export type BackupDocument = {
  schemaVersion: typeof BACKUP_SCHEMA_VERSION;
  exportedAt: string;
  people: Person[];
  gifts: Gift[];
  giftLinks: GiftLink[];
  tags: Tag[];
  giftTags: GiftTag[];
  metadata: BackupCounters & { birthdayNotificationsEnabled: boolean };
};

export type Result<T> = { ok: true; value: T } | { ok: false; error: string };

export function createBackupDocument(dataset: Dataset, exportedAt: Date): BackupDocument {
  return {
    schemaVersion: BACKUP_SCHEMA_VERSION,
    exportedAt: exportedAt.toISOString(),
    people: dataset.people,
    gifts: dataset.gifts,
    giftLinks: dataset.giftLinks,
    tags: dataset.tags,
    giftTags: dataset.giftTags,
    metadata: { ...dataset.counters, birthdayNotificationsEnabled: dataset.birthdayNotificationsEnabled },
  };
}

/** "giftlist-zaloha-YYYY-MM-DD.json" for a local calendar date. */
export function backupFileName(date: { year: number; month: number; day: number }): string {
  const pad = (value: number) => String(value).padStart(2, "0");
  return `giftlist-zaloha-${date.year}-${pad(date.month)}-${pad(date.day)}.json`;
}

// ---------------------------------------------------------------------------
// Document validation: every field is checked and unknown fields are dropped.
// ---------------------------------------------------------------------------

class InvalidBackup extends Error {}

function invalid(detail: string): never {
  throw new InvalidBackup(`Záloha není platná: ${detail}.`);
}

type Fields = Record<string, unknown>;

function isObject(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function id(record: Fields, field: string, where: string): number {
  const value = record[field];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value <= 0) {
    invalid(`${where} nemá platné ${field === "id" ? "ID" : `pole „${field}“`}`);
  }
  return value;
}

function integer(record: Fields, field: string, where: string, min = Number.MIN_SAFE_INTEGER): number {
  const value = record[field];
  if (typeof value !== "number" || !Number.isSafeInteger(value) || value < min) invalid(`${where} má neplatné pole „${field}“`);
  return value;
}

function text(record: Fields, field: string, where: string, { nonEmpty = false } = {}): string {
  const value = record[field];
  if (typeof value !== "string" || (nonEmpty && value.trim() === "")) invalid(`${where} má neplatné pole „${field}“`);
  return value;
}

function timestamp(record: Fields, field: string, where: string): string {
  const value = text(record, field, where);
  if (Number.isNaN(Date.parse(value))) invalid(`${where} má neplatné datum v poli „${field}“`);
  return value;
}

function list(document: Fields, field: string): unknown[] {
  const value = document[field];
  if (!Array.isArray(value)) invalid(`chybí seznam „${field}“`);
  return value;
}

function eachRecord<T>(items: unknown[], label: string, read: (record: Fields, where: string) => T): T[] {
  return items.map((item, index) => {
    if (!isObject(item)) invalid(`${label} na pozici ${index + 1} není záznam`);
    return read(item, `${label} #${typeof item.id === "number" ? item.id : index + 1}`);
  });
}

function assertUniqueIds(records: { id: number }[], label: string): void {
  const seen = new Set<number>();
  for (const record of records) {
    if (seen.has(record.id)) invalid(`${label} s ID ${record.id} je v záloze vícekrát`);
    seen.add(record.id);
  }
}

function readPerson(record: Fields, where: string): Person {
  const birthday = record.birthday ?? null;
  if (birthday !== null && (typeof birthday !== "string" || !isValidBirthday(birthday))) {
    invalid(`${where} nemá platné datum narozenin`);
  }
  const photoFields = {
    photo: (record.photo ?? null) as string | null,
    photoSource: (record.photoSource ?? null) as string | null,
    photoCrop: (record.photoCrop ?? null) as CropView | null,
  };
  if (photoFieldsError(photoFields) !== null) invalid(`${where} má neplatnou fotku`);
  return {
    id: id(record, "id", where),
    name: text(record, "name", where, { nonEmpty: true }).trim(),
    birthday,
    avatarSeed: text(record, "avatarSeed", where, { nonEmpty: true }),
    ...photoFields,
    sortOrder: integer(record, "sortOrder", where),
    createdAt: timestamp(record, "createdAt", where),
    updatedAt: timestamp(record, "updatedAt", where),
  };
}

function readGift(record: Fields, where: string): Gift {
  const { priority, status } = record;
  if (!isOneOf(GIFT_PRIORITIES, priority)) invalid(`${where} má neplatnou prioritu`);
  if (!isOneOf(GIFT_STATUSES, status)) invalid(`${where} má neplatný stav`);
  const buyer = record.buyerPersonId ?? null;
  return {
    id: id(record, "id", where),
    personId: id(record, "personId", where),
    name: text(record, "name", where, { nonEmpty: true }),
    note: text(record, "note", where),
    priority,
    status,
    buyerPersonId: buyer === null ? null : id(record, "buyerPersonId", where),
    sortOrder: integer(record, "sortOrder", where),
    createdAt: timestamp(record, "createdAt", where),
    updatedAt: timestamp(record, "updatedAt", where),
  };
}

function readGiftLink(record: Fields, where: string): GiftLink {
  const url = text(record, "url", where);
  if (!isHttpUrl(url)) invalid(`${where} nemá platnou adresu http:// nebo https://`);
  const title = record.title;
  if (title !== undefined && typeof title !== "string") invalid(`${where} má neplatný název`);
  return {
    id: id(record, "id", where),
    giftId: id(record, "giftId", where),
    url,
    ...(typeof title === "string" && title.trim() !== "" && { title: title.trim() }),
    sortOrder: integer(record, "sortOrder", where, 0),
  };
}

function readTag(record: Fields, where: string): Tag {
  return {
    id: id(record, "id", where),
    name: text(record, "name", where, { nonEmpty: true }).trim(),
    createdAt: timestamp(record, "createdAt", where),
    updatedAt: timestamp(record, "updatedAt", where),
  };
}

function readGiftTag(record: Fields, where: string): GiftTag {
  return { giftId: id(record, "giftId", where), tagId: id(record, "tagId", where) };
}

/** Parses and fully validates a backup file's text. Never throws. */
export function parseBackup(fileText: string): Result<BackupDocument> {
  let raw: unknown;
  try {
    raw = JSON.parse(fileText);
  } catch {
    return { ok: false, error: "Soubor není platná záloha GiftList (nejde o čitelný JSON)." };
  }
  try {
    if (!isObject(raw) || !("schemaVersion" in raw)) invalid("soubor neobsahuje data GiftList");
    if (raw.schemaVersion !== BACKUP_SCHEMA_VERSION) {
      return {
        ok: false,
        error:
          typeof raw.schemaVersion === "number" && raw.schemaVersion > BACKUP_SCHEMA_VERSION
            ? "Záloha pochází z novější verze aplikace. Aktualizujte GiftList a zkuste to znovu."
            : "Tuto verzi zálohy aplikace nepodporuje.",
      };
    }
    const people = eachRecord(list(raw, "people"), "osoba", readPerson);
    const gifts = eachRecord(list(raw, "gifts"), "dárek", readGift);
    const giftLinks = eachRecord(list(raw, "giftLinks"), "odkaz", readGiftLink);
    const tags = eachRecord(list(raw, "tags"), "štítek", readTag);
    const giftTags = eachRecord(list(raw, "giftTags"), "přiřazení štítku", readGiftTag);
    assertUniqueIds(people, "Osoba");
    assertUniqueIds(gifts, "Dárek");
    assertUniqueIds(giftLinks, "Odkaz");
    assertUniqueIds(tags, "Štítek");
    const pairs = new Set<string>();
    for (const { giftId, tagId } of giftTags) {
      const pair = `${giftId}:${tagId}`;
      if (pairs.has(pair)) invalid(`přiřazení štítku ${tagId} k dárku ${giftId} je v záloze vícekrát`);
      pairs.add(pair);
    }
    const metadata = raw.metadata;
    if (!isObject(metadata)) invalid("chybí metadata");
    if (typeof metadata.birthdayNotificationsEnabled !== "boolean") invalid("metadata mají neplatné nastavení upozornění");
    return {
      ok: true,
      value: {
        schemaVersion: BACKUP_SCHEMA_VERSION,
        exportedAt: timestamp(raw, "exportedAt", "záloha"),
        people,
        gifts,
        giftLinks,
        tags,
        giftTags,
        metadata: {
          highestPersonId: integer(metadata, "highestPersonId", "metadata", 0),
          highestGiftId: integer(metadata, "highestGiftId", "metadata", 0),
          highestTagId: integer(metadata, "highestTagId", "metadata", 0),
          highestGiftLinkId: integer(metadata, "highestGiftLinkId", "metadata", 0),
          birthdayNotificationsEnabled: metadata.birthdayNotificationsEnabled,
        },
      },
    };
  } catch (error) {
    if (error instanceof InvalidBackup) return { ok: false, error: error.message };
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Merge by stable ID (DATABASE.md → Import rules).
// ---------------------------------------------------------------------------

export type EntityCounts = { people: number; gifts: number; tags: number; giftLinks: number };

export type ImportPlan = {
  /** No people and no gifts locally: local tags are replaced by the imported ones. */
  fresh: boolean;
  merged: Dataset;
  /** Records created with the imported ID. */
  added: EntityCounts;
  /** Local records replaced by the imported ones (shown in the confirmation). */
  updated: EntityCounts;
  /** Local tags removed because the installation is fresh. */
  removedTagIds: number[];
  /** Gifts whose link order was renormalized to 0..n-1. */
  relinkedGiftIds: number[];
};

function mergeById<T extends { id: number }>(local: T[], imported: T[]): { merged: T[]; added: number; updated: number } {
  const byId = new Map(local.map((record) => [record.id, record]));
  let added = 0;
  let updated = 0;
  for (const record of imported) {
    if (byId.has(record.id)) updated += 1;
    else added += 1;
    byId.set(record.id, record);
  }
  return { merged: [...byId.values()], added, updated };
}

function maxId(records: { id: number }[]): number {
  return records.reduce((max, record) => Math.max(max, record.id), 0);
}

/** Merges a validated backup into the local data. Pure: nothing is written here. */
export function planImport(local: Dataset, document: BackupDocument): ImportPlan {
  const fresh = local.people.length === 0 && local.gifts.length === 0;
  const baseTags = fresh ? [] : local.tags;
  const removedTagIds = fresh ? local.tags.map((tag) => tag.id) : [];
  const removed = new Set(removedTagIds);
  const baseGiftTags = local.giftTags.filter((association) => !removed.has(association.tagId));

  const people = mergeById(local.people, document.people);
  const gifts = mergeById(local.gifts, document.gifts);
  const tags = mergeById(baseTags, document.tags);
  const links = mergeById(local.giftLinks, document.giftLinks);

  // Gifts that gain imported links, and gifts that lose a link moved by the import.
  const localLinkGift = new Map(local.giftLinks.map((link) => [link.id, link.giftId]));
  const affected = new Set<number>();
  for (const link of document.giftLinks) {
    affected.add(link.giftId);
    const previousGift = localLinkGift.get(link.id);
    if (previousGift !== undefined) affected.add(previousGift);
  }
  const importedLinkIds = new Set(document.giftLinks.map((link) => link.id));
  const renumbered = new Map<number, GiftLink>();
  for (const giftId of affected) {
    const importedFirst = document.giftLinks.filter((link) => link.giftId === giftId).sort(compareBySortOrder);
    const localRest = local.giftLinks
      .filter((link) => link.giftId === giftId && !importedLinkIds.has(link.id))
      .sort(compareBySortOrder);
    [...importedFirst, ...localRest].forEach((link, index) => renumbered.set(link.id, { ...link, sortOrder: index }));
  }
  const giftLinks = links.merged.map((link) => renumbered.get(link.id) ?? link);

  // Associations are only added, identified by the giftId + tagId pair.
  const pairKey = (association: GiftTag) => `${association.giftId}:${association.tagId}`;
  const giftTags = new Map(baseGiftTags.map((association) => [pairKey(association), association]));
  document.giftTags.forEach((association) => giftTags.set(pairKey(association), association));

  const merged: Dataset = {
    people: people.merged,
    gifts: gifts.merged,
    giftLinks,
    tags: tags.merged,
    giftTags: [...giftTags.values()],
    counters: {
      highestPersonId: Math.max(local.counters.highestPersonId, document.metadata.highestPersonId, maxId(people.merged)),
      highestGiftId: Math.max(local.counters.highestGiftId, document.metadata.highestGiftId, maxId(gifts.merged)),
      // Removed local tags keep their IDs reserved: the counter never decreases.
      highestTagId: Math.max(local.counters.highestTagId, document.metadata.highestTagId, maxId(tags.merged)),
      highestGiftLinkId: Math.max(
        local.counters.highestGiftLinkId,
        document.metadata.highestGiftLinkId,
        maxId(giftLinks),
      ),
    },
    birthdayNotificationsEnabled: document.metadata.birthdayNotificationsEnabled,
  };

  return {
    fresh,
    merged,
    added: { people: people.added, gifts: gifts.added, tags: tags.added, giftLinks: links.added },
    updated: { people: people.updated, gifts: gifts.updated, tags: tags.updated, giftLinks: links.updated },
    removedTagIds,
    relinkedGiftIds: [...affected],
  };
}

/** Checks references and uniqueness of the merged data; returns a Czech error or null. */
export function datasetError(dataset: Dataset): string | null {
  const personIds = new Set(dataset.people.map((person) => person.id));
  const giftIds = new Set(dataset.gifts.map((gift) => gift.id));
  const tagIds = new Set(dataset.tags.map((tag) => tag.id));
  for (const gift of dataset.gifts) {
    if (!personIds.has(gift.personId)) return `Dárek „${gift.name}“ patří osobě, která v datech není.`;
    if (gift.buyerPersonId !== null && !personIds.has(gift.buyerPersonId)) {
      return `Dárek „${gift.name}“ má kupujícího, který v datech není.`;
    }
  }
  const linkOrders = new Set<string>();
  for (const link of dataset.giftLinks) {
    if (!giftIds.has(link.giftId)) return "Záloha obsahuje odkaz k dárku, který v datech není.";
    const order = `${link.giftId}:${link.sortOrder}`;
    if (linkOrders.has(order)) return "Odkazy jednoho dárku mají stejné pořadí.";
    linkOrders.add(order);
  }
  for (const association of dataset.giftTags) {
    if (!giftIds.has(association.giftId) || !tagIds.has(association.tagId)) {
      return "Záloha přiřazuje štítek, který nebo jehož dárek v datech není.";
    }
  }
  const names = new Map<string, string>();
  for (const tag of dataset.tags) {
    const key = tag.name.trim().toLocaleLowerCase("cs-CZ");
    if (names.has(key)) {
      return `Po sloučení by existovaly dva štítky „${tag.name}“. Přejmenujte nebo smažte jeden z nich a zkuste to znovu.`;
    }
    names.set(key, tag.name);
  }
  return null;
}
