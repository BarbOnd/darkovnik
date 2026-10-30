import { describe, expect, it } from "vitest";
import {
  backupFileName,
  createBackupDocument,
  datasetError,
  parseBackup,
  planImport,
  type BackupDocument,
  type Dataset,
} from "./backup";
import type { Gift, GiftLink, Person, Tag } from "./entities";

const T = "2026-01-01T00:00:00.000Z";

function person(id: number, name = `Osoba ${id}`): Person {
  return {
    id,
    name,
    birthday: null,
    avatarSeed: `seed-${id}`,
    photo: null,
    photoSource: null,
    photoCrop: null,
    sortOrder: 0,
    createdAt: T,
    updatedAt: T,
  };
}

function gift(id: number, personId: number, name = `Dárek ${id}`): Gift {
  return {
    id,
    personId,
    name,
    note: "",
    priority: "MEDIUM",
    status: "NEW",
    buyerPersonId: null,
    sortOrder: 0,
    createdAt: T,
    updatedAt: T,
  };
}

function link(id: number, giftId: number, sortOrder: number): GiftLink {
  return { id, giftId, url: `https://example.test/${id}`, sortOrder };
}

function tag(id: number, name: string): Tag {
  return { id, name, createdAt: T, updatedAt: T };
}

function dataset(partial: Partial<Dataset> = {}): Dataset {
  return {
    people: [],
    gifts: [],
    giftLinks: [],
    tags: [],
    giftTags: [],
    counters: { highestPersonId: 0, highestGiftId: 0, highestTagId: 0, highestGiftLinkId: 0 },
    birthdayNotificationsEnabled: false,
    ...partial,
  };
}

function documentFrom(data: Dataset): BackupDocument {
  return createBackupDocument(data, new Date(T));
}

/** Round trip through JSON like a real file. */
function parse(value: unknown) {
  return parseBackup(JSON.stringify(value));
}

describe("backup file name", () => {
  it("uses the local date", () => {
    expect(backupFileName({ year: 2026, month: 5, day: 4 })).toBe("giftlist-zaloha-2026-05-04.json");
  });
});

describe("backup document validation", () => {
  const valid = documentFrom(
    dataset({
      people: [{ ...person(1, "Jana"), birthday: "--02-29" }],
      gifts: [gift(1, 1)],
      giftLinks: [{ ...link(1, 1, 0), title: "Obchod" }],
      tags: [tag(1, "Vánoce")],
      giftTags: [{ giftId: 1, tagId: 1 }],
      counters: { highestPersonId: 1, highestGiftId: 1, highestTagId: 3, highestGiftLinkId: 1 },
      birthdayNotificationsEnabled: true,
    }),
  );

  it("accepts an exported document unchanged", () => {
    expect(parse(valid)).toEqual({ ok: true, value: valid });
  });

  it("drops unknown fields", () => {
    const result = parse({ ...valid, people: [{ ...valid.people[0], hacked: true }], extra: 1 });
    expect(result.ok && result.value.people[0]).toEqual(valid.people[0]);
  });

  it("rejects text that is not JSON", () => {
    expect(parseBackup("nesmysl")).toEqual({
      ok: false,
      error: "Soubor není platná záloha GiftList (nejde o čitelný JSON).",
    });
  });

  it.each([
    [{ ...valid, schemaVersion: 2 }, "Záloha pochází z novější verze aplikace. Aktualizujte GiftList a zkuste to znovu."],
    [{ ...valid, schemaVersion: "1" }, "Tuto verzi zálohy aplikace nepodporuje."],
    [{ foo: 1 }, "Záloha není platná: soubor neobsahuje data GiftList."],
  ])("rejects an unsupported or foreign file %#", (document, error) => {
    expect(parse(document)).toEqual({ ok: false, error });
  });

  it.each([
    [{ people: [{ ...valid.people[0], id: 0 }] }, "osoba #0 nemá platné ID"],
    [{ people: [{ ...valid.people[0], id: 1.5 }] }, "nemá platné ID"],
    [{ people: [{ ...valid.people[0], name: "  " }] }, "neplatné pole „name“"],
    [{ people: [{ ...valid.people[0], birthday: "2023-02-29" }] }, "nemá platné datum narozenin"],
    [{ people: [{ ...valid.people[0], photo: "data:image/jpeg;base64,AA" }] }, "má neplatnou fotku"],
    [{ people: [valid.people[0], valid.people[0]] }, "Osoba s ID 1 je v záloze vícekrát"],
    [{ gifts: [{ ...valid.gifts[0], priority: "URGENT" }] }, "má neplatnou prioritu"],
    [{ gifts: [{ ...valid.gifts[0], status: "LOST" }] }, "má neplatný stav"],
    [{ gifts: [{ ...valid.gifts[0], buyerPersonId: -1 }] }, "nemá platné pole „buyerPersonId“"],
    [{ giftLinks: [{ ...valid.giftLinks[0], url: "javascript:alert(1)" }] }, "nemá platnou adresu"],
    [{ giftLinks: [{ ...valid.giftLinks[0], sortOrder: -1 }] }, "neplatné pole „sortOrder“"],
    [{ giftTags: [valid.giftTags[0], valid.giftTags[0]] }, "je v záloze vícekrát"],
    [{ gifts: "nic" }, "chybí seznam „gifts“"],
    [{ metadata: { ...valid.metadata, highestGiftId: -3 } }, "neplatné pole „highestGiftId“"],
    [{ metadata: { ...valid.metadata, birthdayNotificationsEnabled: "ano" } }, "nastavení upozornění"],
    [{ exportedAt: "včera" }, "neplatné datum"],
  ])("rejects invalid content %#", (override, fragment) => {
    const result = parse({ ...valid, ...override });
    expect(result.ok).toBe(false);
    expect(!result.ok && result.error).toContain(fragment);
  });
});

