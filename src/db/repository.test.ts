import "fake-indexeddb/auto";
import { afterEach, describe, expect, it } from "vitest";
import {
  DATABASE_VERSION,
  deleteGiftListDatabase,
  openGiftListDatabase,
  STORE_NAMES,
} from "./database";
import { createGiftListRepository, type GiftListRepository } from "./repository";

let databaseSequence = 0;
let activeRepository: GiftListRepository | undefined;
let activeDatabaseName: string | undefined;

function createRepository(): GiftListRepository {
  databaseSequence += 1;
  activeDatabaseName = `giftlist-test-${databaseSequence}`;
  activeRepository = createGiftListRepository({
    databaseName: activeDatabaseName,
    now: () => new Date("2026-01-01T12:00:00.000Z"),
  });
  return activeRepository;
}

function createPerson(repository: GiftListRepository, name = "Ada") {
  return repository.createPerson({ name, birthday: null, avatarSeed: `seed-${name}` });
}

afterEach(async () => {
  activeRepository?.close();
  if (activeDatabaseName !== undefined) await deleteGiftListDatabase(activeDatabaseName);
  activeRepository = undefined;
  activeDatabaseName = undefined;
});

describe("GiftList IndexedDB initialization", () => {
  it("creates the required stores, indexes, schema version, and default tags", async () => {
    const repository = createRepository();
    await repository.initialize();

    const database = await openGiftListDatabase(activeDatabaseName);
    expect(database.version).toBe(DATABASE_VERSION);
    expect([...database.objectStoreNames].sort()).toEqual(Object.values(STORE_NAMES).sort());

    const transaction = database.transaction(
      [STORE_NAMES.gifts, STORE_NAMES.giftLinks, STORE_NAMES.giftTags, STORE_NAMES.notificationLog],
      "readonly",
    );
    expect([...transaction.objectStore(STORE_NAMES.gifts).indexNames].sort()).toEqual([
      "buyerPersonId",
      "personId",
      "status",
    ]);
    expect([...transaction.objectStore(STORE_NAMES.giftLinks).indexNames]).toEqual(["giftId"]);
    expect([...transaction.objectStore(STORE_NAMES.giftTags).indexNames].sort()).toEqual([
      "giftId",
      "tagId",
    ]);
    expect([...transaction.objectStore(STORE_NAMES.notificationLog).indexNames]).toEqual(["personId"]);
    database.close();

    expect((await repository.listTags()).map((tag) => tag.name)).toEqual([
      "Vánoce",
      "Narozeniny",
      "Výročí",
    ]);
    expect(await repository.getMetadata()).toMatchObject({
      schemaVersion: DATABASE_VERSION,
      highestPersonId: 0,
      highestGiftId: 0,
      highestTagId: 3,
      highestGiftLinkId: 0,
      birthdayNotificationsEnabled: false,
      lastExportAt: null,
      peopleSortMode: "ALPHABETICAL",
      giftSortMode: "PRIORITY",
      theme: "SYSTEM",
    });
  });

  it("does not duplicate default tags after reopening and initializing again", async () => {
    const repository = createRepository();
    await repository.initialize();
    repository.close();

    const reopenedRepository = createGiftListRepository({ databaseName: activeDatabaseName });
    activeRepository = reopenedRepository;
    await reopenedRepository.initialize();

    expect(await reopenedRepository.listTags()).toHaveLength(3);
    expect((await reopenedRepository.getMetadata()).highestTagId).toBe(3);
  });

  it("does not recreate a deleted default tag", async () => {
    const repository = createRepository();
    await repository.initialize();
    const [defaultTag] = await repository.listTags();
    await repository.deleteTag(defaultTag.id);
    repository.close();

    const reopenedRepository = createGiftListRepository({ databaseName: activeDatabaseName });
    activeRepository = reopenedRepository;
    await reopenedRepository.initialize();

    expect((await reopenedRepository.listTags()).map((tag) => tag.name)).toEqual([
      "Narozeniny",
      "Výročí",
    ]);
  });
});

