import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import { parseBackup, type BackupDocument } from "../domain/backup";
import { deleteGiftListDatabase } from "./database";
import { createGiftListRepository, ImportError, type GiftListRepository } from "./repository";

const opened: { repository: GiftListRepository; name: string }[] = [];
let sequence = 0;

function openRepository(): GiftListRepository {
  sequence += 1;
  const name = `giftlist-backup-test-${sequence}`;
  const repository = createGiftListRepository({ databaseName: name, now: () => new Date("2026-03-01T10:00:00.000Z") });
  opened.push({ repository, name });
  return repository;
}

afterEach(async () => {
  for (const { repository, name } of opened.splice(0)) {
    repository.close();
    await deleteGiftListDatabase(name);
  }
});

/** Export → file text → parse, like a real download and upload. */
async function exportAsFile(repository: GiftListRepository): Promise<BackupDocument> {
  const text = JSON.stringify(await repository.exportBackup());
  const parsed = parseBackup(text);
  if (!parsed.ok) throw new Error(parsed.error);
  return parsed.value;
}

function withoutExportTime(document: BackupDocument) {
  const { exportedAt: _exportedAt, ...rest } = document;
  void _exportedAt;
  return {
    ...rest,
    people: [...rest.people].sort((a, b) => a.id - b.id),
    gifts: [...rest.gifts].sort((a, b) => a.id - b.id),
    giftLinks: [...rest.giftLinks].sort((a, b) => a.id - b.id),
    tags: [...rest.tags].sort((a, b) => a.id - b.id),
    giftTags: [...rest.giftTags].sort((a, b) => a.giftId - b.giftId || a.tagId - b.tagId),
  };
}

async function fillOldPhone(repository: GiftListRepository) {
  await repository.initialize();
  await repository.updatePreferences({ birthdayNotificationsEnabled: true, theme: "DARK" });
  const removed = await repository.createPerson({ name: "Smazaná", birthday: null, avatarSeed: "x" });
  const jana = await repository.createPerson({
    name: "Jana",
    birthday: "1990-05-14",
    avatarSeed: "seed-jana",
    photo: "data:image/jpeg;base64,/9j/4AAQ",
    photoSource: "data:image/jpeg;base64,/9j/4BBQ",
    photoCrop: { zoom: 2, dx: 0.1, dy: 0 },
  });
  const petr = await repository.createPerson({ name: "Petr", birthday: "--02-29", avatarSeed: "seed-petr" });
  await repository.deletePerson(removed.id);
  const family = await repository.createTag({ name: "Rodina" });
  const [lego] = await repository.createGiftsWithLinks({
    name: "Lego",
    note: "velká krabice",
    priority: "HIGH",
    status: "BOUGHT",
    buyerPersonId: petr.id,
    personIds: [jana.id],
    links: [{ url: "https://example.test/a", title: "Obchod" }, { url: "https://example.test/b" }],
    tagIds: [1, family.id],
  });
  const [scarf] = await repository.createGiftsWithLinks({
    name: "Šála",
    note: "",
    priority: "LOW",
    status: "GIVEN",
    buyerPersonId: null,
    personIds: [petr.id],
    links: [],
  });
  await repository.deleteGift(scarf.id);
  return { jana, petr, lego };
}

describe("phone migration: export → import into an empty app", () => {
  it("moves all data with the same IDs, replaces default tags and never reuses IDs", async () => {
    const oldPhone = openRepository();
    await fillOldPhone(oldPhone);
    const file = await exportAsFile(oldPhone);

    const newPhone = openRepository();
    await newPhone.initialize(); // fresh: only the default tags
    const preview = await newPhone.previewImport(file);
    expect(preview.ok && preview.value.fresh).toBe(true);

    const plan = await newPhone.importBackup(file);
    expect(plan.added).toEqual({ people: 2, gifts: 1, tags: 4, giftLinks: 2 });

    expect(withoutExportTime(await exportAsFile(newPhone))).toEqual(withoutExportTime(file));
    // Device preferences are not part of the backup.
    expect((await newPhone.getMetadata()).theme).toBe("SYSTEM");
    expect((await newPhone.getMetadata()).birthdayNotificationsEnabled).toBe(true);

    // IDs of records deleted on the old phone stay unused on the new one.
    const next = await newPhone.createPerson({ name: "Další", birthday: null, avatarSeed: "y" });
    expect(next.id).toBe(4);
    expect((await newPhone.createGift({ personId: next.id, name: "x", note: "", priority: "LOW", status: "NEW", buyerPersonId: null })).id).toBe(3);
  });

  it("merges into an installation with data without deleting anything", async () => {
    const oldPhone = openRepository();
    await fillOldPhone(oldPhone);
    const file = await exportAsFile(oldPhone);

    const other = openRepository();
    await other.initialize();
    await other.createPerson({ name: "Místní", birthday: null, avatarSeed: "m" });
    await other.createTag({ name: "Svatba" });

    const preview = await other.previewImport(file);
    expect(preview.ok && preview.value.fresh).toBe(false);
    // Person 1 (local "Místní") is not in the file: person IDs 2 and 3 are new here.
    // Tag ID 4 exists in both: the imported "Rodina" replaces the local "Svatba"
    // (same ID → imported wins), which is why the confirmation shows these counts.
    expect(preview.ok && preview.value.updated).toEqual({ people: 0, gifts: 0, tags: 4, giftLinks: 0 });
    expect(preview.ok && preview.value.added).toEqual({ people: 2, gifts: 1, tags: 0, giftLinks: 2 });

    await other.importBackup(file);
    expect((await other.listPeople()).map((person) => person.name).sort()).toEqual(["Jana", "Místní", "Petr"]);
    expect((await other.listTags()).map((tag) => tag.name).sort()).toEqual([
      "Narozeniny",
      "Rodina",
      "Vánoce",
      "Výročí",
    ]);
  });

  it("writes nothing when the merged result would be invalid", async () => {
    const oldPhone = openRepository();
    await fillOldPhone(oldPhone);
    const file = await exportAsFile(oldPhone);

    const other = openRepository();
    await other.initialize();
    await other.createPerson({ name: "Místní", birthday: null, avatarSeed: "m" });
    // Same name as the imported tag "Rodina" (ID 4) but a different ID → duplicate after merge.
    await other.createTag({ name: "rodina" });
    await other.createTag({ name: "Rodina 2" });
    await other.renameTag(4, "Jiná");
    await other.renameTag(5, "RODINA");
    const before = await exportAsFile(other);

    const preview = await other.previewImport(file);
    expect(preview.ok).toBe(false);
    await expect(other.importBackup(file)).rejects.toBeInstanceOf(ImportError);
    expect(withoutExportTime(await exportAsFile(other))).toEqual(withoutExportTime(before));
  });
});