describe("import merge", () => {
  it("into a fresh installation replaces the default tags and keeps imported IDs", () => {
    const local = dataset({
      tags: [tag(1, "Vánoce"), tag(2, "Narozeniny"), tag(3, "Výročí")],
      counters: { highestPersonId: 0, highestGiftId: 0, highestTagId: 3, highestGiftLinkId: 0 },
    });
    const imported = documentFrom(
      dataset({
        people: [person(5)],
        gifts: [gift(9, 5)],
        tags: [tag(7, "Vánoce")],
        giftTags: [{ giftId: 9, tagId: 7 }],
        counters: { highestPersonId: 6, highestGiftId: 9, highestTagId: 7, highestGiftLinkId: 0 },
        birthdayNotificationsEnabled: true,
      }),
    );

    const plan = planImport(local, imported);
    expect(plan.fresh).toBe(true);
    expect(plan.removedTagIds).toEqual([1, 2, 3]);
    expect(plan.merged.tags).toEqual([tag(7, "Vánoce")]);
    expect(plan.merged.people.map((p) => p.id)).toEqual([5]);
    expect(plan.merged.counters).toEqual({ highestPersonId: 6, highestGiftId: 9, highestTagId: 7, highestGiftLinkId: 0 });
    expect(plan.merged.birthdayNotificationsEnabled).toBe(true);
    expect(plan.added).toEqual({ people: 1, gifts: 1, tags: 1, giftLinks: 0 });
    expect(datasetError(plan.merged)).toBeNull();
  });

  it("into an installation with data merges by ID and deletes nothing", () => {
    const local = dataset({
      people: [person(1, "Jana"), person(2, "Petr")],
      gifts: [gift(1, 1, "Lokální")],
      tags: [tag(1, "Vánoce"), tag(4, "Jen lokální")],
      giftTags: [{ giftId: 1, tagId: 4 }],
      counters: { highestPersonId: 10, highestGiftId: 3, highestTagId: 4, highestGiftLinkId: 0 },
    });
    const imported = documentFrom(
      dataset({
        people: [person(1, "Jana (z druhého telefonu)"), person(3, "Nová")],
        gifts: [gift(1, 1, "Importovaný"), gift(5, 3)],
        tags: [tag(1, "Vánoce")],
        giftTags: [{ giftId: 1, tagId: 1 }],
        counters: { highestPersonId: 3, highestGiftId: 7, highestTagId: 1, highestGiftLinkId: 0 },
      }),
    );

    const plan = planImport(local, imported);
    expect(plan.fresh).toBe(false);
    expect(plan.removedTagIds).toEqual([]);
    expect(plan.updated).toEqual({ people: 1, gifts: 1, tags: 1, giftLinks: 0 });
    expect(plan.added).toEqual({ people: 1, gifts: 1, tags: 0, giftLinks: 0 });
    expect(plan.merged.people.map((p) => p.name).sort()).toEqual(["Jana (z druhého telefonu)", "Nová", "Petr"]);
    expect(plan.merged.gifts.find((g) => g.id === 1)?.name).toBe("Importovaný");
    expect(plan.merged.tags.map((t) => t.id).sort()).toEqual([1, 4]);
    // Associations are only added.
    expect(plan.merged.giftTags).toEqual([
      { giftId: 1, tagId: 4 },
      { giftId: 1, tagId: 1 },
    ]);
    // Counters never decrease: max(local, imported, IDs present).
    expect(plan.merged.counters).toEqual({ highestPersonId: 10, highestGiftId: 7, highestTagId: 4, highestGiftLinkId: 0 });
    expect(datasetError(plan.merged)).toBeNull();
  });

  it("renormalizes link order: imported links first, then remaining local links", () => {
    const local = dataset({
      people: [person(1)],
      gifts: [gift(1, 1), gift(2, 1)],
      giftLinks: [link(10, 1, 0), link(11, 1, 1), link(12, 2, 0), link(13, 2, 1)],
    });
    const imported = documentFrom(
      dataset({
        people: [person(1)],
        gifts: [gift(1, 1)],
        // Link 13 moves from gift 2 to gift 1; link 20 is new.
        giftLinks: [link(20, 1, 0), link(13, 1, 1)],
      }),
    );

    const plan = planImport(local, imported);
    const order = (giftId: number) =>
      plan.merged.giftLinks
        .filter((l) => l.giftId === giftId)
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((l) => [l.id, l.sortOrder]);
    expect(order(1)).toEqual([
      [20, 0],
      [13, 1],
      [10, 2],
      [11, 3],
    ]);
    expect(order(2)).toEqual([[12, 0]]);
    expect(plan.merged.counters.highestGiftLinkId).toBe(20);
    expect(datasetError(plan.merged)).toBeNull();
  });

  it("reports broken references and duplicate tag names in the merged result", () => {
    expect(datasetError(dataset({ gifts: [gift(1, 99)] }))).toContain("patří osobě, která v datech není");
    expect(
      datasetError(dataset({ people: [person(1)], gifts: [{ ...gift(1, 1), buyerPersonId: 7 }] })),
    ).toContain("kupujícího");
    expect(datasetError(dataset({ giftLinks: [link(1, 5, 0)] }))).toContain("odkaz k dárku");
    expect(datasetError(dataset({ giftTags: [{ giftId: 1, tagId: 1 }] }))).toContain("štítek");

    const local = dataset({ people: [person(1)], tags: [tag(1, "Vánoce")] });
    const plan = planImport(local, documentFrom(dataset({ tags: [tag(2, " vánoce ")] })));
    expect(datasetError(plan.merged)).toContain("dva štítky");
  });
});