describe("GiftList persistence", () => {
  it("reads persisted data after closing and reopening the connection", async () => {
    const repository = createRepository();
    await repository.initialize();
    const person = await createPerson(repository, "Bára");
    repository.close();

    const reopenedRepository = createGiftListRepository({ databaseName: activeDatabaseName });
    activeRepository = reopenedRepository;
    await reopenedRepository.initialize();

    expect(await reopenedRepository.getPerson(person.id)).toEqual(person);
    expect(await reopenedRepository.listPeople()).toEqual([person]);
  });
});

describe("persistent ID counters", () => {
  it("allocates positive ascending person IDs and never reuses a deleted ID", async () => {
    const repository = createRepository();
    await repository.initialize();
    const first = await createPerson(repository, "Adam");
    const second = await createPerson(repository, "Beáta");
    await repository.deletePerson(second.id);
    const third = await createPerson(repository, "Cyril");

    expect(first.id).toBe(1);
    expect(second.id).toBe(2);
    expect(third.id).toBe(3);
    expect((await repository.getMetadata()).highestPersonId).toBe(3);
  });

  it("does not derive a new ID from the current maximum record ID", async () => {
    const repository = createRepository();
    await repository.initialize();
    const first = await createPerson(repository, "Adam");
    const second = await createPerson(repository, "Beáta");
    await repository.deletePerson(second.id);
    await repository.deletePerson(first.id);

    const next = await createPerson(repository, "Cyril");
    expect(next.id).toBe(3);
    expect((await repository.getMetadata()).highestPersonId).toBe(3);
  });

  it("allocates distinct IDs for concurrent creates", async () => {
    const repository = createRepository();
    await repository.initialize();

    const people = await Promise.all([
      createPerson(repository, "Adam"),
      createPerson(repository, "Beáta"),
    ]);

    expect(people.map((person) => person.id).sort()).toEqual([1, 2]);
  });

  it("keeps independent counters for people, gifts, tags, and gift links", async () => {
    const repository = createRepository();
    await repository.initialize();
    const person = await createPerson(repository, "Adam");
    const gift = await repository.createGift({
      personId: person.id,
      name: "Kniha",
      note: "",
      priority: "MEDIUM",
      status: "NEW",
      buyerPersonId: null,
    });
    const tag = await repository.createTag({ name: "Rodina" });
    const link = await repository.createGiftLink({
      giftId: gift.id,
      url: "https://example.test/kniha",
    });

    expect({ person: person.id, gift: gift.id, tag: tag.id, link: link.id }).toEqual({
      person: 1,
      gift: 1,
      tag: 4,
      link: 1,
    });
    expect(await repository.getMetadata()).toMatchObject({
      highestPersonId: 1,
      highestGiftId: 1,
      highestTagId: 4,
      highestGiftLinkId: 1,
    });
  });
});

function createGift(repository: GiftListRepository, personId: number, name = "Dárek") {
  return repository.createGift({
    personId,
    name,
    note: "",
    priority: "MEDIUM",
    status: "NEW",
    buyerPersonId: null,
  });
}

function manualOrder<T extends { id: number; sortOrder: number }>(records: T[]): number[] {
  return [...records].sort((a, b) => a.sortOrder - b.sortOrder).map((record) => record.id);
}

describe("people", () => {
  it("trims the name and validates the birthday format", async () => {
    const repository = createRepository();
    await repository.initialize();

    const person = await repository.createPerson({
      name: "  Jana  ",
      birthday: "--02-29",
      avatarSeed: "seed",
    });
    expect(person.name).toBe("Jana");
    expect(person.birthday).toBe("--02-29");

    await expect(
      repository.createPerson({ name: "   ", birthday: null, avatarSeed: "seed" }),
    ).rejects.toThrow("Jméno nesmí být prázdný.");
    await expect(
      repository.createPerson({ name: "Petr", birthday: "2023-02-29", avatarSeed: "seed" }),
    ).rejects.toThrow("Datum narozenin není platné.");
    await expect(
      repository.createPerson({ name: "Petr", birthday: "14.5.1990", avatarSeed: "seed" }),
    ).rejects.toThrow("Datum narozenin není platné.");
    expect(await repository.listPeople()).toHaveLength(1);
  });

  it("places new people at the top of the manual order", async () => {
    const repository = createRepository();
    await repository.initialize();
    const adam = await createPerson(repository, "Adam");
    const beata = await createPerson(repository, "Beáta");
    const cyril = await createPerson(repository, "Cyril");

    expect(manualOrder(await repository.listPeople())).toEqual([cyril.id, beata.id, adam.id]);
  });

  it("updates name, birthday, and avatar seed without changing ID or sortOrder", async () => {
    const repository = createRepository();
    await repository.initialize();
    const person = await createPerson(repository, "Ada");

    const updated = await repository.updatePerson(person.id, {
      name: "  Adéla ",
      birthday: "1990-05-14",
    });
    expect(updated).toMatchObject({
      id: person.id,
      name: "Adéla",
      birthday: "1990-05-14",
      avatarSeed: person.avatarSeed,
      sortOrder: person.sortOrder,
      createdAt: person.createdAt,
    });

    const withNewAvatar = await repository.updatePerson(person.id, {
      avatarSeed: "new-seed",
      birthday: null,
    });
    expect(withNewAvatar).toMatchObject({ name: "Adéla", birthday: null, avatarSeed: "new-seed" });
    expect(await repository.getPerson(person.id)).toEqual(withNewAvatar);

    await expect(repository.updatePerson(person.id, { name: " " })).rejects.toThrow();
    await expect(repository.updatePerson(person.id, { birthday: "--13-01" })).rejects.toThrow();
    await expect(repository.updatePerson(999, { name: "X" })).rejects.toThrow("Osoba neexistuje.");
  });

  it("stores, re-crops and removes a photo with its source and crop, without touching the avatar seed", async () => {
    const repository = createRepository();
    await repository.initialize();
    const photoFields = {
      photo: "data:image/jpeg;base64,/9j/4AAQSkZJRg==",
      photoSource: "data:image/jpeg;base64,/9j/4BBQSkZJRg==",
      photoCrop: { zoom: 1.5, dx: 0.1, dy: -0.05 },
    };
    const noPhoto = { photo: null, photoSource: null, photoCrop: null };

    const withoutPhoto = await createPerson(repository, "Jana");
    expect(withoutPhoto).toMatchObject(noPhoto);

    const withPhoto = await repository.createPerson({
      name: "Petr",
      birthday: null,
      avatarSeed: "seed-petr",
      ...photoFields,
    });
    expect(await repository.getPerson(withPhoto.id)).toMatchObject({ ...photoFields, avatarSeed: "seed-petr" });

    const renamed = await repository.updatePerson(withPhoto.id, { name: "Petr K." });
    expect(renamed).toMatchObject(photoFields);

    const recropped = { ...photoFields, photo: "data:image/jpeg;base64,/9j/4CCQ", photoCrop: { zoom: 3, dx: 0, dy: 0 } };
    expect(await repository.updatePerson(withPhoto.id, recropped)).toMatchObject(recropped);

    const removed = await repository.updatePerson(withPhoto.id, noPhoto);
    expect(removed).toMatchObject({ ...noPhoto, avatarSeed: "seed-petr" });

    const invalid = "Fotka má nepodporovaný formát nebo je příliš velká.";
    await expect(
      repository.updatePerson(withoutPhoto.id, { ...photoFields, photo: "https://example.test/foto.jpg" }),
    ).rejects.toThrow(invalid);
    await expect(repository.updatePerson(withoutPhoto.id, { photo: photoFields.photo })).rejects.toThrow(invalid);
    await expect(repository.updatePerson(withPhoto.id, { photo: null })).rejects.toThrow(invalid);
    await expect(
      repository.createPerson({
        name: "Eva",
        birthday: null,
        avatarSeed: "seed-eva",
        ...photoFields,
        photo: "data:image/svg+xml;base64,PHN2Zz4=",
      }),
    ).rejects.toThrow(invalid);
    await expect(
      repository.createPerson({
        name: "Eva",
        birthday: null,
        avatarSeed: "seed-eva",
        ...photoFields,
        photoCrop: { zoom: 9, dx: 0, dy: 0 },
      }),
    ).rejects.toThrow(invalid);
    expect(await repository.listPeople()).toHaveLength(2);
    expect(await repository.getPerson(withoutPhoto.id)).toMatchObject(noPhoto);
  });

  it("reorders people and requires every person exactly once", async () => {
    const repository = createRepository();
    await repository.initialize();
    const a = await createPerson(repository, "A");
    const b = await createPerson(repository, "B");
    const c = await createPerson(repository, "C");

    await repository.reorderPeople([a.id, c.id, b.id]);
    const people = await repository.listPeople();
    expect(manualOrder(people)).toEqual([a.id, c.id, b.id]);
    expect(people.map((person) => person.sortOrder).sort()).toEqual([0, 1, 2]);

    await expect(repository.reorderPeople([a.id, c.id])).rejects.toThrow();
    await expect(repository.reorderPeople([a.id, a.id, b.id])).rejects.toThrow();
    await expect(repository.reorderPeople([a.id, b.id, c.id, 99])).rejects.toThrow();
    expect(manualOrder(await repository.listPeople())).toEqual([a.id, c.id, b.id]);
  });

  it("reports the deletion impact: own gifts and other people's gifts as buyer", async () => {
    const repository = createRepository();
    await repository.initialize();
    const jana = await createPerson(repository, "Jana");
    const petr = await createPerson(repository, "Petr");
    await createGift(repository, jana.id, "Kniha");
    await repository.createGift({
      personId: jana.id,
      name: "Pro sebe",
      note: "",
      priority: "LOW",
      status: "NEW",
      buyerPersonId: jana.id,
    });
    await repository.createGift({
      personId: petr.id,
      name: "Šála",
      note: "",
      priority: "LOW",
      status: "NEW",
      buyerPersonId: jana.id,
    });

    expect(await repository.getPersonDeletionImpact(jana.id)).toEqual({
      giftCount: 2,
      buyerGiftCount: 1,
    });
    expect(await repository.getPersonDeletionImpact(petr.id)).toEqual({
      giftCount: 1,
      buyerGiftCount: 0,
    });
    expect((await repository.listGifts()).map((gift) => gift.name).sort()).toEqual([
      "Kniha",
      "Pro sebe",
      "Šála",
    ]);
  });

  it("deletes the person's gifts, links, tags, notification log, and clears them as buyer", async () => {
    const repository = createRepository();
    await repository.initialize();
    const jana = await createPerson(repository, "Jana");
    const petr = await createPerson(repository, "Petr");
    const janasGift = await createGift(repository, jana.id, "Kniha");
    await repository.createGiftLink({ giftId: janasGift.id, url: "https://example.test" });
    await repository.setGiftTags(janasGift.id, [1]);
    const petrsGift = await repository.createGift({
      personId: petr.id,
      name: "Šála",
      note: "",
      priority: "HIGH",
      status: "BOUGHT",
      buyerPersonId: jana.id,
    });

    const database = await openGiftListDatabase(activeDatabaseName);
    const write = database.transaction(STORE_NAMES.notificationLog, "readwrite");
    const log = write.objectStore(STORE_NAMES.notificationLog);
    log.put({
      key: `${jana.id}:DAY:2026-05-14`,
      personId: jana.id,
      type: "DAY",
      occurrenceDate: "2026-05-14",
      shownAt: "2026-05-14T08:00:00.000Z",
    });
    log.put({
      key: `${petr.id}:DAY:2026-06-01`,
      personId: petr.id,
      type: "DAY",
      occurrenceDate: "2026-06-01",
      shownAt: "2026-06-01T08:00:00.000Z",
    });
    await new Promise((resolve) => (write.oncomplete = resolve));

    await repository.deletePerson(jana.id);

    expect(await repository.getPerson(jana.id)).toBeUndefined();
    expect(await repository.getGift(janasGift.id)).toBeUndefined();
    expect(await repository.listGiftLinks(janasGift.id)).toEqual([]);
    expect(await repository.listGiftTagIds(janasGift.id)).toEqual([]);
    expect(await repository.getGift(petrsGift.id)).toMatchObject({
      buyerPersonId: null,
      status: "BOUGHT",
    });

    const read = database.transaction(STORE_NAMES.notificationLog, "readonly");
    const remainingKeys = await new Promise<IDBValidKey[]>((resolve) => {
      const request = read.objectStore(STORE_NAMES.notificationLog).getAllKeys();
      request.onsuccess = () => resolve(request.result);
    });
    database.close();
    expect(remainingKeys).toEqual([`${petr.id}:DAY:2026-06-01`]);
  });
});

describe("gifts", () => {
  it("validates priority and status enums", async () => {
    const repository = createRepository();
    await repository.initialize();
    const person = await createPerson(repository);
    const base = { personId: person.id, name: "Dárek", note: "", buyerPersonId: null };

    await expect(
      repository.createGift({ ...base, priority: "URGENT" as never, status: "NEW" }),
    ).rejects.toThrow("Neplatná priorita dárku.");
    await expect(
      repository.createGift({ ...base, priority: "LOW", status: "LOST" as never }),
    ).rejects.toThrow("Neplatný stav dárku.");
    const gift = await createGift(repository, person.id);
    await expect(repository.updateGift(gift.id, { status: "DONE" as never })).rejects.toThrow();
    await expect(repository.updateGift(gift.id, { priority: "low" as never })).rejects.toThrow();
    expect(await repository.listGiftsByPerson(person.id)).toEqual([gift]);
  });

  it("lists gifts of one person and places new gifts at the top of that person's order", async () => {
    const repository = createRepository();
    await repository.initialize();
    const jana = await createPerson(repository, "Jana");
    const petr = await createPerson(repository, "Petr");
    const first = await createGift(repository, jana.id, "První");
    const other = await createGift(repository, petr.id, "Jiný");
    const second = await createGift(repository, jana.id, "Druhý");

    expect(manualOrder(await repository.listGiftsByPerson(jana.id))).toEqual([second.id, first.id]);
    expect(await repository.listGiftsByPerson(petr.id)).toEqual([other]);
  });

  it("updates gift fields", async () => {
    const repository = createRepository();
    await repository.initialize();
    const jana = await createPerson(repository, "Jana");
    const petr = await createPerson(repository, "Petr");
    const gift = await createGift(repository, jana.id);

    const updated = await repository.updateGift(gift.id, {
      name: "Lego",
      note: "velká krabice",
      priority: "HIGH",
      status: "BOUGHT",
      buyerPersonId: petr.id,
    });
    expect(updated).toMatchObject({
      id: gift.id,
      personId: jana.id,
      name: "Lego",
      note: "velká krabice",
      priority: "HIGH",
      status: "BOUGHT",
      buyerPersonId: petr.id,
      sortOrder: gift.sortOrder,
    });
    expect(await repository.updateGift(gift.id, { buyerPersonId: null })).toMatchObject({
      buyerPersonId: null,
      name: "Lego",
    });
    await expect(repository.updateGift(gift.id, { buyerPersonId: 999 })).rejects.toThrow(
      "Kupující dárku neexistuje.",
    );
    await expect(repository.updateGift(gift.id, { name: "  " })).rejects.toThrow();
  });

  it("changes the recipient, keeps ID, links, tags, buyer and status, and moves it to the top", async () => {
    const repository = createRepository();
    await repository.initialize();
    const jana = await createPerson(repository, "Jana");
    const petr = await createPerson(repository, "Petr");
    const buyer = await createPerson(repository, "Kupec");
    const gift = await repository.createGift({
      personId: jana.id,
      name: "Lego",
      note: "",
      priority: "LOW",
      status: "BOUGHT",
      buyerPersonId: buyer.id,
    });
    await repository.createGiftLink({ giftId: gift.id, url: "https://example.test/lego" });
    await repository.setGiftTags(gift.id, [1, 2]);
    const petrsOlder = await createGift(repository, petr.id, "Starší");
    const petrsNewer = await createGift(repository, petr.id, "Novější");

    const moved = await repository.updateGift(gift.id, { personId: petr.id });

    expect(moved).toMatchObject({
      id: gift.id,
      personId: petr.id,
      buyerPersonId: buyer.id,
      status: "BOUGHT",
    });
    expect(await repository.listGiftsByPerson(jana.id)).toEqual([]);
    expect(manualOrder(await repository.listGiftsByPerson(petr.id))).toEqual([
      gift.id,
      petrsNewer.id,
      petrsOlder.id,
    ]);
    expect((await repository.listGiftLinks(gift.id)).map((link) => link.url)).toEqual([
      "https://example.test/lego",
    ]);
    expect(await repository.listGiftTagIds(gift.id)).toEqual([1, 2]);
    await expect(repository.updateGift(gift.id, { personId: 999 })).rejects.toThrow(
      "Příjemce dárku neexistuje.",
    );
  });

  it("reorders gifts of one recipient", async () => {
    const repository = createRepository();
    await repository.initialize();
    const jana = await createPerson(repository, "Jana");
    const petr = await createPerson(repository, "Petr");
    const a = await createGift(repository, jana.id, "A");
    const b = await createGift(repository, jana.id, "B");
    const c = await createGift(repository, jana.id, "C");
    const foreign = await createGift(repository, petr.id, "Cizí");

    await repository.reorderGifts(jana.id, [a.id, b.id, c.id]);
    const gifts = await repository.listGiftsByPerson(jana.id);
    expect(manualOrder(gifts)).toEqual([a.id, b.id, c.id]);
    expect(gifts.map((gift) => gift.sortOrder).sort()).toEqual([0, 1, 2]);

    await expect(repository.reorderGifts(jana.id, [a.id, b.id, foreign.id])).rejects.toThrow();
    await expect(repository.reorderGifts(jana.id, [a.id, b.id])).rejects.toThrow();
  });
});

describe("tags", () => {
  it("renames a tag with case-insensitive uniqueness", async () => {
    const repository = createRepository();
    await repository.initialize();
    const [christmas] = await repository.listTags();

    const renamed = await repository.renameTag(christmas.id, "  Vánoce 2026 ");
    expect(renamed).toMatchObject({ id: christmas.id, name: "Vánoce 2026" });
    expect(await repository.renameTag(christmas.id, "VÁNOCE 2026")).toMatchObject({
      name: "VÁNOCE 2026",
    });

    await expect(repository.renameTag(christmas.id, "narozeniny")).rejects.toThrow(
      "Tag s tímto názvem už existuje.",
    );
    await expect(repository.renameTag(christmas.id, " ")).rejects.toThrow();
    await expect(repository.renameTag(999, "Nový")).rejects.toThrow("Tag neexistuje.");
  });

  it("sets the exact set of tags for a gift", async () => {
    const repository = createRepository();
    await repository.initialize();
    const person = await createPerson(repository);
    const gift = await createGift(repository, person.id);

    await repository.setGiftTags(gift.id, [1, 2]);
    expect(await repository.listGiftTagIds(gift.id)).toEqual([1, 2]);
    await repository.setGiftTags(gift.id, [3, 2, 3]);
    expect(await repository.listGiftTagIds(gift.id)).toEqual([2, 3]);
    await repository.setGiftTags(gift.id, []);
    expect(await repository.listGiftTagIds(gift.id)).toEqual([]);

    await repository.setGiftTags(gift.id, [1]);
    await expect(repository.setGiftTags(gift.id, [2, 999])).rejects.toThrow("Tag neexistuje.");
    expect(await repository.listGiftTagIds(gift.id)).toEqual([1]);
  });
});

describe("gift links", () => {
  async function giftWithLinks(repository: GiftListRepository, count: number) {
    const person = await createPerson(repository);
    const gift = await createGift(repository, person.id);
    const links = [];
    for (let index = 0; index < count; index += 1) {
      links.push(
        await repository.createGiftLink({ giftId: gift.id, url: `https://example.test/${index}` }),
      );
    }
    return { gift, links };
  }

  function orderOf(links: { id: number; sortOrder: number }[]) {
    return links.map((link) => [link.id, link.sortOrder]);
  }

  it("appends links with consecutive order and normalizes titles", async () => {
    const repository = createRepository();
    await repository.initialize();
    const { gift, links } = await giftWithLinks(repository, 2);
    const titled = await repository.createGiftLink({
      giftId: gift.id,
      url: "https://example.test/titled",
      title: "  Obchod ",
    });
    const blank = await repository.createGiftLink({
      giftId: gift.id,
      url: "http://example.test",
      title: " ",
    });

    expect(titled.title).toBe("Obchod");
    expect("title" in blank).toBe(false);
    expect(orderOf(await repository.listGiftLinks(gift.id))).toEqual([
      [links[0].id, 0],
      [links[1].id, 1],
      [titled.id, 2],
      [blank.id, 3],
    ]);
    await expect(
      repository.createGiftLink({ giftId: gift.id, url: "ftp://example.test" }),
    ).rejects.toThrow("Odkaz musí být platná HTTP nebo HTTPS adresa.");
  });

  it("updates url and title", async () => {
    const repository = createRepository();
    await repository.initialize();
    const { links } = await giftWithLinks(repository, 1);
    const [link] = links;

    const updated = await repository.updateGiftLink(link.id, {
      url: "https://example.test/new",
      title: "Nový",
    });
    expect(updated).toMatchObject({ url: "https://example.test/new", title: "Nový", sortOrder: 0 });
    expect(await repository.updateGiftLink(link.id, { title: "" })).toEqual({
      id: link.id,
      giftId: link.giftId,
      url: "https://example.test/new",
      sortOrder: 0,
    });
    await expect(
      repository.updateGiftLink(link.id, { url: "javascript:alert(1)" }),
    ).rejects.toThrow();
  });

  it("reorders links to 0..n-1 and requires every link exactly once", async () => {
    const repository = createRepository();
    await repository.initialize();
    const { gift, links } = await giftWithLinks(repository, 3);
    const [a, b, c] = links;

    await repository.reorderGiftLinks(gift.id, [c.id, a.id, b.id]);
    expect(orderOf(await repository.listGiftLinks(gift.id))).toEqual([
      [c.id, 0],
      [a.id, 1],
      [b.id, 2],
    ]);
    await expect(repository.reorderGiftLinks(gift.id, [c.id, a.id])).rejects.toThrow();
  });

  it("removes a link and renormalizes the remaining order; link IDs are never reused", async () => {
    const repository = createRepository();
    await repository.initialize();
    const { gift, links } = await giftWithLinks(repository, 3);
    const [a, b, c] = links;

    await repository.deleteGiftLink(b.id);
    expect(orderOf(await repository.listGiftLinks(gift.id))).toEqual([
      [a.id, 0],
      [c.id, 1],
    ]);
    await repository.deleteGiftLink(c.id);
    const next = await repository.createGiftLink({
      giftId: gift.id,
      url: "https://example.test/next",
    });
    expect(next).toMatchObject({ id: 4, sortOrder: 1 });
    await expect(repository.deleteGiftLink(b.id)).rejects.toThrow("Odkaz neexistuje.");
  });
});

describe("preferences", () => {
  it("updates and persists device preferences", async () => {
    const repository = createRepository();
    await repository.initialize();

    await repository.updatePreferences({
      peopleSortMode: "MANUAL",
      giftSortMode: "MANUAL",
      theme: "DARK",
      lastExportAt: "2026-01-01T12:00:00.000Z",
      birthdayNotificationsEnabled: true,
    });
    repository.close();

    const reopened = createGiftListRepository({ databaseName: activeDatabaseName });
    activeRepository = reopened;
    expect(await reopened.getMetadata()).toMatchObject({
      peopleSortMode: "MANUAL",
      giftSortMode: "MANUAL",
      theme: "DARK",
      lastExportAt: "2026-01-01T12:00:00.000Z",
      birthdayNotificationsEnabled: true,
      highestTagId: 3,
    });

    expect(await reopened.updatePreferences({ theme: "LIGHT" })).toMatchObject({
      theme: "LIGHT",
      peopleSortMode: "MANUAL",
    });
  });

  it("rejects invalid preference values", async () => {
    const repository = createRepository();
    await repository.initialize();

    await expect(repository.updatePreferences({ theme: "BLUE" as never })).rejects.toThrow();
    await expect(
      repository.updatePreferences({ peopleSortMode: "RANDOM" as never }),
    ).rejects.toThrow();
    await expect(repository.updatePreferences({ giftSortMode: "NAME" as never })).rejects.toThrow();
    await expect(repository.updatePreferences({ lastExportAt: "včera" })).rejects.toThrow();
    await expect(
      repository.updatePreferences({ birthdayNotificationsEnabled: "yes" as never }),
    ).rejects.toThrow();
    expect((await repository.getMetadata()).theme).toBe("SYSTEM");
  });
});

describe("fresh installation", () => {
  it("is fresh only without people and gifts; tags do not matter", async () => {
    const repository = createRepository();
    await repository.initialize();
    await repository.createTag({ name: "Vlastní" });
    expect(await repository.isFreshInstallation()).toBe(true);

    const person = await createPerson(repository);
    expect(await repository.isFreshInstallation()).toBe(false);
    await createGift(repository, person.id);
    expect(await repository.isFreshInstallation()).toBe(false);

    await repository.deletePerson(person.id);
    expect(await repository.isFreshInstallation()).toBe(true);
  });
});
